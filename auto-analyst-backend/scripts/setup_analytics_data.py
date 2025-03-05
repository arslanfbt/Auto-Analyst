import sys
import os
from datetime import datetime, timedelta
import sqlite3

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from init_db import ModelUsage, User, session_factory, init_db
from scripts.generate_test_data import generate_test_data
from scripts.create_test_user import create_test_users

def check_database():
    """Check if database exists and has the required tables"""
    db_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
        "chat_database.db"
    )
    
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        print("Creating database...")
        init_db()
        return False
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if model_usage table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='model_usage'")
    if not cursor.fetchone():
        print("model_usage table does not exist.")
        print("Creating tables...")
        init_db()
        return False
        
    # Count records in model_usage table
    cursor.execute("SELECT COUNT(*) FROM model_usage")
    count = cursor.fetchone()[0]
    print(f"Found {count} records in model_usage table")
    
    conn.close()
    return count > 0

def setup_analytics():
    """Set up analytics data for testing"""
    # Check database status
    has_data = check_database()
    
    # Create test users
    print("\nCreating test users...")
    create_test_users()
    
    # Generate model usage data if needed
    if not has_data:
        print("\nGenerating model usage test data...")
        generate_test_data(100)
    else:
        print("\nDatabase already has model usage data. Skipping generation.")
        choice = input("Generate additional data anyway? (y/n): ")
        if choice.lower() == 'y':
            records = int(input("How many records to generate? [default: 100]: ") or "100")
            generate_test_data(records)
    
    # Verify data was created
    session = session_factory()
    try:
        # Count model usage records
        usage_count = session.query(ModelUsage).count()
        print(f"\nTotal model usage records: {usage_count}")
        
        # Count users
        user_count = session.query(User).count()
        print(f"Total users: {user_count}")
        
        # Check recent data
        yesterday = datetime.utcnow() - timedelta(days=1)
        recent_count = session.query(ModelUsage).filter(ModelUsage.timestamp >= yesterday).count()
        print(f"Records from the last 24 hours: {recent_count}")
        
        # Get model breakdown
        models = {}
        providers = {}
        
        for usage in session.query(ModelUsage).all():
            if usage.model_name not in models:
                models[usage.model_name] = 0
            models[usage.model_name] += 1
            
            if usage.provider not in providers:
                providers[usage.provider] = 0
            providers[usage.provider] += 1
            
        print("\nModel breakdown:")
        for model, count in models.items():
            print(f"  {model}: {count} records")
            
        print("\nProvider breakdown:")
        for provider, count in providers.items():
            print(f"  {provider}: {count} records")
            
    finally:
        session.close()
    
    print("\nSetup complete!")
    print("To access the analytics dashboard:")
    print("1. Make sure the backend server is running")
    print("2. In your browser, set localStorage.adminApiKey to 'default-admin-key-change-me'")
    print("   (or the value in your ADMIN_API_KEY environment variable)")
    print("3. Go to http://localhost:3000/analytics/dashboard")

if __name__ == "__main__":
    setup_analytics() 