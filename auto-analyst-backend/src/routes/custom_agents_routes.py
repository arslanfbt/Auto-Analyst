import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, UTC
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError

from src.db.init_db import session_factory
from src.db.schemas.models import CustomAgent, User
from src.utils.logger import Logger

# Initialize logger with console logging disabled
logger = Logger("custom_agents_routes", see_time=True, console_log=False)

# Initialize router
router = APIRouter(prefix="/custom_agents", tags=["custom_agents"])

# Pydantic models for request/response
class CustomAgentCreate(BaseModel):
    agent_name: str = Field(..., min_length=1, max_length=100, description="Unique agent name (e.g., 'pytorch_agent')")
    display_name: Optional[str] = Field(None, max_length=200, description="User-friendly display name")
    description: str = Field(..., min_length=10, max_length=1000, description="Short description for agent selection")
    prompt_template: str = Field(..., min_length=50, description="Main prompt/instructions for agent behavior")

class CustomAgentUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=1000)
    prompt_template: Optional[str] = Field(None, min_length=50)
    is_active: Optional[bool] = None

class CustomAgentResponse(BaseModel):
    agent_id: int
    agent_name: str
    display_name: Optional[str]
    description: str
    prompt_template: str
    is_active: bool
    usage_count: int
    created_at: datetime
    updated_at: datetime

class CustomAgentListResponse(BaseModel):
    agent_id: int
    agent_name: str
    display_name: Optional[str]
    description: str
    is_active: bool
    usage_count: int
    created_at: datetime

# Routes
@router.post("/", response_model=CustomAgentResponse)
async def create_custom_agent(agent: CustomAgentCreate, user_id: int = Query(...)):
    """Create a new custom agent for a user"""
    try:
        session = session_factory()
        
        try:
            # Validate user exists
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Create new custom agent
            now = datetime.now(UTC)
            new_agent = CustomAgent(
                user_id=user_id,
                agent_name=agent.agent_name.lower().strip(),
                display_name=agent.display_name,
                description=agent.description,
                prompt_template=agent.prompt_template,
                is_active=True,
                usage_count=0,
                created_at=now,
                updated_at=now
            )
            
            session.add(new_agent)
            session.commit()
            session.refresh(new_agent)
            
            logger.log_message(f"Created custom agent '{agent.agent_name}' for user {user_id}", level=logging.INFO)
            
            return CustomAgentResponse(
                agent_id=new_agent.agent_id,
                agent_name=new_agent.agent_name,
                display_name=new_agent.display_name,
                description=new_agent.description,
                prompt_template=new_agent.prompt_template,
                is_active=new_agent.is_active,
                usage_count=new_agent.usage_count,
                created_at=new_agent.created_at,
                updated_at=new_agent.updated_at
            )
            
        except IntegrityError:
            session.rollback()
            raise HTTPException(status_code=400, detail=f"Agent name '{agent.agent_name}' already exists for this user")
        except Exception as e:
            session.rollback()
            logger.log_message(f"Error creating custom agent: {str(e)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Failed to create custom agent: {str(e)}")
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error creating custom agent: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to create custom agent: {str(e)}")

