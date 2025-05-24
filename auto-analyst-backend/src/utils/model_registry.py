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
        "gpt-4.1": {"input": 0.002, "output": 0.008},
        "gpt-4.1-mini": {"input": 0.0004, "output": 0.0016},
        "gpt-4.1-nano": {"input": 0.00010, "output": 0.0004},
        "gpt-4.5-preview": {"input": 0.075, "output": 0.15},
        "gpt-4o": {"input": 0.0025, "output": 0.01},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},  
        "o1": {"input": 0.015, "output": 0.06},  
        "o1-pro": {"input": 0.015, "output": 0.6},
        "o1-mini": {"input": 0.00011, "output": 0.00044}, 
        "o3": {"input": 0.001, "output": 0.04},
        "o3-mini": {"input": 0.00011, "output": 0.00044},
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},  
    },
    "anthropic": {
        "claude-3-opus-latest": {"input": 0.015, "output": 0.075},  
        "claude-3-7-sonnet-latest": {"input": 0.003, "output": 0.015},   
        "claude-3-5-sonnet-latest": {"input": 0.003, "output": 0.015}, 
        "claude-sonnet-4-20250514": {"input": 0.003, "output": 0.015},
        "claude-opus-4-20250514": {"input": 0.015, "output": 0.075},
        "claude-3-5-haiku-latest": {"input": 0.0008, "output": 0.0004},
    },
    "groq": {
        "deepseek-r1-distill-llama-70b": {"input": 0.00075, "output": 0.00099},
        "llama-3.3-70b-versatile": {"input": 0.00059, "output": 0.00079},
        "llama3-8b-8192": {"input": 0.00005, "output": 0.00008},
        "llama3-70b-8192": {"input": 0.00059, "output": 0.00079},
        "mistral-saba-24b": {"input": 0.00079, "output": 0.00079},
        "gemma2-9b-it": {"input": 0.0002, "output": 0.0002},
        "qwen-qwq-32b": {"input": 0.00029, "output": 0.00039},
        "meta-llama/llama-4-maverick-17b-128e-instruct": {"input": 0.0002, "output": 0.0006},
        "meta-llama/llama-4-scout-17b-16e-instruct": {"input": 0.00011, "output": 0.00034},
        "deepseek-r1-distill-qwen-32b": {"input": 0.00075, "output": 0.00099},
        "llama-3.1-70b-versatile": {"input": 0.00059, "output": 0.00079},
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
            "llama3-8b-8192",
            "llama-3.1-8b-instant",
            "gemma2-9b-it",
            "meta-llama/llama-4-scout-17b-16e-instruct",
            "llama-3.2-1b-preview",
            "llama-3.2-3b-preview",
            "llama-3.2-11b-text-preview",
            "llama-3.2-11b-vision-preview",
            "llama3-groq-8b-8192-tool-use-preview"
        ]
    },
    "tier2": {
        "name": "Standard",
        "credits": 3,
        "models": [
            "gpt-4.1-nano",
            "gpt-4o-mini",
            "o1-mini",
            "o3-mini",
            "qwen-qwq-32b",
            "meta-llama/llama-4-maverick-17b-128e-instruct"
        ]
    },
    "tier3": {
        "name": "Premium",
        "credits": 5,
        "models": [
            "gpt-4.1",
            "gpt-4.1-mini",
            "gpt-4.5-preview",
            "gpt-4o",
            "o1",
            "o1-pro",
            "o3",
            "gpt-3.5-turbo",
            "claude-3-opus-latest",
            "claude-3-7-sonnet-latest",
            "claude-3-5-sonnet-latest",
            "claude-3-5-haiku-latest",
            "claude-sonnet-4-20250514",
            "deepseek-r1-distill-llama-70b",
            "llama-3.3-70b-versatile",
            "llama3-70b-8192",
            "mistral-saba-24b",
            "deepseek-r1-distill-qwen-32b",
            "llama-3.2-90b-text-preview",
            "llama-3.2-90b-vision-preview",
            "llama-3.3-70b-specdec",
            "llama2-70b-4096",
            "llama-3.1-70b-versatile",
            "llama-3.1-405b-reasoning",
            "llama3-groq-70b-8192-tool-use-preview",
            "gemini-2.5-pro-preview-03-25"
        ]
    },
    "tier4": {
        "name": "Enterprise",
        "credits": 10,
        "models": [
            "claude-opus-4-20250514"
        ]
    }
}


# Model metadata (display name, context window, etc.)
MODEL_METADATA = {
    # OpenAI
    "gpt-4.1": {"display_name": "GPT-4.1", "context_window": 128000},
    "gpt-4.1-mini": {"display_name": "GPT-4.1 Mini", "context_window": 128000},
    "gpt-4.1-nano": {"display_name": "GPT-4.1 Nano", "context_window": 128000},
    "gpt-4o": {"display_name": "GPT-4o", "context_window": 128000},
    "gpt-4.5-preview": {"display_name": "GPT-4.5 Preview", "context_window": 128000},
    "gpt-4o-mini": {"display_name": "GPT-4o Mini", "context_window": 128000},
    "gpt-3.5-turbo": {"display_name": "GPT-3.5 Turbo", "context_window": 16385},
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
    "claude-sonnet-4-20250514": {"display_name": "Claude Sonnet 4", "context_window": 200000},
    "claude-opus-4-20250514": {"display_name": "Claude Opus 4", "context_window": 200000},
    
    # GROQ
    "deepseek-r1-distill-llama-70b": {"display_name": "DeepSeek R1 Distill Llama 70b", "context_window": 32768},
    "llama-3.3-70b-versatile": {"display_name": "Llama 3.3 70b", "context_window": 8192},
    "llama3-8b-8192": {"display_name": "Llama 3 8b", "context_window": 8192},
    "llama3-70b-8192": {"display_name": "Llama 3 70b", "context_window": 8192},
    "mistral-saba-24b": {"display_name": "Mistral Saba 24b", "context_window": 32768},
    "gemma2-9b-it": {"display_name": "Gemma 2 9b", "context_window": 8192},
    "qwen-qwq-32b": {"display_name": "Qwen QWQ 32b | Alibaba", "context_window": 32768},
    "meta-llama/llama-4-maverick-17b-128e-instruct": {"display_name": "Llama 4 Maverick 17b", "context_window": 128000},
    "meta-llama/llama-4-scout-17b-16e-instruct": {"display_name": "Llama 4 Scout 17b", "context_window": 16000},
    "llama-3.1-70b-versatile": {"display_name": "Llama 3.1 70b Versatile", "context_window": 8192},
    
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