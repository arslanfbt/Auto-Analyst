import io
import logging
import json
import os
from io import StringIO
from typing import Optional, List
from datetime import datetime

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.managers.session_manager import get_session_id
from src.schemas.model_settings import ModelSettings
from src.utils.logger import Logger
from src.agents.agents import dataset_description_agent
from src.db.schemas.models import DatasetUpload
from src.db.init_db import get_db

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
        logger.log_message(f"Found {len(sheet_names)} sheets in Excel file: {', '.join(sheet_names)}", level=logging.INFO)
        
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
    sheet_name: str = Form(...),
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Upload and process an Excel file with a specific sheet"""
    start_time = datetime.utcnow()
    try:
        # Log the incoming request details
        logger.log_message(f"Excel upload request for session {session_id}: name='{name}', description='{description}', sheet='{sheet_name}'", level=logging.INFO)
        
        # Get user_id from session if available
        session_state = app_state.get_session_state(session_id)
        user_id = session_state.get("user_id")
        
        # Check if we need to force a complete session reset before upload
        force_refresh = request.headers.get("X-Force-Refresh") == "true" if request else False
        
        if force_refresh:
            logger.log_message(f"Force refresh requested for session {session_id} before Excel upload", level=logging.INFO)
            # Reset the session but don't completely wipe it, so we maintain user association
            app_state.reset_session_to_default(session_id)
        
        # Read the uploaded Excel file
        contents = await file.read()
        file_size = len(contents)
        
        # Create a dataset upload record - we'll update it with more info later
        dataset_upload = DatasetUpload(
            user_id=user_id,
            filename=f"{name}.csv",  # Will be converted to CSV
            original_filename=file.filename,
            file_size=file_size,
            file_type="excel",
            status="processing"
        )
        
        db.add(dataset_upload)
        db.commit()
        db.refresh(dataset_upload)
        
        # Capture the dataset upload ID to update status later
        dataset_upload_id = dataset_upload.upload_id
        
        try:
            # Read the specific sheet with basic preprocessing
            excel_df = pd.read_excel(io.BytesIO(contents), sheet_name=sheet_name)
            
            # Preprocessing steps
            # 1. Drop empty rows and columns
            excel_df.dropna(how='all', inplace=True)  # Remove empty rows
            excel_df.dropna(how='all', axis=1, inplace=True)  # Remove empty columns
            
            # 2. Clean column names
            excel_df.columns = excel_df.columns.str.strip()  # Remove extra spaces
            
            # 3. Convert Excel data to CSV with UTF-8-sig encoding
            csv_buffer = io.StringIO()
            excel_df.to_csv(csv_buffer, index=False, encoding='utf-8-sig')
            csv_buffer.seek(0)
            
            # Read the processed CSV back into a dataframe
            new_df = pd.read_csv(csv_buffer)
            
            # Log some info about the processed data
            logger.log_message(f"Processed Excel sheet '{sheet_name}' into dataframe with {len(new_df)} rows and {len(new_df.columns)} columns", level=logging.INFO)
            
            # Update dataset information in DB with success
            dataset_upload.row_count = len(new_df)
            dataset_upload.column_count = len(new_df.columns)
            dataset_upload.column_names = new_df.columns.tolist()
            
            # Store data types as a dictionary
            data_types = {}
            for col in new_df.columns:
                data_types[col] = str(new_df[col].dtype)
            
            dataset_upload.data_types = data_types
            dataset_upload.status = "completed"
            
        except Exception as e:
            logger.log_message(f"Error processing Excel file: {str(e)}", level=logging.ERROR)
            
            # Update dataset record with error
            dataset_upload.status = "failed"
            dataset_upload.error_message = str(e)
            dataset_upload.error_details = {
                "error_type": type(e).__name__,
                "sheet_name": sheet_name
            }
            
            db.commit()
            raise HTTPException(status_code=400, detail=f"Error processing Excel file: {str(e)}")
        
        # Update the dataset description to include sheet name
        desc = f"{name} Dataset (from Excel sheet '{sheet_name}'): {description}"
        
        logger.log_message(f"Updating session dataset with Excel data and description: '{desc}'", level=logging.INFO)
        app_state.update_session_dataset(session_id, new_df, name, desc)
        
        # Log the final state
        session_state = app_state.get_session_state(session_id)
        logger.log_message(f"Session dataset updated with Excel data and description: '{session_state.get('description')}'", level=logging.INFO)
        
        # Calculate processing time and update the record
        end_time = datetime.utcnow()
        processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
        dataset_upload.processing_time_ms = processing_time_ms
        dataset_upload.updated_at = end_time
        
        db.commit()
        
        return {"message": "Excel file processed successfully", "session_id": session_id, "sheet": sheet_name, "dataset_upload_id": dataset_upload_id}
    except Exception as e:
        # Make sure to update the dataset record with error if it was created
        error_details = {
            "error_type": type(e).__name__,
            "message": str(e)
        }
        
        try:
            if 'dataset_upload_id' in locals():
                dataset_upload = db.query(DatasetUpload).filter(DatasetUpload.upload_id == dataset_upload_id).first()
                if dataset_upload:
                    dataset_upload.status = "failed"
                    dataset_upload.error_message = str(e)
                    dataset_upload.error_details = error_details
                    dataset_upload.updated_at = datetime.utcnow()
                    db.commit()
        except Exception as db_error:
            logger.log_message(f"Error updating dataset record: {str(db_error)}", level=logging.ERROR)
        
        logger.log_message(f"Error in upload_excel: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload_dataframe")
async def upload_dataframe(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(...),
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency),
    request: Request = None,
    db: Session = Depends(get_db)
):
    start_time = datetime.utcnow()
    try:
        # Log the incoming request details
        logger.log_message(f"Upload request for session {session_id}: name='{name}', description='{description}'", level=logging.INFO)
        
        # Get user_id from session if available
        session_state = app_state.get_session_state(session_id)
        user_id = session_state.get("user_id")
        
        # Check if we need to force a complete session reset before upload
        force_refresh = request.headers.get("X-Force-Refresh") == "true" if request else False
        
        if force_refresh:
            logger.log_message(f"Force refresh requested for session {session_id} before upload", level=logging.INFO)
            # Reset the session but don't completely wipe it, so we maintain user association
            app_state.reset_session_to_default(session_id)
        
        # Now process the new file
        contents = await file.read()
        file_size = len(contents)
        
        # Create a dataset upload record - we'll update it with more info later
        dataset_upload = DatasetUpload(
            user_id=user_id,
            filename=f"{name}.csv",
            original_filename=file.filename,
            file_size=file_size,
            file_type="csv",
            status="processing"
        )
        
        db.add(dataset_upload)
        db.commit()
        db.refresh(dataset_upload)
        
        # Capture the dataset upload ID to update status later
        dataset_upload_id = dataset_upload.upload_id
        
        validation_errors = []
        try:
            # Try different encodings
            encodings = ['utf-8', 'unicode_escape', 'ISO-8859-1']
            new_df = None
            successful_encoding = None
            
            for encoding in encodings:
                try:
                    new_df = pd.read_csv(io.BytesIO(contents), encoding=encoding)
                    successful_encoding = encoding
                    break
                except Exception as encoding_error:
                    validation_errors.append({
                        "encoding": encoding,
                        "error": str(encoding_error)
                    })
                    continue
            
            if new_df is None:
                error_msg = f"Error reading file with all attempted encodings: {', '.join(encodings)}"
                
                # Update dataset record with error
                dataset_upload.status = "failed"
                dataset_upload.error_message = error_msg
                dataset_upload.error_details = {
                    "attempted_encodings": encodings,
                    "validation_errors": validation_errors
                }
                dataset_upload.validation_errors = validation_errors
                db.commit()
                
                raise HTTPException(status_code=400, detail=error_msg)
            
            # Update dataset information with success
            dataset_upload.row_count = len(new_df)
            dataset_upload.column_count = len(new_df.columns)
            dataset_upload.column_names = new_df.columns.tolist()
            
            # Store data types as a dictionary
            data_types = {}
            for col in new_df.columns:
                data_types[col] = str(new_df[col].dtype)
            
            dataset_upload.data_types = data_types
            dataset_upload.status = "completed"
            dataset_upload.validation_errors = validation_errors if validation_errors else None
            
        except Exception as e:
            error_msg = f"Error reading file: {str(e)}"
            
            # Update dataset record with error
            dataset_upload.status = "failed"
            dataset_upload.error_message = error_msg
            dataset_upload.error_details = {
                "error_type": type(e).__name__,
                "validation_errors": validation_errors if validation_errors else None
            }
            db.commit()
            
            raise HTTPException(status_code=400, detail=error_msg)
            
        desc = f"{name} Dataset: {description}"
        
        logger.log_message(f"Updating session dataset with description: '{desc}'", level=logging.INFO)
        app_state.update_session_dataset(session_id, new_df, name, desc)
        
        # Log the final state
        session_state = app_state.get_session_state(session_id)
        logger.log_message(f"Session dataset updated with description: '{session_state.get('description')}'", level=logging.INFO)
        
        # Calculate processing time and update the record
        end_time = datetime.utcnow()
        processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
        dataset_upload.processing_time_ms = processing_time_ms
        dataset_upload.updated_at = end_time
        
        db.commit()
        
        return {"message": "Dataframe uploaded successfully", "session_id": session_id, "dataset_upload_id": dataset_upload_id}
    except Exception as e:
        # Make sure to update the dataset record with error if it was created
        error_details = {
            "error_type": type(e).__name__,
            "message": str(e)
        }
        
        try:
            if 'dataset_upload_id' in locals():
                dataset_upload = db.query(DatasetUpload).filter(DatasetUpload.upload_id == dataset_upload_id).first()
                if dataset_upload:
                    dataset_upload.status = "failed"
                    dataset_upload.error_message = str(e)
                    dataset_upload.error_details = error_details
                    dataset_upload.updated_at = datetime.utcnow()
                    db.commit()
        except Exception as db_error:
            logger.log_message(f"Error updating dataset record: {str(db_error)}", level=logging.ERROR)
            
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
        import dspy
        
        if settings.provider.lower() == "groq":
            logger.log_message(f"Groq Model: {settings.model}", level=logging.INFO)
            lm = dspy.GROQ(
                model=settings.model,
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )
        elif settings.provider.lower() == "anthropic":
            logger.log_message(f"Anthropic Model: {settings.model}", level=logging.INFO)
            lm = dspy.LM(
                model=settings.model,
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )
        elif settings.provider.lower() == "gemini":
            logger.log_message(f"Gemini Model: {settings.model}, API Key: {settings.api_key}, Temperature: {settings.temperature}, Max Tokens: {settings.max_tokens}", level=logging.INFO)
            lm = dspy.LM(
                model=f"gemini/{settings.model}",
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )
        else:  # OpenAI is the default
            logger.log_message(f"OpenAI Model: {settings.model}", level=logging.INFO)
            lm = dspy.LM(
                model=settings.model,
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )
        

        # Test the model configuration without setting it globally
        try:
            resp = lm("Hello, are you working?")
            logger.log_message(f"Model Response: {resp}", level=logging.INFO)
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
        "model": model_config.get("model", "gpt-4o-mini"),
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
        df = session_state.get("current_df")
        
        # Handle case where dataset might be missing
        if df is None:
            logger.log_message(f"Dataset not found in session {session_id}, using default", level=logging.WARNING)
            # Create a new default session for this session ID
            app_state.reset_session_to_default(session_id)
            # Get the session state again
            session_state = app_state.get_session_state(session_id)
            df = session_state.get("current_df")

        # Replace NaN values with None (which becomes null in JSON)
        df = df.where(pd.notna(df), None)

        # Convert columns to appropriate types if necessary
        for column in df.columns:
            if df[column].dtype == 'object':
                # Attempt to convert to boolean if the column contains 'True'/'False' strings
                if df[column].isin(['True', 'False']).all():
                    df[column] = df[column].astype(bool)

        # Extract name and description if available
        name = session_state.get("name", "Dataset")
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
                    
                    logger.log_message(f"Extracted name: '{name}', description: '{description}'", level=logging.INFO)
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
    df = session_state["current_df"]
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
                logger.log_message(f"Preserved model settings for session {session_id}", level=logging.INFO)
            except Exception as e:
                logger.log_message(f"Failed to restore model settings: {str(e)}", level=logging.ERROR)
        
        # Get name and description from either query params or request body
        if request_data:
            name = request_data.name or name
            description = request_data.description or description
        
        # If name and description are provided, update the dataset description
        if name and description:
            session_state = app_state.get_session_state(session_id)
            df = session_state["current_df"]
            desc = f"{description}"
            
            # Update the session dataset with the new description
            app_state.update_session_dataset(session_id, df, name, desc)
        
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
        df = session_state["current_df"]
        
        # Get any existing description provided by the user
        existing_description = request.get("existingDescription", "")
        
        
        # Convert dataframe to a string representation for the agent
        dataset_info = {
            "columns": df.columns.tolist(),
            "sample": df.head(2).to_dict(),
            "stats": df.describe().to_dict()
        }
        
        # Get session-specific model
        lm = dspy.LM(
            model="gpt-4o-mini",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7,
            max_tokens=3000
        )
        
        # Generate description using session model
        with dspy.context(lm=lm):
            # If there's an existing description, have the agent improve it
            description = dspy.Predict(dataset_description_agent)(
                dataset=str(dataset_info),
                existing_description=existing_description
            )
            
        
        return {"description": description.description}
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
        if "current_df" in session_state and session_state["current_df"] is not None:
            try:
                # This is just a basic check - we could make it more sophisticated if needed
                custom_col_count = len(session_state["current_df"].columns)
                if hasattr(session_manager, "_default_df") and session_manager._default_df is not None:
                    default_col_count = len(session_manager._default_df.columns)
                    if custom_col_count != default_col_count:
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
        
        # Log changes
        logger.log_message(
            f"Message info updated for session {session_id}:\n"
            f"  message_id: {previous_message_id} -> {current_message_id}\n"
            f"  chat_id: {previous_chat_id} -> {current_chat_id}\n"
            f"  user_id: {previous_user_id} -> {current_user_id}",
            level=logging.INFO
        )
        
        # Verify session state was updated
        updated_session_state = app_state.get_session_state(session_id)
        logger.log_message(
            f"Verified session state after update:\n"
            f"  current_message_id: {updated_session_state.get('current_message_id')}\n"
            f"  chat_id: {updated_session_state.get('chat_id')}\n"
            f"  user_id: {updated_session_state.get('user_id')}",
            level=logging.INFO
        )
        
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

@router.get("/api/dataset-uploads")
async def get_dataset_uploads(
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    limit: int = 100
):
    """Get dataset upload statistics and history"""
    try:
        # Base query
        query = db.query(DatasetUpload)
        
        # Apply filters if provided
        if user_id:
            query = query.filter(DatasetUpload.user_id == user_id)
        if status:
            query = query.filter(DatasetUpload.status == status)
            
        # Get results with limit
        uploads = query.order_by(DatasetUpload.created_at.desc()).limit(limit).all()
        
        # Transform to response format with more detailed metrics
        result = []
        for upload in uploads:
            # Basic details
            upload_data = {
                "upload_id": upload.upload_id,
                "user_id": upload.user_id,
                "filename": upload.filename,
                "original_filename": upload.original_filename,
                "file_size": upload.file_size,
                "file_type": upload.file_type,
                "status": upload.status,
                "created_at": upload.created_at.isoformat() if upload.created_at else None,
                "updated_at": upload.updated_at.isoformat() if upload.updated_at else None,
                "processing_time_ms": upload.processing_time_ms
            }
            
            # Add dataset characteristics if available
            if upload.row_count is not None:
                upload_data["row_count"] = upload.row_count
            if upload.column_count is not None:
                upload_data["column_count"] = upload.column_count
                
            # Add error information if any
            if upload.status == "failed":
                upload_data["error_message"] = upload.error_message
                upload_data["error_details"] = upload.error_details
                
            result.append(upload_data)
        
        # Calculate aggregate statistics
        stats = {
            "total_uploads": db.query(DatasetUpload).count(),
            "successful_uploads": db.query(DatasetUpload).filter(DatasetUpload.status == "completed").count(),
            "failed_uploads": db.query(DatasetUpload).filter(DatasetUpload.status == "failed").count(),
            "avg_processing_time_ms": db.query(func.avg(DatasetUpload.processing_time_ms)).filter(
                DatasetUpload.processing_time_ms != None
            ).scalar() or 0,
        }
            
        return {
            "uploads": result,
            "stats": stats
        }
    except Exception as e:
        logger.log_message(f"Error getting dataset uploads: {str(e)}", level=logging.ERROR)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching dataset uploads: {str(e)}"
        )