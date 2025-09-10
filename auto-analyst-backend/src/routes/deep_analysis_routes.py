import logging
from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from datetime import datetime, UTC
from sqlalchemy import desc
import json

from src.db.init_db import session_factory
from src.db.schemas.models import DeepAnalysisReport
from src.utils.logger import Logger

from src.schemas.deep_analysis_schema import DeepAnalysisReportCreate, DeepAnalysisReportResponse, DeepAnalysisReportDetailResponse

# Initialize logger with console logging disabled
logger = Logger("deep_analysis_routes", see_time=True, console_log=False)

# Initialize router
router = APIRouter(prefix="/deep_analysis", tags=["deep_analysis"])

# Routes
@router.post("/reports", response_model=DeepAnalysisReportResponse)
async def create_report(report: DeepAnalysisReportCreate):
    """Store a deep analysis report in the database"""
    try:
        session = session_factory()
        
        try:
            # Calculate duration if not provided
            duration_seconds = None
            if report.duration_seconds is not None:
                duration_seconds = report.duration_seconds
                
            # Convert any JSON data to strings for storage
            summaries = report.summaries
            plotly_figures = report.plotly_figures
            synthesis = report.synthesis
            
            if isinstance(summaries, list):
                summaries = json.dumps(summaries)
            
            if isinstance(plotly_figures, list):
                # Handle serialization of plotly figures specially
                # We'll store references or simplified versions
                plotly_figures = json.dumps(plotly_figures)
                
            if isinstance(synthesis, list):
                synthesis = json.dumps(synthesis)
                
            # Create a summary if not provided
            report_summary = report.report_summary
            if not report_summary and report.final_conclusion:
                # remove the **Conclusion** and **Key Takeaways** from the final conclusion
                report_summary = report.final_conclusion.replace("**Conclusion**", "")
                # Create a summary from the conclusion (first 200 chars)
                report_summary = report.final_conclusion[:200] + "..." if len(report.final_conclusion) > 200 else report.final_conclusion
                
            now = datetime.now(UTC)
            
            new_report = DeepAnalysisReport(
                report_uuid=report.report_uuid,
                user_id=report.user_id,
                goal=report.goal,
                status=report.status,
                start_time=now,
                end_time=now,
                duration_seconds=duration_seconds,
                deep_questions=report.deep_questions,
                deep_plan=report.deep_plan,
                summaries=summaries,
                analysis_code=report.analysis_code,
                plotly_figures=plotly_figures,
                synthesis=synthesis,
                final_conclusion=report.final_conclusion,
                html_report=report.html_report,
                report_summary=report_summary,
                progress_percentage=report.progress_percentage,
                # Credit and error tracking
                credits_consumed=report.credits_consumed or 0,
                error_message=report.error_message,
                model_provider=report.model_provider or "anthropic",
                model_name=report.model_name or "claude-sonnet-4-20250514",
                total_tokens_used=report.total_tokens_used or 0,
                estimated_cost=report.estimated_cost or 0.0,
                steps_completed=report.steps_completed,
                created_at=now,
                updated_at=now
            )
            
            session.add(new_report)
            session.commit()
            session.refresh(new_report)
            
            # Return response with created report data
            return {
                "report_id": new_report.report_id,
                "report_uuid": new_report.report_uuid,
                "user_id": new_report.user_id,
                "goal": new_report.goal,
                "status": new_report.status,
                "start_time": new_report.start_time,
                "end_time": new_report.end_time,
                "duration_seconds": new_report.duration_seconds,
                "report_summary": new_report.report_summary,
                "created_at": new_report.created_at,
                "updated_at": new_report.updated_at
            }
            
        except Exception as e:
            session.rollback()
            logger.log_message(f"Error creating deep analysis report: {str(e)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Failed to create report: {str(e)}")
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error creating deep analysis report: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to create report: {str(e)}")

