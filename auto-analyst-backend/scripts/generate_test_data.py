import sys
import os
import random
from datetime import datetime, timedelta
import sqlite3

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from init_db import ModelUsage, session_factory

# Models and providers to use in test data
MODELS = {
    "gpt-3.5-turbo": {"provider": "OpenAI", "cost_per_1k": 0.0015},
    "gpt-4": {"provider": "OpenAI", "cost_per_1k": 0.03},
    "gpt-4o": {"provider": "OpenAI", "cost_per_1k": 0.01},
    "gpt-4o-mini": {"provider": "OpenAI", "cost_per_1k": 0.0015},
    "o1-mini": {"provider": "OpenAI", "cost_per_1k": 0.00015},
    "claude-3-opus": {"provider": "Anthropic", "cost_per_1k": 0.015},
    "claude-3-sonnet": {"provider": "Anthropic", "cost_per_1k": 0.008},
    "claude-3-haiku": {"provider": "Anthropic", "cost_per_1k": 0.003},
    "llama-3-8b": {"provider": "Groq", "cost_per_1k": 0.0005},
    "llama-3-70b": {"provider": "Groq", "cost_per_1k": 0.002},
}

# User IDs to use (can be random if you don't have specific users)
USER_IDS = [1, 2, 3, 4, 5]

def generate_test_data(num_records=100):
    """Generate test model usage data"""
    session = session_factory()
    
    try:
        # Generate records for the past 30 days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        for _ in range(num_records):
            # Random timestamp within the date range
            random_days = random.randint(0, 30)
            timestamp = end_date - timedelta(days=random_days, 
                                           hours=random.randint(0, 23),
                                           minutes=random.randint(0, 59))
            
            # Select random model and user
            model_name = random.choice(list(MODELS.keys()))
            model_info = MODELS[model_name]
            user_id = random.choice(USER_IDS)
            
            # Generate random token counts
            prompt_tokens = random.randint(100, 1000)
            completion_tokens = random.randint(50, 500)
            total_tokens = prompt_tokens + completion_tokens
            
            # Calculate cost
            cost = (total_tokens / 1000) * model_info["cost_per_1k"]
            
            # Create model usage record
            usage = ModelUsage(
                user_id=user_id,
                chat_id=random.randint(1, 50),  # Random chat ID
                model_name=model_name,
                provider=model_info["provider"],
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                query_size=prompt_tokens * 4,  # Approximate characters
                response_size=completion_tokens * 4,  # Approximate characters
                cost=cost,
                timestamp=timestamp,
                is_streaming=random.choice([True, False]),
                request_time_ms=random.randint(500, 5000)  # Between 0.5 and 5 seconds
            )
            session.add(usage)
        
        session.commit()
        print(f"Successfully generated {num_records} test records")
    
    except Exception as e:
        session.rollback()
        print(f"Error generating test data: {e}")
    
    finally:
        session.close()

if __name__ == "__main__":
    # Default to 100 records, but allow command line override
    num_records = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    generate_test_data(num_records)
    print("Done! The model_usage table has been populated with test data.") 