@router.get("/", response_model=List[CustomAgentListResponse])
async def get_custom_agents(
    user_id: int = Query(...),
    active_only: bool = Query(False, description="Return only active agents"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get custom agents for a user"""
    try:
        session = session_factory()
        
        try:
            query = session.query(CustomAgent).filter(CustomAgent.user_id == user_id)
            
            if active_only:
                query = query.filter(CustomAgent.is_active == True)
                
            # Order by most recently created first
            query = query.order_by(desc(CustomAgent.created_at))
            
            agents = query.limit(limit).offset(offset).all()
            
            return [CustomAgentListResponse(
                agent_id=agent.agent_id,
                agent_name=agent.agent_name,
                display_name=agent.display_name,
                description=agent.description,
                is_active=agent.is_active,
                usage_count=agent.usage_count,
                created_at=agent.created_at
            ) for agent in agents]
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving custom agents: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve custom agents: {str(e)}")

@router.get("/{agent_id}", response_model=CustomAgentResponse)
async def get_custom_agent(agent_id: int, user_id: int = Query(...)):
    """Get a specific custom agent by ID"""
    try:
        session = session_factory()
        
        try:
            agent = session.query(CustomAgent).filter(
                CustomAgent.agent_id == agent_id,
                CustomAgent.user_id == user_id
            ).first()
            
            if not agent:
                raise HTTPException(status_code=404, detail=f"Custom agent with ID {agent_id} not found")
                
            return CustomAgentResponse(
                agent_id=agent.agent_id,
                agent_name=agent.agent_name,
                display_name=agent.display_name,
                description=agent.description,
                prompt_template=agent.prompt_template,
                is_active=agent.is_active,
                usage_count=agent.usage_count,
                created_at=agent.created_at,
                updated_at=agent.updated_at
            )
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error retrieving custom agent: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve custom agent: {str(e)}")

@router.put("/{agent_id}", response_model=CustomAgentResponse)
async def update_custom_agent(agent_id: int, agent_update: CustomAgentUpdate, user_id: int = Query(...)):
    """Update a custom agent"""
    try:
        session = session_factory()
        
        try:
            agent = session.query(CustomAgent).filter(
                CustomAgent.agent_id == agent_id,
                CustomAgent.user_id == user_id
            ).first()
            
            if not agent:
                raise HTTPException(status_code=404, detail=f"Custom agent with ID {agent_id} not found")
                
            # Update fields if provided
            if agent_update.display_name is not None:
                agent.display_name = agent_update.display_name
            if agent_update.description is not None:
                agent.description = agent_update.description
            if agent_update.prompt_template is not None:
                agent.prompt_template = agent_update.prompt_template
            if agent_update.is_active is not None:
                agent.is_active = agent_update.is_active
                
            agent.updated_at = datetime.now(UTC)
            session.commit()
            session.refresh(agent)
            
            logger.log_message(f"Updated custom agent {agent_id} for user {user_id}", level=logging.INFO)
            
            return CustomAgentResponse(
                agent_id=agent.agent_id,
                agent_name=agent.agent_name,
                display_name=agent.display_name,
                description=agent.description,
                prompt_template=agent.prompt_template,
                is_active=agent.is_active,
                usage_count=agent.usage_count,
                created_at=agent.created_at,
                updated_at=agent.updated_at
            )
            
        except Exception as e:
            session.rollback()
            logger.log_message(f"Error updating custom agent: {str(e)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Failed to update custom agent: {str(e)}")
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error updating custom agent: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to update custom agent: {str(e)}")

@router.delete("/{agent_id}")
async def delete_custom_agent(agent_id: int, user_id: int = Query(...)):
    """Delete a custom agent"""
    try:
        session = session_factory()
        
        try:
            agent = session.query(CustomAgent).filter(
                CustomAgent.agent_id == agent_id,
                CustomAgent.user_id == user_id
            ).first()
            
            if not agent:
                raise HTTPException(status_code=404, detail=f"Custom agent with ID {agent_id} not found")
                
            session.delete(agent)
            session.commit()
            
            logger.log_message(f"Deleted custom agent {agent_id} for user {user_id}", level=logging.INFO)
            
            return {"message": f"Custom agent {agent_id} deleted successfully"}
            
        except Exception as e:
            session.rollback()
            logger.log_message(f"Error deleting custom agent: {str(e)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Failed to delete custom agent: {str(e)}")
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error deleting custom agent: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to delete custom agent: {str(e)}")

@router.post("/{agent_id}/increment_usage")
async def increment_usage_count(agent_id: int, user_id: int = Query(...)):
    """Increment usage count for a custom agent"""
    try:
        session = session_factory()
        
        try:
            agent = session.query(CustomAgent).filter(
                CustomAgent.agent_id == agent_id,
                CustomAgent.user_id == user_id
            ).first()
            
            if not agent:
                raise HTTPException(status_code=404, detail=f"Custom agent with ID {agent_id} not found")
                
            agent.usage_count += 1
            agent.updated_at = datetime.now(UTC)
            session.commit()
            
            logger.log_message(f"Incremented usage count for agent {agent_id} (now: {agent.usage_count})", level=logging.INFO)
            
            return {"message": "Usage count incremented", "usage_count": agent.usage_count}
            
        except Exception as e:
            session.rollback()
            logger.log_message(f"Error incrementing usage count: {str(e)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Failed to increment usage count: {str(e)}")
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error incrementing usage count: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to increment usage count: {str(e)}")

@router.get("/validate_name/{agent_name}")
async def validate_agent_name(agent_name: str, user_id: int = Query(...)):
    """Check if an agent name is available for a user"""
    try:
        session = session_factory()
        
        try:
            existing_agent = session.query(CustomAgent).filter(
                CustomAgent.user_id == user_id,
                CustomAgent.agent_name == agent_name.lower().strip()
            ).first()
            
            is_available = existing_agent is None
            
            return {
                "agent_name": agent_name,
                "is_available": is_available,
                "message": "Agent name is available" if is_available else "Agent name already exists"
            }
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error validating agent name: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to validate agent name: {str(e)}") 