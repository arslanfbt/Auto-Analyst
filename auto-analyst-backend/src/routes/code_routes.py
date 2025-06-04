import io
import logging
import re
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Optional, List, Tuple
from pydantic import BaseModel

from scripts.format_response import execute_code_from_markdown, format_code_block
from src.utils.logger import Logger
from src.routes.session_routes import get_session_id_dependency
from src.agents.agents import code_edit, code_fix
from src.db.schemas.models import CodeExecution
from src.db.init_db import get_session
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
try_logger = Logger("try_code_routes", see_time=True, console_log=False)
# Request body model
class CodeExecuteRequest(BaseModel):
    code: str
    session_id: Optional[str] = None
    message_id: Optional[int] = None
    
class CodeEditRequest(BaseModel):
    original_code: str
    user_prompt: str
    
class CodeFixRequest(BaseModel):
    code: str
    error: str
    
class CodeCleanRequest(BaseModel):
    code: str
    
class GetLatestCodeRequest(BaseModel):
    message_id: int
    
def format_code(code: str) -> str:
    """
    Clean the code by organizing imports and ensuring code blocks are properly formatted.
    
    Args:
        code (str): The raw Python code as a string.
        
    Returns:
        str: The cleaned code.
    """
    # Move imports to top
    code = move_imports_to_top(code)
    
    # Split code into blocks if they exist (based on comments like '# agent_name code start')
    code_blocks = []
    current_block = []
    current_agent = None
    
    for line in code.splitlines():
        if re.search(r'#\s+\w+\s+code\s+start', line.lower()):
            if current_agent and current_block:
                code_blocks.append((current_agent, '\n'.join(current_block)))
                current_block = []
            current_agent = re.search(r'#\s+(\w+)\s+code\s+start', line.lower()).group(1)
            current_block.append(line)
        elif re.search(r'#\s+\w+\s+code\s+end', line.lower()):
            if current_block:
                current_block.append(line)
                code_blocks.append((current_agent, '\n'.join(current_block)))
                current_agent = None
                current_block = []
        else:
            current_block.append(line)
    
    # If there's remaining code not in a block
    if current_block:
        if current_agent:
            code_blocks.append((current_agent, '\n'.join(current_block)))
        else:
            code_blocks.append(('main', '\n'.join(current_block)))
    
    # If no blocks were identified, return the original cleaned code
    if not code_blocks:
        return code
    # Reconstruct the code with the identified blocks
    return '\n\n'.join([block[1] for block in code_blocks])

def extract_code_blocks(code: str) -> Dict[str, str]:
    """
    Extract code blocks from the code based on agent name comments.
    
    Args:
        code (str): The code containing multiple blocks
        
    Returns:
        Dict[str, str]: Dictionary mapping agent names to their code blocks
    """
    # Find code blocks with start and end markers
    block_pattern = r'(#\s+(\w+)\s+code\s+start[\s\S]*?#\s+\w+\s+code\s+end)'
    blocks_with_markers = re.findall(block_pattern, code, re.DOTALL)
    
    if not blocks_with_markers:
        # If no blocks found, treat the entire code as one block
        return {'main': code}
    
    result = {}
    for full_block, agent_name in blocks_with_markers:
        result[agent_name.lower()] = full_block.strip()
    
    return result

def identify_error_blocks(code: str, error_output: str) -> List[Tuple[str, str, str]]:
    """
    Identify code blocks that have errors during execution.
    
    Args:
        code (str): The full code containing multiple agent blocks
        error_output (str): The error output from execution
        
    Returns:
        List[Tuple[str, str, str]]: List of tuples containing (agent_name, block_code, error_message)
    """
    # Parse the error output to find which agents had errors
    faulty_blocks = []
    
    # Find error patterns like "=== ERROR IN AGENT_NAME ===" or "=== ERROR IN UNKNOWN_AGENT ==="
    error_matches = []
    for match in re.finditer(
        r'^===\s+ERROR\s+IN\s+([A-Za-z0-9_]+)\s+===\s*([\s\S]*?)(?=^===\s+[A-Z]+\s+IN\s+[A-Za-z0-9_]+\s+===|\Z)',
        error_output,
        re.MULTILINE
    ):
        error_matches.append((match.group(1), match.group(2)))
    
    if not error_matches:
        return []
    
    # Find all code blocks in the given code
    blocks = {}
    for agent_match in re.finditer(r'#\s+(\w+)\s+code\s+start([\s\S]*?)#\s+\w+\s+code\s+end', code, re.DOTALL):
        agent_name = agent_match.group(1).lower()
        full_block = agent_match.group(0)
        blocks[agent_name] = full_block
    
    # Match errors with their corresponding code blocks
    matched_blocks = set()
    for agent_name, error_message in error_matches:
        # Format from error output is AGENT_NAME_AGENT, we need to extract the base name
        # Remove '_AGENT' suffix if present and convert to lowercase
        normalized_name = agent_name.lower()
        if normalized_name.endswith('_agent'):
            normalized_name = normalized_name[:-6]  # Remove '_agent' suffix
        
        # Try direct match first
        if normalized_name in blocks:
            # Extract the relevant error information
            processed_error = extract_relevant_error_section(error_message)
            faulty_blocks.append((normalized_name, blocks[normalized_name], processed_error))
            matched_blocks.add(normalized_name)
        else:
            # Try fuzzy matching for agent names
            for block_name, block_code in blocks.items():
                if block_name not in matched_blocks and (normalized_name in block_name or block_name in normalized_name):
                    # Extract the relevant error information
                    processed_error = extract_relevant_error_section(error_message)
                    faulty_blocks.append((block_name, block_code, processed_error))
                    matched_blocks.add(block_name)
                    break
    
    # logger.log_message(f"Faulty blocks found: {len(faulty_blocks)}", level=logging.INFO)
    # logger.log_message(f"Faulty blocks: {faulty_blocks}", level=logging.INFO)
    return faulty_blocks

