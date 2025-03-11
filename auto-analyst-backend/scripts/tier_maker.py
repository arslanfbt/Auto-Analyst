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
        
# divide models in 3 tiers based on cost per 1k tokens
# tier 1: < $0.0005
# tier 2: $0.0005 - $0.001
# tier 3: > $0.001

def get_tier(model_name):
    for provider, models in costs.items():
        for model, cost in models.items():
            if model == model_name:
                return cost
    return None

def get_tier_1():
    tier_1 = []
    for provider, models in costs.items():
        for model, cost in models.items():
            if cost["input"] + cost["output"] < 0.0005:
                tier_1.append(model)
    return tier_1

def get_tier_2():
    tier_2 = []
    for provider, models in costs.items():
        for model, cost in models.items():
            if cost["input"] + cost["output"] >= 0.0005 and cost["input"] + cost["output"] < 0.001:
                tier_2.append(model)
    return tier_2

def get_tier_3():
    tier_3 = []
    for provider, models in costs.items():
        for model, cost in models.items():
            if cost["input"] + cost["output"] >= 0.001:
                tier_3.append(model)
    return tier_3   



model_tiers = {
    "tier1": {
        "name": "Basic",
        "credits": 1,
        "models": get_tier_1()
    },
    "tier2": {
        "name": "Standard",
        "credits": 3,
        "models": get_tier_2()
    },
    "tier3": {
        "name": "Premium",
        "credits": 5,
        "models": get_tier_3()
    }
}
import json
print(json.dumps(model_tiers, indent=4))


"""
{
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
"""