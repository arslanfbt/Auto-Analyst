import io
import logging
import json
import re
import os
from io import StringIO
from typing import Optional, List, Dict
import random
import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from src.managers.session_manager import get_session_id
from src.schemas.model_settings_schema import ModelSettings
from src.utils.logger import Logger
# data context is for excelsheets with multiple sheets and dataset_descrp is for single sheet or csv
from src.agents.agents import data_context_gen, dataset_description_agent
from src.utils.model_registry import MODEL_OBJECTS, mid_lm
from src.utils.dataset_description_generator import generate_dataset_description
import dspy


logger = Logger("session_routes", see_time=False, console_log=False)

# Add session header for dependency
X_SESSION_ID = APIKeyHeader(name="X-Session-ID", auto_error=False)

router = APIRouter(tags=["session"])

# Dependency to get app state
def get_app_state(request: Request):
    return request.app.state

# Update session dependency for FastAPI
async def get_session_id_dependency(request: Request):
    """Dependency to get session ID, wrapped for FastAPI"""
    app_state = get_app_state(request)
    return await get_session_id(request, app_state._session_manager)

# Define a model for message tracking
class MessageInfo(BaseModel):
    chat_id: Optional[int] = None
    message_id: Optional[int] = None
    user_id: Optional[int] = None

# Define a model for reset session request
class ResetSessionRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    preserveModelSettings: Optional[bool] = False

# Define a response model for Excel sheets
class ExcelSheetsResponse(BaseModel):
    sheets: List[str]

@router.post("/api/excel-sheets")
async def get_excel_sheets(
    file: UploadFile = File(...),
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency)
):
    """Get the list of sheet names from an Excel file"""
    try:
        # Read the uploaded Excel file
        contents = await file.read()
        
        # Load Excel file using pandas
        excel_file = pd.ExcelFile(io.BytesIO(contents))
        
        # Get sheet names
        sheet_names = excel_file.sheet_names
        
        # Log the sheets found
        # logger.log_message(f"Found {len(sheet_names)} sheets in Excel file: {', '.join(sheet_names)}", level=logging.INFO)
        
        # Return the sheet names
        return {"sheets": sheet_names}
    except Exception as e:
        logger.log_message(f"Error getting Excel sheets: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")




