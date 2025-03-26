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
    """Preview the first 5 rows of the dataset stored in the session."""
    try:
        # Get the session state to ensure we're using the current dataset
        session_state = app_state.get_session_state(session_id)
        df = session_state["current_df"]

        # Replace NaN values with None (which becomes null in JSON)
        df = df.where(pd.notna(df), None)

        # Get first 5 rows and convert to dict
        preview_data = {
            "headers": df.columns.tolist(),
            "rows": df.head(5).values.tolist()  # Return as a 2D array
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
    try:
        # First ensure the session is reset to default
        app_state.reset_session_to_default(session_id)
        
        # Get the session state to ensure we're using the default dataset
        session_state = app_state.get_session_state(session_id)
        df = session_state["current_df"]
        
        # Replace NaN values with None (which becomes null in JSON)
        df = df.where(pd.notna(df), None)
        
        preview_data = {
            "headers": df.columns.tolist(),
            "rows": df.head(10).values.tolist(),
            "name": "Housing Dataset",
            "description": "A comprehensive dataset containing housing information including price, area, bedrooms, and other relevant features."
        }
        return preview_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/reset-session")
async def reset_session(
    app_state = Depends(get_app_state),
    session_id: str = Depends(get_session_id_dependency),
    name: str = None,
    description: str = None
):
    """Reset session to use default dataset with optional new description"""
    try:
        app_state.reset_session_to_default(session_id)
        
        # If name and description are provided, update the dataset description
        if name and description:
            session_state = app_state.get_session_state(session_id)
            desc = f"{name} Dataset: {description}"
            from src.agents.retrievers.retrievers import make_data
            from scripts.format_response import initialize_retrievers
            data_dict = make_data(session_state["current_df"], desc)
            # Access the styling_instructions from app_state
            styling_instructions = app_state._session_manager.styling_instructions
            session_state["retrievers"] = initialize_retrievers(styling_instructions, [str(data_dict)])
            from src.agents.agents import auto_analyst
            session_state["ai_system"] = auto_analyst(
                agents=list(app_state._session_manager.available_agents.values()), 
                retrievers=session_state["retrievers"]
            )
        
        return {
            "message": "Session reset to default dataset",
            "session_id": session_id,
            "dataset": "Housing.csv"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset session: {str(e)}"
        )
