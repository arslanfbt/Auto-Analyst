import groq
from fastapi import FastAPI, HTTPException, File, UploadFile, Request, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os
from typing import List, Optional
import uvicorn
import logging
from io import StringIO
import uuid
from fastapi.security import APIKeyHeader

from fastapi import Form, UploadFile
import io
# Import custom modules and models
from src.agents.agents import *
from src.retrievers import *
from llama_index.core import Document
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import VectorStoreIndex
from scripts.format_response import format_response_to_markdown, execute_code_from_markdown
import json
import asyncio


from dotenv import load_dotenv
from src.routes.chat_routes import router as chat_router
from src.routes.analytics_routes import router as analytics_router
import time
from src.managers.ai_manager import AI_Manager
from src.managers.user_manager import get_current_user, User, create_user

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add styling_instructions at the top level
styling_instructions = [
    "Create clear and informative visualizations",
    "Use appropriate color schemes",
    "Include descriptive titles and labels",
    "Make sure axes are properly labeled",
    "Add legends where necessary"
]

# Add near the top of the file, after imports
DEFAULT_MODEL_CONFIG = {
    "provider": "openai",
    "model": "o1-mini",
    "api_key": os.getenv("OPENAI_API_KEY"),
    "temperature": 1.0,
    "max_tokens": 6000
}

# Initialize DSPy with default model
if DEFAULT_MODEL_CONFIG["provider"].lower() == "groq":
    default_lm = dspy.GROQ(
        model=DEFAULT_MODEL_CONFIG["model"],
        api_key=DEFAULT_MODEL_CONFIG["api_key"],
        temperature=DEFAULT_MODEL_CONFIG["temperature"],
        max_tokens=DEFAULT_MODEL_CONFIG["max_tokens"]
    )
else:
    default_lm = dspy.LM(
        model=DEFAULT_MODEL_CONFIG["model"],
        api_key=DEFAULT_MODEL_CONFIG["api_key"],
        temperature=DEFAULT_MODEL_CONFIG["temperature"],
        max_tokens=DEFAULT_MODEL_CONFIG["max_tokens"]
    )

dspy.configure(lm=default_lm)

# Initialize retrievers with empty data first
def initialize_retrievers(styling_instructions: List[str], doc: List[str]):
    try:
        style_index = VectorStoreIndex.from_documents([Document(text=x) for x in styling_instructions])
        data_index = VectorStoreIndex.from_documents([Document(text=x) for x in doc])
        return {"style_index": style_index, "dataframe_index": data_index}
    except Exception as e:
        logger.error(f"Error initializing retrievers: {str(e)}")
        raise e

# clear console
def clear_console():
    os.system('cls' if os.name == 'nt' else 'clear')


# Check for Housing.csv
housing_csv_path = "Housing.csv"
if not os.path.exists(housing_csv_path):
    logger.error(f"Housing.csv not found at {os.path.abspath(housing_csv_path)}")
    raise FileNotFoundError(f"Housing.csv not found at {os.path.abspath(housing_csv_path)}")

AVAILABLE_AGENTS = {
    "data_viz_agent": data_viz_agent,
    "sk_learn_agent": sk_learn_agent,
    "statistical_analytics_agent": statistical_analytics_agent,
    "preprocessing_agent": preprocessing_agent,
}

# Add session header
X_SESSION_ID = APIKeyHeader(name="X-Session-ID", auto_error=False)

