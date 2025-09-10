from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

# Pydantic models
class DeepAnalysisReportCreate(BaseModel):
    report_uuid: str
    user_id: Optional[int] = None
    goal: str
    status: str = "completed"
    deep_questions: Optional[str] = None
    deep_plan: Optional[str] = None
    summaries: Optional[List[Any]] = None
    analysis_code: Optional[str] = None
    plotly_figures: Optional[List[Any]] = None
    synthesis: Optional[List[Any]] = None
    final_conclusion: Optional[str] = None
    html_report: Optional[str] = None
    report_summary: Optional[str] = None
    progress_percentage: Optional[int] = 100
    duration_seconds: Optional[int] = None
    # Credit and error tracking
    credits_consumed: Optional[int] = 0
    error_message: Optional[str] = None
    model_provider: Optional[str] = "anthropic"
    model_name: Optional[str] = "claude-sonnet-4-20250514"
    total_tokens_used: Optional[int] = 0
    estimated_cost: Optional[float] = 0.0
    steps_completed: Optional[List[str]] = None  # Array of completed step names

class DeepAnalysisReportResponse(BaseModel):
    report_id: int
    report_uuid: str
    user_id: Optional[int]
    goal: str
    status: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_seconds: Optional[int]
    report_summary: Optional[str]
    created_at: datetime
    updated_at: datetime

class DeepAnalysisReportDetailResponse(DeepAnalysisReportResponse):
    deep_questions: Optional[str]
    deep_plan: Optional[str]
    summaries: Optional[List[Any]]
    analysis_code: Optional[str]
    plotly_figures: Optional[List[Any]]
    synthesis: Optional[List[Any]]
    final_conclusion: Optional[str]
    html_report: Optional[str]
    progress_percentage: Optional[int]
    # Credit and error tracking
    credits_consumed: Optional[int]
    error_message: Optional[str]
    model_provider: Optional[str] = "anthropic"
    model_name: Optional[str] = "claude-sonnet-4-20250514"
    total_tokens_used: Optional[int]
    estimated_cost: Optional[float]
    steps_completed: Optional[List[str]] = None
