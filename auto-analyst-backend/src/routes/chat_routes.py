from datetime import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from src.db.init_db import session_factory
from src.db.schemas.models import ModelUsage
from src.managers.ai_manager import AI_Manager
from src.managers.chat_manager import ChatManager
from src.managers.user_manager import get_current_user, User
from src.schemas.chat_schemas import *
from src.utils.logger import Logger

# Initialize logger with console logging disabled
logger = Logger("chat_routes", see_time=True, console_log=False)

# Initialize router
router = APIRouter(prefix="/chats", tags=["chats"])

# Initialize chat manager
chat_manager = ChatManager()

# Initialize AI manager
ai_manager = AI_Manager()


# Routes
@router.post("/", response_model=ChatResponse)
async def create_chat(chat_create: ChatCreate):
    """Create a new chat session"""
    try:
        chat = chat_manager.create_chat(chat_create.user_id)
        return chat
    except Exception as e:
        logger.log_message(f"Error creating chat: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to create chat: {str(e)}")

@router.post("/{chat_id}/messages", response_model=MessageResponse)
async def add_message(chat_id: int, message: MessageCreate, user_id: Optional[int] = None):
    """Add a message to a chat"""
    try:
        result = chat_manager.add_message(chat_id, message.content, message.sender, user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.log_message(f"Error adding message: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to add message: {str(e)}")

@router.get("/{chat_id}", response_model=ChatDetailResponse)
async def get_chat(chat_id: int, user_id: Optional[int] = None):
    """Get a chat by ID with all messages"""
    try:
        chat = chat_manager.get_chat(chat_id, user_id)
        return chat
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.log_message(f"Error retrieving chat: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat: {str(e)}")

@router.get("/", response_model=List[ChatResponse])
async def get_chats(
    user_id: Optional[int] = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get recent chats, optionally filtered by user_id"""
    try:
        chats = chat_manager.get_user_chats(user_id, limit, offset)
        return chats
    except Exception as e:
        logger.log_message(f"Error retrieving chats: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chats: {str(e)}")

@router.delete("/{chat_id}")
async def delete_chat(chat_id: int, user_id: Optional[int] = None):
    """Delete a chat and all its messages"""
    try:
        success = chat_manager.delete_chat(chat_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Chat with ID {chat_id} not found or access denied")
        return {"message": f"Chat {chat_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error deleting chat: {str(e)}", level=logging.ERROR)
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
        logger.log_message(f"Error searching chats: {str(e)}", level=logging.ERROR)
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
        logger.log_message(f"Error creating/getting user: {str(e)}", level=logging.ERROR)
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
        logger.log_message(f"Error updating chat: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to update chat: {str(e)}")

@router.post("/cleanup-empty", response_model=dict)
async def cleanup_empty_chats(request: ChatCreate):
    """Delete empty chats for a user"""
    try:
        deleted_count = chat_manager.delete_empty_chats(request.user_id, request.is_admin)
        return {"message": f"Deleted {deleted_count} empty chats"}
    except Exception as e:
        logger.log_message(f"Error cleaning up empty chats: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to clean up empty chats: {str(e)}")

@router.post("/debug/test-model-usage")
async def test_model_usage(
    model_name: str = "gpt-3.5-turbo", 
    user_id: Optional[int] = None
):
    """Debug endpoint to manually test model usage tracking"""
    try:
        # Generate a test prompt
        test_prompt = "This is a test message to verify model usage tracking."
        
        # Call the AI manager directly
        response = await ai_manager.generate_response(
            prompt=test_prompt,
            model_name=model_name,
            user_id=user_id,
            chat_id=999  # Test chat ID
        )
        
        # Get the latest model usage entry
        session = session_factory()
        try:
            latest_usage = session.query(ModelUsage).order_by(ModelUsage.usage_id.desc()).first()
            
            return {
                "success": True,
                "message": "Model usage tracking test completed",
                "response": response,
                "usage_recorded": {
                    "usage_id": latest_usage.usage_id if latest_usage else None,
                    "model_name": latest_usage.model_name if latest_usage else None,
                    "tokens": latest_usage.total_tokens if latest_usage else None,
                    "cost": latest_usage.cost if latest_usage else None,
                    "timestamp": latest_usage.timestamp.isoformat() if latest_usage else None
                }
            }
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error in test-model-usage: {str(e)}", level=logging.ERROR)
        return {
            "success": False,
            "error": str(e)
        } 
    