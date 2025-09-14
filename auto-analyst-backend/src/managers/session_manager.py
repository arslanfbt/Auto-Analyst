import io
import os
import time
import uuid
import logging
import pandas as pd
from typing import Dict, Any, List

from llama_index.core import Document, VectorStoreIndex
from src.utils.logger import Logger
from src.managers.user_manager import get_current_user
from src.agents.agents import auto_analyst
from src.agents.retrievers.retrievers import make_data
from src.managers.chat_manager import ChatManager
from dotenv import load_dotenv
import duckdb

load_dotenv()

# Initialize logger
logger = Logger("session_manager", see_time=False, console_log=False)

class SessionManager:
    """
    Manages session-specific state, including datasets, retrievers, and AI systems.
    Handles creation, retrieval, and updating of sessions.
    """
    
    def __init__(self, styling_instructions: List[str], available_agents: Dict):
        """
        Initialize SessionManager with styling instructions and available agents
        
        Args:
            styling_instructions: List of styling instructions for visualization
            available_agents: Dictionary of available agents (deprecated - agents now loaded from DB)
        """
        self.styling_instructions = styling_instructions
        self._sessions = {}
        self._default_df = None
        self._default_retrievers = None
        self._default_ai_system = None
        self._make_data = None

        # Initialize chat manager

        self._default_name = "Housing.csv"

        
        self._dataset_description = """This dataset contains residential property information with details about pricing, physical characteristics, and amenities. The data can be used for real estate market analysis, property valuation, and understanding the relationship between house features and prices.

Key Features:
- Property prices range from 1.75M to 13.3M (currency units)
- Living areas from 1,650 to 16,200 (square units)
- Properties vary from 1-6 bedrooms and 1-4 bathrooms
- Various amenities tracked including parking, air conditioning, and hot water heating

TECHNICAL CONSIDERATIONS FOR ANALYSIS:

Numeric Columns:
- price (int): Large values suggesting currency units; range 1.75M-13.3M
- area (int): Square units measurement; range 1,650-16,200
- bedrooms (int): Discrete values 1-6
- bathrooms (int): Discrete values 1-4
- stories (int): Discrete values 1-4
- parking (int): Discrete values 0-3

Binary Categorical Columns (stored as str):
- mainroad (str): 'yes'/'no' - Consider boolean conversion
- guestroom (str): 'yes'/'no' - Consider boolean conversion
- basement (str): 'yes'/'no' - Consider boolean conversion
- hotwaterheating (str): 'yes'/'no' - Consider boolean conversion
- airconditioning (str): 'yes'/'no' - Consider boolean conversion
- prefarea (str): 'yes'/'no' - Consider boolean conversion

Other Categorical:
- furnishingstatus (str): Categories include 'furnished', 'semi-furnished' - Consider one-hot encoding

Data Handling Recommendations:
1. Binary variables should be converted to boolean or numeric (0/1) for analysis
2. Consider normalizing price and area values for certain analyses
3. Furnishing status will need categorical encoding for numerical analysis
4. No null values detected in the dataset
5. All numeric columns are properly typed as numbers (no string conversion needed)
6. Consider treating bedrooms, bathrooms, stories, and parking as categorical despite numeric storage

This dataset appears clean with consistent formatting and no missing values, making it suitable for immediate analysis with appropriate categorical encoding.
        """
        self.available_agents = available_agents
        self.chat_manager = ChatManager(db_url=os.getenv("DATABASE_URL"))
        
        self.initialize_default_dataset()
    
    def initialize_default_dataset(self):
        """Initialize the default dataset and store it"""
        try:
            self._default_df = pd.read_csv("Housing.csv")
            self._make_data = {'dataset_python_name':"this dataset is loaded as `df`","description":self._dataset_description}
            self._default_retrievers = self.initialize_retrievers(self.styling_instructions, [str(self._make_data)])
            # Create default AI system - agents will be loaded from database
            self._default_ai_system = auto_analyst(agents=[], retrievers=self._default_retrievers)
        except Exception as e:
            logger.log_message(f"Error initializing default dataset: {str(e)}", level=logging.ERROR)
            raise e
    
    def initialize_retrievers(self,styling_instructions: List[str], doc: List[str]):
        try:
            style_index = VectorStoreIndex.from_documents([Document(text=x) for x in styling_instructions])
            
            return {"style_index": style_index, "dataframe_index": doc}
        except Exception as e:
            logger.log_message(f"Error initializing retrievers: {str(e)}", level=logging.ERROR)
            raise e

    def get_session_state(self, session_id: str) -> Dict[str, Any]:
        """
        Get or create session-specific state
        
        Args:
            session_id: The session identifier
            
        Returns:
            Dictionary containing session state
        """
        # Use the global model config from app_state when available
        # Get the most up-to-date model config
        if hasattr(self, '_app_model_config') and self._app_model_config:
            default_model_config = self._app_model_config
        else:
            default_model_config = {
                "provider": os.getenv("MODEL_PROVIDER", "openai"),
                "model": os.getenv("MODEL_NAME", "gpt-4o-mini"),
                "api_key": os.getenv("OPENAI_API_KEY"),
                "temperature": float(os.getenv("TEMPERATURE", 1.0)),
                "max_tokens": int(os.getenv("MAX_TOKENS", 6000))
            }
        
        if session_id not in self._sessions:
            # Check if we need to create a brand new session
            logger.log_message(f"Creating new session state for session_id: {session_id}", level=logging.INFO)
            
            # Initialize DuckDB connection for this session
            duckdb_conn = duckdb.connect(':memory:')
            if self._default_df is not None:
                duckdb_conn.register("df", self._default_df)
            
            # Initialize with default state
            self._sessions[session_id] = {
                "datasets": {"df":self._default_df.copy() if self._default_df is not None else None},
                "dataset_names": ["df"],
                "retrievers": self._default_retrievers,
                "ai_system": self._default_ai_system,
                "make_data": self._make_data,
                "description": self._dataset_description,
                "name": self._default_name,
                "model_config": default_model_config,
                "creation_time": time.time(),
                "duckdb_conn": duckdb_conn,
            }
        else:
            # Verify dataset integrity in existing session
            session = self._sessions[session_id]
            
            # Always update model_config to match global settings
            session["model_config"] = default_model_config
            
            # If dataset is somehow missing, restore it
            if "datasets" not in session or session["datasets"] is None:
                logger.log_message(f"Restoring missing dataset for session {session_id}", level=logging.WARNING)
                session["datasets"] = {"df":self._default_df.copy() if self._default_df is not None else None}
                session["retrievers"] = self._default_retrievers
                session["ai_system"] = self._default_ai_system
                session["description"] = self._dataset_description
                session["name"] = self._default_name
            
            # Ensure we have the basic required fields
            if "name" not in session:
                session["name"] = self._default_name
            if "description" not in session:
                session["description"] = self._dataset_description
            
            # Update last accessed time
            session["last_accessed"] = time.time()
            
        return self._sessions[session_id]

    def clear_session_state(self, session_id: str):
        """
        Clear session-specific state
        
        Args:
            session_id: The session identifier
        """
        if session_id in self._sessions:
            # Close DuckDB connection before clearing session
            duckdb_conn = self._sessions[session_id].get("duckdb_conn")
            if duckdb_conn:
                try:
                    duckdb_conn.close()
                    logger.log_message(f"Closed DuckDB connection for session {session_id}", level=logging.INFO)
                except Exception as e:
                    logger.log_message(f"Error closing DuckDB connection for session {session_id}: {str(e)}", level=logging.WARNING)
            
            del self._sessions[session_id]
            logger.log_message(f"Cleared session state for session {session_id}", level=logging.INFO)


    def update_session_dataset(self, session_id: str, datasets, names, desc: str):
        """

        """
        try:
            self._make_data = {'description':desc}
            retrievers = self.initialize_retrievers(self.styling_instructions, [str(self._make_data)])
            
            # Check if session has a user_id to create user-specific AI system
            current_user_id = None
            if session_id in self._sessions and "user_id" in self._sessions[session_id]:
                current_user_id = self._sessions[session_id]["user_id"]
            
            ai_system = self.create_ai_system_for_user(retrievers, current_user_id)
            
            # Get default model config for new sessions
            default_model_config = {
                "provider": os.getenv("MODEL_PROVIDER", "openai"),
                "model": os.getenv("MODEL_NAME", "gpt-4o-mini"),
                "api_key": os.getenv("OPENAI_API_KEY"),
                "temperature": float(os.getenv("TEMPERATURE", 1.0)),
                "max_tokens": int(os.getenv("MAX_TOKENS", 6000))
            }
            
            # Get or create DuckDB connection for this session
            duckdb_conn = None
            if session_id in self._sessions and "duckdb_conn" in self._sessions[session_id]:
                duckdb_conn = self._sessions[session_id]["duckdb_conn"]
            else:
                # Create new DuckDB connection if it doesn't exist
                duckdb_conn = duckdb.connect(':memory:')
            
            # Register the new dataset in DuckDB
            try:
                duckdb_conn.execute("DROP TABLE IF EXISTS current_data")
            except:
                pass
            
            
            # Create a completely fresh session state for the new dataset
            # This ensures no remnants of the previous dataset remain
            session_state = {
                "datasets": datasets,
                "dataset_names":names,
                "retrievers": retrievers,
                "ai_system": ai_system,
                "make_data": self._make_data,
                "description": desc,
                "name": names[0],
                "duckdb_conn":duckdb_conn,
                "model_config": default_model_config,  # Initialize with default
            }
            
            # Preserve user_id, chat_id, and model_config if they exist in the current session
            if session_id in self._sessions:
                if "user_id" in self._sessions[session_id]:
                    session_state["user_id"] = self._sessions[session_id]["user_id"]
                if "chat_id" in self._sessions[session_id]:
                    session_state["chat_id"] = self._sessions[session_id]["chat_id"]
                if "model_config" in self._sessions[session_id]:
                    # Preserve the user's model configuration
                    session_state["model_config"] = self._sessions[session_id]["model_config"]
            
            # Replace the entire session with the new state
            self._sessions[session_id] = session_state
            
            # Update DuckDB with new dataset
            
            logger.log_message(f"Updated session {session_id} with completely fresh dataset state: {name}", level=logging.INFO)
        except Exception as e:
            logger.log_message(f"Error updating dataset for session {session_id}: {str(e)}", level=logging.ERROR)
            raise e

    def reset_session_to_default(self, session_id: str):
        """
        Reset a session to use the default dataset

        Args:
            session_id: The session identifier
        """
        try:
            # Get default model config from environment
            default_model_config = {
                "provider": os.getenv("MODEL_PROVIDER", "openai"),
                "model": os.getenv("MODEL_NAME", "gpt-4o-mini"),
                "api_key": os.getenv("OPENAI_API_KEY"),
                "temperature": float(os.getenv("TEMPERATURE", 1.0)),
                "max_tokens": int(os.getenv("MAX_TOKENS", 6000))
            }
            
            # Clear any custom data associated with the session first
            if session_id in self._sessions:
                del self._sessions[session_id]
                logger.log_message(f"Cleared existing state for session {session_id} before reset.", level=logging.INFO)

            # Create new DuckDB connection for default session
            duckdb_conn = duckdb.connect(':memory:')

            # Register default DataFrame in DuckDB
            if self._default_df is not None:
                duckdb_conn.register("current_data", self._default_df)

            # Initialize with default state
            self._sessions[session_id] = {
                "datasets": {'df':self._default_df.copy()},
                "dataset_names": ["df"], # Use a copy
                "retrievers": self._default_retrievers,
                "ai_system": self._default_ai_system,
                "description": self._dataset_description,
                "name": self._default_name, # Explicitly set the default name
                "make_data": None, # Clear any custom make_data
                "model_config": default_model_config, # Initialize with default model config
                "duckdb_conn": duckdb_conn, # Create new DuckDB connection
            }
            logger.log_message(f"Reset session {session_id} to default dataset: {self._default_name}", level=logging.INFO)
        except Exception as e:
            logger.log_message(f"Error resetting session {session_id}: {str(e)}", level=logging.ERROR)
            raise e

    def create_ai_system_for_user(self, retrievers, user_id=None):
        """
        Create an AI system with user-specific agents (including custom agents)
        
        Args:
            retrievers: The retrievers for the AI system
            user_id: Optional user ID to load custom agents for
            
        Returns:
            An auto_analyst instance with all available agents (standard + custom)
        """
        try:
            if user_id:
                # Import here to avoid circular imports
                from src.db.init_db import session_factory
                
                # Create a database session
                db_session = session_factory()
                try:
                    # Create AI system with user context to load custom agents
                    ai_system = auto_analyst(
                        agents=[], 
                        retrievers=retrievers,
                        user_id=user_id,
                        db_session=db_session
                    )
                    logger.log_message(f"Created AI system for user {user_id}", level=logging.INFO)
                    return ai_system
                finally:
                    db_session.close()
            else:
                # Create standard AI system without custom agents
                return auto_analyst(agents=[], retrievers=retrievers)
                
        except Exception as e:
            logger.log_message(f"Error creating AI system for user {user_id}: {str(e)}", level=logging.ERROR)
            # Fallback to standard AI system
            return auto_analyst(agents=[], retrievers=retrievers)

    def set_session_user(self, session_id: str, user_id: int, chat_id: int = None):
        """
        Associate a user with a session
        
        Args:
            session_id: The session identifier
            user_id: The authenticated user ID
            chat_id: Optional chat ID for tracking conversation
            
        Returns:
            Updated session state dictionary
        """
        # Ensure we have a session state for this session ID
        if session_id not in self._sessions:
            self.get_session_state(session_id)  # Initialize with defaults
        
        # Store user ID
        self._sessions[session_id]["user_id"] = user_id
        
        # Generate or use chat ID
        if chat_id:
            chat_id_to_use = chat_id
        else:
            # Check if chat_id already exists
            if "chat_id" not in self._sessions[session_id] or not self._sessions[session_id]["chat_id"]:
                # Use current timestamp + random number to generate a more readable ID
                import random
                chat_id_to_use = int(time.time() * 1000) % 1000000 + random.randint(1, 999)
            else:
                chat_id_to_use = self._sessions[session_id]["chat_id"]
        
        # Store chat ID
        self._sessions[session_id]["chat_id"] = chat_id_to_use
        
        # Recreate AI system with user context to load custom agents
        try:
            session_retrievers = self._sessions[session_id]["retrievers"]
            user_ai_system = self.create_ai_system_for_user(session_retrievers, user_id)
            self._sessions[session_id]["ai_system"] = user_ai_system
            logger.log_message(f"Updated AI system for session {session_id} with user {user_id}", level=logging.INFO)
        except Exception as e:
            logger.log_message(f"Error updating AI system for user {user_id}: {str(e)}", level=logging.ERROR)
            # Continue with existing AI system if update fails
        
        # Make sure this data gets saved
        logger.log_message(f"Associated session {session_id} with user_id={user_id}, chat_id={chat_id_to_use}", level=logging.INFO)
        
        # Return the updated session data
        return self._sessions[session_id]

