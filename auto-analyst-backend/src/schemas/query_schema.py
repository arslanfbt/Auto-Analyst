from typing import List, Optional
from pydantic import BaseModel

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