@router.get("/reports", response_model=List[DeepAnalysisReportResponse])
async def get_reports(
    user_id: Optional[int] = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None
):
    """Get deep analysis reports, optionally filtered by user_id or status"""
    try:
        session = session_factory()
        
        try:
            query = session.query(DeepAnalysisReport)
            
            if user_id is not None:
                query = query.filter(DeepAnalysisReport.user_id == user_id)
                
            if status is not None:
                query = query.filter(DeepAnalysisReport.status == status)
                
            # Order by most recent first
            query = query.order_by(desc(DeepAnalysisReport.created_at))
            
            reports = query.limit(limit).offset(offset).all()
            
            return [{
                "report_id": report.report_id,
                "report_uuid": report.report_uuid,
                "user_id": report.user_id,
                "goal": report.goal,
                "status": report.status,
                "start_time": report.start_time,
                "end_time": report.end_time,
                "duration_seconds": report.duration_seconds,
                "report_summary": report.report_summary,
                "created_at": report.created_at,
                "updated_at": report.updated_at
            } for report in reports]
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving deep analysis reports: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve reports: {str(e)}")

@router.get("/reports/user_historical", response_model=List[DeepAnalysisReportResponse])
async def get_user_historical_reports(user_id: int, limit: int = Query(50, ge=1, le=100)):
    """Get all historical deep analysis reports for a user"""
    try:
        session = session_factory()
        
        try:
            reports = session.query(DeepAnalysisReport)\
                .filter(DeepAnalysisReport.user_id == user_id)\
                .order_by(desc(DeepAnalysisReport.created_at))\
                .limit(limit)\
                .all()
            
            return [{
                "report_id": report.report_id,
                "report_uuid": report.report_uuid,
                "user_id": report.user_id,
                "goal": report.goal,
                "status": report.status,
                "start_time": report.start_time,
                "end_time": report.end_time,
                "duration_seconds": report.duration_seconds,
                "report_summary": report.report_summary,
                "created_at": report.created_at,
                "updated_at": report.updated_at
            } for report in reports]
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving user historical reports: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve historical reports: {str(e)}")

@router.get("/reports/{report_id}", response_model=DeepAnalysisReportDetailResponse)
async def get_report_by_id(report_id: int, user_id: Optional[int] = None):
    """Get a specific deep analysis report by ID"""
    try:
        session = session_factory()
        
        try:
            query = session.query(DeepAnalysisReport).filter(DeepAnalysisReport.report_id == report_id)
            
            # If user_id provided, ensure the report belongs to that user
            if user_id is not None:
                query = query.filter(DeepAnalysisReport.user_id == user_id)
                
            report = query.first()
            
            if not report:
                raise HTTPException(status_code=404, detail=f"Report with ID {report_id} not found")
                
            # Parse JSON fields
            summaries = report.summaries
            plotly_figures = report.plotly_figures
            synthesis = report.synthesis
            
            if isinstance(summaries, str):
                try:
                    summaries = json.loads(summaries)
                except:
                    summaries = []
                    
            if isinstance(plotly_figures, str):
                try:
                    plotly_figures = json.loads(plotly_figures)
                except:
                    plotly_figures = []
                    
            if isinstance(synthesis, str):
                try:
                    synthesis = json.loads(synthesis)
                except:
                    synthesis = []
                
            return {
                "report_id": report.report_id,
                "report_uuid": report.report_uuid,
                "user_id": report.user_id,
                "goal": report.goal,
                "status": report.status,
                "start_time": report.start_time,
                "end_time": report.end_time,
                "duration_seconds": report.duration_seconds,
                "deep_questions": report.deep_questions,
                "deep_plan": report.deep_plan,
                "summaries": summaries,
                "analysis_code": report.analysis_code,
                "plotly_figures": plotly_figures,
                "synthesis": synthesis,
                "final_conclusion": report.final_conclusion,
                "html_report": report.html_report,
                "report_summary": report.report_summary,
                "progress_percentage": report.progress_percentage,
                # Credit and error tracking
                "credits_consumed": report.credits_consumed,
                "error_message": report.error_message,
                "model_provider": report.model_provider,
                "model_name": report.model_name,
                "total_tokens_used": report.total_tokens_used,
                "estimated_cost": report.estimated_cost,
                "steps_completed": report.steps_completed,
                "created_at": report.created_at,
                "updated_at": report.updated_at
            }
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error retrieving deep analysis report: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve report: {str(e)}")

