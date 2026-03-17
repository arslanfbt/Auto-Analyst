import dspy
import os

# Model providers
PROVIDERS = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "groq": "GROQ",
    "gemini": "Google Gemini"
}
max_tokens = int(os.getenv("MAX_TOKENS", 6000))

# Clamp temperature to valid range (0..1) for all models
default_temperature = min(1.0, max(0.0, float(os.getenv("TEMPERATURE", "1.0"))))

# Lightweight LMs used for small internal tasks (planning, classification, etc.)
small_lm = dspy.LM('openai/gpt-5-nano', max_tokens=300, api_key=os.getenv("OPENAI_API_KEY"), cache=False)

mid_lm = dspy.LM('openai/gpt-5-nano', max_tokens=1800, api_key=os.getenv("OPENAI_API_KEY"), cache=False)

# OpenAI models
gpt_5_nano = dspy.LM(
    model="openai/gpt-5-nano",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=default_temperature,
    max_tokens=16_000,
    cache=False
)

gpt_5_mini = dspy.LM(
    model="openai/gpt-5-mini",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=default_temperature,
    max_tokens=16_000,
    cache=False
)

gpt_5 = dspy.LM(
    model="openai/gpt-5",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=default_temperature,
    max_tokens=16_000,
    cache=False
)

gpt_5_2 = dspy.LM(
    model="openai/gpt-5.2",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=float(os.getenv("TEMPERATURE", 1.0)),
    max_tokens=None,
    max_completion_tokens=max_tokens,
    cache=False
)

gpt_5_2_pro = dspy.LM(
    model="openai/gpt-5.2-pro",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=float(os.getenv("TEMPERATURE", 1.0)),
    max_tokens=None,
    max_completion_tokens=max_tokens,
    cache=False
)

gpt_5_2_chat_latest = dspy.LM(
    model="openai/gpt-5.2-chat-latest",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=float(os.getenv("TEMPERATURE", 1.0)),
    max_tokens=None,
    max_completion_tokens=max_tokens,
    cache=False
)

gpt_5_4 = dspy.LM(
    model="openai/gpt-5.4",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=default_temperature,
    max_tokens=16_000,
    cache=False
)

gpt_5_4_pro = dspy.LM(
    model="openai/gpt-5.4-pro",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=default_temperature,
    max_tokens=16_000,
    cache=False
)

o3 = dspy.LM(
    model="openai/o3-2025-04-16",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=default_temperature,
    max_tokens=20_000,
    cache=False
)

# Anthropic models
claude_haiku_4_5 = dspy.LM(
    model="anthropic/claude-haiku-4-5-20251001",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    temperature=default_temperature,
    max_tokens=max_tokens,
    cache=False
)

claude_sonnet_4_5 = dspy.LM(
    model="anthropic/claude-sonnet-4-5-20250929",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    temperature=default_temperature,
    max_tokens=max_tokens,
    cache=False
)

claude_sonnet_4_6 = dspy.LM(
    model="anthropic/claude-sonnet-4-6",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    temperature=default_temperature,
    max_tokens=max_tokens,
    cache=False
)

claude_opus_4_5 = dspy.LM(
    model="anthropic/claude-opus-4-5-20251101",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    temperature=float(os.getenv("TEMPERATURE", 1.0)),
    max_tokens=max_tokens,
    cache=False
)

claude_opus_4_6 = dspy.LM(
    model="anthropic/claude-opus-4-6",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    temperature=default_temperature,
    max_tokens=max_tokens,
    cache=False
)

# Groq models
deepseek_r1_distill_llama_70b = dspy.LM(
    model="groq/deepseek-r1-distill-llama-70b",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=default_temperature,
    max_tokens=max_tokens,
    cache=False
)

gpt_oss_120B = dspy.LM(
    model="groq/gpt-oss-120B",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=default_temperature,
    max_tokens=max_tokens,
    cache=False
)