@router.post("/upload_excel")
async def upload_excel(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(...),
    selected_sheets: Optional[str] = Form(None),  # JSON array of strings
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency),
    request: Request = None
):
    """Upload and process an Excel file with a specific sheet"""
    try:
        # Log the incoming request details
        # logger.log_message(f"Excel upload request for session {session_id}: name='{name}', description='{description}', sheet='{sheet_name}'", level=logging.INFO)
        
        # Check if we need to force a complete session reset before upload
        force_refresh = request.headers.get("X-Force-Refresh") == "true" if request else False
        
        if force_refresh:
            # logger.log_message(f"Force refresh requested for session {session_id} before Excel upload", level=logging.INFO)
            # Reset the session but don't completely wipe it, so we maintain user association
            app_state.reset_session_to_default(session_id)
        
        # Read the uploaded Excel file
        contents = await file.read()
        
        try:
            # Load Excel file to get all sheet names
            excel_file = pd.ExcelFile(io.BytesIO(contents))
            sheet_names = excel_file.sheet_names
            
            # Parse selected sheets if provided; else use all sheets
            target_sheets = sheet_names
            if selected_sheets:
                try:
                    sel = json.loads(selected_sheets)
                    if isinstance(sel, list):
                        target_sheets = [s for s in sheet_names if s in sel]
                except Exception:
                    pass

            # Get session state and DuckDB connection
            session_state = app_state.get_session_state(session_id)
            duckdb_conn = session_state.get("duckdb_conn")
            datasets = {}
            
            if not duckdb_conn:
                raise HTTPException(status_code=500, detail="DuckDB connection not found for session")
            
            # Process all sheets and register them in DuckDB
            processed_sheets = []
            
            for sheet_name in target_sheets:
                try:
                    # Read each sheet
                    sheet_df = pd.read_excel(io.BytesIO(contents), sheet_name=sheet_name)
                    
                    # Preprocessing steps
                    # 1. Drop empty rows and columns
                    sheet_df.dropna(how='all', inplace=True)
                    sheet_df.dropna(how='all', axis=1, inplace=True)
                    
                    # 2. Clean column names
                    sheet_df.columns = sheet_df.columns.str.strip()
                    
                    # 3. Skip empty sheets
                    if sheet_df.empty:
                        continue
                    
                    # Register each sheet in DuckDB with a clean table name
                    clean_sheet_name = sheet_name.replace(' ', '_').replace('-', '_').lower()
                    # Check if the clean_sheet_name is a safe Python variable name; if not, append a random int
                    if not is_safe_variable_name(clean_sheet_name):
                        
                        clean_sheet_name = f"{clean_sheet_name}_{random.randint(1000, 9999)}"
                    # First drop the table if it exists
                    try:
                        duckdb_conn.execute(f"DROP TABLE IF EXISTS {clean_sheet_name}")
                    except:
                        pass

                    # Then register the new table
                    datasets[clean_sheet_name] = sheet_df  # Store the DataFrame, not the name
                    duckdb_conn.register(clean_sheet_name, sheet_df)
                    # exec(f"{clean_sheet_name} = duckdb_conn.execute('SELECT * FROM {clean_sheet_name}').fetchdf()")
                    
                    processed_sheets.append(clean_sheet_name)
                        
                except Exception as e:
                    logger.log_message(f"Error processing sheet '{sheet_name}': {str(e)}", level=logging.WARNING)
                    continue
            
            if not processed_sheets:
                raise HTTPException(status_code=400, detail="No valid sheets found in Excel file")
            
            # Update the session description (no primary dataset needed)
            desc = description
            app_state.update_session_dataset(session_id,datasets,processed_sheets,desc)


            
            logger.log_message(f"Processed Excel file with {len(processed_sheets)} sheets: {', '.join(processed_sheets)}", level=logging.INFO)
            
            return {
                "message": "Excel file processed successfully", 
                "session_id": session_id, 
                "sheets_processed": processed_sheets,
                "total_sheets": len(processed_sheets)
            }
            
        except Exception as e:
            logger.log_message(f"Error processing Excel file: {str(e)}", level=logging.ERROR)
            raise HTTPException(status_code=400, detail=f"Error processing Excel file: {str(e)}")
            
    except Exception as e:
        logger.log_message(f"Error in upload_excel: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=400, detail=str(e))



def is_safe_variable_name(name: str) -> bool:
    """Check if name is a safe Python identifier"""
    return bool(re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name)) and len(name) <= 30

@router.post("/upload_dataframe")
async def upload_dataframe(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(...),
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency),
    request: Request = None
):
    
    try:
        # Log the incoming request details
        # logger.log_message(f"Upload request for session {session_id}: name='{name}', description='{description}'", level=logging.INFO)
        
        # Check if we need to force a complete session reset before upload



        # If name is longer than 30 characters, shorten it
        name = name.replace(' ', '_').lower().strip()



        force_refresh = request.headers.get("X-Force-Refresh") == "true" if request else False
        
        if force_refresh:
            # logger.log_message(f"Force refresh requested for session {session_id} before upload", level=logging.INFO)
            # Reset the session but don't completely wipe it, so we maintain user association
            app_state.reset_session_to_default(session_id)
        
        # Now process the new file
        contents = await file.read()
        # Note: There is no reliable way to determine the encoding of a file just from its bytes.
        # We have to try common encodings or rely on user input/metadata.
        # Try a list of common encodings to read the CSV
        encodings_to_try = ['utf-8', 'utf-8-sig', 'unicode_escape', 'ISO-8859-1', 'latin1', 'cp1252']
        
        new_df = None
        
        last_exception = None
        for enc in encodings_to_try:
            try:
                new_df = pd.read_csv(io.BytesIO(contents), encoding=enc)
                break
            except Exception as e:
                last_exception = e
                continue

        if new_df is None:
            raise HTTPException(status_code=400, detail=f"Error reading file with tried encodings: {encodings_to_try}. Last error: {str(last_exception)}")
        session_state = app_state.get_session_state(session_id)
        duckdb_conn = session_state.get("duckdb_conn")
        
        
        desc = f" exact_python_name: `{name}` Dataset: {description}"
        
        # logger.log_message(f"Updating session dataset with description: '{desc}'", level=logging.INFO)
        datasets = {name:new_df}
        app_state.update_session_dataset(session_id, datasets , [name], desc)
        
        # Log the final state
        session_state = app_state.get_session_state(session_id)

        # conn = session_state.get('duckdb_conn')
        # if conn is None:
        #     raise HTTPException(status_code=500, detail="DuckDB connection not available for session")

        # try:
        #     conn.execute("DROP TABLE IF EXISTS df")
        #     conn.execute(f"DROP TABLE IF EXISTS {name}")
        # except:
        #     pass

        
        # logger.log_message(f"Session dataset updated with description: '{session_state.get('description')}'", level=logging.INFO)
        
        return {"message": "Dataframe uploaded successfully", "session_id": session_id}
    except Exception as e:
        logger.log_message(f"Error in upload_dataframe: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/settings/model")