def extract_relevant_error_section(error_message: str) -> str:
    """
    Extract the most relevant parts of the error message to help with fixing.
    
    Args:
        error_message (str): The full error message
        
    Returns:
        str: The processed error message with the most relevant information
    """
    error_lines = error_message.strip().split('\n')
    
    # If "Problem at this location" is in the error, focus on that section
    if 'Problem at this location:' in error_message:
        problem_idx = -1
        for i, line in enumerate(error_lines):
            if 'Problem at this location:' in line:
                problem_idx = i
                break
        
        if problem_idx >= 0:
            # Include the "Problem at this location" section and a few lines after
            end_idx = min(problem_idx + 10, len(error_lines))
            problem_section = error_lines[problem_idx:end_idx]
            
            # Also include the error type from the end
            error_type_lines = []
            for line in reversed(error_lines):
                if line.startswith('TypeError:') or line.startswith('ValueError:') or line.startswith('AttributeError:'):
                    error_type_lines = [line]
                    break
            
            return '\n'.join(problem_section + error_type_lines)
    
    # If we couldn't find "Problem at this location", include first few and last few lines
    if len(error_lines) > 10:
        return '\n'.join(error_lines[:5] + error_lines[-7:])
    
    # If the error is short enough, return as is
    return error_message

def fix_code_with_dspy(code: str, error: str, dataset_context: str = ""):
    """
    Fix code with errors by identifying faulty blocks and fixing them individually
    
    Args:
        code (str): The code containing errors
        error (str): Error message from execution
        dataset_context (str): Context about the dataset
        
    Returns:
        str: The fixed code
    """
    # gemini = dspy.LM("gemini/gemini-2.5-pro-preview-03-25", api_key = os.environ['GEMINI_API_KEY'], max_tokens=5000)
    claude = dspy.LM("anthropic/claude-3-5-sonnet-latest", api_key = os.environ['ANTHROPIC_API_KEY'], max_tokens=5000)
    # Find the blocks with errors
    faulty_blocks = identify_error_blocks(code, error)
    if not faulty_blocks:
        # If no specific errors found, fix the entire code
        with dspy.context(lm=claude):
            code_fixer = dspy.ChainOfThought(code_fix)
            result = code_fixer(
                dataset_context=str(dataset_context) or "",
                faulty_code=str(code) or "",
                error=str(error) or "",
            )
            return result.fixed_code
    
    # Start with the original code
    result_code = code.replace("```python", "").replace("```", "")
    
    # Fix each faulty block separatelyw
    with dspy.context(lm=claude):
        code_fixer = dspy.ChainOfThought(code_fix)
        
        for agent_name, block_code, specific_error in faulty_blocks:
            
            try:
                # Extract inner code between the markers
                inner_code_match = re.search(r'#\s+\w+\s+code\s+start\s*\n([\s\S]*?)#\s+\w+\s+code\s+end', block_code)
                if not inner_code_match:
                    continue
                    
                inner_code = inner_code_match.group(1).strip()
                
                # Find markers
                start_marker_match = re.search(r'(#\s+\w+\s+code\s+start)', block_code)
                end_marker_match = re.search(r'(#\s+\w+\s+code\s+end)', block_code)
                
                if not start_marker_match or not end_marker_match:
                    logger.log_message(f"Could not find start/end markers for {agent_name}", level=logging.WARNING)
                    continue
                    
                start_marker = start_marker_match.group(1)
                end_marker = end_marker_match.group(1)
                
                # Extract the error type and actual error message
                error_type = ""
                error_msg = specific_error
                
                # Look for common error patterns to provide focused context to the LLM
                error_type_match = re.search(r'(TypeError|ValueError|AttributeError|IndexError|KeyError|NameError):\s*([^\n]+)', specific_error)
                if error_type_match:
                    error_type = error_type_match.group(1)
                    error_msg = f"{error_type}: {error_type_match.group(2)}"
                
                # Add problem location if available
                if "Problem at this location:" in specific_error:
                    problem_section = re.search(r'Problem at this location:([\s\S]*?)(?:\n\n|$)', specific_error)
                    if problem_section:
                        error_msg = f"{error_msg}\n\nProblem at: {problem_section.group(1).strip()}"
                
                # Fix only the inner code
                result = code_fixer(
                    dataset_context=str(dataset_context) or "",
                    faulty_code=str(inner_code) or "",
                    error=str(error_msg) or "",
                )   
                
                # Ensure the fixed code is properly stripped and doesn't include markers
                fixed_inner_code = result.fixed_code.strip()
                if fixed_inner_code.startswith('#') and 'code start' in fixed_inner_code:
                    # If LLM included markers in response, extract only inner code
                    inner_match = re.search(r'#\s+\w+\s+code\s+start\s*\n([\s\S]*?)#\s+\w+\s+code\s+end', fixed_inner_code)
                    if inner_match:
                        fixed_inner_code = inner_match.group(1).strip()
                
                # Reconstruct the block with fixed code
                fixed_block = f"{start_marker}\n\n{fixed_inner_code}\n\n{end_marker}"
                
                # Replace the original block with the fixed block in the full code
                result_code = result_code.replace(block_code, fixed_block)
                
            except Exception as e:
                # Log the error but continue with other blocks
                logger.log_message(f"Error fixing {agent_name} block: {str(e)}", level=logging.ERROR)
                continue
    
    return result_code

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
            context += f"  * {col} ({dtype}): {null_count} null values\n"
        
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
        return "Could not generate dataset context information."

