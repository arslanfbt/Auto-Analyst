from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from chat_manager import ChatManager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/chats", tags=["chats"])

# Initialize chat manager
chat_manager = ChatManager()

# Pydantic models for request/response validation
class MessageCreate(BaseModel):
    content: str
    sender: str

class ChatResponse(BaseModel):
    chat_id: int
    title: str
    created_at: str
    user_id: Optional[int] = None
    
class MessageResponse(BaseModel):
    message_id: int
    chat_id: int
    content: str
    sender: str
    timestamp: str

class ChatDetailResponse(BaseModel):
    chat_id: int
    title: str
    created_at: str
    user_id: Optional[int] = None
    messages: List[MessageResponse]

class UserInfo(BaseModel):
    username: str
    email: str

# Add this class to define the request model
class ChatCreate(BaseModel):
    user_id: Optional[int] = None

class ChatUpdate(BaseModel):
    title: Optional[str] = None
    user_id: Optional[int] = None

# Routes
@router.post("/", response_model=ChatResponse)
async def create_chat(chat_create: ChatCreate):
    """Create a new chat session"""
    try:
        chat = chat_manager.create_chat(chat_create.user_id)
        return chat
    except Exception as e:
        logger.error(f"Error creating chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create chat: {str(e)}")

@router.post("/{chat_id}/messages", response_model=MessageResponse)
async def add_message(chat_id: int, message: MessageCreate):
    """Add a message to a chat"""
    try:
        result = chat_manager.add_message(chat_id, message.content, message.sender)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add message: {str(e)}")

@router.get("/{chat_id}", response_model=ChatDetailResponse)
async def get_chat(chat_id: int, user_id: int = Query(..., description="ID of the user requesting access")):
    """Get a chat by ID with all messages, verifying user has access"""
    try:
        chat = chat_manager.get_chat(chat_id, user_id)
        return chat
    except ValueError as e:
        raise HTTPException(status_code=404 if "not found" in str(e) else 403, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrieving chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat: {str(e)}")

@router.get("/", response_model=List[ChatResponse])
async def get_chats(
    user_id: int = Query(..., description="ID of the user whose chats to retrieve"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get recent chats for the specified user only"""
    try:
        chats = chat_manager.get_user_chats(user_id, limit, offset)
        return chats
    except Exception as e:
        logger.error(f"Error retrieving chats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chats: {str(e)}")

@router.delete("/{chat_id}")
async def delete_chat(chat_id: int):
    """Delete a chat and all its messages"""
    try:
        success = chat_manager.delete_chat(chat_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Chat with ID {chat_id} not found")
        return {"message": f"Chat {chat_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete chat: {str(e)}")

@router.get("/search/", response_model=List[ChatResponse])
async def search_chats(
    query: str,
    user_id: Optional[int] = None,
    limit: int = Query(10, ge=1, le=100)
):
    """Search for chats containing the query string"""
    try:
        chats = chat_manager.search_chats(query, user_id, limit)
        return chats
    except Exception as e:
        logger.error(f"Error searching chats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search chats: {str(e)}")

@router.post("/users", response_model=dict)
async def create_or_get_user(user_info: UserInfo):
    """Create a new user or get an existing one by email"""
    try:
        user = chat_manager.get_or_create_user(
            username=user_info.username,
            email=user_info.email
        )
        return user
    except Exception as e:
        logger.error(f"Error creating/getting user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process user: {str(e)}")

@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(chat_id: int, chat_update: ChatUpdate):
    """Update a chat's title or user_id"""
    try:
        chat = chat_manager.update_chat(
            chat_id=chat_id,
            title=chat_update.title,
            user_id=chat_update.user_id
        )
        return chat
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update chat: {str(e)}") 