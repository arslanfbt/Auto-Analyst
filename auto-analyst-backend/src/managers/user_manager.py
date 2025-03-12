from fastapi import Depends, HTTPException, status, Request
from fastapi.security import APIKeyHeader
from typing import Optional
from pydantic import BaseModel
import os
from src.init_db import User as DBUser, get_session
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define API key header for authentication
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# User model for API responses
class User(BaseModel):
    user_id: int
    username: str
    email: str
    credits: int

    class Config:
        orm_mode = True

async def get_current_user(
    request: Request,
    api_key: Optional[str] = Depends(api_key_header)
) -> Optional[User]:
    """
    Dependency to get the current authenticated user.
    Returns None if no user is authenticated.
    """
    # If no API key is provided, return None (anonymous user)
    if not api_key:
        # Check for API key in query parameters (fallback)
        api_key = request.query_params.get("api_key")
        if not api_key:
            return None
    
    try:
        # In a real application, you'd validate the API key against stored user keys
        # For this example, we'll use a simple lookup using user id
        session = get_session()
        
        try:
            # Simplified example: assume API key is the user_id for demonstration
            # In a real app, you'd do a secure lookup
            try:
                user_id = int(api_key)
                db_user = session.query(DBUser).filter(DBUser.user_id == user_id).first()
            except ValueError:
                # If api_key isn't a number, maybe check by username or something else
                db_user = session.query(DBUser).filter(DBUser.username == api_key).first()
            
            if not db_user:
                return None
                
            return User(
                user_id=db_user.user_id,
                username=db_user.username,
                email=db_user.email,
                credits=db_user.credits
            )
            
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error authenticating user: {str(e)}")
        return None

# Function to create a new user
def create_user(username, email, credits=100):
    """Create a new user with default credits"""
    session = get_session()
    try:
        # Check if user already exists
        existing_user = session.query(DBUser).filter(DBUser.username == username).first()
        if existing_user:
            # Don't reset credits for existing users
            return User(
                user_id=existing_user.user_id,
                username=existing_user.username,
                email=existing_user.email,
                credits=existing_user.credits  # Use existing credits, not default value
            )
        
        # Create new user
        db_user = DBUser(
            username=username,
            email=email,
            credits=credits
        )
        session.add(db_user)
        session.commit()
        
        return User(
            user_id=db_user.user_id,
            username=db_user.username,
            email=db_user.email,
            credits=db_user.credits
        )
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def get_user_by_email(email: str) -> Optional[User]:
    """Get a user by email"""
    session = get_session()
    try:
        user = session.query(DBUser).filter(DBUser.email == email).first()
        return User(
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            credits=user.credits
        )
    except Exception as e:
        logger.error(f"Error getting user by email: {str(e)}")
        return None
