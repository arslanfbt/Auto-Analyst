import io
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Optional
from pydantic import BaseModel

from scripts.format_response import execute_code_from_markdown, format_code_block
from src.utils.logger import Logger
from src.routes.session_routes import get_session_id_dependency
from src.agents.agents import code_edit, code_fix
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
    
class CodeFixRequest(BaseModel):
    code: str
    error: str
    
class CodeCleanRequest(BaseModel):
    code: str

def get_dataset_context(df):
    """
    Generate context information about the dataset
    
    Args:
        df: The pandas dataframe
         
    Returns:
        String with dataset information (columns, types, null values)
    """
    if df is None:
        return "No dataset is currently loaded."
    
    try:
        # Get basic dataframe info
        col_types = df.dtypes.to_dict()
        null_counts = df.isnull().sum().to_dict()
        
        # Format the context string
        context = "Dataset context:\n"
        context += f"- Shape: {df.shape[0]} rows, {df.shape[1]} columns\n"
        context += "- Columns and types:\n"
        
        for col, dtype in col_types.items():
            null_count = null_counts.get(col, 0)
            null_percent = (null_count / len(df)) * 100 if len(df) > 0 else 0
            context += f"  * {col} ({dtype}): {null_count} null values"
        
        # Add sample values for each column (first 2 non-null values)
        context += "- Sample values:\n"
        for col in df.columns:
            sample_values = df[col].dropna().head(2).tolist()
            # if float, round to 2 decimal places
            if df[col].dtype == "float64":
                sample_values = [round(v, 1) for v in sample_values]
            sample_str = ", ".join(str(v) for v in sample_values)
            context += f"  * {col}: {sample_str}\n"
        return context
    except Exception as e:
        logger.log_message(f"Error generating dataset context: {str(e)}", level=logging.ERROR)
        return "Could not generate dataset context information."

def edit_code_with_dspy(original_code: str, user_prompt: str, dataset_context: str = ""):
    gemini = dspy.LM("gemini/gemini-2.5-pro-preview-03-25", api_key = os.environ['GEMINI_API_KEY'], max_tokens=2000)
    with dspy.context(lm=gemini):
        code_editor = dspy.ChainOfThought(code_edit)
        
        logger.log_message(f"Dataset context: {dataset_context}", level=logging.INFO)
        logger.log_message(f"Original code: {original_code}", level=logging.INFO)
        logger.log_message(f"User prompt: {user_prompt}", level=logging.INFO)
        
        result = code_editor(
            dataset_context=dataset_context,
            original_code=original_code,
            user_prompt=user_prompt,
        )
        return result.edited_code

def fix_code_with_dspy(code: str, error: str, dataset_context: str = ""):
    gemini = dspy.LM("gemini/gemini-2.5-pro-preview-03-25", api_key = os.environ['GEMINI_API_KEY'], max_tokens=2000)
    with dspy.context(lm=gemini):
        code_fixer = dspy.ChainOfThought(code_fix)
        logger.log_message(f"FIX Dataset context: {dataset_context}", level=logging.INFO)
        logger.log_message(f"FIX Original code: {code}", level=logging.INFO)
        logger.log_message(f"FIX Error: {error}", level=logging.INFO)
        # Add dataset context information to help the agent understand the data
        result = code_fixer(
            dataset_context=dataset_context,
            faulty_code=code,
            error=error,
        )
        return result.fixed_code
    
import re

def move_imports_to_top(code: str) -> str:
    """
    Moves all import statements to the top of the Python code.

    Args:
        code (str): The raw Python code as a string.

    Returns:
        str: The cleaned code with import statements at the top.
    """
    # Extract import statements
    import_statements = re.findall(
        r'^\s*(import\s+[^\n]+|from\s+[^\n]+import\s+[^\n]+)', code, flags=re.MULTILINE
    )
    
    # Remove import statements from original code
    code_without_imports = re.sub(
        r'^\s*(import\s+[^\n]+|from\s+[^\n]+import\s+[^\n]+)\n?', '', code, flags=re.MULTILINE
    )
    
    # Deduplicate and sort imports
    sorted_imports = sorted(set(import_statements))
    
    # Combine cleaned imports and remaining code
    cleaned_code = '\n'.join(sorted_imports) + '\n\n' + code_without_imports.strip()
    
    return cleaned_code


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
        
        # Get dataset context
        dataset_context = get_dataset_context(session_state["current_df"])
        
        try:
            # Use the configured language model with dataset context
            edited_code = edit_code_with_dspy(
                request_data.original_code, 
                request_data.user_prompt,
                dataset_context
            )
            edited_code = format_code_block(edited_code)
                
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

@router.post("/fix")
async def fix_code(
    request_data: CodeFixRequest,
    request: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    """
    Fix code with errors using the code_fix agent
    
    Args:
        request_data: Body containing code and error message
        request: FastAPI Request object
        session_id: Session identifier
        
    Returns:
        Dictionary containing the fixed code
    """
    try:
        # Check if code and error are provided
        if not request_data.code or not request_data.error:
            raise HTTPException(status_code=400, detail="Both code and error message are required")
            
        # Access app state via request
        app_state = request.app.state
        session_state = app_state.get_session_state(session_id)
        
        # Get dataset context
        dataset_context = get_dataset_context(session_state["current_df"])
        
        try:
            # Use the code_fix agent to fix the code, with dataset context
            fixed_code = fix_code_with_dspy(
                request_data.code, 
                request_data.error,
                dataset_context
            )
            fixed_code = format_code_block(fixed_code)
                
            return {
                "fixed_code": fixed_code,
            }
        except Exception as e:
            # Fallback if DSPy models are not initialized or there's an error
            logger.log_message(f"Error with DSPy models: {str(e)}", level=logging.ERROR)
            
            # Return a helpful error message that doesn't expose implementation details
            return {
                "fixed_code": request_data.code,
                "error": "Could not process fix request. Please try again later."
            }
    except Exception as e:
        logger.log_message(f"Error fixing code: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=str(e))
    
    
@router.post("/clean-code")
async def clean_code(
    request_data: CodeCleanRequest,
    request: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    """
    Clean code provided in the request
    
    Args:
        request_data: Body containing code to clean
        request: FastAPI Request object
        session_id: Session identifier
        
    Returns:
        Dictionary containing the cleaned code
    """
    try:
        # Check if code is provided
        if not request_data.code:
            raise HTTPException(status_code=400, detail="Code is required")

        # Clean the code
        cleaned_code = move_imports_to_top(request_data.code)
        
        return {
            "cleaned_code": cleaned_code,
        }
    except Exception as e:
        logger.log_message(f"Error cleaning code: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=str(e))

