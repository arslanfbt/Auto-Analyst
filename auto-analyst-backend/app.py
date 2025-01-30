from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi_sqlalchemy import DBSessionMiddleware, db
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pandas as pd
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
import dspy
from typing import List
import uvicorn

# Import custom modules and models
from agents import *
from retrievers import *
from db_models import Response, Query
from llama_index.core import Document
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import VectorStoreIndex

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="AI Analytics API", version="1.0")

# Configure middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(DBSessionMiddleware, db_url="sqlite:///response.db")

# DSPy Configuration
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

@app.on_event("startup")
async def startup():
    # setup db
    Base.metadata.create_all(bind=engine)

@app.post("/upload_dataframe", response_model=dict)
async def upload_dataframe(data: DataFrameRequest):
    try:
        df = pd.read_csv(data.file)
        global retrievers
        retrievers = initialize_retrievers(data.styling_instructions, [str(df)])
        return {"message": "Dataframe uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/queries", response_model=List[dict])
async def get_queries():
    with db():
        queries = db.session.query(Query).order_by(Query.created_at.desc()).all()
        return [query.to_dict() for query in queries]

@app.get("/queries/{id}", response_model=dict)
async def get_query(id: int):
    with db():
        query = db.session.query(Query).filter(Query.id == id).first()
        if not query:
            raise HTTPException(status_code=404, detail="Query not found")
        return query.to_dict()

@app.get("/responses", response_model=List[dict])
async def get_responses():
    with db():
        responses = db.session.query(Response).order_by(Response.created_at.desc()).all()
        return [response.to_dict() for response in responses]

@app.get("/responses/query/{query_id}", response_model=List[dict])
async def get_responses_by_query(query_id: int):
    with db():
        responses = db.session.query(Response).filter_by(query_id=query_id).all()
        return [response.to_dict() for response in responses]

@app.post("/chat/{agent_name}", response_model=dict)
async def chat_with_agent(agent_name: str, request: QueryRequest):
    with db():
        if agent_name not in AVAILABLE_AGENTS:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        agent = AVAILABLE_AGENTS[agent_name]
        query = Query(query=request.query)
        db.session.add(query)
        db.session.commit()
        
        response_text = agent(request.query)
        response = Response(
            query_id=query.id,
            agent_name=agent_name,
            query=request.query,
            response=response_text,
        )
        db.session.add(response)
        db.session.commit()
        return response.to_dict()

@app.post("/chat", response_model=dict)
async def chat_with_all(request: QueryRequest):
    with db():
        query = Query(query=request.query)
        db.session.add(query)
        db.session.commit()
        
        response_text = ai_system(request.query)
        response = Response(
            query_id=query.id,
            agent_name="ai_system",
            query=request.query,
            response=response_text,
        )
        db.session.add(response)
        db.session.commit()
        return response.to_dict()

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
