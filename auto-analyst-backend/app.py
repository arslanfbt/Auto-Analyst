# Standard library imports
import asyncio
import json
import logging
import os
import time
import uuid
from io import StringIO
from typing import List, Optional
import ast
import markdown
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime, UTC
# Third-party imports
import uvicorn
from dotenv import load_dotenv
from fastapi import (
    Depends, 
    FastAPI, 
    File, 
    Form, 
    HTTPException, 
    Request, 
    UploadFile
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import APIKeyHeader
from llama_index.core import Document, VectorStoreIndex
from pydantic import BaseModel

# Local application imports
from scripts.format_response import format_response_to_markdown
from src.agents.agents import *
from src.agents.retrievers.retrievers import *
from src.managers.ai_manager import AI_Manager
from src.managers.session_manager import SessionManager
from src.routes.analytics_routes import router as analytics_router
from src.routes.chat_routes import router as chat_router
from src.routes.code_routes import router as code_router
from src.routes.feedback_routes import router as feedback_router
from src.routes.session_routes import router as session_router, get_session_id_dependency
from src.routes.deep_analysis_routes import router as deep_analysis_router
from src.schemas.query_schemas import QueryRequest
from src.utils.logger import Logger

# Import deep analysis components directly
# from src.agents.try_deep_agents import deep_analysis_module
from src.agents.deep_agents import deep_analysis_module
from src.utils.generate_report import generate_html_report
logger = Logger("app", see_time=True, console_log=False)
load_dotenv()

# Request models
class DeepAnalysisRequest(BaseModel):
    goal: str
    
class DeepAnalysisResponse(BaseModel):
    goal: str
    deep_questions: str
    deep_plan: str
    summaries: List[str]
    code: str
    plotly_figs: List
    synthesis: List[str]
    final_conclusion: str
    html_report: Optional[str] = None

styling_instructions = [
    """
        Dont ignore any of these instructions.
        For a line chart always use plotly_white template, reduce x axes & y axes line to 0.2 & x & y grid width to 1. 
        Always give a title and make bold using html tag axis label and try to use multiple colors if more than one line
        Annotate the min and max of the line
        Display numbers in thousand(K) or Million(M) if larger than 1000/100000 
        Show percentages in 2 decimal points with '%' sign
        Default size of chart should be height =1200 and width =1000
        
        """
        
   , """
        Dont ignore any of these instructions.
        For a bar chart always use plotly_white template, reduce x axes & y axes line to 0.2 & x & y grid width to 1. 
        Always give a title and make bold using html tag axis label 
        Always display numbers in thousand(K) or Million(M) if larger than 1000/100000. 
        Annotate the values of the bar chart
        If variable is a percentage show in 2 decimal points with '%' sign.
        Default size of chart should be height =1200 and width =1000
        """
        ,

          """
        For a histogram chart choose a bin_size of 50
        Do not ignore any of these instructions
        always use plotly_white template, reduce x & y axes line to 0.2 & x & y grid width to 1. 
        Always give a title and make bold using html tag axis label 
        Always display numbers in thousand(K) or Million(M) if larger than 1000/100000. Add annotations x values
        If variable is a percentage show in 2 decimal points with '%'
        Default size of chart should be height =1200 and width =1000
        """,


          """
        For a pie chart only show top 10 categories, bundle rest as others
        Do not ignore any of these instructions
        always use plotly_white template, reduce x & y axes line to 0.2 & x & y grid width to 1. 
        Always give a title and make bold using html tag axis label 
        Always display numbers in thousand(K) or Million(M) if larger than 1000/100000. Add annotations x values
        If variable is a percentage show in 2 decimal points with '%'
        Default size of chart should be height =1200 and width =1000
        """,

          """
        Do not ignore any of these instructions
        always use plotly_white template, reduce x & y axes line to 0.2 & x & y grid width to 1. 
        Always give a title and make bold using html tag axis label 
        Always display numbers in thousand(K) or Million(M) if larger than 1000/100000. Add annotations x values
        Don't add K/M if number already in , or value is not a number
        If variable is a percentage show in 2 decimal points with '%'
        Default size of chart should be height =1200 and width =1000
        """,
"""
    For a heat map
    Use the 'plotly_white' template for a clean, white background. 
    Set a chart title 
    Style the X-axis with a black line color, 0.2 line width, 1 grid width, format 1000/1000000 as K/M
    Do not format non-numerical numbers 
    .style the Y-axis with a black line color, 0.2 line width, 1 grid width format 1000/1000000 as K/M
    Do not format non-numerical numbers 

    . Set the figure dimensions to a height of 1200 pixels and a width of 1000 pixels.
""",
"""
    For a Histogram, used for returns/distribution plotting
    Use the 'plotly_white' template for a clean, white background. 
    Set a chart title 
    Style the X-axis  1 grid width, format 1000/1000000 as K/M
    Do not format non-numerical numbers 
    .style the Y-axis, 1 grid width format 1000/1000000 as K/M
    Do not format non-numerical numbers 
    
    Use an opacity of 0.75

     Set the figure dimensions to a height of 1200 pixels and a width of 1000 pixels.
"""
]

# Add near the top of the file, after imports
DEFAULT_MODEL_CONFIG = {
    "provider": os.getenv("MODEL_PROVIDER", "openai"),
    "model": os.getenv("MODEL_NAME", "gpt-4o-mini"),
    "api_key": os.getenv("OPENAI_API_KEY"),
    "temperature": float(os.getenv("TEMPERATURE", 1.0)),
    "max_tokens": int(os.getenv("MAX_TOKENS", 6000))
}

# Create default LM config but don't set it globally
if DEFAULT_MODEL_CONFIG["provider"].lower() == "groq":
    default_lm = dspy.LM(
        model=f"groq/{DEFAULT_MODEL_CONFIG["model"]}",
        api_key=DEFAULT_MODEL_CONFIG["api_key"],
        temperature=DEFAULT_MODEL_CONFIG["temperature"],
        max_tokens=DEFAULT_MODEL_CONFIG["max_tokens"]
    )
elif DEFAULT_MODEL_CONFIG["provider"].lower() == "gemini":
    default_lm = dspy.LM(
        model=f"gemini/{DEFAULT_MODEL_CONFIG['model']}",
        api_key=DEFAULT_MODEL_CONFIG["api_key"],
        temperature=DEFAULT_MODEL_CONFIG["temperature"],
        max_tokens=DEFAULT_MODEL_CONFIG["max_tokens"]
    )
elif DEFAULT_MODEL_CONFIG["provider"].lower() == "anthropic":
    default_lm = dspy.LM(
        model=f"anthropic/{DEFAULT_MODEL_CONFIG["model"]}",
        api_key=DEFAULT_MODEL_CONFIG["api_key"],
        temperature=DEFAULT_MODEL_CONFIG["temperature"],
        max_tokens=DEFAULT_MODEL_CONFIG["max_tokens"]
    )
else:
    default_lm = dspy.LM(
        model=f"openai/{DEFAULT_MODEL_CONFIG["model"]}",
        api_key=DEFAULT_MODEL_CONFIG["api_key"],
        temperature=DEFAULT_MODEL_CONFIG["temperature"],
        max_tokens=DEFAULT_MODEL_CONFIG["max_tokens"]
    )
    
# lm = dspy.LM('openai/gpt-4o-mini', api_key=os.getenv("OPENAI_API_KEY"))
# dspy.configure(lm=lm)

# Function to get model config from session or use default
def get_session_lm(session_state):
    """Get the appropriate LM instance for a session, or default if not configured"""
    # First check if we have a valid session-specific model config 
    if session_state and isinstance(session_state, dict) and "model_config" in session_state:
        model_config = session_state["model_config"]
        if model_config and isinstance(model_config, dict) and "model" in model_config:
            # Found valid session-specific model config, use it
            provider = model_config.get("provider", "openai").lower()
            if provider == "groq":
                logger.log_message(f"Using groq model: {model_config.get('model', DEFAULT_MODEL_CONFIG['model'])}", level=logging.INFO)
                return dspy.LM(
                    model=f"groq/{model_config.get("model", DEFAULT_MODEL_CONFIG["model"])}",
                    api_key=model_config.get("api_key", DEFAULT_MODEL_CONFIG["api_key"]),
                    temperature=model_config.get("temperature", DEFAULT_MODEL_CONFIG["temperature"]),
                    max_tokens=model_config.get("max_tokens", DEFAULT_MODEL_CONFIG["max_tokens"])
                )
            elif provider == "anthropic":
                logger.log_message(f"Using anthropic model: {model_config.get('model', DEFAULT_MODEL_CONFIG['model'])}", level=logging.INFO)
                return dspy.LM(
                    model=f"anthropic/{model_config.get("model", DEFAULT_MODEL_CONFIG["model"])}",
                    api_key=model_config.get("api_key", DEFAULT_MODEL_CONFIG["api_key"]),
                    temperature=model_config.get("temperature", DEFAULT_MODEL_CONFIG["temperature"]),
                    max_tokens=model_config.get("max_tokens", DEFAULT_MODEL_CONFIG["max_tokens"])
                )
            elif provider == "gemini":
                logger.log_message(f"Using gemini model: {model_config.get('model', DEFAULT_MODEL_CONFIG['model'])}", level=logging.INFO)
                return dspy.LM(
                    model=f"gemini/{model_config.get('model', DEFAULT_MODEL_CONFIG['model'])}",
                    api_key=model_config.get("api_key", DEFAULT_MODEL_CONFIG["api_key"]),
                    temperature=model_config.get("temperature", DEFAULT_MODEL_CONFIG["temperature"]),
                    max_tokens=model_config.get("max_tokens", DEFAULT_MODEL_CONFIG["max_tokens"])
                )
            else:  # OpenAI is the default
                logger.log_message(f"Using default model: {model_config.get('model', DEFAULT_MODEL_CONFIG['model'])}", level=logging.INFO)
                return dspy.LM(
                    model=f"openai/{model_config.get("model", DEFAULT_MODEL_CONFIG["model"])}",
                    api_key=model_config.get("api_key", DEFAULT_MODEL_CONFIG["api_key"]),
                    temperature=model_config.get("temperature", DEFAULT_MODEL_CONFIG["temperature"]),
                    max_tokens=model_config.get("max_tokens", DEFAULT_MODEL_CONFIG["max_tokens"])
                )
    
    # If no valid session config, use default
    return default_lm

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

PLANNER_AGENTS = {
    "planner_preprocessing_agent": planner_preprocessing_agent,
    "planner_sk_learn_agent": planner_sk_learn_agent,
    "planner_statistical_analytics_agent": planner_statistical_analytics_agent,
    "planner_data_viz_agent": planner_data_viz_agent,
}

# Add session header
X_SESSION_ID = APIKeyHeader(name="X-Session-ID", auto_error=False)

# Update AppState class to use SessionManager
class AppState:
    def __init__(self):
        self._session_manager = SessionManager(styling_instructions, PLANNER_AGENTS)
        self.model_config = DEFAULT_MODEL_CONFIG.copy()
        # Update the SessionManager with the current model_config
        self._session_manager._app_model_config = self.model_config
        self.ai_manager = AI_Manager()
        self.chat_name_agent = chat_history_name_agent
        # Initialize deep analysis module
        self.deep_analyzer = None
    
    def get_session_state(self, session_id: str):
        """Get or create session-specific state using the SessionManager"""
        return self._session_manager.get_session_state(session_id)

    def clear_session_state(self, session_id: str):
        """Clear session-specific state using the SessionManager"""
        self._session_manager.clear_session_state(session_id)

    def update_session_dataset(self, session_id: str, df, name, desc):
        """Update dataset for a specific session using the SessionManager"""
        self._session_manager.update_session_dataset(session_id, df, name, desc)

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
    
    def get_chat_history_name_agent(self):
        return dspy.Predict(self.chat_name_agent)

    def get_deep_analyzer(self, session_id: str):
        """Get or create deep analysis module for a session"""
        session_state = self.get_session_state(session_id)
        if not hasattr(session_state, 'deep_analyzer') or session_state.get('deep_analyzer') is None:
            # Create agents dictionary for deep analysis
            deep_agents = {
                "planner_data_viz_agent": dspy.asyncify(dspy.ChainOfThought(planner_data_viz_agent)),
                "planner_statistical_analytics_agent": dspy.asyncify(dspy.ChainOfThought(planner_statistical_analytics_agent)), 
                "planner_sk_learn_agent": dspy.asyncify(dspy.ChainOfThought(planner_sk_learn_agent)),
                "planner_preprocessing_agent": dspy.asyncify(dspy.ChainOfThought(planner_preprocessing_agent))
            }
            
            deep_agents_desc = PLANNER_AGENTS_WITH_DESCRIPTION
            session_state['deep_analyzer'] = deep_analysis_module(agents=deep_agents, agents_desc=deep_agents_desc)
        
        return session_state['deep_analyzer']

# Initialize FastAPI app with state
app = FastAPI(title="AI Analytics API", version="1.0")
app.state = AppState()

# Configure middleware
# Use a wildcard for local development or read from environment
is_development = os.getenv("ENVIRONMENT", "development").lower() == "development"

allowed_origins = []
frontend_url = os.getenv("FRONTEND_URL", "").strip()
print(f"FRONTEND_URL: {frontend_url}")
if is_development:
    allowed_origins = ["*"]
elif frontend_url:
    allowed_origins = [frontend_url]
else:
    logger.log_message("CORS misconfigured: FRONTEND_URL not set", level=logging.ERROR)
    allowed_origins = []  # or set a default safe origin

# Add a strict origin verification middleware
@app.middleware("http")
async def verify_origin_middleware(request: Request, call_next):
    # Skip origin check in development mode
    if is_development:
        return await call_next(request)
    
    # Get the origin from the request headers
    origin = request.headers.get("origin")
    
    # Log the origin for debugging
    if origin:
        print(f"Request from origin: {origin}")
    
    # If no origin header or origin not in allowed list, reject the request
    if origin and frontend_url and origin != frontend_url:
        print(f"Blocked request from unauthorized origin: {origin}")
        return JSONResponse(
            status_code=403,
            content={"detail": "Not authorized"}
        )
    
    # Continue processing the request if origin is allowed
    return await call_next(request)

# CORS middleware (still needed for browser preflight)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600  # Cache preflight requests for 10 minutes (for performance)
)

