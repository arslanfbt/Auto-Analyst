import groq
from fastapi import FastAPI, HTTPException, File, UploadFile, Request, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os
from typing import List
import uvicorn
import logging
from io import StringIO
import uuid
from fastapi.security import APIKeyHeader

from fastapi import Form, UploadFile
import io
# Import custom modules and models
from agents import *
from retrievers import *
from llama_index.core import Document
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import VectorStoreIndex
from format_response import format_response_to_markdown, execute_code_from_markdown
import json
import asyncio

from dotenv import load_dotenv

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
    "model": "gpt-4o-mini",
    "api_key": os.getenv("OPENAI_API_KEY"),
    "temperature": 0,
    "max_tokens": 1000
}

# Initialize DSPy with default model
if DEFAULT_MODEL_CONFIG["provider"].lower() == "groq":
    default_lm = dspy.GROQ(
        model=DEFAULT_MODEL_CONFIG["model"],
        api_key=DEFAULT_MODEL_CONFIG["api_key"],
        temperature=0,
        max_tokens=1000
    )
else:
    default_lm = dspy.LM(
        model=DEFAULT_MODEL_CONFIG["model"],
        api_key=DEFAULT_MODEL_CONFIG["api_key"],
        temperature=0,
        max_tokens=1000
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

# Helper function to get session ID
async def get_session_id(session_id: str = Depends(X_SESSION_ID)):
    if not session_id:
        # Generate a random session ID if none provided
        session_id = str(uuid.uuid4())
    return session_id

# Update the AppState class to handle session-specific state
class AppState:
    def __init__(self):
        self._sessions = {}  # Store session-specific states
        self._default_df = None
        self._default_retrievers = None
        self._default_ai_system = None
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
    session_id: str = Depends(get_session_id)
):
    session_state = app.state.get_session_state(session_id)
    
    if session_state["current_df"] is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset is currently loaded. Please link a dataset before proceeding with your analysis."
        )
    
    if agent_name not in AVAILABLE_AGENTS:
        available = list(AVAILABLE_AGENTS.keys())
        raise HTTPException(
            status_code=404, 
            detail=f"Agent '{agent_name}' not found. Available agents: {available}"
        )
    
    try:
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
        
        return {
            "agent_name": agent_name,
            "query": request.query,
            "response": formatted_response,
            "session_id": session_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/chat", response_model=dict)
async def chat_with_all(
    request: QueryRequest,
    session_id: str = Depends(get_session_id)
):
    session_state = app.state.get_session_state(session_id)
    
    if session_state["current_df"] is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset is currently loaded."
        )
    
    if session_state["ai_system"] is None:
        raise HTTPException(
            status_code=500,
            detail="AI system not properly initialized."
        )
    
    # Update the generate_responses function to use session state
    async def generate_responses():
        try:
            loop = asyncio.get_event_loop()
            plan_response = await loop.run_in_executor(
                None,
                session_state["ai_system"].get_plan,
                request.query
            )
            
            async for agent_name, response in session_state["ai_system"].execute_plan(request.query, plan_response):
                try:
                    formatted_response = format_response_to_markdown(
                        {agent_name: response}, 
                        dataframe=session_state["current_df"]
                    )
                    
                    # Ensure response is not None or empty
                    if formatted_response:
                        response_data = {
                            "agent": agent_name, 
                            "content": formatted_response,
                            "status": "success"
                        }
                    else:
                        response_data = {
                            "agent": agent_name,
                            "content": "No response generated",
                            "status": "error"
                        }
                    
                    yield json.dumps(response_data) + "\n"
                except Exception as format_error:
                    logger.error(f"Error formatting response for {agent_name}: {str(format_error)}")
                    yield json.dumps({
                        "agent": agent_name,
                        "content": f"Error formatting response: {str(format_error)}",
                        "status": "error"
                    }) + "\n"

        except Exception as e:
            logger.error(f"Error in generate_responses: {str(e)}")
            yield json.dumps({
                "agent": "system",
                "content": f"Error: {str(e)}",
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
            'X-Accel-Buffering': 'no'  # Disable buffering for nginx
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
async def update_model_settings(settings: ModelSettings):
    try:
        # If no API key provided, use default
        if not settings.api_key:
            if settings.provider.lower() == "groq":
                settings.api_key = os.getenv("GROQ_API_KEY")
            elif settings.provider.lower() == "openai":
                settings.api_key = os.getenv("OPENAI_API_KEY")
            elif settings.provider.lower() == "anthropic":
                settings.api_key = os.getenv("ANTHROPIC_API_KEY")
        
        # # Store custom API key if provided
        # if settings.api_key and settings.api_key != os.getenv(f"{settings.provider}_API_KEY"):
        #     os.environ["CUSTOM_API_KEY"] = settings.api_key
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
        else:
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
                    detail=f"Invalid model selection: {settings.model}. Please check if you have access to this model."
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
async def reset_session(session_id: str = Depends(get_session_id)):
    """Reset session to use default dataset"""
    try:
        app.state.reset_session_to_default(session_id)
        # Return the default dataset info to confirm reset
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
