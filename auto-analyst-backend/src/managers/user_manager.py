import logging
import os
from typing import Optional
from datetime import datetime, UTC

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyHeader

from src.db.init_db import get_session
from src.db.schemas.models import User as DBUser, AgentTemplate, UserTemplatePreference
from src.schemas.user_schema import User
from src.utils.logger import Logger

logger = Logger("user_manager", see_time=True, console_log=False)

# Define API key header for authentication
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def get_current_user(
    request: Request,
    api_key: Optional[str] = Depends(api_key_header)
) -> Optional[User]:
    """
    Dependency to get the current authenticated user.
    Returns None if no user is authenticated.
    """
    # FastAPI resolves the `api_key` parameter when this function is used as a dependency. However, when the
    # function is called directly (e.g. from the session manager), the `api_key` parameter will still hold the
    # unresolved `Depends` placeholder object. In that case – or when no API key is supplied – we need to
    # manually look for the key in the request headers or query parameters.

    if not api_key or not isinstance(api_key, str):
        # Prefer header first for consistency with the dependency implementation
        api_key = request.headers.get(API_KEY_NAME) or request.query_params.get("api_key")

        # If an API key still isn't available, treat the caller as anonymous
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
                # Check if api_key is actually a string before converting to int
                if isinstance(api_key, str):
                    user_id = int(api_key)
                    db_user = session.query(DBUser).filter(DBUser.user_id == user_id).first()
                else:
                    # Handle the case where api_key is not a string (like Depends object)
                    logger.log_message("API key is not a string", level=logging.ERROR)
                    return None
            except ValueError:
                # If api_key isn't a number, maybe check by username or something else
                logger.log_message(f"API key is not a number: {api_key}", level=logging.ERROR)
                db_user = session.query(DBUser).filter(DBUser.username == api_key).first()
            
            if not db_user:
                logger.log_message("User not found", level=logging.ERROR)
                return None
                
            return User(
                user_id=db_user.user_id,
                username=db_user.username,
                email=db_user.email
            )
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error authenticating user: {str(e)}", level=logging.ERROR)
        return None

# Function to create a new user
def create_user(username: str, email: str) -> User:
    """Create a new user in the database"""
    session = get_session()
    try:
        # Check if user with this email already exists
        existing_user = session.query(DBUser).filter(DBUser.email == email).first()
        if existing_user:
            return User(
                user_id=existing_user.user_id,
                username=existing_user.username,
                email=existing_user.email
            )
            
        # Create new user
        new_user = DBUser(
            username=username,
            email=email
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        # Enable default agents for the new user
        _enable_default_agents_for_user(new_user.user_id, session)
        
        return User(
            user_id=new_user.user_id,
            username=new_user.username,
            email=new_user.email
        )
    
    except Exception as e:
        session.rollback()
        logger.log_message(f"Error creating user: {str(e)}", logging.ERROR)
        raise
    
    finally:
        session.close() 

def get_user_by_email(email: str) -> Optional[User]:
    """Get a user by email"""
    session = get_session()
    try:
        user = session.query(DBUser).filter(DBUser.email == email).first()
        if user is None:
            return None
        return User(
            user_id=user.user_id,
            username=user.username,
            email=user.email
        )
    except Exception as e:
        logger.log_message(f"Error getting user by email: {str(e)}", logging.ERROR)
        return None
    finally:
        session.close()

def _enable_default_agents_for_user(user_id: int, session):
    """Enable default agents for a new user"""
    try:
        # Get all default agents (the 4 built-in agents)
        default_agent_names = [
            "preprocessing_agent",
            "statistical_analytics_agent", 
            "sk_learn_agent",
            "data_viz_agent"
        ]
        
        # Find these agents in the database
        default_agents = session.query(AgentTemplate).filter(
            AgentTemplate.template_name.in_(default_agent_names),
            AgentTemplate.is_active == True
        ).all()
        
        # Enable each default agent for the user
        for agent in default_agents:
            # Check if preference already exists
            existing_pref = session.query(UserTemplatePreference).filter(
                UserTemplatePreference.user_id == user_id,
                UserTemplatePreference.template_id == agent.template_id
            ).first()
            
            if not existing_pref:
                # Create new preference with enabled=True
                new_pref = UserTemplatePreference(
                    user_id=user_id,
                    template_id=agent.template_id,
                    is_enabled=True,  # Enable by default
                    usage_count=0,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC)
                )
                session.add(new_pref)
        
        session.commit()
        logger.log_message(f"Enabled {len(default_agents)} default agents for user {user_id}", level=logging.INFO)
        
    except Exception as e:
        session.rollback()
        logger.log_message(f"Error enabling default agents for user {user_id}: {str(e)}", level=logging.ERROR)
        raise
