#!/usr/bin/env python3
"""
Test script to verify deep analysis integration with Housing.csv dataset
"""

import os
import sys
import requests
import json
from typing import Dict, Any

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_SESSION_ID = "test-deep-analysis-session-housing"

def test_basic_functionality():
    """Test basic server functionality"""
    print("Testing server health...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Server is running")
            return True
        else:
            print(f"❌ Server health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        print("Make sure the FastAPI server is running on localhost:8000")
        return False



def test_agents_endpoint():
    """Test that agents endpoint includes deep analysis"""
    print("\nTesting agents endpoint for deep analysis info...")
    try:
        response = requests.get(f"{BASE_URL}/agents")
        if response.status_code == 200:
            agents_info = response.json()
            if "deep_analysis" in agents_info:
                print("✅ Deep analysis info found in agents endpoint")
                print(f"   Description: {agents_info['deep_analysis']['description']}")
                print(f"   Available agents: {len(agents_info['available_agents'])}")
                print(f"   Planner agents: {len(agents_info['planner_agents'])}")
                return True
            else:
                print("❌ Deep analysis info not found in agents endpoint")
                return False
        else:
            print(f"❌ Failed to get agents info: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing agents endpoint: {e}")
        return False

def test_deep_analysis_with_housing_data():
    """Test deep analysis with Housing.csv data"""
    print("\nTesting deep analysis with Housing.csv dataset...")
    
    # First, reset session to ensure we have the default dataset
    print("  Resetting session to default dataset...")
    try:
        reset_response = requests.post(
            f"{BASE_URL}/session/reset_to_default",
            headers={"X-Session-ID": TEST_SESSION_ID}
        )
        if reset_response.status_code == 200:
            print("  ✅ Session reset to default dataset")
        else:
            print(f"  ⚠️ Session reset failed: {reset_response.status_code}")
            
        # Verify the dataset is actually loaded
        print("  Verifying dataset is loaded...")
        verify_response = requests.get(
            f"{BASE_URL}/dataset/info",
            headers={"X-Session-ID": TEST_SESSION_ID}
        )
        
        if verify_response.status_code == 200:
            dataset_info = verify_response.json()
            if dataset_info.get("loaded", False):
                print(f"  ✅ Dataset loaded: {dataset_info.get('rows', 0)} rows, {dataset_info.get('columns', 0)} columns")
            else:
                print("  ⚠️ No dataset loaded - attempting to load default dataset")
                # Try to explicitly load the default dataset
                load_response = requests.post(
                    f"{BASE_URL}/dataset/load_default",
                    headers={"X-Session-ID": TEST_SESSION_ID}
                )
                if load_response.status_code == 200:
                    print("  ✅ Default dataset loaded")
                else:
                    print(f"  ❌ Failed to load default dataset: {load_response.status_code}")
                    return False
        else:
            print(f"  ⚠️ Could not verify dataset: {verify_response.status_code}")
    except Exception as e:
        print(f"  ⚠️ Error during dataset setup: {e}")
    
    # Now test deep analysis
    test_payload = {
        "goal": "Analyze housing price patterns and identify key factors affecting prices"
    }
    
    headers = {
        "X-Session-ID": TEST_SESSION_ID,
        "Content-Type": "application/json"
    }
    
    try:
        print("  Starting deep analysis...")
        response = requests.post(
            f"{BASE_URL}/deep_analysis_streaming",
            json=test_payload,
            headers=headers,
            timeout=12000  # 5 minute timeout for analysis
        )
        
        if response.status_code == 200:
            print("✅ Deep analysis completed successfully!")
            result = response.json()
            
            # Check key components
            analysis = result.get("analysis", {})
            print(f"   Goal: {analysis.get('goal', 'N/A')[:50]}...")
            print(f"   Questions generated: {'✅' if analysis.get('deep_questions') else '❌'}")
            print(f"   Plan created: {'✅' if analysis.get('deep_plan') else '❌'}")
            print(f"   Code generated: {'✅' if analysis.get('code') else '❌'}")
            print(f"   Visualizations: {len(analysis.get('plotly_figs', []))} figures")
            print(f"   Synthesis: {'✅' if analysis.get('synthesis') else '❌'}")
            print(f"   Conclusion: {'✅' if analysis.get('final_conclusion') else '❌'}")
            print(f"   Processing time: {result.get('processing_time_seconds', 'unknown')} seconds")
            
            return True
            
        elif response.status_code == 400:
            error_detail = response.json().get('detail', 'Unknown error')
            if "No dataset" in error_detail:
                print("❌ Dataset not properly loaded")
                print(f"   Error: {error_detail}")
            else:
                print(f"❌ Client error: {error_detail}")
            return False
            
        elif response.status_code == 500:
            error_detail = response.json().get('detail', 'Unknown error')
            print(f"❌ Server error during analysis: {error_detail}")
            return False
            
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False
            
    except requests.Timeout:
        print("❌ Analysis timed out (this may be normal for complex analysis)")
        return False
    except Exception as e:
        print(f"❌ Error during deep analysis: {e}")
        return False

def download_html_report():
    """Test downloading HTML report"""
    print("\nTesting HTML report download...")
    try:
        response = requests.post(
            f"{BASE_URL}/deep_analysis/download_report",
            headers={"X-Session-ID": TEST_SESSION_ID}
        )
        if response.status_code == 200:
            print("✅ HTML report downloaded successfully")
            return True
        else:
            print(f"❌ Failed to download HTML report: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error during HTML report download: {e}")
        return False


def main():
    print("🧪 Testing Deep Analysis Integration with Housing Data")
    print("=" * 60)
    
    # Run tests in sequence
    tests = [
        ("Server Health", test_basic_functionality),
        ("Agents Endpoint", test_agents_endpoint),
        ("Deep Analysis with Housing Data", test_deep_analysis_with_housing_data),
        ("HTML Report Download", download_html_report)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Running: {test_name}")
        result = test_func()
        results.append((test_name, result))
        
        if not result:
            print(f"⚠️ Test failed: {test_name}")
            break
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary:")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {status}: {test_name}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Deep analysis integration is working correctly.")
    else:
        print("⚠️ Some tests failed. Check the errors above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 