# Update the get_session_id dependency to include user creation
async def get_session_id(request: Request):
    """Get the session ID from the request, create/associate a user if needed"""
    # First try to get from query params
    session_id = request.query_params.get("session_id")
    
    # If not in query params, try to get from headers
    if not session_id:
        session_id = request.headers.get("X-Session-ID")
    
    # If still not found, generate a new one
    if not session_id:
        session_id = str(uuid.uuid4())
        logger.info(f"Generated new session ID: {session_id}")
    
    # Get or create the session state
    session_state = app.state.get_session_state(session_id)
    
    # Check if a user_id was provided in the request
    user_id_param = request.query_params.get("user_id")
    if user_id_param:
        try:
            user_id = int(user_id_param)
            # Store in session state if not already there
            if session_state.get("user_id") != user_id:
                app.state.set_session_user(session_id=session_id, user_id=user_id)
                # logger.info(f"Associated session {session_id} with provided user_id {user_id}")
            return session_id
        except (ValueError, TypeError):
            logger.warning(f"Invalid user_id in query params: {user_id_param}")
    
    # ONLY create a guest user if no user is associated AND no user_id was provided
    # This prevents creating unnecessary guest users
    if session_state.get("user_id") is None and not user_id_param:
        try:
            # Create a guest user for this session
            guest_username = f"guest_{session_id[:8]}"
            guest_email = f"{guest_username}@example.com"
            
            # Create the user
            user = create_user(username=guest_username, email=guest_email)
            user_id = user.user_id
            
            # Associate the user with this session
            app.state.set_session_user(
                session_id=session_id,
                user_id=user_id
            )
            
            # logger.info(f"Auto-created guest user {user_id} for session {session_id}")
        except Exception as e:
            logger.error(f"Error auto-creating user for session {session_id}: {str(e)}")
    
    return session_id

# Update the AppState class to handle session-specific state
class AppState:
    def __init__(self):
        self._sessions = {}  # Store session-specific states
        self._default_df = None
        self._default_retrievers = None
        self._default_ai_system = None
        self.model_config = DEFAULT_MODEL_CONFIG
        if not hasattr(app, "state"):
            app.state = type("AppState", (), {})()
        self.ai_manager = AI_Manager()

        if not hasattr(self, "model_config"):
            self.model_config = DEFAULT_MODEL_CONFIG

        self.initialize_default_dataset()
    
    def initialize_default_dataset(self):
        """Initialize the default dataset and store it"""
        try:
            self._default_df = pd.read_csv("Housing.csv")
            desc = "Housing Dataset"
            data_dict = make_data(self._default_df, desc)
            self._default_retrievers = initialize_retrievers(styling_instructions, [str(data_dict)])
            self._default_ai_system = auto_analyst(agents=list(AVAILABLE_AGENTS.values()), retrievers=self._default_retrievers)
        except Exception as e:
            logger.error(f"Error initializing default dataset: {str(e)}")
            raise e

    def get_session_state(self, session_id: str):
        """Get or create session-specific state"""
        if session_id not in self._sessions:
            # Initialize with default state
            self._sessions[session_id] = {
                "current_df": self._default_df,
                "retrievers": self._default_retrievers,
                "ai_system": self._default_ai_system
            }
        return self._sessions[session_id]

    def clear_session_state(self, session_id: str):
        """Clear session-specific state"""
        if session_id in self._sessions:
            del self._sessions[session_id]

    def update_session_dataset(self, session_id: str, df, desc):
        """Update dataset for a specific session"""
        try:
            data_dict = make_data(df, desc)
            retrievers = initialize_retrievers(styling_instructions, [str(data_dict)])
            ai_system = auto_analyst(agents=list(AVAILABLE_AGENTS.values()), retrievers=retrievers)
            
            self._sessions[session_id] = {
                "current_df": df,
                "retrievers": retrievers,
                "ai_system": ai_system
            }
        except Exception as e:
            logger.error(f"Error updating dataset for session {session_id}: {str(e)}")
            # Revert to default state
            self.clear_session_state(session_id)

    def reset_session_to_default(self, session_id: str):
        """Reset a session to use the default dataset"""
        try:
            # First clear any existing session
            self.clear_session_state(session_id)
            
            # Then initialize with default state
            self._sessions[session_id] = {
                "current_df": self._default_df.copy(),  # Create a copy to ensure isolation
                "retrievers": self._default_retrievers,
                "ai_system": self._default_ai_system
            }
        except Exception as e:
            logger.error(f"Error resetting session {session_id}: {str(e)}")
            raise e
    
    def get_ai_manager(self):
        """Get the AI Manager instance"""
        if not hasattr(self, 'ai_manager'):
            self.ai_manager = AI_Manager()
        return self.ai_manager
    
    def get_provider_for_model(self, model_name):
        return self.ai_manager.get_provider_for_model(model_name)
    
    def calculate_cost(self, model_name, input_tokens, output_tokens):
        return self.ai_manager.calculate_cost(model_name, input_tokens, output_tokens)
    
    def save_usage_to_db(self, user_id, chat_id, model_name, provider, prompt_tokens, completion_tokens, total_tokens, query_size, response_size, cost, request_time_ms, is_streaming=False):
        return self.ai_manager.save_usage_to_db(user_id, chat_id, model_name, provider, prompt_tokens, completion_tokens, total_tokens, query_size, response_size, round(cost, 7), request_time_ms, is_streaming)
    
    def get_tokenizer(self):
        return self.ai_manager.tokenizer
    
    def set_session_user(self, session_id: str, user_id: int, chat_id: int = None):
        """
        Associate a user with a session
        
        Args:
            session_id: The session identifier
            user_id: The authenticated user ID
            chat_id: Optional chat ID for tracking conversation
        """
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
        # logger.info(f"Set session {session_id} with user_id={user_id}, chat_id={chat_id_to_use}")
        
        # Return the updated session data
        return self._sessions[session_id]

