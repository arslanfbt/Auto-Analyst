import logging
from typing import Optional, Dict, Any
import time
from init_db import ModelUsage, session_factory
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AI_Manager:
    """Manages AI model interactions and usage tracking"""
    
    def __init__(self):
        self.tokenizer = None
        # Initialize tokenizer - could use tiktoken or another tokenizer
        try:
            import tiktoken
            self.tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")
        except ImportError:
            logger.warning("Tiktoken not available, using simple tokenizer")
            self.tokenizer = SimpleTokenizer()
            
    async def generate_response(self, prompt: str, model_name: Optional[str] = None, 
                               user_id: Optional[int] = None, chat_id: Optional[int] = None) -> str:
        """
        Generate a response from an AI model and track usage
        
        Args:
            prompt: The input prompt
            model_name: The AI model to use (default will be set if None)
            user_id: Optional user ID for tracking
            chat_id: Optional chat ID for tracking
            
        Returns:
            The generated response text
        """
        if not model_name:
            model_name = "gpt-3.5-turbo"  # Default model
            
        start_time = time.time()
        logger.info(f"Generating response using {model_name}")
        
        # For demo purposes, just echo back the prompt with some additions
        # In a real application, you would call an actual AI model API here
        response = f"This is a simulated response from {model_name}.\n\nYou said: {prompt}\n\nHere's my response..."
        
        # Calculate tokens (in a real application, this would come from the API response)
        prompt_tokens = len(self.tokenizer.encode(prompt))
        completion_tokens = len(self.tokenizer.encode(response))
        total_tokens = prompt_tokens + completion_tokens
        
        # Calculate query processing time
        end_time = time.time()
        processing_time_ms = int((end_time - start_time) * 1000)
        
        # Calculate cost based on token usage
        cost = self.calculate_cost(model_name, total_tokens)
        
        # Get the provider for the model
        provider = self.get_provider_for_model(model_name)
        print("--------------------------------")
        print(f"Provider: {provider}")
        print("--------------------------------")
        print(f"Model: {model_name}")
        # Track usage in database
        self.save_usage_to_db(
            user_id=user_id,
            chat_id=chat_id,
            model_name=model_name,
            provider=provider,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            query_size=len(prompt),
            response_size=len(response),
            cost=cost,
            request_time_ms=processing_time_ms,
            is_streaming=False  # Set based on actual usage
        )
        
        logger.info(f"Generated response with {total_tokens} tokens (prompt: {prompt_tokens}, completion: {completion_tokens})")
        logger.info(f"Cost: ${cost:.6f}, Processing time: {processing_time_ms}ms")
        
        return response
    
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
            logger.info(f"Saved usage data to database: {total_tokens} tokens, ${cost:.6f}")
            
        except Exception as e:
            session.rollback()
            logger.error(f"Error saving usage data to database: {str(e)}")
        finally:
            session.close()
        
    def calculate_cost(self, model_name, total_tokens):
        """Calculate the cost for using the model based on tokens"""
        if not model_name:
            return 0
            
        # Convert tokens to thousands
        tokens_in_thousands = total_tokens / 1000
        
        # Cost per 1K tokens for different models
        # These are example rates, you should update with actual pricing
        costs = {
            "gpt-3.5-turbo": 0.0015,  # $0.0015 per 1K tokens
            "gpt-4": 0.03,  # $0.03 per 1K tokens
            "claude-3-opus": 0.015,  # $0.015 per 1K tokens
            "claude-3-sonnet": 0.008,  # $0.008 per 1K tokens
            "claude-3-haiku": 0.003,  # $0.003 per 1K tokens
            "llama-3-70b": 0.0007,  # Example cost
            "llama-3-8b": 0.0002,  # Example cost
            "llama-3-70b-8192": 0.0007,  # Example cost
            "llama-3-8b-8192": 0.0002,  # Example cost
            "mixtral-8x7b-32768": 0.0006,  # Example cost
            "gpt-4o": 0.01,  # Example cost
            "gpt-4o-mini": 0.0015,  # Example cost
            "o1-mini": 0.00015,  # Example cost
            # Add other models as needed
        }
        
        # Default cost if model not found
        return tokens_in_thousands * costs.get(model_name, 0.002)

    def get_provider_for_model(self, model_name):
        """Determine the provider based on model name"""
        if not model_name:
            return "Unknown"
            
        model_name = model_name.lower()
        if "gpt" in model_name:
            return "OpenAI"
        elif "claude" in model_name:
            return "Anthropic"
        elif "llama" in model_name:
            return "Meta"
        # Add more providers as needed
        return "Unknown"


class SimpleTokenizer:
    """A very simple tokenizer implementation for fallback"""
    def encode(self, text):
        # This is a very rough approximation - not for production use
        # In reality, you'd want to use a proper tokenizer
        return text.split() 