async def update_model_settings(
    settings: ModelSettings,
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency)
):
    try:
        # If no API key provided, use default
        if not settings.api_key:
            if settings.provider.lower() == "groq":
                settings.api_key = os.getenv("GROQ_API_KEY")
            elif settings.provider.lower() == "openai":
                settings.api_key = os.getenv("OPENAI_API_KEY")
            elif settings.provider.lower() == "anthropic":
                settings.api_key = os.getenv("ANTHROPIC_API_KEY")
            elif settings.provider.lower() == "gemini":
                settings.api_key = os.getenv("GEMINI_API_KEY")
        
        # Get session state to update model config
        session_state = app_state.get_session_state(session_id)
        
        # Create the model config
        if 'gpt-5' in str(settings.model):
            model_config = {
                "provider": settings.provider,
                "model": settings.model,
                "api_key": settings.api_key,
                "temperature": settings.temperature,
                "max_tokens":None,
                "max_completion_tokens": 2500
            }
        elif 'o1-' in str(settings.model):
            model_config = {
                "provider": settings.provider,
                "model": settings.model,
                "api_key": settings.api_key,
                "temperature": 1,
                "max_tokens":5001
            }
            
        
        else:
            model_config = {
                "provider": settings.provider,
                "model": settings.model,
                "api_key": settings.api_key,
                "temperature": settings.temperature,
                "max_tokens": settings.max_tokens
            }
            
        # Update only the session's model config
        session_state["model_config"] = model_config
        
        # Also update the global model_config in app_state
        app_state.model_config = model_config
        
        # Update SessionManager's app_model_config
        app_state._session_manager._app_model_config = model_config

        # Create the LM instance to test the configuration, but don't set it globally
        lm = MODEL_OBJECTS[str(settings.model)]
        

        

        # Test the model configuration without setting it globally
        try:
            # resp = lm("Hello, are you working?")
            # logger.log_message(f"Model Response: {resp}", level=logging.INFO)
            # REMOVED: dspy.configure(lm=lm) - no longer set globally
            return {"message": "Model settings updated successfully"}
        except Exception as model_error:
            if "auth" in str(model_error).lower() or "api" in str(model_error).lower():
                raise HTTPException(
                    status_code=401,
                    detail=f"Invalid API key for {settings.model}. Please check your API key and try again."
                )
            elif "model" in str(model_error).lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid model selection: {settings.model}. Please check if you have access to this model. {model_error}"
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error configuring model: {str(model_error)}"
                )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}. Please check your model selection and API key."
        )

@router.get("/api/model-settings")
async def get_model_settings(
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency)
):
    """Get current model settings for the specific session"""
    # Get the session state for this specific user
    session_state = app_state.get_session_state(session_id)
    
    # Get model config from session state, with default fallbacks if needed
    model_config = session_state.get("model_config", {})
    
    # Use values from model_config with fallbacks to defaults
    return {
        "provider": model_config.get("provider", "openai"),
        "model": model_config.get("model", "o1"),
        "hasCustomKey": bool(model_config.get("api_key")) or bool(os.getenv("CUSTOM_API_KEY")),
        "temperature": model_config.get("temperature", 0.7),
        "maxTokens": model_config.get("max_tokens", 6000)
    }

