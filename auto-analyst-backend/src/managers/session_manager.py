import io
import os
import time
import uuid
import logging
import pandas as pd
from typing import Dict, Any, List, Optional

from llama_index.core import Document, VectorStoreIndex
from src.utils.logger import Logger
from src.managers.user_manager import create_user, get_current_user
from src.agents.agents import auto_analyst, auto_analyst_ind
from src.agents.retrievers.retrievers import make_data
from src.managers.chat_manager import ChatManager

# Initialize logger
logger = Logger("session_manager", see_time=True, console_log=False)

class SessionManager:
    """
    Manages session-specific state, including datasets, retrievers, and AI systems.
    Handles creation, retrieval, and updating of sessions.
    """
    
    def __init__(self, styling_instructions: List[str], available_agents: Dict):
        """
        Initialize session manager with styling instructions and agents
        
        Args:
            styling_instructions: List of styling instructions
            available_agents: Dictionary of available agents
        """
        self._sessions = {}
        self._default_df = None
        self._default_retrievers = None
        self._default_ai_system = None
        self._dataset_description = None
        self._make_data = None
        self._default_name = "Housing Dataset"  # Default dataset name
        
        self._dataset_description = """This dataset focuses on the real estate market, containing 545 entries detailing numerous aspects of residential properties, such as their selling prices and structural features. Each record includes essential numeric attributes like `price`, `area`, `bedrooms`, `bathrooms`, `stories`, and `parking`, allowing for thorough quantitative analysis. The dataset also includes binary features like `mainroad`, `guestroom`, `basement`, `hotwaterheating`, `airconditioning`, `prefarea`, and `furnishingstatus`, adding qualitative dimensions that affect property desirability and value.

        Statistical summaries reveal that the average price of properties is approximately 4.77 million, with a substantial standard deviation indicating a diverse market. The average area of the properties is about 5,151 square feet, while the typical layout features about three bedrooms and one bathroom. Understanding these patterns can assist stakeholders in making strategic decisions in areas such as pricing and investment. Overall, this dataset proves invaluable for realtors, investors, and analysts seeking to grasp market dynamics and property features that drive value."""
        self.styling_instructions = styling_instructions
        self.available_agents = available_agents
        self.chat_manager = ChatManager(db_url='sqlite:///chat_database.db')
        
        self.initialize_default_dataset()
    
    def initialize_default_dataset(self):
        """Initialize the default dataset and store it"""
        try:
            self._default_df = pd.read_csv("Housing.csv")
            data_dict = make_data(self._default_df, self._dataset_description)
            self._default_retrievers = self.initialize_retrievers(self.styling_instructions, [str(data_dict)])
            self._default_ai_system = auto_analyst(agents=list(self.available_agents.values()), 
                                                  retrievers=self._default_retrievers)
        except Exception as e:
            logger.log_message(f"Error initializing default dataset: {str(e)}", level=logging.ERROR)
            raise e
    
    def initialize_retrievers(self, styling_instructions: List[str], doc: List[str]):
        """
        Initialize retrievers for styling and data
        
        Args:
            styling_instructions: List of styling instructions
            doc: List of document strings
            
        Returns:
            Dictionary containing style_index and dataframe_index
        """
        try:
            style_index = VectorStoreIndex.from_documents([Document(text=x) for x in styling_instructions])
            data_index = VectorStoreIndex.from_documents([Document(text=x) for x in doc])
            return {"style_index": style_index, "dataframe_index": data_index}
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
        if session_id not in self._sessions:
            # Check if we need to create a brand new session
            logger.log_message(f"Creating new session state for session_id: {session_id}", level=logging.INFO)
            
            # Initialize with default state
            self._sessions[session_id] = {
                "current_df": self._default_df.copy() if self._default_df is not None else None,
                "retrievers": self._default_retrievers,
                "ai_system": self._default_ai_system,
                "make_data": self._make_data,
                "description": self._dataset_description,
                "name": self._default_name,
                "creation_time": time.time()
            }
        else:
            # Verify dataset integrity in existing session
            session = self._sessions[session_id]
            
            # If dataset is somehow missing, restore it
            if "current_df" not in session or session["current_df"] is None:
                logger.log_message(f"Restoring missing dataset for session {session_id}", level=logging.WARNING)
                session["current_df"] = self._default_df.copy() if self._default_df is not None else None
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
            del self._sessions[session_id]


    def update_session_dataset(self, session_id: str, df, name: str, desc: str):
        """
        Update dataset for a specific session

        Args:
            session_id: The session identifier
            df: Pandas DataFrame containing the dataset
            name: Name of the dataset
            desc: Description of the dataset
        """
        try:
            data_dict = make_data(df, desc)
            retrievers = self.initialize_retrievers(self.styling_instructions, [str(data_dict)])
            ai_system = auto_analyst(agents=list(self.available_agents.values()), retrievers=retrievers)
            
            # Create a completely fresh session state for the new dataset
            # This ensures no remnants of the previous dataset remain
            session_state = {
                "current_df": df,
                "retrievers": retrievers,
                "ai_system": ai_system,
                "make_data": data_dict,
                "description": desc,
                "name": name
            }
            
            # Preserve user_id and chat_id if they exist in the current session
            if session_id in self._sessions:
                if "user_id" in self._sessions[session_id]:
                    session_state["user_id"] = self._sessions[session_id]["user_id"]
                if "chat_id" in self._sessions[session_id]:
                    session_state["chat_id"] = self._sessions[session_id]["chat_id"]
            
            # Replace the entire session with the new state
            self._sessions[session_id] = session_state
            
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
            # Clear any custom data associated with the session first
            if session_id in self._sessions:
                del self._sessions[session_id]
                logger.log_message(f"Cleared existing state for session {session_id} before reset.", level=logging.INFO)

            # Initialize with default state
            self._sessions[session_id] = {
                "current_df": self._default_df.copy(), # Use a copy
                "retrievers": self._default_retrievers,
                "ai_system": self._default_ai_system,
                "description": self._dataset_description,
                "name": self._default_name, # Explicitly set the default name
                "make_data": None # Clear any custom make_data
            }
            logger.log_message(f"Reset session {session_id} to default dataset: {self._default_name}", level=logging.INFO)
        except Exception as e:
            logger.log_message(f"Error resetting session {session_id}: {str(e)}", level=logging.ERROR)
            raise e


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
    
    # Only create a guest user if no authenticated user is found
    try:
        # Create a guest user for this session
        guest_username = f"guest_{session_id[:8]}"
        guest_email = f"{guest_username}@example.com"
        
        # Create the user
        user = create_user(username=guest_username, email=guest_email)
        user_id = user.user_id
        
        logger.log_message(f"Created guest user {user_id} for session {session_id}", level=logging.INFO)
        
        # Associate the user with this session
        session_manager.set_session_user(
            session_id=session_id,
            user_id=user_id
        )
    except Exception as e:
        logger.log_message(f"Error auto-creating user for session {session_id}: {str(e)}", level=logging.ERROR)
    
    return session_id