@router.get("/reports/uuid/{report_uuid}", response_model=DeepAnalysisReportDetailResponse)
async def get_report_by_uuid(report_uuid: str, user_id: Optional[int] = None):
    """Get a specific deep analysis report by UUID"""
    try:
        session = session_factory()
        
        try:
            query = session.query(DeepAnalysisReport).filter(DeepAnalysisReport.report_uuid == report_uuid)
            
            # If user_id provided, ensure the report belongs to that user
            if user_id is not None:
                query = query.filter(DeepAnalysisReport.user_id == user_id)
                
            report = query.first()
            
            if not report:
                raise HTTPException(status_code=404, detail=f"Report with UUID {report_uuid} not found")
                
            # Parse JSON fields
            summaries = report.summaries
            plotly_figures = report.plotly_figures
            synthesis = report.synthesis
            
            if isinstance(summaries, str):
                try:
                    summaries = json.loads(summaries)
                except:
                    summaries = []
                    
            if isinstance(plotly_figures, str):
                try:
                    plotly_figures = json.loads(plotly_figures)
                except:
                    plotly_figures = []
                    
            if isinstance(synthesis, str):
                try:
                    synthesis = json.loads(synthesis)
                except:
                    synthesis = []
                
            return {
                "report_id": report.report_id,
                "report_uuid": report.report_uuid,
                "user_id": report.user_id,
                "goal": report.goal,
                "status": report.status,
                "start_time": report.start_time,
                "end_time": report.end_time,
                "duration_seconds": report.duration_seconds,
                "deep_questions": report.deep_questions,
                "deep_plan": report.deep_plan,
                "summaries": summaries,
                "analysis_code": report.analysis_code,
                "plotly_figures": plotly_figures,
                "synthesis": synthesis,
                "final_conclusion": report.final_conclusion,
                "html_report": report.html_report,
                "report_summary": report.report_summary,
                "progress_percentage": report.progress_percentage,
                # Credit and error tracking
                "credits_consumed": report.credits_consumed,
                "error_message": report.error_message,
                "model_provider": report.model_provider,
                "model_name": report.model_name,
                "total_tokens_used": report.total_tokens_used,
                "estimated_cost": report.estimated_cost,
                "steps_completed": report.steps_completed,
                "created_at": report.created_at,
                "updated_at": report.updated_at
            }
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error retrieving deep analysis report: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve report: {str(e)}")

@router.delete("/reports/{report_id}")
async def delete_report(report_id: int, user_id: Optional[int] = None):
    """Delete a deep analysis report"""
    try:
        session = session_factory()
        
        try:
            query = session.query(DeepAnalysisReport).filter(DeepAnalysisReport.report_id == report_id)
            
            # If user_id provided, ensure the report belongs to that user
            if user_id is not None:
                query = query.filter(DeepAnalysisReport.user_id == user_id)
                
            report = query.first()
            
            if not report:
                raise HTTPException(status_code=404, detail=f"Report with ID {report_id} not found")
                
            session.delete(report)
            session.commit()
            
            return {"message": f"Report {report_id} deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            session.rollback()
            logger.log_message(f"Error deleting deep analysis report: {str(e)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}")
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error deleting deep analysis report: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}")

@router.put("/reports/{report_id}/status", response_model=DeepAnalysisReportResponse)
async def update_report_status(report_id: int, status: str = Body(..., embed=True), user_id: Optional[int] = None):
    """Update the status of a deep analysis report"""
    try:
        if status not in ["pending", "running", "completed", "failed"]:
            raise HTTPException(status_code=400, detail="Invalid status value")
            
        session = session_factory()
        
        try:
            query = session.query(DeepAnalysisReport).filter(DeepAnalysisReport.report_id == report_id)
            
            # If user_id provided, ensure the report belongs to that user
            if user_id is not None:
                query = query.filter(DeepAnalysisReport.user_id == user_id)
                
            report = query.first()
            
            if not report:
                raise HTTPException(status_code=404, detail=f"Report with ID {report_id} not found")
                
            # Update status and end_time if completed or failed
            report.status = status
            if status in ["completed", "failed"]:
                report.end_time = datetime.now(UTC)
                if report.start_time:
                    # Calculate duration in seconds
                    report.duration_seconds = int((report.end_time - report.start_time).total_seconds())
                    
            report.updated_at = datetime.now(UTC)
            session.commit()
            session.refresh(report)
            
            return {
                "report_id": report.report_id,
                "report_uuid": report.report_uuid,
                "user_id": report.user_id,
                "goal": report.goal,
                "status": report.status,
                "start_time": report.start_time,
                "end_time": report.end_time,
                "duration_seconds": report.duration_seconds,
                "report_summary": report.report_summary,
                "created_at": report.created_at,
                "updated_at": report.updated_at
            }
            
        except HTTPException:
            raise
        except Exception as e:
            session.rollback()
            logger.log_message(f"Error updating report status: {str(e)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Failed to update report status: {str(e)}")
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error updating report status: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to update report status: {str(e)}")