gpt_oss_20B = dspy.LM(
    model="groq/gpt-oss-20B",
    api_key=os.getenv("GROQ_API_KEY"),
    temperature=default_temperature,
    max_tokens=max_tokens,
    cache=False
)

# Gemini models
gemini_2_5_pro_preview_03_25 = dspy.LM(
    model="gemini/gemini-2.5-pro-preview-03-25",
    api_key=os.getenv("GEMINI_API_KEY"),
    temperature=default_temperature,
    max_tokens=max_tokens,
    cache=False
)

gemini_3_pro = dspy.LM(
    model="gemini/gemini-3-pro",
    api_key=os.getenv("GEMINI_API_KEY"),
    temperature=float(os.getenv("TEMPERATURE", 1.0)),
    max_tokens=max_tokens,
    cache=False
)

gemini_3_flash = dspy.LM(
    model="gemini/gemini-3-flash",
    api_key=os.getenv("GEMINI_API_KEY"),
    temperature=float(os.getenv("TEMPERATURE", 1.0)),
    max_tokens=max_tokens,
    cache=False
)

MODEL_OBJECTS = {
    # OpenAI models
    "gpt-5-nano": gpt_5_nano,
    "gpt-5-mini": gpt_5_mini,
    "gpt-5": gpt_5,
    "gpt-5.2": gpt_5_2,
    "gpt-5.2-pro": gpt_5_2_pro,
    "gpt-5.2-chat-latest": gpt_5_2_chat_latest,
    "gpt-5.4": gpt_5_4,
    "gpt-5.4-pro": gpt_5_4_pro,
    "o3": o3,
    
    # Anthropic models
    "claude-haiku-4-5": claude_haiku_4_5,
    "claude-sonnet-4-5-20250929": claude_sonnet_4_5,
    "claude-sonnet-4-6": claude_sonnet_4_6,
    "claude-opus-4-5-20251101": claude_opus_4_5,
    "claude-opus-4-6": claude_opus_4_6,
    
    # Groq models
    "deepseek-r1-distill-llama-70b": deepseek_r1_distill_llama_70b,
    "gpt-oss-120B": gpt_oss_120B,
    "gpt-oss-20B": gpt_oss_20B,
    
    # Gemini models
    "gemini-2.5-pro-preview-03-25": gemini_2_5_pro_preview_03_25,
    "gemini-3-pro": gemini_3_pro,
    "gemini-3-flash": gemini_3_flash
}


def get_model_object(model_name: str):
    """Get model object by name"""
    return MODEL_OBJECTS.get(model_name, claude_sonnet_4_6)


# Get max tokens from environment
max_tokens = int(os.getenv("MAX_TOKENS", 6000))

# Tiers based on cost per 1K tokens
MODEL_TIERS = {
    "tier1": {
        "name": "Basic",
        "credits": 1,
        "models": [
            "gpt-5-nano",
            "gpt-oss-20B"
        ]
    },
    "tier2": {
        "name": "Standard",
        "credits": 3,
        "models": [
            "claude-haiku-4-5",
            "gpt-5-mini",
            "gpt-5.2-chat-latest"
        ]
    },
    "tier3": {
        "name": "Premium",
        "credits": 5,
        "models": [
            "o3",
            "claude-sonnet-4-5-20250929",
            "claude-sonnet-4-6",
            "deepseek-r1-distill-llama-70b",
            "gpt-oss-120B",
            "gemini-2.5-pro-preview-03-25",
            "gemini-3-flash",
            "gpt-5.2"
        ]
    },
    "tier4": {
        "name": "Premium Plus",
        "credits": 20,
        "models": [
            "gpt-5",
            "gpt-5.4",
            "claude-opus-4-5-20251101",
            "claude-opus-4-6",
            "gemini-3-pro"
        ]
    },
    "tier5": {
        "name": "Ultimate",
        "credits": 50,
        "models": [
            "gpt-5.2-pro",
            "gpt-5.4-pro"
        ]
    }
}

