import io
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Optional
from pydantic import BaseModel

from scripts.format_response import execute_code_from_markdown
from src.utils.logger import Logger
from src.routes.session_routes import get_session_id_dependency
from src.agents.agents import code_edit
import dspy
import os
# Initialize router
router = APIRouter(
    prefix="/code",
    tags=["code"],
    responses={404: {"description": "Not found"}},
)

# Initialize logger
logger = Logger("code_routes", see_time=True, console_log=False)

# Request body model
class CodeExecuteRequest(BaseModel):
    code: str
    
class CodeEditRequest(BaseModel):
    original_code: str
    user_prompt: str
    

def edit_code_with_dspy(original_code: str, user_prompt: str):
    gemini = dspy.LM("gemini/gemini-2.5-pro-preview-03-25", api_key = os.environ['GEMINI_API_KEY'], max_tokens=2000)
    with dspy.context(lm=gemini):
        code_editor = dspy.ChainOfThought(code_edit)
        result = code_editor(
            original_code=original_code,
            user_prompt=user_prompt
        )
        return result.edited_code

@router.post("/execute")
async def execute_code(
    request_data: CodeExecuteRequest,
    request: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    """
    Execute code provided in the request against the session's dataframe
    
    Args:
        request_data: Body containing code to execute
        request: FastAPI Request object
        session_id: Session identifier
        
    Returns:
        Dictionary containing execution output and any plot outputs
    """
    # Access app state via request
    app_state = request.app.state
    session_state = app_state.get_session_state(session_id)
    
    if session_state["current_df"] is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset is currently loaded. Please link a dataset before executing code."
        )
        
    try:
        code = request_data.code
        if not code:
            raise HTTPException(status_code=400, detail="No code provided")
            
        # Execute the code with the dataframe from session state
        output, json_outputs = execute_code_from_markdown(code, session_state["current_df"])
        
        # Format plotly outputs for frontend
        plotly_outputs = [f"```plotly\n{json_output}\n```\n" for json_output in json_outputs]
        
        return {
            "output": output,
            "plotly_outputs": plotly_outputs if json_outputs else None
        }
    except Exception as e:
        logger.log_message(f"Error executing code: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/edit")
async def edit_code(
    request_data: CodeEditRequest,
    request: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    """
    Edit code provided in the request using AI
    
    Args:
        request_data: Body containing original code and user prompt
        request: FastAPI Request object
        session_id: Session identifier
        
    Returns:
        Dictionary containing the edited code
    """
    try:
        # Check if code and prompt are provided
        if not request_data.original_code or not request_data.user_prompt:
            raise HTTPException(status_code=400, detail="Both original code and editing instructions are required")
            
        # Access app state via request
        app_state = request.app.state
        session_state = app_state.get_session_state(session_id)
        
        try:
            # Use the configured language model
            edited_code = edit_code_with_dspy(request_data.original_code, request_data.user_prompt)
                
            return {
                "edited_code": edited_code,
            }
        except Exception as e:
            # Fallback if DSPy models are not initialized or there's an error
            logger.log_message(f"Error with DSPy models: {str(e)}", level=logging.ERROR)
            
            # Return a helpful error message that doesn't expose implementation details
            return {
                "edited_code": request_data.original_code,
                "error": "Could not process edit request. Please try again later."
            }
    except Exception as e:
        logger.log_message(f"Error editing code: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=str(e))