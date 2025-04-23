MODEL_TIERS = {
    "tier1": {
        "name": "Basic",
        "credits": 1,
        "models": [
            "llama3-8b-8192",
            "llama-3.1-8b-instant",
            "gemma2-9b-it",
            "meta-llama/llama-4-scout-17b-16e-instruct"
        ]
    },
    "tier2": {
        "name": "Standard",
        "credits": 3,
        "models": [
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
            "gpt-4",
            "gpt-4o",
            "gpt-4.5-preview",
            "gpt-3.5-turbo",
            "o1",
            "claude-3-opus-latest",
            "claude-3-7-sonnet-latest",
            "claude-3-5-sonnet-latest",
            "claude-3-5-haiku-latest",
            "deepseek-r1-distill-llama-70b",
            "llama-3.3-70b-versatile",
            "llama3-70b-8192",
            "mistral-saba-24b",
            "gemini-2.5-pro-preview-03-25"
        ]
    }
}



def get_model_tier(model_name):
    for tier, tier_info in MODEL_TIERS.items():
        if model_name in tier_info["models"]:
            return tier
    return "tier1"
