import logging
from typing import Optional, Dict, Any
import time
from src.db.schemas.models import ModelUsage
from src.db.init_db import session_factory
from datetime import datetime
import tiktoken
from src.routes.analytics_routes import handle_new_model_usage
import asyncio

from src.utils.logger import Logger

logger = Logger(name="ai_manager", see_time=True, console_log=True)

# Cost per 1K tokens for different models
costs = {
    "openai": {
        "gpt-4": {"input": 0.03, "output": 0.06},  
        "gpt-4o": {"input": 0.0025, "output": 0.01},  
        "gpt-4.5-preview": {"input": 0.075, "output": 0.15},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},  
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},  
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
        "deepseek-r1-distill-llama-70b": {"input": 0.00075, "output": 0.00099},
        "llama-3.3-70b-versatile": {"input": 0.00059, "output": 0.00079},
        "llama3-8b-8192": {"input": 0.00005, "output": 0.00008},
        "llama3-70b-8192": {"input": 0.00059, "output": 0.00079},
        "llama-3.1-8b-instant": {"input": 0.00005, "output": 0.00008},
        "mistral-saba-24b": {"input": 0.00079, "output": 0.00079},
        "gemma2-9b-it": {"input": 0.0002, "output": 0.0002},
        "qwen-qwq-32b": {"input": 0.00029, "output": 0.00039},
        "meta-llama/llama-4-maverick-17b-128e-instruct": {"input": 0.0002, "output": 0.0006},
        "meta-llama/llama-4-scout-17b-16e-instruct": {"input": 0.00011, "output": 0.00034},
    },
    "gemini": {
        "gemini-2.5-pro-preview-03-25": {"input": 0.00015, "output": 0.001}
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
            logger.log_message("Tiktoken not available, using simple tokenizer", level=logging.WARNING)
            self.tokenizer = SimpleTokenizer()
            
    def save_usage_to_db(self, user_id, chat_id, model_name, provider, 
                       prompt_tokens, completion_tokens, total_tokens,
                       query_size, response_size, cost, request_time_ms, 
                       is_streaming=False):
        """Save model usage data to the database"""
        try:
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
            logger.log_message(f"Error saving usage data to database for chat {chat_id}: {str(e)}", level=logging.ERROR)
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
        model_provider = self.get_provider_for_model(model_name)    
        logger.log_message(f"[> ] Model Name: {model_name}, Model Provider: {model_provider}")
        
        return input_tokens_in_thousands * costs[model_provider][model_name]["input"] + output_tokens_in_thousands * costs[model_provider][model_name]["output"]

    def get_provider_for_model(self, model_name):
        """Determine the provider based on model name"""
        if not model_name:
            return "Unknown"

        model_name = model_name.lower()
        return next((provider for provider, models in costs.items() 
                     if any(model_name in model for model in models)), "Unknown")

class SimpleTokenizer:
    """A very simple tokenizer implementation for fallback"""
    def encode(self, text):
        return len(text.split())
