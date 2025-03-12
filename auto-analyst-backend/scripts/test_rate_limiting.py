"""
Test script for rate limiting and Redis integration
"""
import sys
import os
from pathlib import Path
import logging
import time
import random

# Add the parent directory to the system path so we can import the modules
parent_dir = str(Path(__file__).parent.parent)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Now we can import our modules
from src.utils.rate_limiter import RateLimiter
from src.utils.model_tier import get_model_tier
from src.init_db import session_factory, User

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("rate_limiter_test")

def create_test_user():
    """Create a test user with 100 credits"""
    session = session_factory()
    try:
        # Create a random username to avoid conflicts
        username = f"test_user_{random.randint(1000, 9999)}"
        email = f"{username}@example.com"
        
        # Check if user exists
        existing_user = session.query(User).filter(User.username == username).first()
        if existing_user:
            logger.info(f"Using existing test user: {username} (ID: {existing_user.user_id})")
            return existing_user.user_id
            
        # Create new user
        user = User(
            username=username,
            email=email,
            credits=100
        )
        session.add(user)
        session.commit()
        logger.info(f"Created test user {username} with ID {user.user_id} and 100 credits")
        return user.user_id
    except Exception as e:
        session.rollback()
        logger.error(f"Error creating test user: {e}")
        return None
    finally:
        session.close()

def get_user_credits(user_id):
    """Get current credits for a user"""
    session = session_factory()
    try:
        user = session.query(User).filter(User.user_id == user_id).first()
        if not user:
            logger.error(f"User with ID {user_id} not found")
            return None
        return user.credits
    except Exception as e:
        logger.error(f"Error getting user credits: {e}")
        return None
    finally:
        session.close()

def reset_user_credits(user_id, credits=100):
    """Reset a user's credits to the specified amount"""
    session = session_factory()
    try:
        user = session.query(User).filter(User.user_id == user_id).first()
        if not user:
            logger.error(f"User with ID {user_id} not found")
            return False
        user.credits = credits
        session.commit()
        logger.info(f"Reset credits for user {user_id} to {credits}")
        return True
    except Exception as e:
        session.rollback()
        logger.error(f"Error resetting user credits: {e}")
        return False
    finally:
        session.close()

def test_direct_credit_deduction():
    """Test direct credit deduction without involving Redis"""
    logger.info("=== TESTING DIRECT CREDIT DEDUCTION ===")
    
    # Create a test user
    user_id = create_test_user()
    if not user_id:
        logger.error("Failed to create test user, aborting test")
        return False
    
    # Get initial credits
    initial_credits = get_user_credits(user_id)
    logger.info(f"Initial credits for user {user_id}: {initial_credits}")
    
    # Initialize rate limiter
    rate_limiter = RateLimiter()
    
    # Test deducting credits for different model tiers
    tiers = {
        "tier1": "llama3-8b-8192",  # Cheaper model
        "tier2": "gpt-4o-mini",     # Medium cost model
        "tier3": "gpt-4o"           # Expensive model
    }
    
    success = True
    for tier_name, model_name in tiers.items():
        # Get the tier and credits needed
        tier = get_model_tier(model_name)
        credits_needed = rate_limiter.tiers.get(tier, 0)
        
        logger.info(f"Testing model {model_name} (tier: {tier}, credits: {credits_needed})")
        
        # Check if user has enough credits
        has_credits = rate_limiter.check_user_credits(user_id, credits_needed)
        if not has_credits:
            logger.error(f"User does not have enough credits for {model_name}")
            success = False
            continue
        
        # Deduct credits
        logger.info(f"Deducting {credits_needed} credits for model {model_name}")
        result = rate_limiter.deduct_credits(user_id, credits_needed)
        
        if result:
            # Check new credit balance
            new_credits = get_user_credits(user_id)
            expected_credits = initial_credits - credits_needed
            logger.info(f"New credits: {new_credits}, Expected: {expected_credits}")
            
            if new_credits == expected_credits:
                logger.info(f"✅ Credit deduction successful for {model_name}")
                initial_credits = new_credits  # Update for next iteration
            else:
                logger.error(f"❌ Credit deduction failed for {model_name}: Credits don't match expected value")
                success = False
        else:
            logger.error(f"❌ Credit deduction function returned False for {model_name}")
            success = False
    
    # Reset credits for the user
    # reset_user_credits(user_id)
    
    if success:
        logger.info("✅ All direct credit deduction tests passed!")
    else:
        logger.error("❌ Some direct credit deduction tests failed")
    
    return success