# Initialize FastAPI app with state
app = FastAPI(title="AI Analytics API", version="1.0")
app.state = AppState()

# Configure middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Content-Length"]
)

# DSPy Configuration
import dspy
# dspy.configure(lm=dspy.LM(model="gpt-4o-mini", api_key=os.getenv("OPENAI_API_KEY"), temperature=0, max_tokens=3000))

# Available agents
AVAILABLE_AGENTS = {
    "data_viz_agent": data_viz_agent,
    "sk_learn_agent": sk_learn_agent,
    "statistical_analytics_agent": statistical_analytics_agent,
    "preprocessing_agent": preprocessing_agent,
}

# Pydantic models for validation
class QueryRequest(BaseModel):
    query: str

class DataFrameRequest(BaseModel):
    styling_instructions: List[str]
    file: str
    name: str
    description: str

class ModelSettings(BaseModel):
    provider: str
    model: str
    api_key: str = ""
    temperature: float = 0
    max_tokens: int = 1000

class UserLoginRequest(BaseModel):
    username: str
    email: str
    session_id: Optional[str] = None

@app.post("/upload_dataframe")
async def upload_dataframe(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(...),
    session_id: str = Depends(get_session_id)
):
    try:
        contents = await file.read()
        new_df = pd.read_csv(io.BytesIO(contents))
        desc = f"{name} Dataset: {description}"
        
        app.state.update_session_dataset(session_id, new_df, desc)
        
        return {"message": "Dataframe uploaded successfully", "session_id": session_id}
    except Exception as e:
        logger.error(f"Error in upload_dataframe: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/chat/{agent_name}", response_model=dict)
