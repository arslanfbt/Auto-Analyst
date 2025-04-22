# Standard library imports
import asyncio
import json
import logging
import os
import time
import uuid
from io import StringIO
from typing import List, Optional

# Third-party imports
import groq
import pandas as pd
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
from src.routes.session_routes import router as session_router, get_session_id_dependency
from src.schemas.query_schemas import QueryRequest
from src.utils.logger import Logger


logger = Logger("app", see_time=True, console_log=False)
load_dotenv()

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
    default_lm = dspy.GROQ(
        model=DEFAULT_MODEL_CONFIG["model"],
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
else:
    default_lm = dspy.LM(
        model=DEFAULT_MODEL_CONFIG["model"],
        api_key=DEFAULT_MODEL_CONFIG["api_key"],
        temperature=DEFAULT_MODEL_CONFIG["temperature"],
        max_tokens=DEFAULT_MODEL_CONFIG["max_tokens"]
    )

# Function to get model config from session or use default
def get_session_lm(session_state):
    """Get the appropriate LM instance for a session, or default if not configured"""
    # First check if we have a valid session-specific model config 
    if session_state and isinstance(session_state, dict) and "model_config" in session_state:
        model_config = session_state["model_config"]
        if model_config and isinstance(model_config, dict) and "model" in model_config:
            # Found valid session-specific model config, use it
            provider = model_config.get("provider", "openai").lower()
            logger.log_message(f"Model Config: {model_config}", level=logging.INFO)
            if provider == "groq":
                return dspy.GROQ(
                    model=model_config.get("model", DEFAULT_MODEL_CONFIG["model"]),
                    api_key=model_config.get("api_key", DEFAULT_MODEL_CONFIG["api_key"]),
                    temperature=model_config.get("temperature", DEFAULT_MODEL_CONFIG["temperature"]),
                    max_tokens=model_config.get("max_tokens", DEFAULT_MODEL_CONFIG["max_tokens"])
                )
            elif provider == "anthropic":
                return dspy.LM(
                    model=model_config.get("model", DEFAULT_MODEL_CONFIG["model"]),
                    api_key=model_config.get("api_key", DEFAULT_MODEL_CONFIG["api_key"]),
                    temperature=model_config.get("temperature", DEFAULT_MODEL_CONFIG["temperature"]),
                    max_tokens=model_config.get("max_tokens", DEFAULT_MODEL_CONFIG["max_tokens"])
                )
            elif provider == "gemini":
                return dspy.LM(
                    model=f"gemini/{model_config.get('model', DEFAULT_MODEL_CONFIG['model'])}",
                    api_key=model_config.get("api_key", DEFAULT_MODEL_CONFIG["api_key"]),
                    temperature=model_config.get("temperature", DEFAULT_MODEL_CONFIG["temperature"]),
                    max_tokens=model_config.get("max_tokens", DEFAULT_MODEL_CONFIG["max_tokens"])
                )
            else:  # OpenAI is the default
                return dspy.LM(
                    model=model_config.get("model", DEFAULT_MODEL_CONFIG["model"]),
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

# Add session header
X_SESSION_ID = APIKeyHeader(name="X-Session-ID", auto_error=False)

# Update AppState class to use SessionManager
class AppState:
    def __init__(self):
        self._session_manager = SessionManager(styling_instructions, AVAILABLE_AGENTS)
        self.model_config = DEFAULT_MODEL_CONFIG.copy()
        # Update the SessionManager with the current model_config
        self._session_manager._app_model_config = self.model_config
        self.ai_manager = AI_Manager()
        self.chat_name_agent = chat_history_name_agent
    
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

# Available agents
AVAILABLE_AGENTS = {
    "data_viz_agent": data_viz_agent,
    "sk_learn_agent": sk_learn_agent,
    "statistical_analytics_agent": statistical_analytics_agent,
    "preprocessing_agent": preprocessing_agent,
}


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
            # Update session state with this chat ID
            session_state["chat_id"] = chat_id_param
        except (ValueError, TypeError):
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
        
        # Get session-specific model
        session_lm = get_session_lm(session_state)
        
        # Add chat context from previous messages if chat_id is available
        chat_id = session_state.get("chat_id")
        chat_context = ""
        if chat_id:
            # Get chat manager from app state
            chat_manager = app.state._session_manager.chat_manager
            # Get recent messages
            recent_messages = chat_manager.get_recent_chat_history(chat_id, limit=5)
            # Extract response history
            chat_context = chat_manager.extract_response_history(recent_messages)
        # Append context to the query if available
        enhanced_query = request.query
        if chat_context:
            enhanced_query = f"### Current Query:\n{request.query}\n\n{chat_context}"
        # For multiple agents
        if "," in agent_name:
            agent_list = [AVAILABLE_AGENTS[agent.strip()] for agent in agent_name.split(",")]
            agent = auto_analyst_ind(agents=agent_list, retrievers=session_state["retrievers"])
        else:
            # Single agent case
            agent = AVAILABLE_AGENTS[agent_name]
            agent = auto_analyst_ind(agents=[agent], retrievers=session_state["retrievers"])
        
        try:
            # Use session-specific model for this request
            with dspy.context(lm=session_lm):
                response = agent(enhanced_query, agent_name)
        except Exception as agent_error:
            raise HTTPException(
                status_code=500,
                detail=f"Agent execution failed: {str(agent_error)}"
            )
        
        formatted_response = format_response_to_markdown(response, agent_name, session_state["current_df"])
        
        if formatted_response == "Please provide a valid query...":
            return {
                "agent_name": agent_name,
                "query": request.query,  # Return original query without context
                "response": formatted_response,
                "session_id": session_id
            }
        
        # Track model usage directly with AI Manager
        ai_manager = app.state.get_ai_manager()

        if session_state.get("user_id"):
            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Get prompt and response sizes
            prompt_size = len(enhanced_query)
            response_size = len(str(response))
            
            # Get model name from session config
            model_config = session_state.get("model_config", DEFAULT_MODEL_CONFIG)
            model_name = model_config.get("model", DEFAULT_MODEL_CONFIG["model"])
            provider = ai_manager.get_provider_for_model(model_name)
                
            # Estimate tokens
            try:
                prompt_tokens = len(ai_manager.tokenizer.encode(enhanced_query))
                completion_tokens = len(ai_manager.tokenizer.encode(str(response)))
                total_tokens = prompt_tokens + completion_tokens
            except:
                # Fallback estimation
                words = len(enhanced_query.split()) + len(str(response).split())
                total_tokens = words * 1.5
                prompt_tokens = len(enhanced_query.split()) * 1.5
                completion_tokens = total_tokens - prompt_tokens
            
            cost = ai_manager.calculate_cost(model_name, prompt_tokens, completion_tokens)
            # Save to DB with the proper chat_id
            ai_manager.save_usage_to_db(
                user_id=session_state.get("user_id"),
                chat_id=session_state.get("chat_id"),
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
            "query": request.query,  # Return original query without context
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

    # Get session-specific model
    session_lm = get_session_lm(session_state)

    async def generate_responses():
        overall_start_time = time.time()
        total_response = ""
        total_inputs = ""

        try:
            # Add chat context from previous messages if chat_id is available
            chat_id = session_state.get("chat_id")
            chat_context = ""
            if chat_id:
                # Get chat manager from app state
                chat_manager = app.state._session_manager.chat_manager
                # Get recent messages
                recent_messages = chat_manager.get_recent_chat_history(chat_id, limit=5)
                # Extract response history
                chat_context = chat_manager.extract_response_history(recent_messages)
            # Append context to the query if available
            enhanced_query = request.query
            if chat_context:
                enhanced_query = f"### Current Query:\n{request.query}\n\n{chat_context}"
            
            # Use the session model for this specific request
            with dspy.context(lm=session_lm):
                loop = asyncio.get_event_loop()
                plan_response = await loop.run_in_executor(
                    None,
                    session_state["ai_system"].get_plan,
                    enhanced_query  # Use enhanced query with context
                )

                plan_descrition = format_response_to_markdown({"analytical_planner": plan_response}, dataframe=session_state["current_df"])
                
                # if plan_descrition is empty, yield and send error
                if plan_descrition == "Please provide a valid query...":
                    yield json.dumps({
                        "agent": "Analytical Planner",
                        "content": plan_descrition,
                        "status": "error"
                    }) + "\n"
                    return
                
                yield json.dumps({
                    "agent": "Analytical Planner",
                    "content": plan_descrition,
                    "status": "success" if plan_descrition else "error"
                }) + "\n"

                async for agent_name, inputs, response in session_state["ai_system"].execute_plan(enhanced_query, plan_response):
                    
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

                    if formatted_response == "Please provide a valid query...":
                        yield json.dumps({
                            "agent": agent_name,
                            "content": formatted_response,
                            "status": "error"
                        }) + "\n"
                        return
                    if "code_combiner_agent" in agent_name:
                        logger.log_message(f"[>] Code combiner response: {response}", level=logging.INFO)
                        total_response += str(response) if response else ""
                        total_inputs += str(inputs) if inputs else ""

                    yield json.dumps({
                        "agent": agent_name.split("__")[0] if "__" in agent_name else agent_name,
                        "content": formatted_response,
                        "status": "success" if response else "error"
                    }) + "\n"
            if session_state.get("user_id"):
                overall_processing_time_ms = int((time.time() - overall_start_time) * 1000)
                prompt_size = len(enhanced_query)  # Use enhanced_query size instead of request.query

                # Track the code combiner agent response
                if "refined_complete_code" in response:
                    model_name = agent_name.split("__")[1] if "__" in agent_name else agent_name
                    if model_name == "qwen":
                        model_name = "qwen-2.5-coder-32br"
                    elif model_name == "deepseek":
                        model_name = "deepseek-r1-distill-llama-70b"
                    else:
                        model_name = "gemini-2.5-pro-preview-03-25"
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

                # Get model info from session state
                model_config = session_state.get("model_config", DEFAULT_MODEL_CONFIG)
                model_name = model_config.get("model", DEFAULT_MODEL_CONFIG["model"])
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
            yield json.dumps({
                "agent": "planner",
                "content": f"An error occurred while generating responses. Please try again!\n{str(e)}",
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

@app.post("/chat_history_name")
async def chat_history_name(request: dict, session_id: str = Depends(get_session_id_dependency)):
    query = request.get("query")
    name = None
    
    lm = dspy.LM(model="gpt-4o-mini", max_tokens=300, temperature=0.5)
    
    with dspy.context(lm=lm):
        name = app.state.get_chat_history_name_agent()(query=str(query))
        
    return {"name": name.name if name else "New Chat"}

# In the section where routers are included, add the session_router
app.include_router(chat_router)
app.include_router(analytics_router)
app.include_router(code_router)
app.include_router(session_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)