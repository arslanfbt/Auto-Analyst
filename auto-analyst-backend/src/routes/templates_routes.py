import logging
import os
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, UTC
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError

from src.db.init_db import session_factory
from src.db.schemas.models import AgentTemplate, User, UserTemplatePreference
from src.utils.logger import Logger
from src.agents.agents import get_all_available_templates, toggle_user_template_preference

# Initialize logger with console logging disabled
logger = Logger("templates_routes", see_time=True, console_log=False)

# Initialize router
router = APIRouter(prefix="/templates", tags=["templates"])

# Pydantic models for request/response
class TemplateResponse(BaseModel):
    template_id: int
    template_name: str
    display_name: Optional[str]
    description: str
    prompt_template: str
    template_category: Optional[str]
    is_premium_only: bool
    is_active: bool
    usage_count: int
    created_at: datetime
    updated_at: datetime

class UserTemplatePreferenceResponse(BaseModel):
    template_id: int
    template_name: str
    display_name: Optional[str]
    description: str
    template_category: Optional[str]
    is_premium_only: bool
    is_enabled: bool
    usage_count: int
    last_used_at: Optional[datetime]

class ToggleTemplateRequest(BaseModel):
    is_enabled: bool = Field(..., description="Whether to enable or disable the template")

# Routes
@router.get("/", response_model=List[TemplateResponse])
async def get_all_templates():
    """Get all available agent templates"""
    try:
        session = session_factory()
        
        try:
            templates = get_all_available_templates(session)
            
            return [TemplateResponse(
                template_id=template.template_id,
                template_name=template.template_name,
                display_name=template.display_name,
                description=template.description,
                prompt_template=template.prompt_template,
                template_category=template.category,
                is_premium_only=template.is_premium_only,
                is_active=template.is_active,
                usage_count=0,  # Templates don't track global usage count anymore
                created_at=template.created_at,
                updated_at=template.updated_at
            ) for template in templates]
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving templates: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve templates: {str(e)}")

@router.get("/user/{user_id}", response_model=List[UserTemplatePreferenceResponse])
async def get_user_template_preferences(user_id: int):
    """Get all templates with user preferences (enabled/disabled status and usage)"""
    try:
        session = session_factory()
        
        try:
            # Validate user exists
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get all active templates
            templates = session.query(AgentTemplate).filter(
                AgentTemplate.is_active == True
            ).all()
            
            result = []
            for template in templates:
                # Get user preference for this template if it exists
                preference = session.query(UserTemplatePreference).filter(
                    UserTemplatePreference.user_id == user_id,
                    UserTemplatePreference.template_id == template.template_id
                ).first()
                
                result.append(UserTemplatePreferenceResponse(
                    template_id=template.template_id,
                    template_name=template.template_name,
                    display_name=template.display_name,
                    description=template.description,
                    template_category=template.category,
                    is_premium_only=template.is_premium_only,
                    is_enabled=preference.is_enabled if preference else False,  # Default to disabled
                    usage_count=preference.usage_count if preference else 0,
                    last_used_at=preference.last_used_at if preference else None
                ))
            
            return result
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error retrieving user template preferences: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user template preferences: {str(e)}")

@router.get("/user/{user_id}/enabled", response_model=List[UserTemplatePreferenceResponse])
async def get_user_enabled_templates(user_id: int):
    """Get only templates that are enabled for the user (all templates enabled by default)"""
    try:
        session = session_factory()
        
        try:
            # Validate user exists
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get all active templates
            all_templates = session.query(AgentTemplate).filter(
                AgentTemplate.is_active == True
            ).all()
            
            result = []
            for template in all_templates:
                # Check if user has a preference record for this template
                preference = session.query(UserTemplatePreference).filter(
                    UserTemplatePreference.user_id == user_id,
                    UserTemplatePreference.template_id == template.template_id
                ).first()
                
                # Template is disabled by default unless explicitly enabled
                is_enabled = preference.is_enabled if preference else False
                
                if is_enabled:
                    result.append(UserTemplatePreferenceResponse(
                        template_id=template.template_id,
                        template_name=template.template_name,
                        display_name=template.display_name,
                        description=template.description,
                        template_category=template.category,
                        is_premium_only=template.is_premium_only,
                        is_enabled=True,
                        usage_count=preference.usage_count if preference else 0,
                        last_used_at=preference.last_used_at if preference else None
                    ))
            
            return result
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error retrieving user enabled templates: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user enabled templates: {str(e)}")