async def chat_with_agent(
    agent_name: str, 
    request: QueryRequest,
    request_obj: Request,
    session_id: str = Depends(get_session_id)
):
    session_state = app.state.get_session_state(session_id)
    
    # Check for chat_id in query parameters
    chat_id_param = None
    if "chat_id" in request_obj.query_params:
        try:
            chat_id_param = int(request_obj.query_params.get("chat_id"))
            # logger.info(f"Using provided chat_id {chat_id_param} from request")
            # Update session state with this chat ID
            session_state["chat_id"] = chat_id_param
        except (ValueError, TypeError):
            # logger.warning(f"Invalid chat_id in query params: {request_obj.query_params.get('chat_id')}")
            pass

    if session_state["current_df"] is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset is currently loaded. Please link a dataset before proceeding with your analysis."
        )

    if "user_id" in request_obj.query_params:
        try:
            user_id = int(request_obj.query_params["user_id"])
            session_state["user_id"] = user_id
            # logger.info(f"Updated session state with user_id {user_id} from request")
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail="Invalid user_id in query params. Please provide a valid integer."
            )
    # For comma-separated agents, verify each agent exists
    if "," in agent_name:
        agent_list = [agent.strip() for agent in agent_name.split(",")]
        for agent in agent_list:
            if agent not in AVAILABLE_AGENTS:
                available = list(AVAILABLE_AGENTS.keys())
                raise HTTPException(
                    status_code=404, 
                    detail=f"Agent '{agent}' not found. Available agents: {available}"
                )
    elif agent_name not in AVAILABLE_AGENTS:
        available = list(AVAILABLE_AGENTS.keys())
        raise HTTPException(
            status_code=404, 
            detail=f"Agent '{agent_name}' not found. Available agents: {available}"
        )
    
    try:
        # Record start time for timing
        start_time = time.time()
        
        # For multiple agents
        if "," in agent_name:
            agent_list = [AVAILABLE_AGENTS[agent.strip()] for agent in agent_name.split(",")]
            agent = auto_analyst_ind(agents=agent_list, retrievers=session_state["retrievers"])
        else:
            # Single agent case
            agent = AVAILABLE_AGENTS[agent_name]
            agent = auto_analyst_ind(agents=[agent], retrievers=session_state["retrievers"])
        
        try:
            response = agent(request.query, agent_name)
        except Exception as agent_error:
            raise HTTPException(
                status_code=500,
                detail=f"Agent execution failed: {str(agent_error)}"
            )
        
        formatted_response = format_response_to_markdown(response, agent_name, session_state["current_df"])
        
        # Track model usage directly with AI Manager
        ai_manager = app.state.get_ai_manager()

        if session_state.get("user_id"):
            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Get prompt and response sizes
            prompt_size = len(request.query)
            response_size = len(str(response))
            
            model_name = app.state.model_config.get("model", "gpt-4o-mini")
            provider = ai_manager.get_provider_for_model(model_name)
                
                # Estimate tokens (actual implementation may vary)
            try:
                prompt_tokens = len(ai_manager.tokenizer.encode(request.query))
                completion_tokens = len(ai_manager.tokenizer.encode(str(response)))
                total_tokens = prompt_tokens + completion_tokens
            except:
                # Fallback estimation
                words = len(request.query.split()) + len(str(response).split())
                total_tokens = words * 1.5  # rough estimate
                prompt_tokens = len(request.query.split()) * 1.5
                completion_tokens = total_tokens - prompt_tokens
            
            cost = ai_manager.calculate_cost(model_name, prompt_tokens, completion_tokens)
            # Save to DB with the proper chat_id
            ai_manager.save_usage_to_db(
                user_id=session_state.get("user_id"),
                chat_id=session_state.get("chat_id"),  # This will now be the one from query params
                model_name=model_name,
                provider=provider,
                prompt_tokens=int(prompt_tokens),
                completion_tokens=int(completion_tokens),
                total_tokens=int(total_tokens),
                query_size=prompt_size,
                response_size=response_size,
                cost=round(cost, 7),
                request_time_ms=processing_time_ms,
                is_streaming=False
            )
            
            # logger.info(f"Tracked model usage: {model_name}, {total_tokens} tokens, ${cost:.6f}")
        
        return {
            "agent_name": agent_name,
            "query": request.query,
            "response": formatted_response,
            "session_id": session_id
        }
    except HTTPException:
        raise
    except Exception as e:
        # logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    
