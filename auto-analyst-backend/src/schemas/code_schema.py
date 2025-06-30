from pydantic import BaseModel
from typing import Optional

# Request body model
class CodeExecuteRequest(BaseModel):
    code: str
    session_id: Optional[str] = None
    message_id: Optional[int] = None
    
class CodeEditRequest(BaseModel):
    original_code: str
    user_prompt: str
    
class CodeFixRequest(BaseModel):
    code: str
    error: str
    
class CodeCleanRequest(BaseModel):
    code: str
    
class GetLatestCodeRequest(BaseModel):
    message_id: int
    