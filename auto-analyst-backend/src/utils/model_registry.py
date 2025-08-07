"""
Models registry for the Auto-Analyst application.
This file serves as the single source of truth for all model information.
"""

# Model providers
PROVIDERS = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "groq": "GROQ",
    "gemini": "Google Gemini"
}

# Cost per 1K tokens for different models
MODEL_COSTS = {
    "openai": {

        "o1": {"input": 0.015, "output": 0.06},  
        "o1-pro": {"input": 0.015, "output": 0.6},
        "o1-mini": {"input": 0.00011, "output": 0.00044}, 
        "o3": {"input": 0.002, "output": 0.008},
        "o3-mini": {"input": 0.00011, "output": 0.00044},
    },
    "anthropic": {
        "claude-3-5-haiku-latest": {"input": 0.00025, "output": 0.000125},
        "claude-3-7-sonnet-latest": {"input": 0.003, "output": 0.015},   
        "claude-3-5-sonnet-latest": {"input": 0.003, "output": 0.015}, 
        "claude-sonnet-4-20250514": {"input": 0.003, "output": 0.015},
        "claude-3-opus-latest": {"input": 0.015, "output": 0.075},  
        "claude-opus-4-20250514": {"input": 0.015, "output": 0.075},
    },
    "groq": {
        "deepseek-r1-distill-llama-70b": {"input": 0.00075, "output": 0.00099},
        "gpt-oss-120B":{"input": 0.00075, "output": 0.00099},
        "gpt-oss-20B":{"input": 0.00075, "output": 0.00099}

    },
    "gemini": {
        "gemini-2.5-pro-preview-03-25": {"input": 0.00015, "output": 0.001}
    }
}

# Tiers based on cost per 1K tokens
MODEL_TIERS = {
    "tier1": {
        "name": "Basic",
        "credits": 1,
        "models": [
            "claude-3-5-haiku-latest",
             "gpt-oss-20B"
            

        ]
    },
    "tier2": {
        "name": "Standard",
        "credits": 3,
        "models": [

            "o1-mini",
            "o3-mini",
        ]
    },
    "tier3": {
        "name": "Premium",
        "credits": 5,
        "models": [
            "o3",

            "claude-3-7-sonnet-latest",
            "claude-3-5-sonnet-latest",
            "claude-sonnet-4-20250514",
            "deepseek-r1-distill-llama-70b",
            "gpt-oss-120B",
    
            "gemini-2.5-pro-preview-03-25"
        ]
    },
    "tier4": {
        "name": "Premium Plus",
        "credits": 20,
        "models": [
            "gpt-4.5-preview",
            "o1",
            "o1-pro",
            "claude-3-opus-latest",
            "claude-opus-4-20250514"
        ]
    }
}

# Model metadata (display name, context window, etc.)
MODEL_METADATA = {
    # OpenAI
    "o1": {"display_name": "o1", "context_window": 128000},
    "o1-pro": {"display_name": "o1 Pro", "context_window": 128000},
    "o1-mini": {"display_name": "o1 Mini", "context_window": 128000},
    "o3": {"display_name": "o3", "context_window": 128000},
    "o3-mini": {"display_name": "o3 Mini", "context_window": 128000},
    # Anthropic
    "claude-3-opus-latest": {"display_name": "Claude 3 Opus", "context_window": 200000},
    "claude-3-7-sonnet-latest": {"display_name": "Claude 3.7 Sonnet", "context_window": 200000},
    "claude-3-5-sonnet-latest": {"display_name": "Claude 3.5 Sonnet", "context_window": 200000},
    "claude-3-5-haiku-latest": {"display_name": "Claude 3.5 Haiku", "context_window": 200000},
    
    # GROQ
    "deepseek-r1-distill-llama-70b": {"display_name": "DeepSeek R1 Distill Llama 70b", "context_window": 32768},
    "gpt-oss-120B":{"display_name": "OpenAI gpt oss 120B", "context_window": 128000},
    "gpt-oss-20B":{"display_name": "OpenAI gpt oss 20B", "context_window": 128000},

    
    # Gemini
    "gemini-2.5-pro-preview-03-25": {"display_name": "Gemini 2.5 Pro", "context_window": 1000000},
}

# Helper functions

def get_provider_for_model(model_name):
    """Determine the provider based on model name"""
    if not model_name:
        return "Unknown"
        
    model_name = model_name.lower()
    return next((provider for provider, models in MODEL_COSTS.items() 
                if any(model_name in model for model in models)), "Unknown")

def get_model_tier(model_name):
    """Get the tier of a model"""
    for tier_id, tier_info in MODEL_TIERS.items():
        if model_name in tier_info["models"]:
            return tier_id
    return "tier1"  # Default to tier1 if not found

def calculate_cost(model_name, input_tokens, output_tokens):
    """Calculate the cost for using the model based on tokens"""
    if not model_name:
        return 0
        
    # Convert tokens to thousands
    input_tokens_in_thousands = input_tokens / 1000
    output_tokens_in_thousands = output_tokens / 1000
    
    # Get model provider
    model_provider = get_provider_for_model(model_name)
    
    # Handle case where model is not found
    if model_provider == "Unknown" or model_name not in MODEL_COSTS.get(model_provider, {}):
        return 0
        
    return (input_tokens_in_thousands * MODEL_COSTS[model_provider][model_name]["input"] + 
            output_tokens_in_thousands * MODEL_COSTS[model_provider][model_name]["output"])

def get_credit_cost(model_name):
    """Get the credit cost for a model"""
    tier_id = get_model_tier(model_name)
    return MODEL_TIERS[tier_id]["credits"]

def get_display_name(model_name):
    """Get the display name for a model"""
    return MODEL_METADATA.get(model_name, {}).get("display_name", model_name)

def get_context_window(model_name):
    """Get the context window size for a model"""
    return MODEL_METADATA.get(model_name, {}).get("context_window", 4096)

def get_all_models_for_provider(provider):
    """Get all models for a specific provider"""
    if provider not in MODEL_COSTS:
        return []
    return list(MODEL_COSTS[provider].keys())

def get_models_by_tier(tier_id):
    """Get all models for a specific tier"""
    return MODEL_TIERS.get(tier_id, {}).get("models", []) 