@app.post("/chat", response_model=dict)
async def chat_with_all(
    request: QueryRequest,
    request_obj: Request,
    session_id: str = Depends(get_session_id)
):
    session_state = app.state.get_session_state(session_id)

    # Update session state with user_id and chat_id from request if provided
    for param in ["user_id", "chat_id"]:
        if param in request_obj.query_params:
            try:
                session_state[param] = int(request_obj.query_params[param])
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid {param} in query params. Please provide a valid integer."
                )

    if session_state["current_df"] is None:
        raise HTTPException(status_code=400, detail="No dataset is currently loaded.")
    
    if session_state["ai_system"] is None:
        raise HTTPException(status_code=500, detail="AI system not properly initialized.")

    async def generate_responses():
        overall_start_time = time.time()
        total_response = ""

        try:
            loop = asyncio.get_event_loop()
            plan_response = await loop.run_in_executor(
                None,
                session_state["ai_system"].get_plan,
                request.query
            )

            async for agent_name, response in session_state["ai_system"].execute_plan(request.query, plan_response):
                formatted_response = format_response_to_markdown(
                    {agent_name: response}, 
                    dataframe=session_state["current_df"]
                ) or "No response generated"

                total_response += str(response) if response else ""
                yield json.dumps({
                    "agent": agent_name,
                    "content": formatted_response,
                    "status": "success" if response else "error"
                }) + "\n"

            if session_state.get("user_id"):
                overall_processing_time_ms = int((time.time() - overall_start_time) * 1000)
                prompt_size = len(request.query)

                if "refined_complete_code" in response:
                    model_name = "claude-3-5-sonnet-latest"
                    provider = app.state.ai_manager.get_provider_for_model(model_name)
                    completion_tokens = len(app.state.ai_manager.tokenizer.encode(str(response)))
                    code_combiner_cost = app.state.ai_manager.calculate_cost(model_name, 0, completion_tokens)

                    app.state.ai_manager.save_usage_to_db(
                        user_id=session_state.get("user_id"),
                        chat_id=session_state.get("chat_id"),
                        model_name=model_name,
                        provider=provider,
                        prompt_tokens=0,
                        completion_tokens=int(completion_tokens),
                        total_tokens=int(completion_tokens),
                        query_size=prompt_size,
                        response_size=len(total_response),
                        cost=round(code_combiner_cost, 7),
                        request_time_ms=overall_processing_time_ms,
                        is_streaming=True
                    )
                else:
                    model_name = app.state.model_config.get("model", "gpt-4o-mini")
                    provider = app.state.ai_manager.get_provider_for_model(model_name)
                    prompt_tokens = len(app.state.ai_manager.tokenizer.encode(request.query))
                    completion_tokens = len(app.state.ai_manager.tokenizer.encode(total_response))
                    total_tokens = prompt_tokens + completion_tokens

                    cost = app.state.ai_manager.calculate_cost(model_name, prompt_tokens, completion_tokens)

                    app.state.ai_manager.save_usage_to_db(
                        user_id=session_state.get("user_id"),
                        chat_id=session_state.get("chat_id"),
                        model_name=model_name,
                        provider=provider,
                        prompt_tokens=int(prompt_tokens),
                        completion_tokens=int(completion_tokens),
                        total_tokens=int(total_tokens),
                        query_size=prompt_size,
                        response_size=len(total_response),
                        cost=round(cost, 7),
                        request_time_ms=overall_processing_time_ms,
                        is_streaming=True
                    )

        except Exception as e:
            logger.error(f"Error in generate_responses: {str(e)}")
            yield json.dumps({
                "agent": "planner",
                "content": f"Error: An error occurred while generating responses. Please try again! {str(e)}",
                "status": "error"
            }) + "\n"

    return StreamingResponse(
        generate_responses(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'X-Accel-Buffering': 'no'
        }
    )

