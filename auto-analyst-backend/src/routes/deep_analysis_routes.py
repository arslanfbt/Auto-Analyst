from datetime import datetime
import logging
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from src.db.init_db import session_factory
from src.db.schemas.models import ModelUsage
from src.managers.ai_manager import AI_Manager
from src.managers.chat_manager import ChatManager
from src.schemas.chat_schemas import *
from src.routes.session_routes import get_session_id_dependency
from src.utils.logger import Logger
import os
from dotenv import load_dotenv
import dspy

load_dotenv()

# Initialize logger with console logging disabled
logger = Logger("deep_analysis_routes", see_time=True, console_log=False)

# Initialize router
router = APIRouter(prefix="/deep_analysis", tags=["deep_analysis"])

# Initialize managers
chat_manager = ChatManager(db_url=os.getenv("DATABASE_URL"))
ai_manager = AI_Manager()

# Request models
class DeepAnalysisRequest(BaseModel):
    goal: str
    user_id: Optional[int] = None

class DeepAnalysisReportRequest(BaseModel):
    analysis_data: Dict[str, Any]

# Deep Analysis specific constants
DEEP_ANALYSIS_IDENTIFIER = "DEEP_ANALYSIS"
DEEP_ANALYSIS_AGENT = "deep_analysis"

@router.post("/start", response_model=ChatResponse)
async def start_deep_analysis_chat(
    request: DeepAnalysisRequest,
    request_obj: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    """Create a new chat session specifically for Deep Analysis"""
    try:
        # Create a new chat with a special title to identify it as deep analysis
        chat_title = f"[{DEEP_ANALYSIS_IDENTIFIER}] {request.goal[:50]}..."
        
        # Create the chat
        chat = chat_manager.create_chat(request.user_id)
        
        # Update the chat title to include deep analysis identifier
        updated_chat = chat_manager.update_chat(
            chat_id=chat['chat_id'],
            title=chat_title
        )
        
        # Add the initial user message
        user_message = chat_manager.add_message(
            chat_id=chat['chat_id'],
            content=request.goal,
            sender='user',
            user_id=request.user_id
        )
        
        logger.log_message(f"Created Deep Analysis chat {chat['chat_id']} for goal: {request.goal[:50]}...", level=logging.INFO)
        
        return {
            **updated_chat,
            "analysis_type": "deep_analysis",
            "initial_message_id": user_message['message_id']
        }
        
    except Exception as e:
        logger.log_message(f"Error creating deep analysis chat: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to create deep analysis chat: {str(e)}")

@router.post("/streaming")
async def deep_analysis_streaming(
    request: DeepAnalysisRequest,
    request_obj: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    """Perform streaming deep analysis with database integration"""
    from app import app  # Import app to access session state and deep analyzer
    
    session_state = app.state.get_session_state(session_id)
    
    try:
        # Extract and validate query parameters
        from app import _update_session_from_query_params, RESPONSE_ERROR_NO_DATASET
        _update_session_from_query_params(request_obj, session_state)
        
        # Validate dataset
        if session_state["current_df"] is None:
            raise HTTPException(status_code=400, detail=RESPONSE_ERROR_NO_DATASET)
        
        # Create a deep analysis chat if user_id is provided
        chat_id = None
        if request.user_id:
            try:
                chat_response = await start_deep_analysis_chat(request, request_obj, session_id)
                chat_id = chat_response['chat_id']
                logger.log_message(f"Created Deep Analysis chat {chat_id} for streaming analysis", level=logging.INFO)
            except Exception as e:
                logger.log_message(f"Failed to create chat for deep analysis: {str(e)}", level=logging.WARNING)
        
        # Get session-specific model
        session_lm = dspy.LM(model="anthropic/claude-4-sonnet-20250514", max_tokens=7000, temperature=0.5)
        
        return StreamingResponse(
            _generate_deep_analysis_stream_with_db(
                session_state, 
                request.goal, 
                session_lm, 
                request.user_id, 
                chat_id,
                session_id
            ),
            media_type='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'text/event-stream',
                'Access-Control-Allow-Origin': '*',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Streaming deep analysis failed: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Streaming deep analysis failed: {str(e)}")

async def _generate_deep_analysis_stream_with_db(
    session_state: dict, 
    goal: str, 
    session_lm, 
    user_id: Optional[int] = None, 
    chat_id: Optional[int] = None,
    session_id: str = None
):
    """Generate streaming responses for deep analysis with database tracking"""
    import pandas as pd
    from app import app
    
    start_time = datetime.utcnow()
    total_tokens = 0
    total_cost = 0.0
    
    try:
        # Get dataset info
        df = session_state["current_df"]
        dtypes_info = pd.DataFrame({
            'Column': df.columns,
            'Data Type': df.dtypes.astype(str)
        }).to_markdown()
        dataset_info = f"Sample Data:\n{df.head(2).to_markdown()}\n\nData Types:\n{dtypes_info}"
        
        # Use session model for this request
        with dspy.context(lm=session_lm):
            # Send initial status
            yield json.dumps({
                "step": "initialization",
                "status": "starting",
                "message": "Initializing deep analysis...",
                "progress": 10
            }) + "\n"
            
            # Get deep analyzer
            deep_analyzer = app.state.get_deep_analyzer(session_state.get("session_id", "default"))
            
            # Make the dataset available globally for code execution
            globals()['df'] = df
            
            # Step 1: Generate deep questions
            yield json.dumps({
                "step": "questions",
                "status": "processing", 
                "message": "Generating analytical questions...",
                "progress": 20
            }) + "\n"
            
            questions = deep_analyzer.deep_questions(goal=goal, dataset_info=dataset_info)
            
            yield json.dumps({
                "step": "questions",
                "status": "completed",
                "content": questions.deep_questions,
                "progress": 30
            }) + "\n"
            
            # Step 2: Create plan
            yield json.dumps({
                "step": "planning",
                "status": "processing",
                "message": "Creating analysis plan...",
                "progress": 40
            }) + "\n"
            
            # Continue with full deep analysis execution
            return_dict = await deep_analyzer.execute_deep_analysis(
                goal=goal,
                dataset_info=dataset_info,
                session_df=df  # Pass the session DataFrame
            )
            
            # Convert Plotly figures to JSON format for network transmission
            import plotly.io
            serialized_return_dict = return_dict.copy()
            
            # Convert plotly_figs to JSON format
            if 'plotly_figs' in serialized_return_dict and serialized_return_dict['plotly_figs']:
                json_figs = []
                for fig_list in serialized_return_dict['plotly_figs']:
                    if isinstance(fig_list, list):
                        json_fig_list = []
                        for fig in fig_list:
                            if hasattr(fig, 'to_json'):  # Check if it's a Plotly figure
                                json_fig_list.append(plotly.io.to_json(fig))
                            else:
                                json_fig_list.append(fig)  # Already JSON or other format
                        json_figs.append(json_fig_list)
                    else:
                        # Single figure case
                        if hasattr(fig_list, 'to_json'):
                            json_figs.append(plotly.io.to_json(fig_list))
                        else:
                            json_figs.append(fig_list)
                serialized_return_dict['plotly_figs'] = json_figs
            
            # Step 3: Send analysis results
            yield json.dumps({
                "step": "analysis",
                "status": "completed",
                "content": serialized_return_dict,
                "progress": 90
            }) + "\n"
            
            # Step 4: Generate HTML report
            yield json.dumps({
                "step": "report",
                "status": "processing",
                "message": "Generating final report...",
                "progress": 95
            }) + "\n"
            
            # Generate HTML report using the original return_dict with Figure objects
            from app import generate_html_report
            html_report = generate_html_report(return_dict)
            
            # Calculate usage metrics
            end_time = datetime.utcnow()
            request_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Estimate token usage (this is approximate)
            estimated_prompt_tokens = len(goal + dataset_info) // 4  # Rough estimate
            estimated_completion_tokens = len(str(return_dict)) // 4  # Rough estimate
            total_tokens = estimated_prompt_tokens + estimated_completion_tokens
            
            # Calculate cost
            model_name = "claude-4-sonnet"
            total_cost = ai_manager.calculate_cost(model_name, estimated_prompt_tokens, estimated_completion_tokens)
            
            # Save usage to database
            if user_id:
                try:
                    ai_manager.save_usage_to_db(
                        user_id=user_id,
                        chat_id=chat_id,
                        model_name=model_name,
                        provider="anthropic",
                        prompt_tokens=estimated_prompt_tokens,
                        completion_tokens=estimated_completion_tokens,
                        total_tokens=total_tokens,
                        query_size=len(goal),
                        response_size=len(str(return_dict)),
                        cost=total_cost,
                        request_time_ms=request_time_ms,
                        is_streaming=True
                    )
                    logger.log_message(f"Deep Analysis usage saved: {total_tokens} tokens, ${total_cost:.6f}", level=logging.INFO)
                except Exception as e:
                    logger.log_message(f"Failed to save deep analysis usage: {str(e)}", level=logging.WARNING)
            
            # SAVE COMPLETE ANALYSIS AS SINGLE RECORD (New Approach)
            if chat_id and user_id:
                try:
                    # Prepare comprehensive analysis data
                    complete_analysis_data = {
                        "goal": goal,
                        "start_time": start_time.isoformat(),
                        "end_time": end_time.isoformat(),
                        "deep_questions": return_dict.get('deep_questions', ''),
                        "deep_plan": return_dict.get('deep_plan', ''),
                        "code": return_dict.get('code', ''),
                        "synthesis": return_dict.get('synthesis', []),
                        "final_conclusion": return_dict.get('final_conclusion', ''),
                        "analysis_metadata": {
                            "total_tokens": total_tokens,
                            "cost": total_cost,
                            "duration_ms": request_time_ms,
                            "model_name": model_name
                        }
                    }
                    
                    # Save as single comprehensive message
                    chat_manager.save_complete_deep_analysis(
                        chat_id=chat_id,
                        user_id=user_id,
                        analysis_data=complete_analysis_data
                    )
                    logger.log_message(f"Saved complete Deep Analysis as single record for chat {chat_id}", level=logging.INFO)
                    
                except Exception as e:
                    logger.log_message(f"Failed to save complete deep analysis: {str(e)}", level=logging.WARNING)
            
            yield json.dumps({
                "step": "completed",
                "status": "success",
                "analysis": serialized_return_dict,
                "html_report": html_report,
                "progress": 100,
                "usage": {
                    "total_tokens": total_tokens,
                    "cost": total_cost,
                    "duration_ms": request_time_ms
                }
            }) + "\n"
            
    except Exception as e:
        logger.log_message(f"Error in deep analysis stream: {str(e)}", level=logging.ERROR)
        
        # Save error to database if possible (as single message)
        if chat_id and user_id:
            try:
                error_analysis_data = {
                    "goal": goal,
                    "start_time": start_time.isoformat(),
                    "end_time": datetime.utcnow().isoformat(),
                    "error": str(e),
                    "status": "failed"
                }
                
                # Use regular message for errors
                chat_manager.add_message(
                    chat_id=chat_id,
                    content=f"# ❌ Deep Analysis Failed\n\n**Goal:** {goal}\n\n**Error:** {str(e)}\n\n*The analysis encountered an error and could not be completed.*",
                    sender="deep_analysis",
                    user_id=user_id
                )
            except Exception as db_error:
                logger.log_message(f"Failed to save error to database: {str(db_error)}", level=logging.WARNING)
        
        yield json.dumps({
            "step": "error",
            "status": "failed",
            "message": f"Deep analysis failed: {str(e)}",
            "progress": 0
        }) + "\n"

@router.post("/download_report")
async def download_deep_analysis_report(
    request: DeepAnalysisReportRequest,
    session_id: str = Depends(get_session_id_dependency)
):
    """Download HTML report from deep analysis data"""
    try:
        logger.log_message(f"Download report request received with keys: {list(request.analysis_data.keys())}", level=logging.INFO)
        
        from app import generate_html_report
        
        # Check if this is markdown content from database (new format)
        if 'markdown_content' in request.analysis_data:
            logger.log_message("Processing markdown content from database", level=logging.INFO)
            
            # For database-stored reports, we already have the formatted markdown
            markdown_content = request.analysis_data['markdown_content']
            
            logger.log_message(f"Markdown content type: {type(markdown_content)}, length: {len(str(markdown_content)) if markdown_content else 0}", level=logging.INFO)
            
            if not markdown_content:
                logger.log_message("Markdown content is empty or None", level=logging.WARNING)
                raise HTTPException(status_code=400, detail="No markdown content available for download")
            
            try:
                # Convert markdown to HTML
                import markdown
                from markdown.extensions import codehilite, tables, toc
                
                logger.log_message("Markdown library imported successfully", level=logging.INFO)
                
                # Configure markdown extensions for better formatting
                md = markdown.Markdown(extensions=[
                    'codehilite',
                    'tables', 
                    'toc',
                    'fenced_code'
                ])
                
                logger.log_message("Markdown processor configured", level=logging.INFO)
                
                # Convert markdown to HTML
                html_body = md.convert(str(markdown_content))
                
                logger.log_message(f"Markdown converted to HTML, output length: {len(html_body)}", level=logging.INFO)
                
            except Exception as markdown_error:
                logger.log_message(f"Markdown conversion failed: {str(markdown_error)}", level=logging.ERROR)
                import traceback
                logger.log_message(f"Markdown conversion traceback: {traceback.format_exc()}", level=logging.ERROR)
                raise HTTPException(status_code=500, detail=f"Markdown conversion failed: {str(markdown_error)}")
            
            try:
                # Create a complete HTML document
                html_report = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deep Analysis Report</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }}
        .container {{
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 40px;
        }}
        h1, h2, h3, h4, h5, h6 {{
            color: #2c3e50;
            margin-top: 30px;
            margin-bottom: 15px;
        }}
        h1 {{
            border-bottom: 3px solid #FF7F7F;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }}
        h2 {{
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
        }}
        code {{
            background-color: #f1f3f4;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }}
        pre {{
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 16px;
            overflow-x: auto;
        }}
        pre code {{
            background: none;
            padding: 0;
        }}
        blockquote {{
            border-left: 4px solid #FF7F7F;
            margin: 0;
            padding-left: 20px;
            color: #666;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background-color: #f8f9fa;
            font-weight: 600;
        }}
        .header {{
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #FF7F7F;
        }}
        .timestamp {{
            color: #666;
            font-size: 0.9em;
            margin-top: 10px;
        }}
        hr {{
            border: none;
            height: 2px;
            background: linear-gradient(to right, #FF7F7F, transparent);
            margin: 30px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧠 Deep Analysis Report</h1>
            <div class="timestamp">Generated on {datetime.now().strftime("%B %d, %Y at %I:%M %p")}</div>
        </div>
        {html_body}
        <hr>
        <p style="text-align: center; color: #666; font-size: 0.9em; margin-top: 40px;">
            <em>This report was generated by Auto-Analyst's Deep Analysis system.</em>
        </p>
    </div>
</body>
</html>
"""
                logger.log_message(f"HTML report generated, total length: {len(html_report)}", level=logging.INFO)
                
            except Exception as html_error:
                logger.log_message(f"HTML generation failed: {str(html_error)}", level=logging.ERROR)
                import traceback
                logger.log_message(f"HTML generation traceback: {traceback.format_exc()}", level=logging.ERROR)
                raise HTTPException(status_code=500, detail=f"HTML generation failed: {str(html_error)}")
        else:
            logger.log_message("Using legacy format - calling generate_html_report", level=logging.INFO)
            # Legacy format - use the original generate_html_report function
            try:
                html_report = generate_html_report(request.analysis_data)
                logger.log_message(f"Legacy HTML report generated, length: {len(html_report)}", level=logging.INFO)
            except Exception as legacy_error:
                logger.log_message(f"Legacy HTML generation failed: {str(legacy_error)}", level=logging.ERROR)
                import traceback
                logger.log_message(f"Legacy HTML generation traceback: {traceback.format_exc()}", level=logging.ERROR)
                raise HTTPException(status_code=500, detail=f"Legacy HTML generation failed: {str(legacy_error)}")
        
        try:
            # Create filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"deep_analysis_report_{timestamp}.html"
            
            logger.log_message(f"Creating download response with filename: {filename}", level=logging.INFO)
            
            # Return as downloadable file
            return StreamingResponse(
                iter([html_report.encode('utf-8')]),
                media_type='text/html',
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"',
                    'Content-Type': 'text/html; charset=utf-8'
                }
            )
        except Exception as response_error:
            logger.log_message(f"Response creation failed: {str(response_error)}", level=logging.ERROR)
            import traceback
            logger.log_message(f"Response creation traceback: {traceback.format_exc()}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Response creation failed: {str(response_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Failed to generate HTML report: {str(e)}", level=logging.ERROR)
        import traceback
        logger.log_message(f"Full traceback: {traceback.format_exc()}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.get("/chats", response_model=List[ChatResponse])
async def get_deep_analysis_chats(
    user_id: Optional[int] = None,
    limit: int = 10,
    offset: int = 0
):
    """Get deep analysis chats for a user"""
    try:
        # Get all chats for the user
        all_chats = chat_manager.get_user_chats(user_id, limit * 2, offset)  # Get more to filter
        
        # Filter for deep analysis chats
        deep_analysis_chats = [
            chat for chat in all_chats 
            if chat['title'] and DEEP_ANALYSIS_IDENTIFIER in chat['title']
        ]
        
        # Limit to requested amount
        return deep_analysis_chats[:limit]
        
    except Exception as e:
        logger.log_message(f"Error retrieving deep analysis chats: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve deep analysis chats: {str(e)}")

@router.get("/history", response_model=List[Dict[str, Any]])
async def get_deep_analysis_history(
    user_id: Optional[int] = None,
    limit: int = 10,
    offset: int = 0
):
    """Get formatted deep analysis history for display"""
    try:
        history_list = chat_manager.get_deep_analysis_history_list(user_id, limit, offset)
        return history_list
        
    except Exception as e:
        logger.log_message(f"Error retrieving deep analysis history: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve deep analysis history: {str(e)}")

@router.get("/chats/{chat_id}", response_model=ChatDetailResponse)
async def get_deep_analysis_chat(chat_id: int, user_id: Optional[int] = None):
    """Get a specific deep analysis chat with all messages"""
    try:
        chat = chat_manager.get_chat(chat_id, user_id)
        
        # Verify this is a deep analysis chat
        if not (chat['title'] and DEEP_ANALYSIS_IDENTIFIER in chat['title']):
            raise HTTPException(status_code=404, detail="Chat is not a deep analysis chat")
        
        return chat
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.log_message(f"Error retrieving deep analysis chat: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve deep analysis chat: {str(e)}")

@router.get("/chats/{chat_id}/summary", response_model=Dict[str, Any])
async def get_deep_analysis_chat_summary(chat_id: int, user_id: Optional[int] = None):
    """Get a specific deep analysis chat with formatted summary"""
    try:
        chat_with_summary = chat_manager.get_deep_analysis_chat_with_summary(chat_id, user_id)
        return chat_with_summary
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.log_message(f"Error retrieving deep analysis chat summary: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve deep analysis chat summary: {str(e)}")

@router.delete("/chats/{chat_id}")
async def delete_deep_analysis_chat(chat_id: int, user_id: Optional[int] = None):
    """Delete a deep analysis chat and all its messages"""
    try:
        # First verify this is a deep analysis chat
        chat = chat_manager.get_chat(chat_id, user_id)
        if not (chat['title'] and DEEP_ANALYSIS_IDENTIFIER in chat['title']):
            raise HTTPException(status_code=404, detail="Chat is not a deep analysis chat")
        
        # Delete the chat
        success = chat_manager.delete_chat(chat_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Deep analysis chat with ID {chat_id} not found or access denied")
        
        return {
            "message": f"Deep analysis chat {chat_id} deleted successfully", 
            "preserved_model_usage": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.log_message(f"Error deleting deep analysis chat: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to delete deep analysis chat: {str(e)}")

@router.get("/usage/summary")
async def get_deep_analysis_usage_summary(
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get usage summary specifically for deep analysis operations"""
    try:
        # Get overall usage summary
        usage_summary = chat_manager.get_usage_summary(start_date, end_date)
        
        # Filter for deep analysis usage (based on model usage records)
        session = session_factory()
        try:
            from sqlalchemy import and_
            
            # Base query for deep analysis usage
            query = session.query(ModelUsage).filter(
                ModelUsage.model_name.like('%claude%')  # Deep analysis uses Claude models
            )
            
            # Apply filters
            if user_id:
                query = query.filter(ModelUsage.user_id == user_id)
            if start_date:
                query = query.filter(ModelUsage.timestamp >= start_date)
            if end_date:
                query = query.filter(ModelUsage.timestamp <= end_date)
            
            # Get deep analysis specific metrics
            deep_analysis_records = query.all()
            
            total_deep_cost = sum(record.cost or 0 for record in deep_analysis_records)
            total_deep_tokens = sum(record.total_tokens or 0 for record in deep_analysis_records)
            total_deep_requests = len(deep_analysis_records)
            
            return {
                "deep_analysis_summary": {
                    "total_cost": total_deep_cost,
                    "total_tokens": total_deep_tokens,
                    "total_requests": total_deep_requests
                },
                "overall_summary": usage_summary
            }
            
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error getting deep analysis usage summary: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Failed to get usage summary: {str(e)}") 