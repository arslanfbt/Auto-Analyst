import sys
import os

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from init_db import User, session_factory

def create_test_users():
    """Create test users for development"""
    session = session_factory()
    
    try:
        # Create a few test users
        test_users = [
            {"username": "testuser1", "email": "user1@example.com"},
            {"username": "testuser2", "email": "user2@example.com"},
            {"username": "admin", "email": "admin@example.com"},
            {"username": "demo", "email": "demo@example.com"},
            {"username": "guest", "email": "guest@example.com"},
        ]
        
        for user_data in test_users:
            # Check if user already exists
            existing = session.query(User).filter(User.email == user_data["email"]).first()
            if not existing:
                user = User(**user_data)
                session.add(user)
                print(f"Created user: {user_data['username']}")
            else:
                print(f"User {user_data['username']} already exists")
        
        session.commit()
        print("Test users created successfully")
        
    except Exception as e:
        session.rollback()
        print(f"Error creating test users: {e}")
    
    finally:
        session.close()

if __name__ == "__main__":
    create_test_users()
    print("Done!") 