def test_rate_limiting():
    """Test the rate limiting logic"""
    # Create a test user
    user_id = create_test_user()
    if not user_id:
        logger.error("Failed to create test user")
        return False

    logger.info(f"Testing rate limiting for user {user_id}")
    
    # Initialize rate limiter
    rate_limiter = RateLimiter()
    
    # Test with tier 1 model
    model_name = "gemma-7b-it"  # A tier 1 model
    tier = get_model_tier(model_name)
    credits_needed = rate_limiter.tiers.get(tier, 0)
    
    # Check initial credits
    initial_credits = get_user_credits(user_id)
    logger.info(f"User has {initial_credits} credits initially")
    
    # Test if the limiter allows the request
    result = rate_limiter.limit(user_id, tier)
    if result:
        logger.info(f"✅ Rate limiting function allowed request for {model_name}")
    else:
        logger.error(f"❌ Rate limiting function denied request for {model_name}")
        return False
    
    # Check updated credits
    updated_credits = get_user_credits(user_id)
    logger.info(f"User has {updated_credits} credits after request")
    
    # Verify credits were deducted
    if updated_credits == initial_credits - credits_needed:
        logger.info(f"✅ Credits correctly deducted: {initial_credits} → {updated_credits}")
    else:
        logger.error(f"❌ Credits not deducted correctly: {initial_credits} → {updated_credits}")
        return False
    
    # Test with premium model
    model_name = "gpt-4"  # A tier 3 model
    tier = get_model_tier(model_name)
    credits_needed = rate_limiter.tiers.get(tier, 0)
    
    # Get current credits
    initial_credits = get_user_credits(user_id)
    
    # Test if the limiter allows the request
    result = rate_limiter.limit(user_id, tier)
    if result:
        logger.info(f"✅ Rate limiting function allowed request for {model_name}")
    else:
        logger.error(f"❌ Rate limiting function returned False for {model_name}")
        return False
    
    # Test multiple rapid requests to verify rate limiting
    logger.info("Testing multiple rapid requests...")
    
    # Get current credits
    initial_credits = get_user_credits(user_id)
    
    # Make 5 rapid requests
    success_count = 0
    for i in range(5):
        result = rate_limiter.limit(user_id, tier)
        if result:
            success_count += 1
        time.sleep(0.1)  # Small delay between requests
    
    # Check final credits
    final_credits = get_user_credits(user_id)
    expected_credits = initial_credits - (credits_needed * success_count)
    
    logger.info(f"Made 5 rapid requests, {success_count} succeeded")
    logger.info(f"Final credits: {final_credits}, Expected: {expected_credits}")
    
    if final_credits == expected_credits:
        logger.info("✅ Multiple request test passed: Credits match expected value")
    else:
        logger.error("❌ Multiple request test failed: Credits don't match expected value")
        return False
    
    logger.info("✅ All rate limiting tests passed!")
    return True

if __name__ == "__main__":
    print("\n🔍 STARTING RATE LIMITER AND REDIS TESTS 🔍\n")
    
    direct_test_result = test_direct_credit_deduction()
    print("\n" + "-" * 60 + "\n")
    rate_limit_test_result = test_rate_limiting()
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY 📊")
    print("=" * 60)
    print(f"Direct Credit Deduction: {'✅ PASSED' if direct_test_result else '❌ FAILED'}")
    print(f"Rate Limiting with Redis: {'✅ PASSED' if rate_limit_test_result else '❌ FAILED'}")
    print("=" * 60 + "\n")
    
    if direct_test_result and rate_limit_test_result:
        print("🎉 All tests passed! The rate limiting and credit system are working properly.")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Please check the logs for details.")
        sys.exit(1) 