# Add these constants at the top of the file with other imports/constants
RESPONSE_ERROR_INVALID_QUERY = "Please provide a valid query..."
RESPONSE_ERROR_NO_DATASET = "No dataset is currently loaded. Please link a dataset before proceeding with your analysis."
DEFAULT_TOKEN_RATIO = 1.5
REQUEST_TIMEOUT_SECONDS = 60  # Timeout for LLM requests
MAX_RECENT_MESSAGES = 3
DB_BATCH_SIZE = 10  # For future batch DB operations

# Replace the existing chat_with_agent function
@app.post("/chat/{agent_name}", response_model=dict)
async def chat_with_agent(
    agent_name: str, 
    request: QueryRequest,
    request_obj: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    session_state = app.state.get_session_state(session_id)
    
    try:
        # Extract and validate query parameters
        _update_session_from_query_params(request_obj, session_state)
        
        # Validate dataset and agent name
        if session_state["current_df"] is None:
            raise HTTPException(status_code=400, detail=RESPONSE_ERROR_NO_DATASET)

        _validate_agent_name(agent_name)
        
        # Record start time for timing
        start_time = time.time()
        
        # Get chat context and prepare query
        enhanced_query = _prepare_query_with_context(request.query, session_state)
        
        # Initialize agent
        if "," in agent_name:
            agent_list = [AVAILABLE_AGENTS[agent.strip()] for agent in agent_name.split(",")]
            agent = auto_analyst_ind(agents=agent_list, retrievers=session_state["retrievers"])
        else:
            agent = auto_analyst_ind(agents=[AVAILABLE_AGENTS[agent_name]], retrievers=session_state["retrievers"])
        
        # Execute agent with timeout
        try:
            # Get session-specific model
            session_lm = get_session_lm(session_state)
            
            # Use session-specific model for this request
            with dspy.context(lm=session_lm):
                response = await asyncio.wait_for(
                    agent.forward(enhanced_query, agent_name),
                    timeout=REQUEST_TIMEOUT_SECONDS
                )
        except asyncio.TimeoutError:
            logger.log_message(f"Agent execution timed out for {agent_name}", level=logging.WARNING)
            raise HTTPException(status_code=504, detail="Request timed out. Please try a simpler query.")
        except Exception as agent_error:
            logger.log_message(f"Agent execution failed: {str(agent_error)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail="Failed to process query. Please try again.")
        
        formatted_response = format_response_to_markdown(response, agent_name, session_state["current_df"])
        
        if formatted_response == RESPONSE_ERROR_INVALID_QUERY:
            return {
                "agent_name": agent_name,
                "query": request.query,
                "response": formatted_response,
                "session_id": session_id
            }
        
        # Track usage statistics
        if session_state.get("user_id"):
            _track_model_usage(
                session_state=session_state,
                enhanced_query=enhanced_query,
                response=response,
                processing_time_ms=int((time.time() - start_time) * 1000)
            )
        
        return {
            "agent_name": agent_name,
            "query": request.query,  # Return original query without context
            "response": formatted_response,
            "session_id": session_id
        }
    except HTTPException:
        # Re-raise HTTP exceptions to preserve status codes
        raise
    except Exception as e:
        logger.log_message(f"Unexpected error in chat_with_agent: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again later.")
    
    
@app.post("/chat", response_model=dict)
async def chat_with_all(
    request: QueryRequest,
    request_obj: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    session_state = app.state.get_session_state(session_id)

    try:
        # Extract and validate query parameters
        _update_session_from_query_params(request_obj, session_state)
        
        # Validate dataset
        if session_state["current_df"] is None:
            raise HTTPException(status_code=400, detail=RESPONSE_ERROR_NO_DATASET)
        
        if session_state["ai_system"] is None:
            raise HTTPException(status_code=500, detail="AI system not properly initialized.")

        # Get session-specific model
        session_lm = get_session_lm(session_state)

        # Create streaming response
        return StreamingResponse(
            _generate_streaming_responses(session_state, request.query, session_lm),
            media_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream',
                'Access-Control-Allow-Origin': '*',
                'X-Accel-Buffering': 'no'
            }
        )
    except HTTPException:
        # Re-raise HTTP exceptions to preserve status codes
        raise
    except Exception as e:
        logger.log_message(f"Unexpected error in chat_with_all: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again later.")


# Helper functions to reduce duplication and improve modularity
def _update_session_from_query_params(request_obj: Request, session_state: dict):
    """Extract and validate chat_id and user_id from query parameters"""
    # Check for chat_id in query parameters
    if "chat_id" in request_obj.query_params:
        try:
            chat_id_param = int(request_obj.query_params.get("chat_id"))
            # Update session state with this chat ID
            session_state["chat_id"] = chat_id_param
        except (ValueError, TypeError):
            logger.log_message("Invalid chat_id parameter", level=logging.WARNING)
            # Continue without updating chat_id

    # Check for user_id in query parameters
    if "user_id" in request_obj.query_params:
        try:
            user_id = int(request_obj.query_params["user_id"])
            session_state["user_id"] = user_id
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail="Invalid user_id in query params. Please provide a valid integer."
            )


def _validate_agent_name(agent_name: str):
    """Validate that the requested agent(s) exist"""
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


def _prepare_query_with_context(query: str, session_state: dict) -> str:
    """Prepare the query with chat context from previous messages"""
    chat_id = session_state.get("chat_id")
    if not chat_id:
        return query
        
    # Get chat manager from app state
    chat_manager = app.state._session_manager.chat_manager
    # Get recent messages
    recent_messages = chat_manager.get_recent_chat_history(chat_id, limit=MAX_RECENT_MESSAGES)
    # Extract response history
    chat_context = chat_manager.extract_response_history(recent_messages)
    
    # Append context to the query if available
    if chat_context:
        return f"### Current Query:\n{query}\n\n{chat_context}"
    return query


def _track_model_usage(session_state: dict, enhanced_query: str, response, processing_time_ms: int):
    """Track model usage statistics in the database"""
    try:
        ai_manager = app.state.get_ai_manager()
        
        # Get model configuration
        model_config = session_state.get("model_config", DEFAULT_MODEL_CONFIG)
        model_name = model_config.get("model", DEFAULT_MODEL_CONFIG["model"])
        provider = ai_manager.get_provider_for_model(model_name)
        
        # Calculate token usage
        try:
            # Try exact tokenization
            prompt_tokens = len(ai_manager.tokenizer.encode(enhanced_query))
            completion_tokens = len(ai_manager.tokenizer.encode(str(response)))
            total_tokens = prompt_tokens + completion_tokens
        except Exception as token_error:
            # Fall back to estimation
            logger.log_message(f"Tokenization error: {str(token_error)}", level=logging.WARNING)
            prompt_words = len(enhanced_query.split())
            completion_words = len(str(response).split())
            prompt_tokens = int(prompt_words * DEFAULT_TOKEN_RATIO)
            completion_tokens = int(completion_words * DEFAULT_TOKEN_RATIO)
            total_tokens = prompt_tokens + completion_tokens
        
        # Calculate cost
        cost = ai_manager.calculate_cost(model_name, prompt_tokens, completion_tokens)
        
        # Save usage to database
        ai_manager.save_usage_to_db(
            user_id=session_state.get("user_id"),
            chat_id=session_state.get("chat_id"),
            model_name=model_name,
            provider=provider,
            prompt_tokens=int(prompt_tokens),
            completion_tokens=int(completion_tokens),
            total_tokens=int(total_tokens),
            query_size=len(enhanced_query),
            response_size=len(str(response)),
            cost=round(cost, 7),
            request_time_ms=processing_time_ms,
            is_streaming=False
        )
    except Exception as e:
        # Log but don't fail the request if usage tracking fails
        logger.log_message(f"Failed to track model usage: {str(e)}", level=logging.ERROR)


async def _generate_streaming_responses(session_state: dict, query: str, session_lm):
    """Generate streaming responses for chat_with_all endpoint"""
    overall_start_time = time.time()
    total_response = ""
    total_inputs = ""
    usage_records = []

    # Add chat context from previous messages
    enhanced_query = _prepare_query_with_context(query, session_state)
    
    # Use the session model for this specific request
    with dspy.context(lm=session_lm):
        try:
            # Get the plan - planner is now async, so we need to await it
            plan_response = await session_state["ai_system"].get_plan(enhanced_query)
            
            plan_description = format_response_to_markdown(
                {"analytical_planner": plan_response}, 
                dataframe=session_state["current_df"]
            )
            
            # Check if plan is valid
            if plan_description == RESPONSE_ERROR_INVALID_QUERY:
                yield json.dumps({
                    "agent": "Analytical Planner",
                    "content": plan_description,
                    "status": "error"
                }) + "\n"
                return
            
            yield json.dumps({
                "agent": "Analytical Planner",
                "content": plan_description,
                "status": "success" if plan_description else "error"
            }) + "\n"
            
            # Track planner usage
            if session_state.get("user_id"):
                planner_tokens = _estimate_tokens(ai_manager=app.state.ai_manager, 
                                                input_text=enhanced_query, 
                                                output_text=plan_description)
                
                usage_records.append(_create_usage_record(
                    session_state=session_state,
                    model_name=session_state.get("model_config", DEFAULT_MODEL_CONFIG)["model"],
                    prompt_tokens=planner_tokens["prompt"],
                    completion_tokens=planner_tokens["completion"],
                    query_size=len(enhanced_query),
                    response_size=len(plan_description),
                    processing_time_ms=int((time.time() - overall_start_time) * 1000),
                    is_streaming=False
                ))
            
            # Execute the plan with well-managed concurrency
            async for agent_name, inputs, response in _execute_plan_with_timeout(
                session_state["ai_system"], enhanced_query, plan_response):
                
                if agent_name == "plan_not_found":
                    yield json.dumps({
                        "agent": "Analytical Planner",
                        "content": "**No plan found**\n\nPlease try again with a different query or try using a different model.",
                        "status": "error"
                    }) + "\n"
                    return
                
                formatted_response = format_response_to_markdown(
                    {agent_name: response}, 
                    dataframe=session_state["current_df"]
                ) or "No response generated"

                if formatted_response == RESPONSE_ERROR_INVALID_QUERY:
                    yield json.dumps({
                        "agent": agent_name,
                        "content": formatted_response,
                        "status": "error"
                    }) + "\n"
                    return

                # Send response chunk
                yield json.dumps({
                    "agent": agent_name.split("__")[0] if "__" in agent_name else agent_name,
                    "content": formatted_response,
                    "status": "success" if response else "error"
                }) + "\n"
                
                # Track agent usage for future batch DB write
                if session_state.get("user_id"):
                    agent_tokens = _estimate_tokens(
                        ai_manager=app.state.ai_manager,
                        input_text=str(inputs),
                        output_text=str(response)
                    )
                    
                    # Get appropriate model name for code combiner
                    if "code_combiner_agent" in agent_name and "__" in agent_name:
                        provider = agent_name.split("__")[1]
                        model_name = _get_model_name_for_provider(provider)
                    else:
                        model_name = session_state.get("model_config", DEFAULT_MODEL_CONFIG)["model"]

                    usage_records.append(_create_usage_record(
                        session_state=session_state,
                        model_name=model_name,
                        prompt_tokens=agent_tokens["prompt"],
                        completion_tokens=agent_tokens["completion"],
                        query_size=len(str(inputs)),
                        response_size=len(str(response)),
                        processing_time_ms=int((time.time() - overall_start_time) * 1000),
                        is_streaming=True
                    ))
                        
        except asyncio.TimeoutError:
            yield json.dumps({
                "agent": "planner",
                "content": "The request timed out. Please try a simpler query.",
                "status": "error"
            }) + "\n"
            return
        except Exception as e:
            logger.log_message(f"Error in streaming response: {str(e)}", level=logging.ERROR)
            yield json.dumps({
                "agent": "planner",
                "content": "An error occurred while generating responses. Please try again!",
                "status": "error"
            }) + "\n"


def _estimate_tokens(ai_manager, input_text: str, output_text: str) -> dict:
    """Estimate token counts, with fallback for tokenization errors"""
    try:
        # Try exact tokenization
        prompt_tokens = len(ai_manager.tokenizer.encode(input_text))
        completion_tokens = len(ai_manager.tokenizer.encode(output_text))
    except Exception:
        # Fall back to estimation
        prompt_words = len(input_text.split())
        completion_words = len(output_text.split())
        prompt_tokens = int(prompt_words * DEFAULT_TOKEN_RATIO)
        completion_tokens = int(completion_words * DEFAULT_TOKEN_RATIO)
    
    return {
        "prompt": prompt_tokens,
        "completion": completion_tokens,
        "total": prompt_tokens + completion_tokens
    }


def _create_usage_record(session_state: dict, model_name: str, prompt_tokens: int, 
                        completion_tokens: int, query_size: int, response_size: int,
                        processing_time_ms: int, is_streaming: bool) -> dict:
    """Create a usage record for the database"""
    ai_manager = app.state.get_ai_manager()
    provider = ai_manager.get_provider_for_model(model_name)
    cost = ai_manager.calculate_cost(model_name, prompt_tokens, completion_tokens)
    
    return {
        "user_id": session_state.get("user_id"),
        "chat_id": session_state.get("chat_id"),
        "model_name": model_name,
        "provider": provider,
        "prompt_tokens": int(prompt_tokens),
        "completion_tokens": int(completion_tokens),
        "total_tokens": int(prompt_tokens + completion_tokens),
        "query_size": query_size,
        "response_size": response_size,
        "cost": round(cost, 7),
        "request_time_ms": processing_time_ms,
        "is_streaming": is_streaming
    }


def _get_model_name_for_provider(provider: str) -> str:
    """Get the model name for a provider"""
    provider_model_map = {
        "openai": "o3-mini",
        "anthropic": "claude-3-7-sonnet-latest",
        "gemini": "gemini-2.5-pro-preview-03-25"
    }
    return provider_model_map.get(provider, "o3-mini")


async def _execute_plan_with_timeout(ai_system, enhanced_query, plan_response):
    """Execute the plan with timeout handling for each step"""
    try:
        # Use the async generator from execute_plan directly
        async for agent_name, inputs, response in ai_system.execute_plan(enhanced_query, plan_response):
            # Yield results as they come
            yield agent_name, inputs, response
    except Exception as e:
        logger.log_message(f"Error executing plan: {str(e)}", level=logging.ERROR)
        yield "error", None, {"error": "An error occurred during plan execution"}


# Add an endpoint to list available agents
@app.get("/agents", response_model=dict)
async def list_agents():
    return {
        "available_agents": list(AVAILABLE_AGENTS.keys()),
        "planner_agents": list(PLANNER_AGENTS.keys()),
        "deep_analysis": {
            "available": True,
            "description": "Comprehensive multi-step analysis with automated planning"
        },
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

@app.post("/chat_history_name")
async def chat_history_name(request: dict, session_id: str = Depends(get_session_id_dependency)):
    query = request.get("query")
    name = None
    
    lm = dspy.LM(model="gpt-4o-mini", max_tokens=300, temperature=0.5)
    
    with dspy.context(lm=lm):
        name = app.state.get_chat_history_name_agent()(query=str(query))
        
    return {"name": name.name if name else "New Chat"}

@app.post("/deep_analysis_streaming")
async def deep_analysis_streaming(
    request: DeepAnalysisRequest,
    request_obj: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    """Perform streaming deep analysis with real-time updates"""
    session_state = app.state.get_session_state(session_id)
    
    try:
        # Extract and validate query parameters
        _update_session_from_query_params(request_obj, session_state)
        
        # Validate dataset
        if session_state["current_df"] is None:
            raise HTTPException(status_code=400, detail=RESPONSE_ERROR_NO_DATASET)
        
        # Get user_id from session state (if available)
        user_id = session_state.get("user_id")
        
        # Generate a UUID for this report
        import uuid
        report_uuid = str(uuid.uuid4())
        
        # Create initial pending report in the database
        try:
            from src.db.init_db import session_factory
            from src.db.schemas.models import DeepAnalysisReport
            
            db_session = session_factory()
            
            try:
                # Create a pending report entry
                new_report = DeepAnalysisReport(
                    report_uuid=report_uuid,
                    user_id=user_id,
                    goal=request.goal,
                    status="pending",
                    start_time=datetime.now(UTC),
                    progress_percentage=0
                )
                
                db_session.add(new_report)
                db_session.commit()
                db_session.refresh(new_report)
                
                # Store the report ID in session state for later updates
                session_state["current_deep_analysis_id"] = new_report.report_id
                session_state["current_deep_analysis_uuid"] = report_uuid
                
            except Exception as e:
                logger.log_message(f"Error creating initial deep analysis report: {str(e)}", level=logging.ERROR)
                # Continue even if DB storage fails
            finally:
                db_session.close()
                
        except Exception as e:
            logger.log_message(f"Database operation failed: {str(e)}", level=logging.ERROR)
            # Continue even if DB operation fails
        
        # Get session-specific model
        # session_lm = get_session_lm(session_state)
        session_lm = dspy.LM(model="anthropic/claude-sonnet-4-20250514", max_tokens=7000, temperature=0.5)
        
        return StreamingResponse(
            _generate_deep_analysis_stream(session_state, request.goal, session_lm),
            media_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream',
                'Access-Control-Allow-Origin': '*',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Streaming deep analysis failed: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Streaming deep analysis failed: {str(e)}")

async def _generate_deep_analysis_stream(session_state: dict, goal: str, session_lm):
    """Generate streaming responses for deep analysis"""
    # Track the start time for duration calculation
    start_time = datetime.now(UTC)
    
    try:
        # Get dataset info
        df = session_state["current_df"]
        dtypes_info = pd.DataFrame({
            'Column': df.columns,
            'Data Type': df.dtypes.astype(str)
        }).to_markdown()
        dataset_info = f"Sample Data:\n{df.head(2).to_markdown()}\n\nData Types:\n{dtypes_info}"
        
        # Get report info from session state
        report_id = session_state.get("current_deep_analysis_id")
        report_uuid = session_state.get("current_deep_analysis_uuid")
        user_id = session_state.get("user_id")
        
        # Helper function to update report in database
        async def update_report_in_db(status, progress, step=None, content=None):
            if not report_id:
                return
                
            try:
                from src.db.init_db import session_factory
                from src.db.schemas.models import DeepAnalysisReport
                
                db_session = session_factory()
                
                try:
                    report = db_session.query(DeepAnalysisReport).filter(DeepAnalysisReport.report_id == report_id).first()
                    
                    if report:
                        report.status = status
                        report.progress_percentage = progress
                        
                        # Update step-specific fields if provided
                        if step == "questions" and content:
                            report.deep_questions = content
                        elif step == "planning" and content:
                            report.deep_plan = content
                        elif step == "analysis" and content:
                            # For analysis step, we get the full object with multiple fields
                            if isinstance(content, dict):
                                # Update fields from content if they exist
                                if "deep_questions" in content and content["deep_questions"]:
                                    report.deep_questions = content["deep_questions"]
                                if "deep_plan" in content and content["deep_plan"]:
                                    report.deep_plan = content["deep_plan"]
                                if "code" in content and content["code"]:
                                    report.analysis_code = content["code"]
                                if "final_conclusion" in content and content["final_conclusion"]:
                                    report.final_conclusion = content["final_conclusion"]
                                    # Also update summary from conclusion
                                    conclusion = content["final_conclusion"]
                                    conclusion = conclusion.replace("**Conclusion**", "")
                                    report.report_summary = conclusion[:200] + "..." if len(conclusion) > 200 else conclusion
                                
                                # Handle JSON fields
                                if "summaries" in content and content["summaries"]:
                                    report.summaries = json.dumps(content["summaries"])
                                if "plotly_figs" in content and content["plotly_figs"]:
                                    report.plotly_figures = json.dumps(content["plotly_figs"])
                                if "synthesis" in content and content["synthesis"]:
                                    report.synthesis = json.dumps(content["synthesis"])
                        
                        # For the final step, update the HTML report
                        if step == "completed":
                            if content:
                                report.html_report = content
                                logger.log_message(f"Storing HTML report in database, length: {len(content)}", level=logging.INFO)
                            else:
                                logger.log_message("No HTML content provided for completed step", level=logging.WARNING)
                                
                            report.end_time = datetime.now(UTC)
                            # Ensure start_time is timezone-aware before calculating duration
                            if report.start_time.tzinfo is None:
                                start_time_utc = report.start_time.replace(tzinfo=UTC)
                            else:
                                start_time_utc = report.start_time
                            report.duration_seconds = int((report.end_time - start_time_utc).total_seconds())
                            
                        report.updated_at = datetime.now(UTC)
                        db_session.commit()
                        
                except Exception as e:
                    db_session.rollback()
                    logger.log_message(f"Error updating deep analysis report: {str(e)}", level=logging.ERROR)
                finally:
                    db_session.close()
            except Exception as e:
                logger.log_message(f"Database operation failed: {str(e)}", level=logging.ERROR)
        
        # Use session model for this request
        with dspy.context(lm=session_lm):
            # Send initial status
            yield json.dumps({
                "step": "initialization",
                "status": "starting",
                "message": "Initializing deep analysis...",
                "progress": 5
            }) + "\n"
            
            # Update DB status to running
            await update_report_in_db("running", 5)
            
            # Get deep analyzer
            deep_analyzer = app.state.get_deep_analyzer(session_state.get("session_id", "default"))
            
            # Make the dataset available globally for code execution
            globals()['df'] = df
            
            # Use the new streaming method and forward all progress updates
            final_result = None
            async for update in deep_analyzer.execute_deep_analysis_streaming(
                goal=goal,
                dataset_info=dataset_info,
                session_df=df
            ):
                # Convert the update to the expected format and yield it
                if update.get("step") == "questions" and update.get("status") == "completed":
                    # Update DB with questions
                    await update_report_in_db("running", update.get("progress", 0), "questions", update.get("content"))
                elif update.get("step") == "planning" and update.get("status") == "completed":
                    # Update DB with planning
                    await update_report_in_db("running", update.get("progress", 0), "planning", update.get("content"))
                elif update.get("step") == "conclusion" and update.get("status") == "completed":
                    # Store the final result for later processing
                    final_result = update.get("final_result")
                    
                    # Convert Plotly figures to JSON format for network transmission
                    if final_result:
                        import plotly.io
                        serialized_return_dict = final_result.copy()
                        
                        # Convert plotly_figs to JSON format
                        if 'plotly_figs' in serialized_return_dict and serialized_return_dict['plotly_figs']:
                            json_figs = []
                            for fig_list in serialized_return_dict['plotly_figs']:
                                if isinstance(fig_list, list):
                                    json_fig_list = []
                                    for fig in fig_list:
                                        if hasattr(fig, 'to_json'):  # Check if it's a Plotly figure
                                            json_fig_list.append(plotly.io.to_json(fig))
                                        else:
                                            json_fig_list.append(fig)  # Already JSON or other format
                                    json_figs.append(json_fig_list)
                                else:
                                    # Single figure case
                                    if hasattr(fig_list, 'to_json'):
                                        json_figs.append(plotly.io.to_json(fig_list))
                                    else:
                                        json_figs.append(fig_list)
                            serialized_return_dict['plotly_figs'] = json_figs
                        
                        # Update DB with analysis results
                        await update_report_in_db("running", update.get("progress", 0), "analysis", serialized_return_dict)
                        
                        # Generate HTML report using the original final_result with Figure objects
                        html_report = None
                        try:
                            logger.log_message("Generating HTML report...", level=logging.INFO)
                            html_report = generate_html_report(final_result)
                            logger.log_message(f"HTML report generated successfully, length: {len(html_report) if html_report else 0}", level=logging.INFO)
                        except Exception as e:
                            logger.log_message(f"Error generating HTML report: {str(e)}", level=logging.ERROR)
                            # Continue even if HTML generation fails
                        
                        # Send the analysis results
                        yield json.dumps({
                            "step": "analysis",
                            "status": "completed",
                            "content": serialized_return_dict,
                            "progress": 90
                        }) + "\n"
                        
                        # Send report generation status
                        yield json.dumps({
                            "step": "report",
                            "status": "processing",
                            "message": "Generating final report...",
                            "progress": 95
                        }) + "\n"
                        
                        # Send final completion
                        yield json.dumps({
                            "step": "completed",
                            "status": "success",
                            "analysis": serialized_return_dict,
                            "html_report": html_report,
                            "progress": 100
                        }) + "\n"
                        
                        # Update DB with completed report (with HTML if generated)
                        if html_report:
                            logger.log_message(f"Saving HTML report to database, length: {len(html_report)}", level=logging.INFO)
                        else:
                            logger.log_message("No HTML report to save to database", level=logging.WARNING)
                        await update_report_in_db("completed", 100, "completed", html_report)
                elif update.get("step") == "error":
                    # Forward error directly
                    yield json.dumps(update) + "\n"
                    await update_report_in_db("failed", 0)
                    return
                else:
                    # Forward all other progress updates
                    yield json.dumps(update) + "\n"
            
            # If we somehow exit the loop without getting a final result, that's an error
            if not final_result:
                yield json.dumps({
                    "step": "error",
                    "status": "failed",
                    "message": "Deep analysis completed without final result",
                    "progress": 0
                }) + "\n"
                await update_report_in_db("failed", 0)
        
    except Exception as e:
        logger.log_message(f"Error in deep analysis stream: {str(e)}", level=logging.ERROR)
        yield json.dumps({
            "step": "error",
            "status": "failed",
            "message": f"Deep analysis failed: {str(e)}",
            "progress": 0
        }) + "\n"
        
        # Update DB with error status
        if 'update_report_in_db' in locals() and session_state.get("current_deep_analysis_id"):
            await update_report_in_db("failed", 0)

@app.post("/deep_analysis/download_report")
async def download_html_report(
    request: dict,
    session_id: str = Depends(get_session_id_dependency)
):
    """Download HTML report from previous deep analysis"""
    try:
        analysis_data = request.get("analysis_data")
        if not analysis_data:
            raise HTTPException(status_code=400, detail="No analysis data provided")
        
        # Get report UUID from request if available (for saving to DB)
        report_uuid = request.get("report_uuid")
        session_state = app.state.get_session_state(session_id)
        
        # If no report_uuid in request, try to get it from session state
        if not report_uuid and session_state.get("current_deep_analysis_uuid"):
            report_uuid = session_state.get("current_deep_analysis_uuid")
            
        # Convert JSON-serialized Plotly figures back to Figure objects for HTML generation
        processed_data = analysis_data.copy()
        
        if 'plotly_figs' in processed_data and processed_data['plotly_figs']:
            import plotly.io
            import plotly.graph_objects as go
            
            figure_objects = []
            for fig_list in processed_data['plotly_figs']:
                if isinstance(fig_list, list):
                    fig_obj_list = []
                    for fig_json in fig_list:
                        if isinstance(fig_json, str):
                            # Convert JSON string back to Figure object
                            try:
                                fig_obj = plotly.io.from_json(fig_json)
                                fig_obj_list.append(fig_obj)
                            except Exception as e:
                                logger.log_message(f"Error parsing Plotly JSON: {str(e)}", level=logging.WARNING)
                                continue
                        elif hasattr(fig_json, 'to_html'):
                            # Already a Figure object
                            fig_obj_list.append(fig_json)
                    figure_objects.append(fig_obj_list)
                else:
                    # Single figure case
                    if isinstance(fig_list, str):
                        try:
                            fig_obj = plotly.io.from_json(fig_list)
                            figure_objects.append(fig_obj)
                        except Exception as e:
                            logger.log_message(f"Error parsing Plotly JSON: {str(e)}", level=logging.WARNING)
                            continue
                    elif hasattr(fig_list, 'to_html'):
                        figure_objects.append(fig_list)
            
            processed_data['plotly_figs'] = figure_objects
        
        # Generate HTML report
        html_report = generate_html_report(processed_data)
        
        # Save report to database if we have a UUID
        if report_uuid:
            try:
                from src.db.init_db import session_factory
                from src.db.schemas.models import DeepAnalysisReport
                
                db_session = session_factory()
                try:
                    # Try to find existing report by UUID
                    report = db_session.query(DeepAnalysisReport).filter(DeepAnalysisReport.report_uuid == report_uuid).first()
                    
                    if report:
                        # Update existing report with HTML content
                        report.html_report = html_report
                        report.updated_at = datetime.now(UTC)
                        db_session.commit()
                        logger.log_message(f"Updated HTML report in database for UUID {report_uuid}", level=logging.INFO)
                except Exception as e:
                    db_session.rollback()
                    logger.log_message(f"Error storing HTML report in database: {str(e)}", level=logging.ERROR)
                finally:
                    db_session.close()
            except Exception as e:
                logger.log_message(f"Database operation failed when storing HTML report: {str(e)}", level=logging.ERROR)
                # Continue even if DB storage fails
        
        # Create a filename with timestamp
        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        filename = f"deep_analysis_report_{timestamp}.html"
        
        # Return as downloadable file
        return StreamingResponse(
            iter([html_report.encode('utf-8')]),
            media_type='text/html',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'text/html; charset=utf-8'
            }
        )
        
    except Exception as e:
        logger.log_message(f"Failed to generate HTML report: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

# In the section where routers are included, add the session_router
app.include_router(chat_router)
app.include_router(analytics_router)
app.include_router(code_router)
app.include_router(session_router)
app.include_router(feedback_router)
app.include_router(deep_analysis_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)