def edit_code_with_dspy(original_code: str, user_prompt: str, dataset_context: str = ""):
    # gemini = dspy.LM("claude-3-5-sonnet-latest", api_key = os.environ['ANTHROPIC_API_KEY'], max_tokens=3000)
    claude = dspy.LM("anthropic/claude-3-5-sonnet-latest", api_key = os.environ['ANTHROPIC_API_KEY'], max_tokens=3000)
    with dspy.context(lm=claude):
        code_editor = dspy.ChainOfThought(code_edit)
        
        result = code_editor(
            dataset_context=dataset_context,
            original_code=original_code,
            user_prompt=user_prompt,
        )
        return result.edited_code

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
    # logger.log_message(f"Session State: {session_state}", level=logging.INFO)
    
    if session_state["current_df"] is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset is currently loaded. Please link a dataset before executing code."
        )
        
    try:
        code = request_data.code
        if not code:
            raise HTTPException(status_code=400, detail="No code provided")
            
        # Get the user_id and chat_id from session state if available
        user_id = session_state.get("user_id")
        chat_id = session_state.get("chat_id")
        message_id = request_data.message_id
        
        # If message_id was not provided in the request, try to get it from the session state
        if message_id is None:
            message_id = session_state.get("current_message_id")
        else:
            # Update the session state with the provided message_id
            session_state["current_message_id"] = message_id
        
        # Get model configuration
        model_config = session_state.get("model_config", {})
        model_provider = model_config.get("provider", "")
        model_name = model_config.get("model", "")
        model_temperature = model_config.get("temperature", 0.0)
        model_max_tokens = model_config.get("max_tokens", 0)
        
        # Get database session
        db = get_session()
        
        # Check if we have an existing execution record for this message
        existing_execution = None
        if message_id:
            try:
                existing_execution = db.query(CodeExecution).filter(
                    CodeExecution.message_id == message_id
                ).first()
                
            except Exception as query_error:
                logger.log_message(f"Error querying for existing execution: {str(query_error)}", level=logging.ERROR)
                # Continue without existing execution
        else:
            logger.log_message("No message_id provided in session state", level=logging.WARNING)
            
        # Execute the code with the dataframe from session state
        full_output = ""
        json_outputs = []
        is_successful = True
        failed_agents = None
        error_messages = None
        
        try:
            full_output, json_outputs = execute_code_from_markdown(code, session_state["current_df"])
            
            # Even with "successful" execution, check for agent failures in the output
            failed_blocks = identify_error_blocks(code, full_output)
            
            if failed_blocks:
                # We have some failed agents even though no exception was thrown
                is_successful = False  # Mark as failed if any agent failed
                failed_agents = json.dumps([block[0] for block in failed_blocks])
                error_messages = json.dumps({
                    block[0]: block[2] for block in failed_blocks
                })
                logger.log_message(f"Partial execution failure. Failed agents: {failed_agents}", level=logging.WARNING)
            
        except Exception as exec_error:
            full_output = str(exec_error)
            is_successful = False
            
            # Identify which agents failed
            failed_blocks = identify_error_blocks(code, full_output)
            
            # Format the failed agents and error messages
            if failed_blocks:
                failed_agents = json.dumps([block[0] for block in failed_blocks])
                error_messages = json.dumps({
                    block[0]: block[2] for block in failed_blocks
                })
                logger.log_message(f"Execution threw exception. Failed agents: {failed_agents}", level=logging.ERROR)
            
            # Don't re-raise the error - we want to capture the error and send it back to the client
            # return error details in the response instead
        
        # Create or update the execution record regardless of success/failure
        try:
            if existing_execution:
                # Update existing record
                existing_execution.latest_code = code
                existing_execution.is_successful = is_successful
                existing_execution.output = full_output
                
                if not is_successful:
                    existing_execution.failed_agents = failed_agents
                    existing_execution.error_messages = error_messages
                    
                db.commit()
            else:
                # Create new record
                new_execution = CodeExecution(
                    message_id=message_id,
                    chat_id=chat_id,
                    user_id=user_id,
                    initial_code=code,
                    latest_code=code,
                    is_successful=is_successful,
                    output=full_output,
                    model_provider=model_provider,
                    model_name=model_name,
                    model_temperature=model_temperature,
                    model_max_tokens=model_max_tokens,
                    failed_agents=failed_agents,
                    error_messages=error_messages
                )
                db.add(new_execution)
                db.commit()
        except Exception as db_error:
            db.rollback()
            logger.log_message(f"Error saving code execution: {str(db_error)}", level=logging.ERROR)
        finally:
            db.close()
        
        # Format plotly outputs for frontend
        plotly_outputs = [f"```plotly\n{json_output}\n```\n" for json_output in json_outputs]
        
        # Include execution status in the response
        return {
            "output": full_output,
            "plotly_outputs": plotly_outputs if json_outputs else None,
            "is_successful": is_successful,
            "failed_agents": failed_agents
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
    Fix code with errors using block-by-block approach
    
    Args:
        request_data: Body containing code and error message
        request: FastAPI Request object
        session_id: Session identifier
        
    Returns:
        Dictionary containing the fixed code and information about fixed blocks
    """
    try:
        # Check if code and error are provided
        if not request_data.code or not request_data.error:
            logger.log_message(f"Error fixing code: Both code and error message are required {request_data.code} {request_data.error}", level=logging.ERROR)
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

        # Clean the code using the format_code function
        cleaned = format_code(request_data.code)
        
        return {
            "cleaned_code": cleaned,
        }
    except Exception as e:
        logger.log_message(f"Error cleaning code: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/get-latest-code")
async def get_latest_code(
    request_data: GetLatestCodeRequest,
    request: Request,
    session_id: str = Depends(get_session_id_dependency)
):
    """
    Retrieve the latest code for a specific message_id
    
    Args:
        request_data: Body containing message_id
        request: FastAPI Request object
        session_id: Session identifier
        
    Returns:
        Dictionary containing the latest code and execution status
    """
    try:
        message_id = request_data.message_id
        
        if not message_id:
            raise HTTPException(status_code=400, detail="Message ID is required")
            
        # Get database session
        db = get_session()
        
        try:
            # Query the database for the latest code execution record
            execution_record = db.query(CodeExecution).filter(
                CodeExecution.message_id == message_id
            ).first()
            
            logger.log_message(f"Execution record: {execution_record.is_successful} for {message_id}", level=logging.INFO)
            
            if execution_record:
                # Return the latest code and execution status
                return {
                    "found": True,
                    "message_id": message_id,
                    "latest_code": execution_record.latest_code,
                    "initial_code": execution_record.initial_code,
                    "is_successful": execution_record.is_successful,
                    "failed_agents": execution_record.failed_agents
                }
            else:
                logger.log_message(f"No execution record found for message_id: {message_id}", level=logging.INFO)
                return {
                    "found": False,
                    "message_id": message_id
                }
                
        except Exception as db_error:
            logger.log_message(f"Database error retrieving latest code: {str(db_error)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")
        finally:
            db.close()
            
    except Exception as e:
        logger.log_message(f"Error retrieving latest code: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=str(e))