from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging
from src.db.init_db import session_factory
from src.db.schemas.models import Message, MessageFeedback
from src.schemas.chat_schemas import MessageFeedbackCreate, MessageFeedbackResponse
from src.managers.chat_manager import ChatManager
from src.utils.logger import Logger
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Initialize logger
logger = Logger("feedback_routes", see_time=True, console_log=False)

# Initialize router
router = APIRouter(prefix="/feedback", tags=["feedback"])

# Initialize chat manager
chat_manager = ChatManager(db_url=os.getenv("DATABASE_URL"))

@router.post("/message/{message_id}", response_model=MessageFeedbackResponse)
async def create_message_feedback(message_id: int, feedback: MessageFeedbackCreate):
    """Create or update feedback for a message"""
    session = session_factory()
    try:
        # Check if message exists
        message = session.query(Message).filter(Message.message_id == message_id).first()
        if not message:
            raise HTTPException(status_code=404, detail=f"Message with ID {message_id} not found")
        
        # Check if feedback already exists for this message
        existing_feedback = session.query(MessageFeedback).filter(
            MessageFeedback.message_id == message_id
        ).first()
        
        now = datetime.utcnow()
        
        if existing_feedback:
            # Update existing feedback
            existing_feedback.rating = feedback.rating
            existing_feedback.model_name = feedback.model_name
            existing_feedback.model_provider = feedback.model_provider
            existing_feedback.temperature = feedback.temperature
            existing_feedback.max_tokens = feedback.max_tokens
            existing_feedback.updated_at = now
            feedback_record = existing_feedback
        else:
            # Create new feedback
            feedback_record = MessageFeedback(
                message_id=message_id,
                rating=feedback.rating,
                model_name=feedback.model_name,
                model_provider=feedback.model_provider,
                temperature=feedback.temperature,
                max_tokens=feedback.max_tokens,
                created_at=now,
                updated_at=now
            )
            session.add(feedback_record)
        
        session.commit()
        
        return {
            "feedback_id": feedback_record.feedback_id,
            "message_id": feedback_record.message_id,
            "rating": feedback_record.rating,
            "feedback_comment": feedback_record.feedback_comment,
            "model_name": feedback_record.model_name,
            "model_provider": feedback_record.model_provider,
            "temperature": feedback_record.temperature,
            "max_tokens": feedback_record.max_tokens,
            "created_at": feedback_record.created_at.isoformat(),
            "updated_at": feedback_record.updated_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        logger.log_message(f"Error creating/updating feedback: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to create/update feedback: {str(e)}")
    finally:
        session.close()

@router.get("/message/{message_id}", response_model=MessageFeedbackResponse)
async def get_message_feedback(message_id: int):
    """Get feedback for a specific message"""
    session = session_factory()
    try:
        # Check if feedback exists for this message
        feedback = session.query(MessageFeedback).filter(
            MessageFeedback.message_id == message_id
        ).first()
        
        if not feedback:
            raise HTTPException(status_code=404, detail=f"No feedback found for message with ID {message_id}")
        
        return {
            "feedback_id": feedback.feedback_id,
            "message_id": feedback.message_id,
            "rating": feedback.rating,
            "feedback_comment": feedback.feedback_comment,
            "model_name": feedback.model_name,
            "model_provider": feedback.model_provider,
            "temperature": feedback.temperature,
            "max_tokens": feedback.max_tokens,
            "created_at": feedback.created_at.isoformat(),
            "updated_at": feedback.updated_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error retrieving feedback: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve feedback: {str(e)}")
    finally:
        session.close()

@router.get("/chat/{chat_id}", response_model=List[MessageFeedbackResponse])
async def get_chat_feedback(chat_id: int):
    """Get all feedback for messages in a specific chat"""
    session = session_factory()
    try:
        # Query all feedback for messages in this chat
        feedback_records = session.query(MessageFeedback).join(
            Message, Message.message_id == MessageFeedback.message_id
        ).filter(
            Message.chat_id == chat_id
        ).all()
        
        if not feedback_records:
            return []
        
        return [{
            "feedback_id": feedback.feedback_id,
            "message_id": feedback.message_id,
            "rating": feedback.rating,
            "feedback_comment": feedback.feedback_comment,
            "model_name": feedback.model_name,
            "model_provider": feedback.model_provider,
            "temperature": feedback.temperature,
            "max_tokens": feedback.max_tokens,
            "created_at": feedback.created_at.isoformat(),
            "updated_at": feedback.updated_at.isoformat()
        } for feedback in feedback_records]
    except Exception as e:
        logger.log_message(f"Error retrieving chat feedback: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve chat feedback: {str(e)}")
    finally:
        session.close() 