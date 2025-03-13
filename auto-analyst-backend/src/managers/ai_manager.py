import logging
from typing import Optional, Dict, Any
import time
from src.db.schemas.models import ModelUsage
from src.db.init_db import session_factory
from datetime import datetime
import tiktoken
from src.routes.analytics_routes import handle_new_model_usage
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cost per 1K tokens for different models
costs = {
            "openai": {
                "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},  
                "gpt-4.5-preview": {"input": 0.075, "output": 0.15},
                "gpt-4": {"input": 0.03, "output": 0.06},  
                "gpt-4o": {"input": 0.0025, "output": 0.01},  
                "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},  
                "o1": {"input": 0.015, "output": 0.06},  
                "o1-mini": {"input": 0.00011, "output": 0.00044},  
                "o3-mini": {"input": 0.00011, "output": 0.00044}  
            },
            "anthropic": {
                "claude-3-opus-latest": {"input": 0.015, "output": 0.075},  
                "claude-3-7-sonnet-latest": {"input": 0.003, "output": 0.015},   
                "claude-3-5-sonnet-latest": {"input": 0.003, "output": 0.015}, 
                "claude-3-5-haiku-latest": {"input": 0.0008, "output": 0.0004},
            },
            "groq": {
                "deepseek-r1-distill-qwen-32b": {"input": 0.00075, "output": 0.00099},
                "deepseek-r1-distill-llama-70b": {"input": 0.00075, "output": 0.00099},
                "llama-3.3-70b-versatile": {"input": 0.00059, "output": 0.00079},
                "llama-3.3-70b-specdec": {"input": 0.00059, "output": 0.00099},
                "llama2-70b-4096": {"input": 0.0007, "output": 0.0008},
                "llama3-8b-8192": {"input": 0.00005, "output": 0.00008},
                "llama-3.2-1b-preview": {"input": 0.00004, "output": 0.00004},
                "llama-3.2-3b-preview": {"input": 0.00006, "output": 0.00006},
                "llama-3.2-11b-text-preview": {"input": 0.00018, "output": 0.00018},
                "llama-3.2-11b-vision-preview": {"input": 0.00018, "output": 0.00018},
                "llama-3.2-90b-text-preview": {"input": 0.0009, "output": 0.0009},
                "llama-3.2-90b-vision-preview": {"input": 0.0009, "output": 0.0009},
                "llama3-70b-8192": {"input": 0.00059, "output": 0.00079},
                "llama-3.1-8b-instant": {"input": 0.00005, "output": 0.00008},
                "llama-3.1-70b-versatile": {"input": 0.00059, "output": 0.00079},
                "llama-3.1-405b-reasoning": {"input": 0.00059, "output": 0.00079},
                "mixtral-8x7b-32768": {"input": 0.00024, "output": 0.00024},
                "gemma-7b-it": {"input": 0.00007, "output": 0.00007},
                "gemma2-9b-it": {"input": 0.0002, "output": 0.0002},
                "llama3-groq-70b-8192-tool-use-preview": {"input": 0.00089, "output": 0.00089},
                "llama3-groq-8b-8192-tool-use-preview": {"input": 0.00019, "output": 0.00019}
            }
        }
        

class AI_Manager:
    """Manages AI model interactions and usage tracking"""
    
    def __init__(self):
        self.tokenizer = None
        # Initialize tokenizer - could use tiktoken or another tokenizer
        try:
            import tiktoken
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except ImportError:
            logger.warning("Tiktoken not available, using simple tokenizer")
            self.tokenizer = SimpleTokenizer()
            
    def save_usage_to_db(self, user_id, chat_id, model_name, provider, 
                       prompt_tokens, completion_tokens, total_tokens,
                       query_size, response_size, cost, request_time_ms, 
                       is_streaming=False):
        """Save model usage data to the database"""
        try:
            # Add debug logging
            logger.info(f"Saving model usage: user_id={user_id}, chat_id={chat_id}, model={model_name}")
            
            session = session_factory()
            
            usage = ModelUsage(
                user_id=user_id,
                chat_id=chat_id,
                model_name=model_name,
                provider=provider,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                query_size=query_size,
                response_size=response_size,
                cost=cost,
                timestamp=datetime.utcnow(),
                is_streaming=is_streaming,
                request_time_ms=request_time_ms
            )
            
            session.add(usage)
            session.commit()
            # logger.info(f"Saved usage data to database for chat {chat_id}: {total_tokens} tokens, ${cost:.6f}")
            
            # Broadcast the event asynchronously
            asyncio.create_task(handle_new_model_usage(usage))
            
        except Exception as e:
            session.rollback()
            logger.error(f"Error saving usage data to database for chat {chat_id}: {str(e)}")
        finally:
            session.close()
        
    def calculate_cost(self, model_name, input_tokens, output_tokens):
        """Calculate the cost for using the model based on tokens"""
        if not model_name:
            return 0
            
        # Convert tokens to thousands
        input_tokens_in_thousands = input_tokens / 1000
        output_tokens_in_thousands = output_tokens / 1000
        
        # Default cost if model not found
        # logger.info(f"[>] Model: {model_name}, Costs: {costs[self.get_provider_for_model(model_name)][model_name]}")
        model_provider = self.get_provider_for_model(model_name)    
        return input_tokens_in_thousands * costs[model_provider][model_name]["input"] + output_tokens_in_thousands * costs[model_provider][model_name]["output"]

    def get_provider_for_model(self, model_name):
        """Determine the provider based on model name"""
        if not model_name:
            return "Unknown"

        model_name = model_name.lower()
        # Use a generator expression to find the provider more efficiently
        return next((provider for provider, models in costs.items() 
                     if any(model_name in model for model in models)), "Unknown")

class SimpleTokenizer:
    """A very simple tokenizer implementation for fallback"""
    def encode(self, text):
        return len(text.split())
