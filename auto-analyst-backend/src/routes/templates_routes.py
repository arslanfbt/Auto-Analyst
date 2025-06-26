import logging
import os
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, UTC
from sqlalchemy import desc, func
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
    icon_url: Optional[str]
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
    icon_url: Optional[str]
    is_premium_only: bool
    is_active: bool
    is_enabled: bool
    usage_count: int
    last_used_at: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class TogglePreferenceRequest(BaseModel):
    is_enabled: bool

def get_global_usage_counts(session, template_ids: List[int] = None) -> Dict[int, int]:
    """
    Calculate global usage counts for templates by summing usage_count across all users.
    
    Args:
        session: Database session
        template_ids: Optional list of template IDs to filter by. If None, gets all templates.
    
    Returns:
        Dict mapping template_id to global usage count
    """
    try:
        query = session.query(
            UserTemplatePreference.template_id,
            func.sum(UserTemplatePreference.usage_count).label('total_usage')
        ).group_by(UserTemplatePreference.template_id)
        
        if template_ids:
            query = query.filter(UserTemplatePreference.template_id.in_(template_ids))
        
        results = query.all()
        
        # Convert to dictionary, defaulting to 0 for templates with no usage
        usage_dict = {template_id: int(total_usage or 0) for template_id, total_usage in results}
        
        # If specific template_ids were requested, ensure all are represented
        if template_ids:
            for template_id in template_ids:
                if template_id not in usage_dict:
                    usage_dict[template_id] = 0
        
        return usage_dict
        
    except Exception as e:
        logger.log_message(f"Error calculating global usage counts: {str(e)}", level=logging.ERROR)
        return {}

# Routes
@router.get("/", response_model=List[TemplateResponse])
async def get_all_templates(variant_type: str = Query(default="all", description="Filter by variant type: 'individual', 'planner', or 'all'")):
    """Get all available agent templates with global usage statistics"""
    try:
        session = session_factory()
        
        try:
            # Get templates filtered by variant type
            query = session.query(AgentTemplate).filter(AgentTemplate.is_active == True)
            
            # Filter by variant type if specified
            if variant_type and variant_type != "all":
                if variant_type == "individual":
                    query = query.filter(AgentTemplate.variant_type.in_(['individual', 'both']))
                elif variant_type == "planner":
                    query = query.filter(AgentTemplate.variant_type.in_(['planner', 'both']))
                else:
                    # Invalid variant_type, default to all
                    pass
            
            templates = query.all()
            
            # Get template IDs for usage calculation
            template_ids = [template.template_id for template in templates]
            
            # Calculate global usage counts
            global_usage = get_global_usage_counts(session, template_ids)
            
            return [TemplateResponse(
                template_id=template.template_id,
                template_name=template.template_name,
                display_name=template.display_name,
                description=template.description,
                prompt_template=template.prompt_template,
                template_category=template.category,
                icon_url=template.icon_url,
                is_premium_only=template.is_premium_only,
                is_active=template.is_active,
                usage_count=global_usage.get(template.template_id, 0),  # Global usage count
                created_at=template.created_at,
                updated_at=template.updated_at
            ) for template in templates]
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving templates: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve templates: {str(e)}")

