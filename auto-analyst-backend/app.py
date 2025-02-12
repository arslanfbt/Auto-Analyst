from fastapi import FastAPI, HTTPException, File, UploadFile, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os
from typing import List
import uvicorn
import logging

from fastapi import Form, UploadFile
import io
# Import custom modules and models
from agents import *
from retrievers import *
from llama_index.core import Document
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import VectorStoreIndex
from format_response import format_response_to_markdown, execute_code_from_markdown

# Add styling_instructions at the top level
styling_instructions = [
    "Create clear and informative visualizations",
    "Use appropriate color schemes",
    "Include descriptive titles and labels",
    "Make sure axes are properly labeled",
    "Add legends where necessary"
]

# Initialize retrievers with empty data first
def initialize_retrievers(styling_instructions: List[str], doc: List[str]):
    style_index = VectorStoreIndex.from_documents([Document(text=x) for x in styling_instructions])
    data_index = VectorStoreIndex.from_documents([Document(text=x) for x in doc])
    return {"style_index": style_index, "dataframe_index": data_index}

# clear console
def clear_console():
    os.system('cls' if os.name == 'nt' else 'clear')

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check for Housing.csv
housing_csv_path = "Housing.csv"
if not os.path.exists(housing_csv_path):
    logger.error(f"Housing.csv not found at {os.path.abspath(housing_csv_path)}")
    raise FileNotFoundError(f"Housing.csv not found at {os.path.abspath(housing_csv_path)}")
else:
    logger.info(f"Housing.csv found at {os.path.abspath(housing_csv_path)}")

AVAILABLE_AGENTS = {
    "data_viz_agent": data_viz_agent,
    "sk_learn_agent": sk_learn_agent,
    "statistical_analytics_agent": statistical_analytics_agent,
    "preprocessing_agent": preprocessing_agent,
}

class AppState:
    def __init__(self):
        self.current_df = None
        self.retrievers = None
        self.ai_system = None
        self.initialize_default_dataset()
    
    def initialize_default_dataset(self):
        try:
            logger.info("Loading default dataset...")
            self.current_df = pd.read_csv("Housing.csv")
            desc = "Housing Dataset"
            data_dict = make_data(self.current_df, desc)
            logger.info("Initializing retrievers...")
            self.retrievers = initialize_retrievers(styling_instructions, [str(data_dict)])
            logger.info("Initializing AI system...")
            self.ai_system = auto_analyst(agents=list(AVAILABLE_AGENTS.values()), retrievers=self.retrievers)
            logger.info("Default dataset initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing default dataset: {str(e)}")
            logger.error(f"Stack trace: ", exc_info=True)
            raise e
    
    def update_dataset(self, df, desc, styling_instructions):
        try:
            logger.info("Updating dataset...")
            self.current_df = df
            data_dict = make_data(self.current_df, desc)
            logger.info("Updating retrievers...")
            self.retrievers = initialize_retrievers(styling_instructions, [str(data_dict)])
            logger.info("Updating AI system...")
            self.ai_system = auto_analyst(agents=list(AVAILABLE_AGENTS.values()), retrievers=self.retrievers)
            logger.info("Dataset updated successfully")
        except Exception as e:
            logger.error(f"Error updating dataset: {str(e)}")
            logger.error(f"Stack trace: ", exc_info=True)
            # Try to fall back to default dataset
            logger.info("Attempting to fall back to default dataset...")
            self.initialize_default_dataset()

# Initialize FastAPI app with state
app = FastAPI(title="AI Analytics API", version="1.0")
try:
    logger.info("Initializing app state...")
    app.state = AppState()
    logger.info("App state initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize app state: {str(e)}")
    logger.error("Stack trace: ", exc_info=True)
    raise e

# Configure middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# DSPy Configuration
import dspy
dspy.configure(lm=dspy.LM(model="gpt-4o-mini", api_key=os.getenv("OPENAI_API_KEY"), temperature=0, max_tokens=3000))

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

@app.post("/upload_dataframe", response_model=dict)
async def upload_dataframe(file: UploadFile = File(...), styling_instructions: str = Form(...)):
    try:
        contents = await file.read()
        new_df = pd.read_csv(io.BytesIO(contents))
        desc = f"{file.filename} Dataset"
        
        # Update the app state with new data
        app.state.update_dataset(new_df, desc, styling_instructions)
        
        return {"message": "Dataframe uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/chat/{agent_name}", response_model=dict)
async def chat_with_agent(agent_name: str, request: QueryRequest):
    if app.state.current_df is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset loaded. Please upload a dataset first."
        )
    
    clear_console()
    
    if agent_name not in AVAILABLE_AGENTS:
        available = list(AVAILABLE_AGENTS.keys())
        raise HTTPException(
            status_code=404, 
            detail=f"Agent '{agent_name}' not found. Available agents: {available}"
        )
    
    try:
        agent = AVAILABLE_AGENTS[agent_name]
        agent = auto_analyst_ind(agents=[agent], retrievers=app.state.retrievers)
        
        try:
            response = agent(request.query, agent_name)
        except Exception as agent_error:
            raise HTTPException(
                status_code=500,
                detail=f"Agent execution failed: {str(agent_error)}"
            )
        
        formatted_response = format_response_to_markdown(response, agent_name, app.state.current_df)
        
        return {
            "agent_name": agent_name,
            "query": request.query,
            "response": formatted_response,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.post("/chat", response_model=dict)
async def chat_with_all(request: QueryRequest):
    try:
        logger.info("Starting chat_with_all...")
        
        if app.state.current_df is None:
            logger.error("No dataset loaded")
            raise HTTPException(
                status_code=400,
                detail="No dataset loaded. Please upload a dataset first."
            )
        
        if app.state.ai_system is None:
            logger.error("AI system not initialized")
            raise HTTPException(
                status_code=500,
                detail="AI system not properly initialized"
            )
        
        logger.info("Executing AI system query...")
        response = app.state.ai_system(request.query)
        
        logger.info("Formatting response...")
        formatted_response = format_response_to_markdown(response, dataframe=app.state.current_df)
        
        logger.info("Returning response...")
        return {
            "agent_name": "ai_system",
            "query": request.query,
            "response": formatted_response,
        }
    except Exception as e:
        logger.error(f"Error in chat_with_all: {str(e)}")
        logger.error("Stack trace: ", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute_code")
async def execute_code(request: dict):
    if app.state.current_df is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset loaded. Please upload a dataset first."
        )
        
    try:
        code = request.get("code")
        if not code:
            raise HTTPException(status_code=400, detail="No code provided")
        output, json_outputs = execute_code_from_markdown(code, app.state.current_df)
        json_outputs = [f"```plotly\n{json_output}\n```\n" for json_output in json_outputs]
        return {
            "output": output,
            "plotly_outputs": json_outputs if json_outputs else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
