MODEL_TIERS = {
    "tier1": {
        "name": "Basic",
        "credits": 1,
        "models": [
            "llama3-8b-8192",
            "llama-3.2-1b-preview",
            "llama-3.2-3b-preview",
            "llama-3.2-11b-text-preview",
            "llama-3.2-11b-vision-preview",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma-7b-it",
            "gemma2-9b-it",
            "llama3-groq-8b-8192-tool-use-preview"
        ]
    },
    "tier2": {
        "name": "Standard",
        "credits": 3,
        "models": [
            "gpt-4o-mini",
            "o1-mini",
            "o3-mini"
        ]
    },
    "tier3": {
        "name": "Premium",
        "credits": 5,
        "models": [
            "gpt-3.5-turbo",
            "gpt-4.5-preview",
            "gpt-4",
            "gpt-4o",
            "o1",
            "claude-3-opus-latest",
            "claude-3-7-sonnet-latest",
            "claude-3-5-sonnet-latest",
            "claude-3-5-haiku-latest",
            "deepseek-r1-distill-qwen-32b",
            "deepseek-r1-distill-llama-70b",
            "llama-3.3-70b-versatile",
            "llama-3.3-70b-specdec",
            "llama2-70b-4096",
            "llama-3.2-90b-text-preview",
            "llama-3.2-90b-vision-preview",
            "llama3-70b-8192",
            "llama-3.1-70b-versatile",
            "llama-3.1-405b-reasoning",
            "llama3-groq-70b-8192-tool-use-preview"
        ]
    }
}

from src.managers.ai_manager import costs

def get_model_tier(model_name):
    """
    Determine the pricing tier for a model based on its cost bracket.
    Returns: 'tier1' (low cost), 'tier2' (medium cost), or 'tier3' (high cost)
    """
    if not model_name:
        return "tier1"  # Default to lowest tier if no model specified
        
    model_name = model_name.lower()
    
    # Handle comma-separated models by taking the highest tier
    if "," in model_name:
        models = [m.strip() for m in model_name.split(",")]
        tiers = [get_model_tier(m) for m in models]
        # Extract tier numbers and find max
        tier_numbers = [int(tier.replace("tier", "")) for tier in tiers]
        return f"tier{max(tier_numbers)}"
    
    # Get provider for this model
    provider = None
    model_key = None
    
    for prov, models in costs.items():
        for model in models:
            if model_name in model.lower():
                provider = prov
                model_key = model
                break
        if provider:
            break
    
    if not provider or not model_key:
        return "tier1"  # Default to lowest tier if model not found
    
    # Determine tier based on input cost
    input_cost = costs[provider][model_key]["input"]
    output_cost = costs[provider][model_key]["output"]
    total_cost = input_cost + output_cost
    
    # tier 1: < $0.0005
    # tier 2: $0.0005 - $0.001
    # tier 3: > $0.001
    if total_cost < 0.0005:
        return "tier1"  # Low cost models
    elif total_cost < 0.001:
        return "tier2"  # Medium cost models
    else:
        return "tier3"  # High cost models (like GPT-4, Claude 3 Opus)


if __name__=="__main__":
    print(get_model_tier("gpt-3.5-turbo"))