@router.get("/user/{user_id}", response_model=List[UserTemplatePreferenceResponse])
async def get_user_template_preferences(user_id: int, variant_type: str = Query(default="planner", description="Filter by variant type: 'individual', 'planner', or 'all'")):
    """Get all templates with user preferences (enabled/disabled status and usage)"""
    try:
        session = session_factory()
        
        try:
            # Validate user exists
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get templates filtered by variant type (default to planner for modal)
            query = session.query(AgentTemplate).filter(AgentTemplate.is_active == True)
            
            # Filter by variant type
            if variant_type and variant_type != "all":
                if variant_type == "individual":
                    query = query.filter(AgentTemplate.variant_type.in_(['individual', 'both']))
                elif variant_type == "planner":
                    query = query.filter(AgentTemplate.variant_type.in_(['planner', 'both']))
                else:
                    # Invalid variant_type, default to planner for modal
                    query = query.filter(AgentTemplate.variant_type.in_(['planner', 'both']))
            
            templates = query.all()
            
            # Get list of default agent names that should be enabled by default
            # Use planner variants when filtering for planner, individual variants otherwise
            if variant_type == "planner":
                default_agent_names = [
                    "planner_preprocessing_agent",
                    "planner_statistical_analytics_agent", 
                    "planner_sk_learn_agent",
                    "planner_data_viz_agent"
                ]
            else:
                default_agent_names = [
                    "preprocessing_agent",
                    "statistical_analytics_agent", 
                    "sk_learn_agent",
                    "data_viz_agent"
                ]
            
            result = []
            for template in templates:
                # Get user preference for this template if it exists
                preference = session.query(UserTemplatePreference).filter(
                    UserTemplatePreference.user_id == user_id,
                    UserTemplatePreference.template_id == template.template_id
                ).first()
                
                # Determine if template should be enabled by default
                is_default_agent = template.template_name in default_agent_names
                default_enabled = is_default_agent  # Default agents enabled by default, others disabled
                
                # Template is enabled by default for default agents, disabled for others
                is_enabled = preference.is_enabled if preference else default_enabled
                
                result.append(UserTemplatePreferenceResponse(
                    template_id=template.template_id,
                    template_name=template.template_name,
                    display_name=template.display_name,
                    description=template.description,
                    template_category=template.category,
                    icon_url=template.icon_url,
                    is_premium_only=template.is_premium_only,
                    is_active=template.is_active,
                    is_enabled=is_enabled,
                    usage_count=preference.usage_count if preference else 0,
                    last_used_at=preference.last_used_at if preference else None,
                    created_at=preference.created_at if preference else None,
                    updated_at=preference.updated_at if preference else None
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
async def get_user_enabled_templates(user_id: int, variant_type: str = Query(default="planner", description="Filter by variant type: 'individual', 'planner', or 'all'")):
    """Get only templates that are enabled for the user (all templates enabled by default)"""
    try:
        session = session_factory()
        
        try:
            # Validate user exists
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Get templates filtered by variant type (default to planner for modal)
            query = session.query(AgentTemplate).filter(AgentTemplate.is_active == True)
            
            # Filter by variant type
            if variant_type and variant_type != "all":
                if variant_type == "individual":
                    query = query.filter(AgentTemplate.variant_type.in_(['individual', 'both']))
                elif variant_type == "planner":
                    query = query.filter(AgentTemplate.variant_type.in_(['planner', 'both']))
                else:
                    # Invalid variant_type, default to planner for modal
                    query = query.filter(AgentTemplate.variant_type.in_(['planner', 'both']))
            
            all_templates = query.all()
            
            # Get list of default agent names that should be enabled by default
            # Use planner variants when filtering for planner, individual variants otherwise
            if variant_type == "planner":
                default_agent_names = [
                    "planner_preprocessing_agent",
                    "planner_statistical_analytics_agent", 
                    "planner_sk_learn_agent",
                    "planner_data_viz_agent"
                ]
            else:
                default_agent_names = [
                    "preprocessing_agent",
                    "statistical_analytics_agent", 
                    "sk_learn_agent",
                    "data_viz_agent"
                ]
            
            result = []
            for template in all_templates:
                # Check if user has a preference record for this template
                preference = session.query(UserTemplatePreference).filter(
                    UserTemplatePreference.user_id == user_id,
                    UserTemplatePreference.template_id == template.template_id
                ).first()
                
                # Determine if template should be enabled by default
                is_default_agent = template.template_name in default_agent_names
                default_enabled = is_default_agent  # Default agents enabled by default, others disabled
                
                # Template is enabled by default for default agents, disabled for others
                is_enabled = preference.is_enabled if preference else default_enabled
                
                if is_enabled:
                    result.append(UserTemplatePreferenceResponse(
                        template_id=template.template_id,
                        template_name=template.template_name,
                        display_name=template.display_name,
                        description=template.description,
                        template_category=template.category,
                        icon_url=template.icon_url,
                        is_premium_only=template.is_premium_only,
                        is_active=template.is_active,
                        is_enabled=True,
                        usage_count=preference.usage_count if preference else 0,
                        last_used_at=preference.last_used_at if preference else None,
                        created_at=preference.created_at if preference else None,
                        updated_at=preference.updated_at if preference else None
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
            
            # Get list of default planner agent names that should be enabled by default
            default_planner_agent_names = [
                "planner_preprocessing_agent",
                "planner_statistical_analytics_agent", 
                "planner_sk_learn_agent",
                "planner_data_viz_agent"
            ]
            
            # Get all active planner variant templates
            all_templates = session.query(AgentTemplate).filter(
                AgentTemplate.is_active == True,
                AgentTemplate.variant_type.in_(['planner', 'both'])
            ).all()
            
            enabled_templates = []
            for template in all_templates:
                # Check if user has a preference record for this template
                preference = session.query(UserTemplatePreference).filter(
                    UserTemplatePreference.user_id == user_id,
                    UserTemplatePreference.template_id == template.template_id
                ).first()
                
                # Determine if template should be enabled by default
                is_default_planner_agent = template.template_name in default_planner_agent_names
                default_enabled = is_default_planner_agent  # Default planner agents enabled by default, others disabled
                
                # Template is enabled by default for default agents, disabled for others
                is_enabled = preference.is_enabled if preference else default_enabled
                
                if is_enabled:
                    enabled_templates.append({
                        'template': template,
                        'preference': preference,
                        'usage_count': preference.usage_count if preference else 0,
                        'last_used_at': preference.last_used_at if preference else None
                    })
            
            # Sort by usage (most used first) and limit to 10
            enabled_templates.sort(key=lambda x: (x['usage_count'], x['last_used_at'] or datetime.min.replace(tzinfo=UTC)), reverse=True)
            enabled_templates = enabled_templates[:10]
            
            result = []
            for item in enabled_templates:
                template = item['template']
                preference = item['preference']
                
                result.append(UserTemplatePreferenceResponse(
                    template_id=template.template_id,
                    template_name=template.template_name,
                    display_name=template.display_name,
                    description=template.description,
                    template_category=template.category,
                    icon_url=template.icon_url,
                    is_premium_only=template.is_premium_only,
                    is_active=template.is_active,
                    is_enabled=True,
                    usage_count=preference.usage_count if preference else 0,
                    last_used_at=preference.last_used_at if preference else None,
                    created_at=preference.created_at if preference else None,
                    updated_at=preference.updated_at if preference else None
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
async def toggle_template_preference(user_id: int, template_id: int, request: TogglePreferenceRequest):
    """Toggle a user's template preference (enable/disable for planner use)"""
    try:
        session = session_factory()
        
        try:
            # Validate user exists
            user = session.query(User).filter(User.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # If trying to disable, check if this would leave user with no enabled templates
            if not request.is_enabled:
                # Get list of default planner agent names that should be enabled by default
                # This function is primarily used by the templates modal which works with planner variants
                default_agent_names = [
                    "planner_preprocessing_agent",
                    "planner_statistical_analytics_agent", 
                    "planner_sk_learn_agent",
                    "planner_data_viz_agent"
                ]
                
                # Get all active planner templates (since this is used by the templates modal)
                all_templates = session.query(AgentTemplate).filter(
                    AgentTemplate.is_active == True,
                    AgentTemplate.variant_type.in_(['planner', 'both'])
                ).all()
                
                enabled_count = 0
                for template in all_templates:
                    # Check if user has a preference record for this template
                    preference = session.query(UserTemplatePreference).filter(
                        UserTemplatePreference.user_id == user_id,
                        UserTemplatePreference.template_id == template.template_id
                    ).first()
                    
                    # Determine if template should be enabled by default
                    is_default_agent = template.template_name in default_agent_names
                    default_enabled = is_default_agent  # Default agents enabled by default, others disabled
                    
                    # Template is enabled by default for default agents, disabled for others
                    is_enabled = preference.is_enabled if preference else default_enabled
                    
                    if is_enabled:
                        enabled_count += 1
                
                # If disabling this template would leave the user with 0 enabled templates, reject
                if enabled_count <= 1:
                    raise HTTPException(
                        status_code=400, 
                        detail="Cannot disable the last active agent. At least one agent must remain active."
                    )
            
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
            
            # Get list of default planner agent names that should be enabled by default
            default_planner_agent_names = [
                "planner_preprocessing_agent",
                "planner_statistical_analytics_agent", 
                "planner_sk_learn_agent",
                "planner_data_viz_agent"
            ]
            
            # Calculate current enabled count properly (including defaults)
            # Focus on planner variants since this is used by the templates modal
            all_templates = session.query(AgentTemplate).filter(
                AgentTemplate.is_active == True,
                AgentTemplate.variant_type.in_(['planner', 'both'])
            ).all()
            
            current_enabled_count = 0
            for template in all_templates:
                # Check if user has a preference record for this template
                preference = session.query(UserTemplatePreference).filter(
                    UserTemplatePreference.user_id == user_id,
                    UserTemplatePreference.template_id == template.template_id
                ).first()
                
                # Determine if template should be enabled by default
                is_default_planner_agent = template.template_name in default_planner_agent_names
                default_enabled = is_default_planner_agent  # Default planner agents enabled by default, others disabled
                
                # Template is enabled by default for default agents, disabled for others
                is_enabled = preference.is_enabled if preference else default_enabled
                
                if is_enabled:
                    current_enabled_count += 1
            
            # Count how many templates we're trying to enable/disable
            enabling_count = sum(1 for pref in template_preferences if pref.get("is_enabled", False))
            disabling_count = sum(1 for pref in template_preferences if not pref.get("is_enabled", False))
            
            # Calculate what the new count would be
            projected_enabled_count = current_enabled_count + enabling_count - disabling_count
            
            # Check if the bulk operation would leave user with 0 enabled templates
            if projected_enabled_count < 1:
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot disable all agents. At least one agent must remain active."
                )
            
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
    """Get a specific template by ID with global usage statistics"""
    try:
        session = session_factory()
        
        try:
            template = session.query(AgentTemplate).filter(
                AgentTemplate.template_id == template_id
            ).first()
            
            if not template:
                raise HTTPException(status_code=404, detail=f"Template with ID {template_id} not found")
            
            # Calculate global usage count for this template
            global_usage = get_global_usage_counts(session, [template_id])
                
            return TemplateResponse(
                template_id=template.template_id,
                template_name=template.template_name,
                display_name=template.display_name,
                description=template.description,
                prompt_template=template.prompt_template,
                template_category=template.category,
                icon_url=template.icon_url,
                is_premium_only=template.is_premium_only,
                is_active=template.is_active,
                usage_count=global_usage.get(template_id, 0),  # Global usage count
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
async def get_templates_by_categories(variant_type: str = Query(default="individual", description="Filter by variant type: 'individual', 'planner', or 'all'")):
    """Get all templates grouped by category for frontend template browser with global usage statistics"""
    try:
        session = session_factory()
        
        try:
            # Get templates filtered by variant type
            query = session.query(AgentTemplate).filter(AgentTemplate.is_active == True)
            
            # Filter by variant type if specified
            if variant_type and variant_type != "all":
                if variant_type == "individual":
                    query = query.filter(AgentTemplate.variant_type.in_(['individual', 'both']))
                elif variant_type == "planner":
                    query = query.filter(AgentTemplate.variant_type.in_(['planner', 'both']))
                else:
                    # Invalid variant_type, default to individual
                    query = query.filter(AgentTemplate.variant_type.in_(['individual', 'both']))
            
            templates = query.order_by(AgentTemplate.category, AgentTemplate.template_name).all()
            
            # Get template IDs for usage calculation
            template_ids = [template.template_id for template in templates]
            
            # Calculate global usage counts
            global_usage = get_global_usage_counts(session, template_ids)
            
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
                    "icon_url": template.icon_url,
                    "is_premium_only": template.is_premium_only,
                    "is_active": template.is_active,
                    "usage_count": global_usage.get(template.template_id, 0),  # Global usage count
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
    """Get all templates in a specific category with global usage statistics"""
    try:
        session = session_factory()
        
        try:
            templates = session.query(AgentTemplate).filter(
                AgentTemplate.is_active == True,
                AgentTemplate.category == category
            ).all()
            
            # Get template IDs for usage calculation
            template_ids = [template.template_id for template in templates]
            
            # Calculate global usage counts
            global_usage = get_global_usage_counts(session, template_ids)
            
            return [TemplateResponse(
                template_id=template.template_id,
                template_name=template.template_name,
                display_name=template.display_name,
                description=template.description,
                prompt_template=template.prompt_template,
                template_category=template.category,
                icon_url=template.icon_url,
                is_premium_only=template.is_premium_only,
                is_active=template.is_active,
                usage_count=global_usage.get(template.template_id, 0),  # Global usage count (shows how many times this template has been used overall by users)
                created_at=template.created_at,
                updated_at=template.updated_at
            ) for template in templates]
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving templates by category: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve templates by category: {str(e)}") 