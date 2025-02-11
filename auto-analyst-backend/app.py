from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os
from typing import List
import uvicorn

from fastapi import Form, UploadFile
import io
# Import custom modules and models
from agents import *
from retrievers import *
from llama_index.core import Document
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import VectorStoreIndex
from format_response import format_response_to_markdown, execute_code_from_markdown

# clear console
def clear_console():
    os.system('cls' if os.name == 'nt' else 'clear')

# Initialize FastAPI app
app = FastAPI(title="AI Analytics API", version="1.0")

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

# Helper function to initialize retrievers
def initialize_retrievers(styling_instructions: List[str], doc: List[str]):
    style_index = VectorStoreIndex.from_documents([Document(text=x) for x in styling_instructions])
    data_index = VectorStoreIndex.from_documents([Document(text=x) for x in doc])
    return {"style_index": style_index, "dataframe_index": data_index}

# Load initial retrievers
df = pd.read_csv("Housing.csv")
desc = "Housing Dataset"
data_dict = make_data(df, desc)
retrievers = initialize_retrievers(styling_instructions, [str(data_dict)])

# Available agents
AVAILABLE_AGENTS = {
    "data_viz_agent": data_viz_agent,
    "sk_learn_agent": sk_learn_agent,
    "statistical_analytics_agent": statistical_analytics_agent,
    "preprocessing_agent": preprocessing_agent,
}

ai_system = auto_analyst(agents=list(AVAILABLE_AGENTS.values()), retrievers=retrievers)

# Pydantic models for validation
class QueryRequest(BaseModel):
    query: str

class DataFrameRequest(BaseModel):
    styling_instructions: List[str]
    file: str

@app.post("/upload_dataframe", response_model=dict)
async def upload_dataframe(file: UploadFile = File(...), styling_instructions: str = Form(...)):
    try:
        # Read the file content
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))  # Use io.BytesIO to read in-memory file content
        
        global retrievers
        retrievers = initialize_retrievers(styling_instructions, [str(df)])
        return {"message": "Dataframe uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/chat/{agent_name}", response_model=dict)
async def chat_with_agent(agent_name: str, request: QueryRequest):
    clear_console()
    # print(f"Received request for agent: {agent_name}")
    # print(f"Query: {request.query}")
    
    if agent_name not in AVAILABLE_AGENTS:
        available = list(AVAILABLE_AGENTS.keys())
        print(f"Agent not found. Available agents: {available}")
        raise HTTPException(
            status_code=404, 
            detail=f"Agent '{agent_name}' not found. Available agents: {available}"
        )
    
    try:
        print(f"Executing agent {agent_name}...")
        agent = AVAILABLE_AGENTS[agent_name]
        agent = auto_analyst_ind(agents=[agent], retrievers=retrievers)
        

        # Execute agent with error catching
        try:
            response = agent(request.query, agent_name)
        except Exception as agent_error:
            # print(f"Agent execution error: {str(agent_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Agent execution failed: {str(agent_error)}"
            )
        
        # print("Formatting response...")
        # try:
        formatted_response = format_response_to_markdown(response, agent_name)
        # except Exception as format_error:
        #     print(f"Response formatting error: {str(format_error)}")
        #     raise HTTPException(
        #         status_code=500,
        #         detail=f"Response formatting failed: {str(format_error)}"
        #     )
        
        # print("Sending response...")
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
        response = ai_system(request.query)
        formatted_response = format_response_to_markdown(response)
        
        return {
            "agent_name": "ai_system",
            "query": request.query,
            "response": formatted_response,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute_code")
async def execute_code(request: dict):
    try:
        code = request.get("code")
        if not code:
            raise HTTPException(status_code=400, detail="No code provided")
        output, json_outputs = execute_code_from_markdown(code)
        json_outputs = [f"```plotly\n{json_output}\n```\n" for json_output in json_outputs]
        print("len(json_outputs): ", len(json_outputs))
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
