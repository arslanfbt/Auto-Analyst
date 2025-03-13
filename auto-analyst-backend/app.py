import asyncio
import groq
import json
import logging
import os
import time
import uuid
from io import StringIO
from typing import List, Optional

import pandas as pd
import uvicorn
from dotenv import load_dotenv
from fastapi import (Depends, FastAPI, File, Form, HTTPException, Request, 
                    UploadFile)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from llama_index.core import Document, VectorStoreIndex
from scripts.format_response import execute_code_from_markdown, format_response_to_markdown
from src.agents.agents import *
from src.managers.ai_manager import AI_Manager
from src.managers.user_manager import create_user, get_current_user, User
from src.agents.retrievers.retrievers import *
from src.routes.analytics_routes import router as analytics_router
from src.routes.chat_routes import router as chat_router
from src.routes.code_routes import router as code_router
from src.utils.logger import Logger
from src.managers.session_manager import SessionManager, get_session_id

logger = Logger("app", see_time=True, console_log=True)
load_dotenv()

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
        logger.log_message(f"Error initializing retrievers: {str(e)}", level=logging.ERROR)
        raise e

# clear console
def clear_console():
    os.system('cls' if os.name == 'nt' else 'clear')


# Check for Housing.csv
housing_csv_path = "Housing.csv"
if not os.path.exists(housing_csv_path):
    logger.log_message(f"Housing.csv not found at {os.path.abspath(housing_csv_path)}", level=logging.ERROR)
    raise FileNotFoundError(f"Housing.csv not found at {os.path.abspath(housing_csv_path)}")

AVAILABLE_AGENTS = {
    "data_viz_agent": data_viz_agent,
    "sk_learn_agent": sk_learn_agent,
    "statistical_analytics_agent": statistical_analytics_agent,
    "preprocessing_agent": preprocessing_agent,
}

# Add session header
X_SESSION_ID = APIKeyHeader(name="X-Session-ID", auto_error=False)

# Update AppState class to use SessionManager
class AppState:
    def __init__(self):
        self._session_manager = SessionManager(styling_instructions, AVAILABLE_AGENTS)
        self.model_config = DEFAULT_MODEL_CONFIG
        self.ai_manager = AI_Manager()
    
    def get_session_state(self, session_id: str):
        """Get or create session-specific state using the SessionManager"""
        return self._session_manager.get_session_state(session_id)

    def clear_session_state(self, session_id: str):
        """Clear session-specific state using the SessionManager"""
        self._session_manager.clear_session_state(session_id)

    def update_session_dataset(self, session_id: str, df, desc):
        """Update dataset for a specific session using the SessionManager"""
        self._session_manager.update_session_dataset(session_id, df, desc)

    def reset_session_to_default(self, session_id: str):
        """Reset a session to use the default dataset using the SessionManager"""
        self._session_manager.reset_session_to_default(session_id)
    
    def set_session_user(self, session_id: str, user_id: int, chat_id: int = None):
        """Associate a user with a session using the SessionManager"""
        return self._session_manager.set_session_user(session_id, user_id, chat_id)
    
    def get_ai_manager(self):
        """Get the AI Manager instance"""
        return self.ai_manager
    
    def get_provider_for_model(self, model_name):
        return self.ai_manager.get_provider_for_model(model_name)
    
    def calculate_cost(self, model_name, input_tokens, output_tokens):
        return self.ai_manager.calculate_cost(model_name, input_tokens, output_tokens)
    
    def save_usage_to_db(self, user_id, chat_id, model_name, provider, prompt_tokens, completion_tokens, total_tokens, query_size, response_size, cost, request_time_ms, is_streaming=False):
        return self.ai_manager.save_usage_to_db(user_id, chat_id, model_name, provider, prompt_tokens, completion_tokens, total_tokens, query_size, response_size, round(cost, 7), request_time_ms, is_streaming)
    
    def get_tokenizer(self):
        return self.ai_manager.tokenizer

# Initialize FastAPI app with state
app = FastAPI(title="AI Analytics API", version="1.0")
app.state = AppState()