@router.post("/api/preview-csv")
@router.get("/api/preview-csv")
async def preview_csv(app_state = Depends(get_app_state), session_id: str = Depends(get_session_id_dependency)):
    """Preview the dataset stored in the session."""
    try:
        # Get the session state to ensure we're using the current dataset
        session_state = app_state.get_session_state(session_id)
        datasets = session_state.get("datasets")
        keys = list(datasets.keys())
        df = datasets[keys[0]]
        
        # Handle case where dataset might be missing
        if df is None:
            logger.log_message(f"Dataset not found in session {session_id}, using default", level=logging.WARNING)
            # Create a new default session for this session ID
            app_state.reset_session_to_default(session_id)
            # Get the session state again
            session_state = app_state.get_session_state(session_id)
            datasets = session_state.get("datasets")
            keys = list(datasets.keys())
            df = datasets[keys[0]]

        # Replace NaN values with None (which becomes null in JSON)
        df = df.where(pd.notna(df), None)

        # Convert columns to appropriate types if necessary
        for column in df.columns:
            if df[column].dtype == 'object':
                # Attempt to convert to boolean if the column contains 'True'/'False' strings
                if df[column].isin(['True', 'False']).all():
                    df[column] = df[column].astype(bool)

        # Extract name and description if available
        name = session_state.get("name")
        description = session_state.get("description", "No description available")
        
        
        # Try to get the description from make_data if available
        if "make_data" in session_state and session_state["make_data"]:
            data_dict = session_state["make_data"]
            if "Description" in data_dict:
                full_desc = data_dict["Description"]
                # Try to parse the description format "{name} Dataset: {description}"
                if "Dataset:" in full_desc:
                    parts = full_desc.split("Dataset:", 1)
                    extracted_name = parts[0].strip()
                    extracted_description = parts[1].strip()
                    
                    # Only use extracted values if they're meaningful
                    if extracted_name:
                        name = extracted_name
                    if extracted_description and extracted_description != "No description available":
                        description = extracted_description
                    
                    # logger.log_message(f"Extracted name: '{name}', description: '{description}'", level=logging.INFO)
                else:
                    # If we can't parse it, use the full description
                    if full_desc and full_desc != "No description available":
                        description = full_desc

        # Make sure we're not returning "No description available" if there's a description in the session
        if description == "No description available" and session_state.get("description"):
            session_desc = session_state.get("description")
            # Check if the description is in the format "{name} Dataset: {description}"
            if "Dataset:" in session_desc:
                parts = session_desc.split("Dataset:", 1)
                description = parts[1].strip()
            else:
                description = session_desc
                
        # Get rows and convert to dict
        preview_data = {
            "headers": df.columns.tolist(),
            "rows": json.loads(df.head(5).to_json(orient="values")),
            "name": name,
            "description": description
        }
        
        return preview_data
    except Exception as e:
        logger.log_message(f"Error in preview_csv: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/default-dataset")
async def get_default_dataset(
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency)
):
    """Get default dataset and ensure session is using it"""
    # try:
        # First ensure the session is reset to default
    # app_state.reset_session_to_default(session_id)
    
    # Get the session state to ensure we're using the default dataset
    session_state = app_state.get_session_state(session_id)
    datasets = session_state["datasets"]
    keys = list(datasets.keys())
    if "df" in keys:
        df = datasets['df']
    desc = session_state["description"]
    
    # Replace NaN values with None (which becomes null in JSON)
    df = df.where(pd.notna(df), None)
    
    preview_data = {
        "headers": df.columns.tolist(),
        "rows": df.head(10).values.tolist(),
        "name": "Housing Dataset",
        "description": desc
    }
    return preview_data
    # except Exception as e:
    #     raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset-session")
async def reset_session(
    request_data: Optional[ResetSessionRequest] = None,
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency),
    name: str = None,
    description: str = None
):
    """Reset session to use default dataset with optional new description"""
    try:
        # Check if we need to preserve model settings
        preserve_settings = False
        if request_data and request_data.preserveModelSettings:
            preserve_settings = True
            
        # Get the current model settings before reset if needed
        model_config = None
        if preserve_settings:
            try:
                session_state = app_state.get_session_state(session_id)
                if "model_config" in session_state:
                    model_config = session_state["model_config"]
            except Exception as e:
                logger.log_message(f"Failed to get model settings: {str(e)}", level=logging.WARNING)
        
        # Now reset the session
        app_state.reset_session_to_default(session_id)
        
        # Restore model settings if requested
        if preserve_settings and model_config:
            try:
                session_state = app_state.get_session_state(session_id)
                session_state["model_config"] = model_config
                # logger.log_message(f"Preserved model settings for session {session_id}", level=logging.INFO)
            except Exception as e:
                logger.log_message(f"Failed to restore model settings: {str(e)}", level=logging.ERROR)
        
        # Get name and description from either query params or request body
        if request_data:
            name = request_data.name or name
            description = request_data.description or description
        
        # If name and description are provided, update the dataset description
        if name and description:
            session_state = app_state.get_session_state(session_id)
            datasets = session_state["datasets"]
            desc = f"{description}"
            
            # Update the session dataset with the new description
            app_state.update_session_dataset(session_id, datasets, name, desc)
        
        return {
            "message": "Session reset to default dataset",
            "session_id": session_id,
            "dataset": "Housing.csv",
            "model_settings_preserved": preserve_settings
        }
    except Exception as e:
        logger.log_message(f"Failed to reset session: {str(e)}", level=logging.ERROR)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset session: {str(e)}"
        )


