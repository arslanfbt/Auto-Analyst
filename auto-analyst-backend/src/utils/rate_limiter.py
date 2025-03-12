from upstash_ratelimit import Ratelimit, FixedWindow
from upstash_redis import Redis
import os
from src.init_db import session_factory, User
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self):
        # Flag to indicate if Redis is available
        self.redis_available = True
        
        try:
            redis = Redis(url=os.getenv("UPSTASH_REDIS_REST_URL"), token=os.getenv("UPSTASH_REDIS_REST_PASSWORD"))

            self.limiter = Ratelimit(
                redis=redis,
                limiter=FixedWindow(max_requests=100, window=30 * 24 * 60 * 60),  # 100 requests per month
                prefix="@upstash/ratelimit"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            self.redis_available = False
            
        self.tiers = {
            "tier1": 1,  # 1 credit per query
            "tier2": 3,  # 3 credits per query
            "tier3": 5   # 5 credits per query
        }

    def limit(self, user_id: str, tier: str):
        if not user_id:
            logger.warning("No user_id provided to rate limiter")
            return True  # Allow the request if no user_id is provided
            
        credits_needed = self.tiers.get(tier, 0)
        
        # Check if user has enough credits before limiting
        has_credits = self.check_user_credits(user_id, credits_needed)
        if not has_credits:
            logger.warning(f"User {user_id} does not have enough credits")
            return False
        
        # Skip Redis rate limiting if it's not available
        if not self.redis_available:
            # Just deduct credits and allow the request
            success = self.deduct_credits(user_id, credits_needed)
            return success
            
        try:
            response = self.limiter.limit(user_id)
            
            if response.allowed:
                # Deduct credits from user
                success = self.deduct_credits(user_id, credits_needed)
                return success
            else:
                return False
        except Exception as e:
            logger.error(f"Error during rate limiting: {e}")
            # Fallback: just check and deduct credits
            success = self.deduct_credits(user_id, credits_needed)
            return success

    def check_user_credits(self, user_id, credits_needed):
        """Check if user has enough credits"""
        try:
            # Convert user_id to int if it's a string
            if isinstance(user_id, str):
                try:
                    user_id = int(user_id)
                except ValueError:
                    logger.error(f"Invalid user_id format: {user_id}")
                    return False
                    
            session = session_factory()
            try:
                user = session.query(User).filter(User.user_id == user_id).first()
                if not user:
                    logger.warning(f"User with ID {user_id} not found")
                    return False
                
                logger.info(f"User {user_id} has {user.credits} credits, needs {credits_needed}")
                return user.credits >= credits_needed
            finally:
                session.close()
        except Exception as e:
            logger.error(f"Error checking user credits: {str(e)}")
            return False

    def deduct_credits(self, user_id, credits):
        """Deduct credits from the user's account"""
        if credits <= 0:
            logger.info(f"No credits to deduct for user {user_id}")
            return True  # No credits to deduct
            
        try:
            # Convert user_id to int if it's a string
            if isinstance(user_id, str):
                try:
                    user_id = int(user_id)
                except ValueError:
                    logger.error(f"Invalid user_id format: {user_id}")
                    return False
                    
            logger.info(f"Attempting to deduct {credits} credits from user {user_id}")
            session = session_factory()
            try:
                user = session.query(User).filter(User.user_id == user_id).first()
                if not user:
                    logger.warning(f"User with ID {user_id} not found")
                    return False
                
                # Log current credits
                logger.info(f"User {user_id} current credits: {user.credits}")
                
                # Prevent negative credits
                if user.credits < credits:
                    logger.warning(f"User {user_id} has insufficient credits: {user.credits} < {credits}")
                    return False
                    
                # Deduct credits
                user.credits -= credits
                session.commit()
                logger.info(f"Successfully deducted {credits} credits from user {user_id}. New balance: {user.credits}")
                return True
            except Exception as e:
                session.rollback()
                logger.error(f"Database error updating user credits: {str(e)}")
                return False
            finally:
                session.close()
        except Exception as e:
            logger.error(f"Error deducting credits: {str(e)}")
            return False 