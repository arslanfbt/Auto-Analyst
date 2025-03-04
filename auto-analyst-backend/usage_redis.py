import redis
import json
import time
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class UsageRedisClient:
    """
    Redis client for real-time model usage tracking.
    Complements database storage with fast access to recent usage data.
    """
    
    def __init__(self, host: str = 'localhost', port: int = 6379, 
                 db: int = 0, password: Optional[str] = None):
        """Initialize Redis client for usage tracking."""
        self.redis_url = f"redis://{':' + password + '@' if password else ''}{host}:{port}/{db}"
        self.client = redis.from_url(self.redis_url)
        self.usage_key_prefix = "model_usage:"
        self.daily_usage_key = "daily_usage"
        self.model_usage_key = "model_usage"
        self.provider_usage_key = "provider_usage"
        self.user_usage_key = "user_usage"
        
    def record_usage(self, usage_data: Dict[str, Any]) -> bool:
        """
        Record model usage data in Redis for real-time analytics.
        
        Args:
            usage_data: Dictionary containing usage information
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Unique ID for this usage record
            usage_id = usage_data.get("usage_id") or int(time.time() * 1000)
            
            # Store the full usage data
            usage_key = f"{self.usage_key_prefix}{usage_id}"
            self.client.setex(
                usage_key, 
                60 * 60 * 24 * 7,  # Expire after 7 days
                json.dumps(usage_data)
            )
            
            # Update daily usage counters
            today = datetime.utcnow().strftime("%Y-%m-%d")
            daily_key = f"{self.daily_usage_key}:{today}"
            
            # Increment counters atomically
            pipeline = self.client.pipeline()
            
            # Daily totals
            pipeline.hincrby(daily_key, "total_tokens", usage_data.get("total_tokens", 0))
            pipeline.hincrby(daily_key, "prompt_tokens", usage_data.get("prompt_tokens", 0))
            pipeline.hincrby(daily_key, "completion_tokens", usage_data.get("completion_tokens", 0))
            pipeline.hincrby(daily_key, "request_count", 1)
            pipeline.hincrbyfloat(daily_key, "total_cost", usage_data.get("cost", 0))
            
            # Set expiry for the daily counter
            pipeline.expire(daily_key, 60 * 60 * 24 * 90)  # 90 days
            
            # Model breakdown
            model_name = usage_data.get("model_name", "unknown")
            model_key = f"{self.model_usage_key}:{model_name}"
            pipeline.hincrby(model_key, "total_tokens", usage_data.get("total_tokens", 0))
            pipeline.hincrby(model_key, "request_count", 1)
            pipeline.hincrbyfloat(model_key, "total_cost", usage_data.get("cost", 0))
            pipeline.expire(model_key, 60 * 60 * 24 * 90)  # 90 days
            
            # Provider breakdown
            provider = usage_data.get("provider", "unknown")
            provider_key = f"{self.provider_usage_key}:{provider}"
            pipeline.hincrby(provider_key, "total_tokens", usage_data.get("total_tokens", 0))
            pipeline.hincrby(provider_key, "request_count", 1)
            pipeline.hincrbyfloat(provider_key, "total_cost", usage_data.get("cost", 0))
            pipeline.expire(provider_key, 60 * 60 * 24 * 90)  # 90 days
            
            # User breakdown
            user_id = usage_data.get("user_id")
            if user_id:
                user_key = f"{self.user_usage_key}:{user_id}"
                pipeline.hincrby(user_key, "total_tokens", usage_data.get("total_tokens", 0))
                pipeline.hincrby(user_key, "request_count", 1)
                pipeline.hincrbyfloat(user_key, "total_cost", usage_data.get("cost", 0))
                pipeline.expire(user_key, 60 * 60 * 24 * 90)  # 90 days
            
            # Execute all commands
            pipeline.execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Error recording usage in Redis: {str(e)}")
            return False
            
    def get_recent_usage(self, days: int = 30) -> Dict[str, Any]:
        """
        Get recent usage statistics from Redis.
        
        Args:
            days: Number of days to include
            
        Returns:
            Dictionary with usage statistics
        """
        try:
            # Get daily usage for the specified number of days
            daily_usage = []
            today = datetime.utcnow()
            
            for day in range(days):
                date = today - timedelta(days=day)
                date_str = date.strftime("%Y-%m-%d")
                daily_key = f"{self.daily_usage_key}:{date_str}"
                
                day_data = self.client.hgetall(daily_key)
                if day_data:
                    # Convert from bytes to proper types
                    processed_data = {
                        "date": date_str,
                        "tokens": int(day_data.get(b"total_tokens", 0)),
                        "requests": int(day_data.get(b"request_count", 0)),
                        "cost": float(day_data.get(b"total_cost", 0))
                    }
                    daily_usage.append(processed_data)
            
            # Get model breakdown
            model_usage = []
            for model_key in self.client.scan_iter(f"{self.model_usage_key}:*"):
                model_data = self.client.hgetall(model_key)
                if model_data:
                    model_name = model_key.decode().split(":")[-1]
                    model_usage.append({
                        "model_name": model_name,
                        "tokens": int(model_data.get(b"total_tokens", 0)),
                        "requests": int(model_data.get(b"request_count", 0)),
                        "cost": float(model_data.get(b"total_cost", 0))
                    })
            
            # Get provider breakdown
            provider_usage = []
            for provider_key in self.client.scan_iter(f"{self.provider_usage_key}:*"):
                provider_data = self.client.hgetall(provider_key)
                if provider_data:
                    provider_name = provider_key.decode().split(":")[-1]
                    provider_usage.append({
                        "provider": provider_name,
                        "tokens": int(provider_data.get(b"total_tokens", 0)),
                        "requests": int(provider_data.get(b"request_count", 0)),
                        "cost": float(provider_data.get(b"total_cost", 0))
                    })
            
            # Get top users
            top_users = []
            user_keys = list(self.client.scan_iter(f"{self.user_usage_key}:*"))
            user_costs = []
            
            for user_key in user_keys:
                user_data = self.client.hgetall(user_key)
                if user_data:
                    user_id = user_key.decode().split(":")[-1]
                    cost = float(user_data.get(b"total_cost", 0))
                    user_costs.append((user_id, cost, user_data))
            
            # Sort users by cost descending
            user_costs.sort(key=lambda x: x[1], reverse=True)
            
            # Take top 10 users
            for user_id, cost, user_data in user_costs[:10]:
                top_users.append({
                    "user_id": user_id,
                    "tokens": int(user_data.get(b"total_tokens", 0)),
                    "requests": int(user_data.get(b"request_count", 0)),
                    "cost": cost
                })
            
            # Calculate summary totals
            total_tokens = sum(day["tokens"] for day in daily_usage)
            total_requests = sum(day["requests"] for day in daily_usage)
            total_cost = sum(day["cost"] for day in daily_usage)
            
            return {
                "summary": {
                    "total_tokens": total_tokens,
                    "total_requests": total_requests,
                    "total_cost": total_cost,
                    "period_days": days
                },
                "daily_usage": daily_usage,
                "model_breakdown": model_usage,
                "provider_breakdown": provider_usage,
                "top_users": top_users
            }
            
        except Exception as e:
            logger.error(f"Error getting usage from Redis: {str(e)}")
            return {
                "summary": {
                    "total_tokens": 0,
                    "total_requests": 0,
                    "total_cost": 0,
                    "period_days": days
                },
                "daily_usage": [],
                "model_breakdown": [],
                "provider_breakdown": [],
                "top_users": []
            } 