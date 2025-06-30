from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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