@router.get("/user/{user_id}/enabled/planner", response_model=List[UserTemplatePreferenceResponse])
async def get_user_enabled_templates_for_planner(user_id: int):
    """Get enabled templates for planner use (max 10 templates)"""
    try:
        session = session_factory()
        
        try:
            # Validate user exists
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get enabled templates ordered by usage (most used first) and limit to 10
            enabled_preferences = session.query(UserTemplatePreference).filter(
                UserTemplatePreference.user_id == user_id,
                UserTemplatePreference.is_enabled == True
            ).order_by(
                UserTemplatePreference.usage_count.desc(),
                UserTemplatePreference.last_used_at.desc()
            ).limit(10).all()
            
            result = []
            for preference in enabled_preferences:
                # Get template details
                template = session.query(AgentTemplate).filter(
                    AgentTemplate.template_id == preference.template_id,
                    AgentTemplate.is_active == True
                ).first()
                
                if template:
                    result.append(UserTemplatePreferenceResponse(
                        template_id=template.template_id,
                        template_name=template.template_name,
                        display_name=template.display_name,
                        description=template.description,
                        template_category=template.category,
                        is_premium_only=template.is_premium_only,
                        is_enabled=True,
                        usage_count=preference.usage_count,
                        last_used_at=preference.last_used_at
                    ))
            
            logger.log_message(f"Retrieved {len(result)} enabled templates for planner for user {user_id}", level=logging.INFO)
            return result
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error retrieving planner templates for user {user_id}: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve planner templates: {str(e)}")

@router.post("/user/{user_id}/template/{template_id}/toggle")
async def toggle_template_preference(user_id: int, template_id: int, request: ToggleTemplateRequest):
    """Toggle a user's template preference (enable/disable for planner use)"""
    try:
        session = session_factory()
        
        try:
            # Validate user exists
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            success, message = toggle_user_template_preference(
                user_id, template_id, request.is_enabled, session
            )
            
            if not success:
                raise HTTPException(status_code=400, detail=message)
            
            logger.log_message(f"Toggled template {template_id} for user {user_id}: {message}", level=logging.INFO)
            
            return {"message": message}
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error toggling template preference: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to toggle template preference: {str(e)}")

@router.post("/user/{user_id}/bulk-toggle")
async def bulk_toggle_template_preferences(user_id: int, request: dict):
    """Bulk toggle multiple template preferences"""
    try:
        session = session_factory()
        
        try:
            # Validate user exists
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            template_preferences = request.get("preferences", [])
            if not template_preferences:
                raise HTTPException(status_code=400, detail="No preferences provided")
            
            # Check current enabled count for limit enforcement
            current_enabled_count = session.query(UserTemplatePreference).filter(
                UserTemplatePreference.user_id == user_id,
                UserTemplatePreference.is_enabled == True
            ).count()
            
            # Count how many templates we're trying to enable
            enabling_count = sum(1 for pref in template_preferences if pref.get("is_enabled", False))
            disabling_count = sum(1 for pref in template_preferences if not pref.get("is_enabled", False))
            
            # Calculate what the new count would be
            projected_enabled_count = current_enabled_count + enabling_count - disabling_count
            
            results = []
            for pref in template_preferences:
                template_id = pref.get("template_id")
                is_enabled = pref.get("is_enabled", True)
                
                if template_id is None:
                    results.append({"template_id": None, "success": False, "message": "Template ID required"})
                    continue
                
                # Check 10-template limit for enabling
                if is_enabled and projected_enabled_count > 10:
                    results.append({
                        "template_id": template_id,
                        "success": False,
                        "message": "Cannot enable more than 10 templates for planner use",
                        "is_enabled": False
                    })
                    continue
                
                success, message = toggle_user_template_preference(
                    user_id, template_id, is_enabled, session
                )
                
                results.append({
                    "template_id": template_id,
                    "success": success,
                    "message": message,
                    "is_enabled": is_enabled
                })
            
            logger.log_message(f"Bulk toggled {len(template_preferences)} templates for user {user_id}", level=logging.INFO)
            
            return {"results": results}
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error bulk toggling template preferences: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to bulk toggle template preferences: {str(e)}")

