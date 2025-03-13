import io
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Optional
from pydantic import BaseModel

from scripts.format_response import execute_code_from_markdown
from src.utils.logger import Logger
from src.managers.session_manager import get_session_id

# Initialize router
router = APIRouter(
    prefix="/code",
    tags=["code"],
    responses={404: {"description": "Not found"}},
)

# Initialize logger
logger = Logger("code_routes", see_time=True, console_log=True)


@router.post("/execute")
async def execute_code(
    request_obj: dict,
    session_id: str = Depends(get_session_id)
):
    """
    Execute code provided in the request against the session's dataframe
    
    Args:
        request: Dictionary containing code to execute
        request_obj: FastAPI Request object
        session_id: Session identifier
        
    Returns:
        Dictionary containing execution output and any plot outputs
    """
    # Access app state via request
    app_state = request_obj.app.state
    session_state = app_state.get_session_state(session_id)
    
    if session_state["current_df"] is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset is currently loaded. Please link a dataset before executing code."
        )
        
    try:
        code = request.code
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
