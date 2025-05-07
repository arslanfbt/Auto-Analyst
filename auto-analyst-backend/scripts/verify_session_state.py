import requests
import uuid
import time


def test_session_workflow():
    # Base URL
    base_url = "http://localhost:8000"
    
    # Create a unique session ID
    session_id = str(uuid.uuid4())
    print(f"Testing with session ID: {session_id}")
    
    # Step 1: Create a user and associate with session
    print("\n1. Creating user...")
    username = f"test_user_{session_id[:8]}"
    email = f"{username}@example.com"
    login_response = requests.post(
        f"{base_url}/auth/login",
        json={"username": username, "email": email, "session_id": session_id}
    ).json()
    print(f"Login response: {login_response}")
    
    # Step 2: Verify session state
    print("\n2. Verifying session state...")
    session_state = requests.get(f"{base_url}/debug/session/{session_id}").json()
    print(f"Session state: {session_state}")
    
    # Step 3: Make a chat request with this session
    print("\n3. Making a test chat request...")
    chat_response = requests.post(
        f"{base_url}/chat/data_explorer",
        json={"query": "Show me a summary of the dataset"},
        params={"session_id": session_id}
    ).json()
    print(f"Chat response received: {len(str(chat_response))} bytes")
    
    # Step 4: Verify session state again
    print("\n4. Verifying session state after chat...")
    session_state = requests.get(f"{base_url}/debug/session/{session_id}").json()
    print(f"Updated session state: {session_state}")
    
    # Step 5: Check analytics data
    print("\n5. Checking analytics data...")
    time.sleep(1)  # Wait a moment for data to be saved
    admin_key = "default-admin-key-change-me"  # Adjust to your admin key

    # Check general model usage
    analytics_response = requests.get(
        f"{base_url}/analytics/debug/model_usage",
        headers={"X-Admin-API-Key": admin_key}
    ).json()
    print(f"Total records in database: {analytics_response.get('total_records', 0)}")

    if 'sample_records' in analytics_response and analytics_response['sample_records']:
        print(f"Latest usage records: {analytics_response['sample_records']}")
    else:
        print("No sample records found in general model usage")

    # Check user-specific usage
    user_id = login_response.get('user_id')
    if user_id:
        user_usage = requests.get(
            f"{base_url}/analytics/debug/user_usage/{user_id}",
            headers={"X-Admin-API-Key": admin_key}
        ).json()
        print(f"User {user_id} has {user_usage.get('total_records', 0)} usage records")
        
        if user_usage.get('recent_records'):
            print(f"Recent usage: {user_usage['recent_records']}")
        else:
            print(f"No usage records found for user {user_id}")

    print("\nTest completed!")

if __name__ == "__main__":
    test_session_workflow()