@router.get("/template/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: int):
    """Get a specific template by ID"""
    try:
        session = session_factory()
        
        try:
            template = session.query(AgentTemplate).filter(
                AgentTemplate.template_id == template_id
            ).first()
            
            if not template:
                raise HTTPException(status_code=404, detail=f"Template with ID {template_id} not found")
                
            return TemplateResponse(
                template_id=template.template_id,
                template_name=template.template_name,
                display_name=template.display_name,
                description=template.description,
                prompt_template=template.prompt_template,
                template_category=template.category,
                is_premium_only=template.is_premium_only,
                is_active=template.is_active,
                usage_count=0,  # Templates don't track global usage count anymore
                created_at=template.created_at,
                updated_at=template.updated_at
            )
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error retrieving template: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve template: {str(e)}")

@router.get("/categories/list")
async def get_template_categories():
    """Get list of all template categories"""
    try:
        session = session_factory()
        
        try:
            categories = session.query(AgentTemplate.category).filter(
                AgentTemplate.is_active == True,
                AgentTemplate.category.isnot(None)
            ).distinct().all()
            
            category_list = [category[0] for category in categories if category[0]]
            
            return {"categories": category_list}
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving template categories: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve template categories: {str(e)}")

@router.get("/categories")
async def get_templates_by_categories():
    """Get all templates grouped by category for frontend template browser"""
    try:
        session = session_factory()
        
        try:
            # Get all active templates
            templates = session.query(AgentTemplate).filter(
                AgentTemplate.is_active == True
            ).order_by(AgentTemplate.category, AgentTemplate.template_name).all()
            
            # Group templates by category
            categories_dict = {}
            for template in templates:
                category = template.category or "Uncategorized"
                if category not in categories_dict:
                    categories_dict[category] = []
                
                categories_dict[category].append({
                    "agent_id": template.template_id,  # Use template_id as agent_id for compatibility
                    "agent_name": template.template_name,
                    "display_name": template.display_name or template.template_name,
                    "description": template.description,
                    "prompt_template": template.prompt_template,
                    "template_category": template.category,
                    "is_premium_only": template.is_premium_only,
                    "is_active": template.is_active,
                    "usage_count": 0,  # Templates don't track global usage count anymore
                    "created_at": template.created_at.isoformat() if template.created_at else None
                })
            
            # Convert to list format expected by frontend
            result = []
            for category, templates in categories_dict.items():
                result.append({
                    "category": category,
                    "templates": templates
                })
            
            return result
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving templates by categories: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve templates by categories: {str(e)}")

@router.get("/category/{category}")
async def get_templates_by_category(category: str):
    """Get all templates in a specific category"""
    try:
        session = session_factory()
        
        try:
            templates = session.query(AgentTemplate).filter(
                AgentTemplate.is_active == True,
                AgentTemplate.category == category
            ).all()
            
            return [TemplateResponse(
                template_id=template.template_id,
                template_name=template.template_name,
                display_name=template.display_name,
                description=template.description,
                prompt_template=template.prompt_template,
                template_category=template.category,
                is_premium_only=template.is_premium_only,
                is_active=template.is_active,
                usage_count=0,  # Templates don't track global usage count anymore
                created_at=template.created_at,
                updated_at=template.updated_at
            ) for template in templates]
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving templates by category: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve templates by category: {str(e)}") 