# Model metadata (display name, context window, etc.)
MODEL_METADATA = {
    # OpenAI
    "gpt-5-nano": {"display_name": "GPT-5 Nano", "context_window": 64000},
    "gpt-5-mini": {"display_name": "GPT-5 Mini", "context_window": 150000},
    "gpt-5": {"display_name": "GPT-5", "context_window": 400000},
    "gpt-5.2": {"display_name": "GPT-5.2", "context_window": 400000},
    "gpt-5.2-pro": {"display_name": "GPT-5.2 Pro", "context_window": 400000},
    "gpt-5.2-chat-latest": {"display_name": "GPT-5.2 Chat", "context_window": 400000},
    "gpt-5.4": {"display_name": "GPT-5.4", "context_window": 1050000},
    "gpt-5.4-pro": {"display_name": "GPT-5.4 Pro", "context_window": 1050000},
    "o3": {"display_name": "o3", "context_window": 128000},

    # Anthropic
    "claude-haiku-4-5": {"display_name": "Claude Haiku 4.5", "context_window": 200000},
    "claude-sonnet-4-5-20250929": {"display_name": "Claude Sonnet 4.5", "context_window": 200000},
    "claude-sonnet-4-6": {"display_name": "Claude Sonnet 4.6", "context_window": 1000000},
    "claude-opus-4-5-20251101": {"display_name": "Claude Opus 4.5", "context_window": 200000},
    "claude-opus-4-6": {"display_name": "Claude Opus 4.6", "context_window": 1000000},

    # GROQ
    "deepseek-r1-distill-llama-70b": {"display_name": "DeepSeek R1 Distill Llama 70b", "context_window": 32768},
    "gpt-oss-120B": {"display_name": "OpenAI gpt oss 120B", "context_window": 128000},
    "gpt-oss-20B": {"display_name": "OpenAI gpt oss 20B", "context_window": 128000},

    # Gemini
    "gemini-2.5-pro-preview-03-25": {"display_name": "Gemini 2.5 Pro", "context_window": 1000000},
    "gemini-3-pro": {"display_name": "Gemini 3 Pro", "context_window": 1000000},
    "gemini-3-flash": {"display_name": "Gemini 3 Flash", "context_window": 1000000},
}

MODEL_COSTS = {
    "openai": {
        "gpt-5-nano": {"input": 0.00005, "output": 0.0004},
        "gpt-5-mini": {"input": 0.00025, "output": 0.002},
        "gpt-5": {"input": 0.00125, "output": 0.01},
        "gpt-5.2": {"input": 0.00125, "output": 0.01},
        "gpt-5.2-pro": {"input": 0.002, "output": 0.015},
        "gpt-5.2-chat-latest": {"input": 0.0005, "output": 0.002},
        "gpt-5.4": {"input": 0.0025, "output": 0.015},
        "gpt-5.4-pro": {"input": 0.03, "output": 0.18},
        "o3": {"input": 0.002, "output": 0.008},
    },
    "anthropic": {
        "claude-haiku-4-5": {"input": 0.001, "output": 0.005},
        "claude-sonnet-4-5-20250929": {"input": 0.003, "output": 0.015},
        "claude-sonnet-4-6": {"input": 0.003, "output": 0.015},
        "claude-opus-4-5-20251101": {"input": 0.015, "output": 0.075},
        "claude-opus-4-6": {"input": 0.005, "output": 0.025},
    },
    "groq": {
        "deepseek-r1-distill-llama-70b": {"input": 0.00075, "output": 0.00099},
        "gpt-oss-120B": {"input": 0.00075, "output": 0.00099},
        "gpt-oss-20B": {"input": 0.00075, "output": 0.00099}
    },
    "gemini": {
        "gemini-2.5-pro-preview-03-25": {"input": 0.00015, "output": 0.001},
        "gemini-3-pro": {"input": 0.0002, "output": 0.001},
        "gemini-3-flash": {"input": 0.0001, "output": 0.0005}
    }
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
