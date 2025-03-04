from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
from chat_manager import ChatManager
import logging
from fastapi import Request
from fastapi.security import APIKeyHeader
import os
from init_db import ModelUsage, session_factory
import json

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/analytics", tags=["analytics"])

# Initialize chat manager
chat_manager = ChatManager()

# API Key security
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "default-admin-key-change-me")
api_key_header = APIKeyHeader(name="X-Admin-API-Key", auto_error=False)

# Dependency to check admin API key
async def verify_admin_api_key(
    api_key: str = Depends(api_key_header),
    request: Request = None
):
    # For debugging
    logger.info(f"Received API key: {api_key}")
    logger.info(f"Expected API key: {ADMIN_API_KEY}")
    
    # Check header first
    if api_key and api_key == ADMIN_API_KEY:
        return True
        
    # If API key wasn't in header or didn't match, check query parameters
    if request:
        api_key_query = request.query_params.get("admin_api_key")
        if api_key_query and api_key_query == ADMIN_API_KEY:
            return True
    
    # If we got here, the API key is invalid
    raise HTTPException(
        status_code=403,
        detail="Invalid or missing admin API key"
    )

@router.get("/usage/summary")
async def get_usage_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _: bool = Depends(verify_admin_api_key),
    request: Request = None
):
    """Get summary of API usage for the dashboard"""
    try:
        # Debug info
        logger.info(f"Getting usage summary from {start_date} to {end_date}")
        
        # Parse dates if provided
        if start_date:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_date = datetime.utcnow() - timedelta(days=30)
            
        if end_date:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_date = datetime.utcnow()
        
        # Query the database directly
        session = session_factory()
        try:
            # For debugging, count records in the model_usage table
            count_query = session.query(ModelUsage).count()
            logger.info(f"Total records in model_usage table: {count_query}")
            
            # Build the query with date filters
            query = session.query(ModelUsage)
            query = query.filter(ModelUsage.timestamp >= start_date)
            query = query.filter(ModelUsage.timestamp <= end_date)
            
            # Execute the query
            usage_records = query.all()
            logger.info(f"Found {len(usage_records)} usage records for the time period")
            
            # If no records found, return empty data structure
            if not usage_records:
                return {
                    "total_cost": 0.0,
                    "total_tokens": 0,
                    "total_requests": 0,
                    "avg_tokens_per_request": 0,
                    "avg_cost_per_request": 0.0,
                    "avg_request_time_ms": 0,
                    "model_breakdown": [],
                    "provider_breakdown": [],
                    "top_users": [],
                    "daily_usage": []
                }
            
            # Calculate totals
            total_cost = sum(record.cost for record in usage_records)
            total_tokens = sum(record.total_tokens for record in usage_records)
            request_count = len(usage_records)
            avg_tokens_per_request = total_tokens / request_count if request_count > 0 else 0
            avg_cost_per_request = total_cost / request_count if request_count > 0 else 0
            avg_request_time = sum(record.request_time_ms for record in usage_records) / request_count if request_count > 0 else 0
            
            # Prepare the summary data
            summary_data = {
                "total_cost": total_cost,
                "total_tokens": total_tokens,
                "total_requests": request_count,
                "avg_tokens_per_request": avg_tokens_per_request,
                "avg_cost_per_request": avg_cost_per_request,
                "avg_request_time_ms": avg_request_time,
                
                # Group by model
                "model_breakdown": calculate_breakdown(usage_records, 'model_name'),
                
                # Group by provider
                "provider_breakdown": calculate_breakdown(usage_records, 'provider'),
                
                # Group by user
                "top_users": calculate_breakdown(usage_records, 'user_id')[:10],  # Top 10 users
                
                # Daily usage will be calculated separately in another endpoint
                "daily_usage": calculate_daily_usage(usage_records, start_date, end_date)
            }
            
            logger.info(f"Generated summary: {json.dumps(summary_data, default=str)[:200]}...")
            
            return summary_data
            
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error retrieving usage summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving usage summary: {str(e)}")

def calculate_breakdown(records, group_by_field):
    """Helper function to calculate breakdown by a specific field"""
    # Group records by the specified field
    groups = {}
    for record in records:
        key = getattr(record, group_by_field)
        if key not in groups:
            groups[key] = {
                group_by_field: key,
                "cost": 0.0,
                "tokens": 0,
                "requests": 0
            }
        
        groups[key]["cost"] += record.cost
        groups[key]["tokens"] += record.total_tokens
        groups[key]["requests"] += 1
    
    # Convert to list and sort by cost descending
    result = list(groups.values())
    result.sort(key=lambda x: x["cost"], reverse=True)
    
    return result

def calculate_daily_usage(records, start_date, end_date):
    """Calculate usage by day"""
    # Create a dictionary with dates as keys
    days = {}
    current_date = start_date
    while current_date <= end_date:
        day_str = current_date.strftime('%Y-%m-%d')
        days[day_str] = {
            "date": day_str,
            "cost": 0.0,
            "tokens": 0,
            "requests": 0
        }
        current_date += timedelta(days=1)
    
    # Sum up usage by day
    for record in records:
        day_str = record.timestamp.strftime('%Y-%m-%d')
        if day_str in days:
            days[day_str]["cost"] += record.cost
            days[day_str]["tokens"] += record.total_tokens
            days[day_str]["requests"] += 1
    
    # Convert to list and sort by date
    result = list(days.values())
    result.sort(key=lambda x: x["date"])
    
    return result

