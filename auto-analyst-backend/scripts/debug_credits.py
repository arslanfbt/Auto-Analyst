"""
Debug script to monitor credit changes over time
"""
import sys
import os
from pathlib import Path
import logging
import time

# Add the parent directory to the system path
parent_dir = str(Path(__file__).parent.parent)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from src.init_db import session_factory, User

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("credit_debug")

def get_all_users():
    """Get all users from the database"""
    session = session_factory()
    try:
        users = session.query(User).all()
        return [(user.user_id, user.username, user.credits) for user in users]
    finally:
        session.close()

def monitor_user_credits(user_id=None, duration=60, interval=5):
    """
    Monitor a user's credits over time
    
    Args:
        user_id: The ID of the user to monitor (None = all users)
        duration: How long to monitor in seconds
        interval: How often to check in seconds
    """
    print(f"\n📊 MONITORING USER CREDITS FOR {duration} SECONDS 📊\n")
    
    # Track credits over time
    credit_history = {}
    
    start_time = time.time()
    end_time = start_time + duration
    
    while time.time() < end_time:
        current_time = time.strftime("%H:%M:%S", time.localtime())
        
        if user_id:
            # Monitor specific user
            session = session_factory()
            try:
                user = session.query(User).filter(User.user_id == user_id).first()
                if user:
                    if user_id not in credit_history:
                        credit_history[user_id] = []
                    
                    credit_history[user_id].append((current_time, user.credits))
                    
                    # Check if credits changed
                    if len(credit_history[user_id]) > 1:
                        prev_credits = credit_history[user_id][-2][1]
                        if user.credits != prev_credits:
                            print(f"⚠️ USER {user.username} (ID: {user_id}): Credits changed from {prev_credits} to {user.credits} at {current_time}")
                    else:
                        print(f"👤 USER {user.username} (ID: {user_id}): Initial credits: {user.credits}")
            finally:
                session.close()
        else:
            # Monitor all users
            users = get_all_users()
            for id, username, credits in users:
                if id not in credit_history:
                    credit_history[id] = []
                    print(f"👤 USER {username} (ID: {id}): Initial credits: {credits}")
                else:
                    prev_credits = credit_history[id][-1][1]
                    if credits != prev_credits:
                        print(f"⚠️ USER {username} (ID: {id}): Credits changed from {prev_credits} to {credits} at {current_time}")
                
                credit_history[id].append((current_time, credits))
        
        # Sleep until next interval
        time.sleep(interval)
    
    # Print final summary
    print("\n" + "=" * 60)
    print("📊 CREDIT MONITORING SUMMARY 📊")
    print("=" * 60)
    
    for id in credit_history:
        initial_credits = credit_history[id][0][1]
        final_credits = credit_history[id][-1][1]
        change = final_credits - initial_credits
        
        session = session_factory()
        try:
            user = session.query(User).filter(User.user_id == id).first()
            username = user.username if user else "Unknown"
        finally:
            session.close()
        
        print(f"User {username} (ID: {id}):")
        print(f"  Initial credits: {initial_credits}")
        print(f"  Final credits: {final_credits}")
        print(f"  Change: {change:+d}")
        
        if change != 0:
            # Print the history of changes
            print("  Credit history:")
            for i, (timestamp, credits) in enumerate(credit_history[id]):
                if i > 0:
                    prev_credits = credit_history[id][i-1][1]
                    if credits != prev_credits:
                        print(f"    {timestamp}: {prev_credits} → {credits} ({credits - prev_credits:+d})")
        print()

if __name__ == "__main__":
    user_id = None
    if len(sys.argv) > 1:
        try:
            user_id = int(sys.argv[1])
            print(f"Monitoring user with ID {user_id}")
        except ValueError:
            print(f"Invalid user ID: {sys.argv[1]}")
            sys.exit(1)
    else:
        print("Monitoring all users")
    
    # Monitor for 2 minutes (or modify this duration)
    monitor_user_credits(user_id=user_id, duration=120, interval=5) 