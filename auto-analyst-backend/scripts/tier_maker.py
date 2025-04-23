from src.utils.model_registry import MODEL_COSTS, MODEL_TIERS

# divide models in 3 tiers based on cost per 1k tokens
# tier 1: < $0.0005
# tier 2: $0.0005 - $0.001
# tier 3: > $0.001

def get_tier(model_name):
    for provider, models in MODEL_COSTS.items():
        for model, cost in models.items():
            if model == model_name:
                return cost
    return None

def get_tier_1():
    tier_1 = []
    for provider, models in MODEL_COSTS.items():
        for model, cost in models.items():
            if cost["input"] + cost["output"] < 0.0005:
                tier_1.append(model)
    return tier_1

def get_tier_2():
    tier_2 = []
    for provider, models in MODEL_COSTS.items():
        for model, cost in models.items():
            if cost["input"] + cost["output"] >= 0.0005 and cost["input"] + cost["output"] < 0.001:
                tier_2.append(model)
    return tier_2

def get_tier_3():
    tier_3 = []
    for provider, models in MODEL_COSTS.items():
        for model, cost in models.items():
            if cost["input"] + cost["output"] >= 0.001:
                tier_3.append(model)
    return tier_3   

# Print current tier definitions from registry
import json
print("Current tier definitions from registry:")
print(json.dumps(MODEL_TIERS, indent=4))
print("\n")

# Generate new tier assignments based on cost
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

print("Suggested tier definitions based on cost:")
print(json.dumps(model_tiers, indent=4))