async def get_session_id(request, session_manager):
    """
    Get the session ID from the request, create/associate a user if needed
    
    Args:
        request: FastAPI Request object
        session_manager: SessionManager instance
        
    Returns:
        Session ID string
    """
    # First try to get from query params
    session_id = request.query_params.get("session_id")
    
    # If not in query params, try to get from headers
    if not session_id:
        session_id = request.headers.get("X-Session-ID")
    
    # If still not found, generate a new one
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Get or create the session state
    session_state = session_manager.get_session_state(session_id)
    
    # First, check if we already have a user associated with this session
    if session_state.get("user_id") is not None:
        return session_id
    
    # Next, try to get authenticated user using the API key
    current_user = await get_current_user(request)
    if current_user:
        # Use the authenticated user instead of creating a guest
        session_manager.set_session_user(
            session_id=session_id,
            user_id=current_user.user_id
        )
        logger.log_message(f"Associated session {session_id} with authenticated user_id {current_user.user_id}", level=logging.INFO)
        return session_id
    
    # Check if a user_id was provided in the request params
    user_id_param = request.query_params.get("user_id")
    if user_id_param:
        try:
            user_id = int(user_id_param)
            session_manager.set_session_user(session_id=session_id, user_id=user_id)
            logger.log_message(f"Associated session {session_id} with provided user_id {user_id}", level=logging.INFO)
            return session_id
        except (ValueError, TypeError):
            logger.log_message(f"Invalid user_id in query params: {user_id_param}", level=logging.WARNING)
    
    # No user was found or created - just return the session ID without associating a user
    logger.log_message(f"No authenticated user found for session {session_id}, continuing without user association", level=logging.INFO)
    return session_id