@router.get("/daily")
async def get_daily_usage(
    days: int = 30,
    _: bool = Depends(verify_admin_api_key)
):
    """Get daily usage data for the specified number of days"""
    try:
        logger.info(f"Getting daily usage for the past {days} days")
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Query the database
        session = session_factory()
        try:
            # Get usage records for the period
            query = session.query(ModelUsage)
            query = query.filter(ModelUsage.timestamp >= start_date)
            query = query.filter(ModelUsage.timestamp <= end_date)
            usage_records = query.all()
            
            logger.info(f"Found {len(usage_records)} records for daily usage chart")
            
            # Calculate daily usage
            daily_data = calculate_daily_usage(usage_records, start_date, end_date)
            
            return {
                "success": True,
                "days": days,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "daily_usage": daily_data
            }
            
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error retrieving daily usage: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "daily_usage": []
        }

@router.get("/debug/model_usage")
async def debug_model_usage(_: bool = Depends(verify_admin_api_key)):
    """Debug endpoint to check the model usage table"""
    session = session_factory()
    try:
        # Count total records
        total = session.query(ModelUsage).count()
        
        # Get a sample of records (limit 5)
        samples = session.query(ModelUsage).order_by(ModelUsage.usage_id.desc()).limit(5).all()
        
        # Format the response
        sample_records = []
        for record in samples:
            sample_records.append({
                "usage_id": record.usage_id,
                "user_id": record.user_id,
                "model_name": record.model_name,
                "provider": record.provider,
                "total_tokens": record.total_tokens,
                "cost": record.cost,
                "timestamp": record.timestamp.isoformat() if record.timestamp else None
            })
        
        return {
            "total_records": total,
            "sample_records": sample_records  # Will be an empty list if no records found
        }
    except Exception as e:
        logger.error(f"Error in debug_model_usage: {str(e)}")
        # Return a consistent structure even when there's an error
        return {
            "total_records": 0,
            "sample_records": [],
            "error": str(e)
        }
    finally:
        session.close()

@router.get("/debug/user_usage/{user_id}")
async def debug_user_usage(user_id: int, _: bool = Depends(verify_admin_api_key)):
    """Debug endpoint to check a specific user's model usage"""
    session = session_factory()
    try:
        # Count user's records
        user_total = session.query(ModelUsage).filter(ModelUsage.user_id == user_id).count()
        
        # Get user's most recent records
        user_records = session.query(ModelUsage).filter(
            ModelUsage.user_id == user_id
        ).order_by(ModelUsage.usage_id.desc()).limit(5).all()
        
        # Format the response
        formatted_records = []
        for record in user_records:
            formatted_records.append({
                "usage_id": record.usage_id,
                "model_name": record.model_name,
                "provider": record.provider,
                "total_tokens": record.total_tokens,
                "cost": record.cost,
                "timestamp": record.timestamp.isoformat() if record.timestamp else None
            })
        
        return {
            "user_id": user_id,
            "total_records": user_total,
            "recent_records": formatted_records
        }
    except Exception as e:
        logger.error(f"Error in debug_user_usage: {str(e)}")
        return {
            "user_id": user_id,
            "total_records": 0,
            "recent_records": [],
            "error": str(e)
        }
    finally:
        session.close()

@router.post("/debug/create_test_usage")
async def create_test_usage(
    user_id: int,
    model_name: str = "test-model", 
    _: bool = Depends(verify_admin_api_key)
):
    """Debug endpoint to manually create a test usage record"""
    session = session_factory()
    try:
        # Create a test usage record
        usage = ModelUsage(
            user_id=user_id,
            chat_id=999,  # Test chat ID
            model_name=model_name,
            provider="Test",
            prompt_tokens=100,
            completion_tokens=200,
            total_tokens=300,
            query_size=500,
            response_size=1000,
            cost=0.001,
            request_time_ms=150,
            is_streaming=False,
            timestamp=datetime.utcnow()
        )
        
        session.add(usage)
        session.commit()
        session.refresh(usage)
        
        return {
            "success": True,
            "message": "Test usage record created",
            "usage_id": usage.usage_id,
            "user_id": usage.user_id,
            "total_tokens": usage.total_tokens
        }
    except Exception as e:
        session.rollback()
        logger.error(f"Error creating test usage: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        session.close()

@router.get("/usage/models")
async def get_model_usage(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _: bool = Depends(verify_admin_api_key)
):
    """Get usage breakdown by model"""
    try:
        logger.info(f"Getting model usage from {start_date} to {end_date}")
        
        # Parse dates if provided
        if start_date:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_date = datetime.utcnow() - timedelta(days=30)
            
        if end_date:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_date = datetime.utcnow()
        
        # Query the database
        session = session_factory()
        try:
            # Build query with date filters
            query = session.query(ModelUsage)
            query = query.filter(ModelUsage.timestamp >= start_date)
            query = query.filter(ModelUsage.timestamp <= end_date)
            
            # Execute query
            usage_records = query.all()
            
            if not usage_records:
                return {
                    "success": True,
                    "model_usage": []
                }
            
            # Group by model
            model_breakdown = calculate_breakdown(usage_records, 'model_name')
            
            return {
                "success": True,
                "model_usage": model_breakdown
            }
            
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Error retrieving model usage: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "model_usage": []
        } 