@router.get("/reports/uuid/{report_uuid}/html", response_model=dict)
async def get_html_report(report_uuid: str, user_id: Optional[int] = None):
    """Get only the HTML report for a specific analysis by UUID"""
    try:
        session = session_factory()
        
        try:
            query = session.query(DeepAnalysisReport).filter(DeepAnalysisReport.report_uuid == report_uuid)
            
            # If user_id provided, ensure the report belongs to that user
            if user_id is not None:
                query = query.filter(DeepAnalysisReport.user_id == user_id)
                
            report = query.first()
            
            if not report:
                raise HTTPException(status_code=404, detail=f"Report with UUID {report_uuid} not found")
            
            if not report.html_report:
                # Attempt to generate a new HTML report if data is available
                from app import generate_html_report  # Import the function from app.py
                import json
                
                # Extract report data and regenerate HTML
                data_for_report = {
                    "goal": report.goal,
                    "deep_questions": report.deep_questions or "",
                    "deep_plan": report.deep_plan or "",
                    "summaries": json.loads(report.summaries) if report.summaries and isinstance(report.summaries, str) else [],
                    "code": report.analysis_code or "",
                    "plotly_figs": json.loads(report.plotly_figures) if report.plotly_figures and isinstance(report.plotly_figures, str) else [],
                    "synthesis": json.loads(report.synthesis) if report.synthesis and isinstance(report.synthesis, str) else [],
                    "final_conclusion": report.final_conclusion or ""
                }
                
                try:
                    html_report = generate_html_report(data_for_report)
                    
                    # Store the generated report back in the database
                    report.html_report = html_report
                    session.commit()
                    
                except Exception as e:
                    logger.log_message(f"Error regenerating HTML report: {str(e)}", level=logging.ERROR)
                    raise HTTPException(status_code=500, detail=f"Failed to generate HTML report: {str(e)}")
            
            # Create a filename with timestamp
            timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
            filename = f"deep_analysis_report_{timestamp}.html"
            
            return {
                "html_report": report.html_report,
                "filename": filename
            }
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error retrieving HTML report: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve HTML report: {str(e)}")
        
@router.post("/download_from_db/{report_uuid}")
async def download_report_from_db(report_uuid: str, user_id: Optional[int] = None):
    """Download HTML report directly from the database"""
    try:
        session = session_factory()
        
        try:
            query = session.query(DeepAnalysisReport).filter(DeepAnalysisReport.report_uuid == report_uuid)
            
            # If user_id provided, ensure the report belongs to that user
            if user_id is not None:
                query = query.filter(DeepAnalysisReport.user_id == user_id)
                
            report = query.first()
            
            if not report:
                raise HTTPException(status_code=404, detail=f"Report with UUID {report_uuid} not found")
                
            if not report.html_report:
                raise HTTPException(status_code=404, detail=f"HTML report not found for {report_uuid}")
            
            # Create a filename with timestamp
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"deep_analysis_report_{timestamp}.html"
            
            from fastapi.responses import StreamingResponse
            
            # Return as downloadable file
            return StreamingResponse(
                iter([report.html_report.encode('utf-8')]),
                media_type='text/html',
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"',
                    'Content-Type': 'text/html; charset=utf-8'
                }
            )
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error downloading report from database: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to download report: {str(e)}") 