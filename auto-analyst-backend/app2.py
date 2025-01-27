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
dspy.configure(lm=dspy.LM(model="gpt-4o-mini", api_key=os.getenv("OPENAI_API_KEY"), temperature=0, max_tokens=1000))

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
    if agent_name not in AVAILABLE_AGENTS:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent = AVAILABLE_AGENTS[agent_name]
    response_text = agent(request.query)
    return {
        "agent_name": agent_name,
        "query": request.query,
        "response": response_text,
    }

@app.post("/chat", response_model=dict)
async def chat_with_all(request: QueryRequest):
    response_text = ai_system(request.query)
    return {
        "agent_name": "ai_system",
        "query": request.query,
        "response": response_text,
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