# Update session dependency for FastAPI
async def get_session_id_dependency(request: Request):
    """Dependency to get session ID, wrapped for FastAPI"""
    return await get_session_id(request, app.state._session_manager)

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
    session_id: str = Depends(get_session_id_dependency)
):
    try:
        contents = await file.read()
        new_df = pd.read_csv(io.BytesIO(contents))
        desc = f"{name} Dataset: {description}"
        
        app.state.update_session_dataset(session_id, new_df, desc)
        
        return {"message": "Dataframe uploaded successfully", "session_id": session_id}
    except Exception as e:
        logger.log_message(f"Error in upload_dataframe: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/chat/{agent_name}", response_model=dict)
async def chat_with_agent(
    agent_name: str, 
    request: QueryRequest,
    request_obj: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    session_state = app.state.get_session_state(session_id)
    
    # Check for chat_id in query parameters
    chat_id_param = None
    if "chat_id" in request_obj.query_params:
        try:
            chat_id_param = int(request_obj.query_params.get("chat_id"))
            logger.log_message(f"Using provided chat_id {chat_id_param} from request", level=logging.INFO)
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
            logger.log_message(f"Updated session state with user_id {user_id} from request", level=logging.INFO)
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
            
        
        return {
            "agent_name": agent_name,
            "query": request.query,
            "response": formatted_response,
            "session_id": session_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Unexpected error: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    
@app.post("/chat", response_model=dict)
async def chat_with_all(
    request: QueryRequest,
    request_obj: Request,
    session_id: str = Depends(get_session_id_dependency)
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
        total_inputs = ""

        try:
            loop = asyncio.get_event_loop()
            plan_response = await loop.run_in_executor(
                None,
                session_state["ai_system"].get_plan,
                request.query
            )

            async for agent_name, inputs, response in session_state["ai_system"].execute_plan(request.query, plan_response):
                formatted_response = format_response_to_markdown(
                    {agent_name: response}, 
                    dataframe=session_state["current_df"]
                ) or "No response generated"

                if agent_name != "code_combiner_agent":
                    total_response += str(response) if response else ""
                    total_inputs += str(inputs) if inputs else ""

                yield json.dumps({
                    "agent": agent_name,
                    "content": formatted_response,
                    "status": "success" if response else "error"
                }) + "\n"

            if session_state.get("user_id"):
                overall_processing_time_ms = int((time.time() - overall_start_time) * 1000)
                prompt_size = len(request.query)

                # Track the code combiner agent response
                if "refined_complete_code" in response:
                    model_name = "claude-3-5-sonnet-latest"
                    provider = app.state.ai_manager.get_provider_for_model(model_name)
                    input_tokens = len(app.state.ai_manager.tokenizer.encode(str(inputs)))
                    completion_tokens = len(app.state.ai_manager.tokenizer.encode(str(response)))
                    code_combiner_cost = app.state.ai_manager.calculate_cost(model_name, input_tokens, completion_tokens)

                    app.state.ai_manager.save_usage_to_db(
                        user_id=session_state.get("user_id"),
                        chat_id=session_state.get("chat_id"),
                        model_name=model_name,
                        provider=provider,
                        prompt_tokens=int(input_tokens),
                        completion_tokens=int(completion_tokens),
                        total_tokens=int(input_tokens + completion_tokens),
                        query_size=prompt_size,
                        response_size=len(total_response),
                        cost=round(code_combiner_cost, 7),
                        request_time_ms=overall_processing_time_ms,
                        is_streaming=True
                    )

                model_name = app.state.model_config.get("model", "gpt-4o-mini")
                provider = app.state.ai_manager.get_provider_for_model(model_name)
                prompt_tokens = len(app.state.ai_manager.tokenizer.encode(total_inputs)) 
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
            logger.log_message(f"Error in generate_responses: {str(e)}", level=logging.ERROR)
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
    session_id: str = Depends(get_session_id_dependency)
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
        "message": "Explore our API for advanced analytics and visualization tools designed to empower your data-driven decisions.",
        "description": "Utilize our powerful agents and models to gain insights from your data effortlessly.",
        "colors": {
            "primary": "#007bff",
            "secondary": "#6c757d",
            "success": "#28a745",
            "danger": "#dc3545",
        },
        "features": [
            "Real-time data processing",
            "Customizable visualizations",
            "Seamless integration with various data sources",
            "User-friendly interface for easy navigation",
            "Custom Analytics",
        ],
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
async def get_default_dataset(session_id: str = Depends(get_session_id_dependency)):
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
    session_id: str = Depends(get_session_id_dependency),
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
app.include_router(code_router)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)