@app.post("/execute_code")
async def execute_code(
    request: dict,
    session_id: str = Depends(get_session_id)
):
    session_state = app.state.get_session_state(session_id)
    
    if session_state["current_df"] is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset is currently loaded. Please link a dataset before executing code."
        )
        
    try:
        code = request.get("code")
        if not code:
            raise HTTPException(status_code=400, detail="No code provided")
        output, json_outputs = execute_code_from_markdown(code, session_state["current_df"])
        json_outputs = [f"```plotly\n{json_output}\n```\n" for json_output in json_outputs]
        return {
            "output": output,
            "plotly_outputs": json_outputs if json_outputs else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/model-settings")
async def get_model_settings():
    """Get current model settings"""
    return {
        "provider": DEFAULT_MODEL_CONFIG["provider"],
        "model": DEFAULT_MODEL_CONFIG["model"],
        "hasCustomKey": bool(os.getenv("CUSTOM_API_KEY")),
        "temperature": DEFAULT_MODEL_CONFIG["temperature"],
        "maxTokens": DEFAULT_MODEL_CONFIG["max_tokens"]
    }

@app.post("/settings/model")
async def update_model_settings(
    settings: ModelSettings,
    session_id: str = Depends(get_session_id)
):
    try:
        # If no API key provided, use default
        if not settings.api_key:
            if settings.provider.lower() == "groq":
                settings.api_key = os.getenv("GROQ_API_KEY")
            elif settings.provider.lower() == "openai":
                settings.api_key = os.getenv("OPENAI_API_KEY")
            elif settings.provider.lower() == "anthropic":
                settings.api_key = os.getenv("ANTHROPIC_API_KEY")
        
        # update session state
        session_state = app.state.get_session_state(session_id)
        session_state["model_config"] = {
            "provider": settings.provider,
            "model": settings.model,
            "api_key": settings.api_key,
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens
        }

        # Update app state model config too, for tracking in streaming chat
        app.state.model_config = {
            "provider": settings.provider,
            "model": settings.model,
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens
        }

        print("settings.api_key: ", settings.api_key)
        print("settings.model: ", settings.model)
        print("settings.temperature: ", settings.temperature)
        print("settings.max_tokens: ", settings.max_tokens)
        print("settings.provider: ", settings.provider)

        # Configure model with temperature and max_tokens
        if settings.provider.lower() == "groq":
            lm = dspy.GROQ(
                model=settings.model,
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )
        elif settings.provider.lower() == "anthropic":
            lm = dspy.LM(
                model=settings.model,
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )
        else:  # OpenAI is the default
            lm = dspy.LM(
                model=settings.model,
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )

        # Test the model configuration
        try:
            lm("Hello, are you working?")
            dspy.configure(lm=lm)
            return {"message": "Model settings updated successfully"}
        except Exception as model_error:
            if "auth" in str(model_error).lower() or "api" in str(model_error).lower():
                raise HTTPException(
                    status_code=401,
                    detail=f"Invalid API key for {settings.model}. Please check your API key and try again."
                )
            elif "model" in str(model_error).lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid model selection: {settings.model}. Please check if you have access to this model. {model_error}"
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error configuring model: {str(model_error)}"
                )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}. Please check your model selection and API key."
        )

# Add an endpoint to list available agents
@app.get("/agents", response_model=dict)
async def list_agents():
    return {
        "available_agents": list(AVAILABLE_AGENTS.keys()),
        "description": "List of available specialized agents that can be called using @agent_name"
    }

@app.get("/health", response_model=dict)
async def health():
    return {"message": "API is healthy and running"}

@app.get("/")
async def index():
    return {
        "title": "Welcome to the AI Analytics API",
        "message": "This API provides advanced analytics and visualization tools.",
        "colors": {
            "primary": "#007bff",
            "secondary": "#6c757d",
            "success": "#28a745",
            "danger": "#dc3545",
        },
    }