@router.post("/create-dataset-description")
async def create_dataset_description(
    request: dict,
    app_state = Depends(get_app_state)
):
    session_id = request.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")
    
    try:
        # Get the session state to access the dataset
        session_state = app_state.get_session_state(session_id)
        
        tables = session_state['datasets']
        dataset_names = session_state.get('dataset_names', list(tables.keys()))
        
        # Get any existing description provided by the user
        user_description = request.get("existingDescription", "")
        
        # Use the utility function to generate description with proper formatting
        generated_description = generate_dataset_description(tables, user_description, dataset_names)
        
        return {"description": generated_description}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate description: {str(e)}")

@router.get("/api/session-info")
async def get_session_info(
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency)
):
    """Get information about the current session including dataset status"""
    try:
        # Get the session state
        session_state = app_state.get_session_state(session_id)
        
        # Get session manager reference for default name
        session_manager = app_state._session_manager
        
        # Get more detailed dataset information
        current_name = session_state.get("name", "")
        current_description = session_state.get("description", "")
        default_name = getattr(session_manager, "_default_name", "Housing Dataset")
        
        # More robust detection of custom dataset
        is_custom = False
        
        # Check by name
        if current_name and current_name != default_name:
            is_custom = True
                    
        # Also check by checking if we have a dataframe that's different from default
        if "datasets" in session_state and session_state["datasets"] is not None:
            try:
                # This is just a basic check - we could make it more sophisticated if needed
                key_count = len(session_state["datasets"].keys)
                if key_count > 1:
                    is_custom = True
            except Exception as e:
                logger.log_message(f"Error comparing datasets: {str(e)}", level=logging.ERROR)
        
        # Return session information
        response_data = {
            "session_id": session_id,
            "is_custom_dataset": is_custom,
            "dataset_name": current_name,
            "dataset_description": current_description,
            "default_name": default_name,
            "has_session": True,
            "session_keys": list(session_state.keys())  # For debugging
        }
        
        
        return response_data
    except Exception as e:
        logger.log_message(f"Error getting session info: {str(e)}", level=logging.ERROR)
        return {
            "session_id": session_id,
            "is_custom_dataset": False,
            "has_session": False,
            "error": str(e)
        }

# Add a new route to set the current message ID in the session
@router.post("/set-message-info")
async def set_message_info(
    message_info: MessageInfo,
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency)
):
    """Set the current message ID, chat ID, and user ID in the session"""
    try:
        # Get the session state
        session_state = app_state.get_session_state(session_id)
        
        # Make a copy of previous values for logging
        previous_message_id = session_state.get("current_message_id")
        previous_chat_id = session_state.get("chat_id")
        previous_user_id = session_state.get("user_id")
        
        # Update the session with message information
        if message_info.message_id is not None:
            session_state["current_message_id"] = message_info.message_id
        if message_info.chat_id is not None:
            session_state["chat_id"] = message_info.chat_id
        if message_info.user_id is not None:
            session_state["user_id"] = message_info.user_id
            
        # Get updated values for logging
        current_message_id = session_state.get("current_message_id")
        current_chat_id = session_state.get("chat_id")
        current_user_id = session_state.get("user_id")
        
        # # Log changes
        # logger.log_message(
        #     f"Message info updated for session {session_id}:\n"
        #     f"  message_id: {previous_message_id} -> {current_message_id}\n"
        #     f"  chat_id: {previous_chat_id} -> {current_chat_id}\n"
        #     f"  user_id: {previous_user_id} -> {current_user_id}",
        #     level=logging.INFO
        # )
        
        # Verify session state was updated
        updated_session_state = app_state.get_session_state(session_id)
        # logger.log_message(
        #     f"Verified session state after update:\n"
        #     f"  current_message_id: {updated_session_state.get('current_message_id')}\n"
        #     f"  chat_id: {updated_session_state.get('chat_id')}\n"
        #     f"  user_id: {updated_session_state.get('user_id')}",
        #     level=logging.INFO
        # )
        
        return {
            "success": True,
            "session_id": session_id,
            "message_id": current_message_id,
            "chat_id": current_chat_id,
            "user_id": current_user_id
        }
    except Exception as e:
        logger.log_message(f"Error setting message info: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=str(e))
