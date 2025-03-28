import io
import logging
import os
from io import StringIO
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from src.managers.session_manager import get_session_id
from src.schemas.model_settings import ModelSettings
from src.utils.logger import Logger
from src.agents.agents import dataset_description_agent
import dspy

logger = Logger("session_routes", see_time=True, console_log=False)

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

# Define a model for reset session request
class ResetSessionRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

@router.post("/upload_dataframe")
async def upload_dataframe(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(...),
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency)
):
    try:
        contents = await file.read()
        new_df = pd.read_csv(io.BytesIO(contents))
        desc = f"{name} Dataset: {description}"
        
        app_state.update_session_dataset(session_id, new_df, desc)
        
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
        
        # update session state
        session_state = app_state.get_session_state(session_id)
        session_state["model_config"] = {
            "provider": settings.provider,
            "model": settings.model,
            "api_key": settings.api_key,
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens
        }

        # Update app state model config too, for tracking in streaming chat
        app_state.model_config = {
            "provider": settings.provider,
            "model": settings.model,
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens
        }

        # Configure model with temperature and max_tokens
        import dspy
        
        if settings.provider.lower() == "groq":
            lm = dspy.GROQ(
                model=settings.model,
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )
        elif settings.provider.lower() == "anthropic":
            lm = dspy.LM(
                model=settings.model,
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )
        else:  # OpenAI is the default
            lm = dspy.LM(
                model=settings.model,
                api_key=settings.api_key,
                temperature=settings.temperature,
                max_tokens=settings.max_tokens
            )

        # Test the model configuration
        try:
            lm("Hello, are you working?")
            dspy.configure(lm=lm)
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
async def get_model_settings(app_state = Depends(get_app_state)):
    """Get current model settings"""
    return {
        "provider": app_state.model_config["provider"],
        "model": app_state.model_config["model"],
        "hasCustomKey": bool(os.getenv("CUSTOM_API_KEY")),
        "temperature": app_state.model_config["temperature"],
        "maxTokens": app_state.model_config["max_tokens"]
    }

@router.post("/api/preview-csv")
async def preview_csv(app_state = Depends(get_app_state), session_id: str = Depends(get_session_id_dependency)):
    """Preview the dataset stored in the session."""
    try:
        # Get the session state to ensure we're using the current dataset
        session_state = app_state.get_session_state(session_id)
        df = session_state["current_df"]

        # Replace NaN values with None (which becomes null in JSON)
        df = df.where(pd.notna(df), None)

        # Convert columns to appropriate types if necessary
        for column in df.columns:
            if df[column].dtype == 'object':
                # Attempt to convert to boolean if the column contains 'True'/'False' strings
                if df[column].isin(['True', 'False']).all():
                    df[column] = df[column].astype(bool)

        # Extract name and description if available
        name = "Dataset"
        description = "No description available"
        
        # Try to get the description from make_data if available
        if "make_data" in session_state and session_state["make_data"]:
            data_dict = session_state["make_data"]
            if "Description" in data_dict:
                full_desc = data_dict["Description"]
                # Try to parse the description format "{name} Dataset: {description}"
                if "Dataset:" in full_desc:
                    parts = full_desc.split("Dataset:", 1)
                    name = parts[0].strip()
                    description = parts[1].strip()
                else:
                    description = full_desc

        # Get rows and convert to dict
        preview_data = {
            "headers": df.columns.tolist(),
            "rows": df.head(5).values.tolist(),  # Limit to first 5 rows for performance
            "name": name,
            "description": description
        }
        return preview_data
    except Exception as e:
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
        app_state.reset_session_to_default(session_id)
        
        # Get name and description from either query params or request body
        if request_data:
            name = request_data.name or name
            description = request_data.description or description
        
        # If name and description are provided, update the dataset description
        if name and description:
            session_state = app_state.get_session_state(session_id)
            df = session_state["current_df"]
            desc = f"{name} Dataset: {description}"
            
            # Update the session dataset with the new description
            app_state.update_session_dataset(session_id, df, desc)
        
        return {
            "message": "Session reset to default dataset",
            "session_id": session_id,
            "dataset": "Housing.csv"
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
        
        # Convert dataframe to a string representation for the agent
        dataset_info = {
            "columns": df.columns.tolist(),
            "sample": df.head(2).to_dict(),
            "stats": df.describe().to_dict()
        }
        
        # Generate description
        description = dspy.ChainOfThought(dataset_description_agent)(dataset=str(dataset_info))
        return {"description": description.description}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate description: {str(e)}")