@app.post("/api/preview-csv")
async def preview_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    try:
        # Read CSV content
        df = pd.read_csv(StringIO(content.decode('utf-8')))
        
        # Replace NaN values with None (which becomes null in JSON)
        df = df.where(pd.notna(df), None)
        
        # Get first 10 rows and convert to dict
        preview_data = {
            "headers": df.columns.tolist(),
            "rows": df.head(10).values.tolist()
        }
        return preview_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/chat_history_name")
async def chat_history_name(request: dict):
    query = request.get("query")
    name = dspy.ChainOfThought(chat_history_name_agent)(query=query)
    return {"name": name.name}

@app.get("/api/default-dataset")
async def get_default_dataset(session_id: str = Depends(get_session_id)):
    """Get default dataset and ensure session is using it"""
    try:
        # First ensure the session is reset to default
        app.state.reset_session_to_default(session_id)
        
        # Get the session state to ensure we're using the default dataset
        session_state = app.state.get_session_state(session_id)
        df = session_state["current_df"]
        
        # Replace NaN values with None (which becomes null in JSON)
        df = df.where(pd.notna(df), None)
        
        preview_data = {
            "headers": df.columns.tolist(),
            "rows": df.head(10).values.tolist(),
            "name": "Housing Dataset",
            "description": "A comprehensive dataset containing housing information including price, area, bedrooms, and other relevant features."
        }
        return preview_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/reset-session")
async def reset_session(
    session_id: str = Depends(get_session_id),
    name: str = None,
    description: str = None
):
    """Reset session to use default dataset with optional new description"""
    try:
        app.state.reset_session_to_default(session_id)
        
        # If name and description are provided, update the dataset description
        if name and description:
            session_state = app.state.get_session_state(session_id)
            desc = f"{name} Dataset: {description}"
            data_dict = make_data(session_state["current_df"], desc)
            session_state["retrievers"] = initialize_retrievers(styling_instructions, [str(data_dict)])
            session_state["ai_system"] = auto_analyst(agents=list(AVAILABLE_AGENTS.values()), retrievers=session_state["retrievers"])
        
        return {
            "message": "Session reset to default dataset",
            "session_id": session_id,
            "dataset": "Housing.csv"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset session: {str(e)}"
        )

# Add this line where other routers are included
app.include_router(chat_router)
app.include_router(analytics_router)

def ensure_user_metadata(session_id: str, session_state: dict, request: Request = None) -> tuple:
    """Ensure a session has user_id and chat_id, creating if necessary"""
    # First check if user_id was provided as a query parameter
    user_id = None
    if request:
        user_id = request.query_params.get("user_id")
        if user_id:
            try:
                user_id = int(user_id)
                # Update session state with this user ID
                session_state["user_id"] = user_id
                # logger.info(f"Using provided user_id {user_id} from request parameters")
            except (ValueError, TypeError):
                logger.warning(f"Invalid user_id provided in query params: {user_id}")
                pass
                user_id = None
    
    # If no valid user_id from request, check session state
    if not user_id:
        user_id = session_state.get('user_id')
        
    # If still no user_id, create a guest user
    if not user_id:
        # Create a guest user
        guest_username = f"guest_{session_id[:8]}"
        guest_email = f"{guest_username}@example.com"
        
        try:
            user = create_user(username=guest_username, email=guest_email)
            user_id = user.user_id
            # Update session state
            app.state.set_session_user(session_id=session_id, user_id=user_id)
            logger.info(f"Created guest user {user_id} for session {session_id}")
        except Exception as e:
            logger.error(f"Failed to create guest user: {str(e)}")
            user_id = 1  # Fallback
    
    # Get chat_id, create if missing
    chat_id = session_state.get('chat_id')
    if not chat_id:
        import random
        chat_id = int(time.time() * 1000) % 1000000 + random.randint(1, 999)
        session_state["chat_id"] = chat_id
        logger.info(f"Created chat_id {chat_id} for session {session_id}")
    
    return user_id, chat_id

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)