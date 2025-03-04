import logging
from typing import Optional, Dict, Any
import time
from init_db import ModelUsage, session_factory
from datetime import datetime
import tiktoken

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
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
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
        
    def calculate_cost(self, model_name, input_tokens, output_tokens):
        """Calculate the cost for using the model based on tokens"""
        if not model_name:
            return 0
            
        # Convert tokens to thousands
        input_tokens_in_thousands = input_tokens / 1000
        output_tokens_in_thousands = output_tokens / 1000
        
        # Cost per 1K tokens for different models
        costs = {
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},  
            "gpt-4.5-preview": {"input": 0.075, "output": 0.15},
            "gpt-4": {"input": 0.03, "output": 0.06},  
            "gpt-4o": {"input": 0.0025, "output": 0.01},  
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},  
            "o1": {"input": 0.015, "output": 0.06},  
            "o1-mini": {"input": 0.00011, "output": 0.00044},  
            "o3-mini": {"input": 0.00011, "output": 0.00044},  
            "claude-3-opus-latest": {"input": 0.015, "output": 0.075},  
            "claude-3-7-sonnet-latest": {"input": 0.003, "output": 0.015},   
            "claude-3-5-sonnet-latest": {"input": 0.000003 * 1000, "output": 0.000015 * 1000}, 
            "claude-3-5-haiku-latest": {"input": 0.0008, "output": 0.0004},
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
            "llama3-groq-8b-8192-tool-use-preview": {"input": 0.00019, "output": 0.00019},
        }
        
        # Default cost if model not found
        logger.info(f"[>] Model: {model_name}, Costs: {costs}")
        return input_tokens_in_thousands * costs.get(model_name, 0.002) + output_tokens_in_thousands * costs.get(model_name, 0.002)

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
        return len(text.split())
