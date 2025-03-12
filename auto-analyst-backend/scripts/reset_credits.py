import logging
from datetime import datetime
from src.init_db import session_factory, User
import argparse

def reset_user_credits(specific_user_id=None):
    """
    Reset user credits to 100
    
    Args:
        specific_user_id: If provided, only reset this user's credits
    
    logging.info("Resetting user credits...")
    session = session_factory()
    try:
        if specific_user_id:
            # Reset specific user
            user = session.query(User).filter(User.user_id == specific_user_id).first()
            if user:
                logging.info(f"Resetting credits for user {user.username} (ID: {user.user_id}) from {user.credits} to 100")
                user.credits = 100
                session.commit()
                logging.info(f"Credits reset for user {user.username}")
            else:
                logging.error(f"User with ID {specific_user_id} not found")
        else:
            # Reset all users
            users = session.query(User).all()
            count = 0
            for user in users:
                logging.info(f"Resetting credits for user {user.username} (ID: {user.user_id}) from {user.credits} to 100")
                user.credits = 100
                count += 1
            session.commit()
            logging.info(f"Credits reset for {count} users")
    except Exception as e:
        session.rollback()
        logging.error(f"Error resetting user credits: {str(e)}")
    finally:
        session.close()

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Parse arguments
    parser = argparse.ArgumentParser(description="Reset user credits")
    parser.add_argument("--user-id", type=int, help="Reset credits for specific user ID")
    args = parser.parse_args()
    
    print(f"⚠️ {'Resetting credits for specific user ID: ' + str(args.user_id) if args.user_id else 'Resetting ALL users credits'} ⚠️")
    confirmation = input("Are you sure you want to proceed? (y/n): ")
    
    if confirmation.lower() == 'y':
        reset_user_credits(args.user_id)
        print("Credits reset operation completed")
    else:
        print("Operation cancelled") 