import requests
import time
import uuid
import os
import sys

# Add the parent directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_manager import AI_Manager
from init_db import session_factory, ModelUsage

def test_ai_manager_directly():
    """Test the AI Manager directly to see if it records usage"""
    print("Starting direct AI Manager test...")
    
    # Create a test AI Manager
    ai_manager = AI_Manager()
    
    # Generate a unique user ID and chat ID for testing
    test_user_id = int(time.time()) % 10000
    test_chat_id = int(uuid.uuid4().int % 100000)
    test_model = "test-direct-model"
    
    print(f"Using test user_id: {test_user_id}, chat_id: {test_chat_id}")
    
    # Call save_usage_to_db directly
    ai_manager.save_usage_to_db(
        user_id=test_user_id,
        chat_id=test_chat_id,
        model_name=test_model,
        provider="Test Provider",
        prompt_tokens=150,
        completion_tokens=250,
        total_tokens=400,
        query_size=600,
        response_size=1200,
        cost=0.002,
        request_time_ms=200,
        is_streaming=False
    )
    
    print("Usage data saved directly via AI Manager")
    
    # Check if it was actually saved
    session = session_factory()
    try:
        # Count records for our test user
        count = session.query(ModelUsage).filter(
            ModelUsage.user_id == test_user_id,
            ModelUsage.model_name == test_model
        ).count()
        
        if count > 0:
            print(f"SUCCESS: Found {count} records for test user {test_user_id}")
            records = session.query(ModelUsage).filter(
                ModelUsage.user_id == test_user_id
            ).all()
            
            for record in records:
                print(f"  - {record.usage_id}: {record.model_name}, {record.total_tokens} tokens, ${record.cost}")
        else:
            print(f"FAILURE: No records found for test user {test_user_id}")
            print("Check the database connection and ModelUsage table")
    finally:
        session.close()
    
def test_api_endpoint():
    """Test the API endpoint that creates test usage records"""
    print("\nTesting API endpoint for creating test usage...")
    
    admin_key = os.getenv("ADMIN_API_KEY", "admin-api-key-change-me")
    base_url = "http://localhost:8000" 
    
    # Generate a unique user ID for testing
    test_user_id = int(time.time()) % 10000
    test_model = "test-api-model"
    
    # Call the API endpoint
    response = requests.post(
        f"{base_url}/analytics/debug/create_test_usage",
        params={
            "user_id": test_user_id,
            "model_name": test_model
        },
        headers={
            "X-Admin-API-Key": admin_key
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"SUCCESS: Created test usage via API endpoint")
        print(f"Response: {data}")
        
        # Verify the record was created
        verification = requests.get(
            f"{base_url}/analytics/debug/user_usage/{test_user_id}",
            headers={
                "X-Admin-API-Key": admin_key
            }
        ).json()
        
        print(f"User {test_user_id} has {verification.get('total_records', 0)} records")
        if verification.get('recent_records'):
            print(f"Recent records: {verification['recent_records']}")
    else:
        print(f"FAILURE: API endpoint returned status {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    # Run both tests
    test_ai_manager_directly()
    test_api_endpoint() 