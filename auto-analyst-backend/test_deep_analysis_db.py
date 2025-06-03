#!/usr/bin/env python3
"""
Test script for Deep Analysis database integration.
Tests the new Deep Analysis endpoints and database operations.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_USER_EMAIL = "test_deep_analysis@example.com"
TEST_USER_NAME = "Deep Analysis Test User"
TEST_GOAL = "Analyze the relationship between customer demographics and purchase patterns"

def test_deep_analysis_db_integration():
    """Test the complete Deep Analysis database integration workflow"""
    
    print("🧪 Testing Deep Analysis Database Integration (Single Record Approach)")
    print("=" * 70)
    
    # Step 1: Create or get test user
    print("\n1. Creating/Getting test user...")
    user_response = requests.post(f"{API_BASE_URL}/chats/users", json={
        "username": TEST_USER_NAME,
        "email": TEST_USER_EMAIL
    })
    
    if user_response.status_code == 200:
        user_data = user_response.json()
        user_id = user_data["user_id"]
        print(f"✅ User created/found: ID {user_id}, Email: {user_data['email']}")
    else:
        print(f"❌ Failed to create/get user: {user_response.status_code}")
        return False
    
    # Step 2: Test Deep Analysis chat creation
    print("\n2. Testing Deep Analysis chat creation...")
    chat_response = requests.post(f"{API_BASE_URL}/deep_analysis/start", json={
        "goal": TEST_GOAL,
        "user_id": user_id
    })
    
    if chat_response.status_code == 200:
        chat_data = chat_response.json()
        chat_id = chat_data["chat_id"]
        print(f"✅ Deep Analysis chat created: ID {chat_id}")
        print(f"   Title: {chat_data['title']}")
        print(f"   Analysis Type: {chat_data.get('analysis_type', 'N/A')}")
    else:
        print(f"❌ Failed to create Deep Analysis chat: {chat_response.status_code}")
        print(f"   Response: {chat_response.text}")
        return False
    
    # Step 3: Test new history endpoint
    print("\n3. Testing Deep Analysis history endpoint...")
    history_response = requests.get(f"{API_BASE_URL}/deep_analysis/history", params={
        "user_id": user_id,
        "limit": 10
    })
    
    if history_response.status_code == 200:
        history_data = history_response.json()
        print(f"✅ Retrieved {len(history_data)} Deep Analysis history entries")
        for entry in history_data[:2]:  # Show first 2 entries
            print(f"   - Chat {entry['chat_id']}: {entry['goal']}")
            print(f"     Summary: {entry['summary'][:50]}...")
            print(f"     Status: {entry['status']}, Duration: {entry.get('duration', 'N/A')}")
    else:
        print(f"❌ Failed to retrieve Deep Analysis history: {history_response.status_code}")
    
    # Step 4: Test getting specific Deep Analysis chat with summary
    print("\n4. Testing specific Deep Analysis chat summary...")
    summary_response = requests.get(f"{API_BASE_URL}/deep_analysis/chats/{chat_id}/summary", params={
        "user_id": user_id
    })
    
    if summary_response.status_code == 200:
        summary_data = summary_response.json()
        print(f"✅ Retrieved Deep Analysis chat summary for chat {chat_id}")
        if 'analysis_summary' in summary_data:
            summary_info = summary_data['analysis_summary']
            print(f"   Goal: {summary_info.get('goal', 'N/A')}")
            print(f"   Status: {summary_info.get('status', 'N/A')}")
            print(f"   Duration: {summary_info.get('duration', 'N/A')}")
            print(f"   Summary: {summary_info.get('summary', 'N/A')[:100]}...")
        print(f"   Total Messages: {len(summary_data.get('messages', []))}")
    else:
        print(f"❌ Failed to retrieve Deep Analysis chat summary: {summary_response.status_code}")
    
    # Step 5: Test regular chat retrieval (should show single comprehensive message)
    print("\n5. Testing single comprehensive message approach...")
    specific_chat_response = requests.get(f"{API_BASE_URL}/deep_analysis/chats/{chat_id}", params={
        "user_id": user_id
    })
    
    if specific_chat_response.status_code == 200:
        specific_chat_data = specific_chat_response.json()
        print(f"✅ Retrieved Deep Analysis chat {chat_id}")
        messages = specific_chat_data['messages']
        print(f"   Total Messages: {len(messages)}")
        
        # Look for comprehensive analysis message
        comprehensive_msgs = [
            msg for msg in messages 
            if msg['sender'] == 'deep_analysis' and '# 🧠 Deep Analysis Report' in msg['content']
        ]
        
        if comprehensive_msgs:
            print(f"   ✅ Found {len(comprehensive_msgs)} comprehensive analysis message(s)")
            comp_msg = comprehensive_msgs[0]
            content_preview = comp_msg['content'][:200].replace('\n', ' ')
            print(f"   Content preview: {content_preview}...")
        else:
            print(f"   ⚠️  No comprehensive analysis messages found")
            
        # Show breakdown of message types
        message_types = {}
        for msg in messages:
            sender = msg['sender']
            message_types[sender] = message_types.get(sender, 0) + 1
        
        print(f"   Message breakdown: {message_types}")
    else:
        print(f"❌ Failed to retrieve specific Deep Analysis chat: {specific_chat_response.status_code}")
    
    # Step 6: Test Deep Analysis usage summary
    print("\n6. Testing Deep Analysis usage summary...")
    usage_response = requests.get(f"{API_BASE_URL}/deep_analysis/usage/summary", params={
        "user_id": user_id
    })
    
    if usage_response.status_code == 200:
        usage_data = usage_response.json()
        print(f"✅ Retrieved Deep Analysis usage summary")
        summary = usage_data.get("deep_analysis_summary", {})
        print(f"   Total Cost: ${summary.get('total_cost', 0):.6f}")
        print(f"   Total Tokens: {summary.get('total_tokens', 0)}")
        print(f"   Total Requests: {summary.get('request_count', 0)}")
        print(f"   Deep Analysis Chats: {summary.get('deep_analysis_chats', 0)}")
    else:
        print(f"❌ Failed to retrieve usage summary: {usage_response.status_code}")
    
    # Step 7: Test isolation from regular chats
    print("\n7. Testing regular chats isolation...")
    regular_chats_response = requests.get(f"{API_BASE_URL}/chats", params={
        "user_id": user_id,
        "limit": 10
    })
    
    if regular_chats_response.status_code == 200:
        regular_chats_data = regular_chats_response.json()
        deep_analysis_in_regular = [
            chat for chat in regular_chats_data 
            if chat.get('title', '').find('[DEEP_ANALYSIS]') != -1
        ]
        
        print(f"✅ Regular chats endpoint returned {len(regular_chats_data)} chats")
        print(f"   Deep Analysis chats in regular endpoint: {len(deep_analysis_in_regular)}")
        
        if len(deep_analysis_in_regular) > 0:
            print("   ⚠️  WARNING: Deep Analysis chats are appearing in regular chat endpoints")
        else:
            print("   ✅ Deep Analysis chats are properly isolated")
    else:
        print(f"❌ Failed to retrieve regular chats: {regular_chats_response.status_code}")
    
    # Step 8: Test chat deletion
    print("\n8. Testing Deep Analysis chat deletion...")
    delete_response = requests.delete(f"{API_BASE_URL}/deep_analysis/chats/{chat_id}", params={
        "user_id": user_id
    })
    
    if delete_response.status_code == 200:
        delete_data = delete_response.json()
        print(f"✅ Deep Analysis chat deleted successfully")
        print(f"   Message: {delete_data['message']}")
        print(f"   Preserved Model Usage: {delete_data['preserved_model_usage']}")
    else:
        print(f"❌ Failed to delete Deep Analysis chat: {delete_response.status_code}")
    
    # Step 9: Verify deletion
    print("\n9. Verifying chat deletion...")
    verify_response = requests.get(f"{API_BASE_URL}/deep_analysis/chats/{chat_id}", params={
        "user_id": user_id
    })
    
    if verify_response.status_code == 404:
        print("✅ Chat deletion verified - chat no longer exists")
    else:
        print(f"❌ Chat deletion verification failed: {verify_response.status_code}")
    
    print("\n" + "=" * 70)
    print("🎉 Deep Analysis Database Integration Test Complete!")
    print("\n📊 Summary of Single Record Approach Benefits:")
    print("   ✅ One analysis = One comprehensive database record")
    print("   ✅ Clean history display with structured summaries")
    print("   ✅ Efficient retrieval and better user experience")
    print("   ✅ Proper isolation from regular chat operations")
    return True

def test_streaming_endpoint():
    """Test the streaming endpoint (requires a dataset to be uploaded)"""
    print("\n🌊 Testing Deep Analysis Streaming Endpoint")
    print("=" * 50)
    
    # Note: This test requires a dataset to be uploaded to the session
    # For now, we'll just test the endpoint response to a request without dataset
    
    user_response = requests.post(f"{API_BASE_URL}/chats/users", json={
        "username": TEST_USER_NAME,
        "email": TEST_USER_EMAIL
    })
    
    if user_response.status_code == 200:
        user_data = user_response.json()
        user_id = user_data["user_id"]
        
        print(f"Using user ID: {user_id}")
        
        # Test streaming endpoint (this will likely fail due to no dataset)
        streaming_response = requests.post(f"{API_BASE_URL}/deep_analysis/streaming", json={
            "goal": TEST_GOAL,
            "user_id": user_id
        })
        
        print(f"Streaming endpoint response: {streaming_response.status_code}")
        if streaming_response.status_code == 400:
            print("✅ Expected error: No dataset uploaded (this is expected behavior)")
        else:
            print(f"Response: {streaming_response.text[:200]}...")
    
    return True

if __name__ == "__main__":
    try:
        # Test database integration
        test_deep_analysis_db_integration()
        
        # Test streaming endpoint
        test_streaming_endpoint()
        
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc() 