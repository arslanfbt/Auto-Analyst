from src.utils.model_registry import MODEL_COSTS, MODEL_TIERS

# divide models in 3 tiers based on cost per 1k tokens
# tier 1: < $0.0005
# tier 2: < $0.001
# tier 3: > $0.05
# tier 4: > $0.1

TIERS_COST = {
    "tier1": 0.0005,
    "tier2": 0.001,
    "tier3": 0.05,
    "tier4": 0.1
}

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
            if cost["input"] + cost["output"] < TIERS_COST["tier1"]:
                tier_1.append(model)
    return tier_1

def get_tier_2():
    tier_2 = []
    for provider, models in MODEL_COSTS.items():
        for model, cost in models.items():
            if cost["input"] + cost["output"] >= TIERS_COST["tier1"] and cost["input"] + cost["output"] < TIERS_COST["tier2"]:
                tier_2.append(model)
    return tier_2

def get_tier_3():
    tier_3 = []
    for provider, models in MODEL_COSTS.items():
        for model, cost in models.items():
            if cost["input"] + cost["output"] >= TIERS_COST["tier2"] and cost["input"] + cost["output"] < TIERS_COST["tier3"]:
                tier_3.append(model)
    return tier_3  

def get_tier_4():
    tier_4 = []
    for provider, models in MODEL_COSTS.items():
        for model, cost in models.items():
            if cost["input"] + cost["output"] >= TIERS_COST["tier3"]:
                tier_4.append(model)
    return tier_4

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
    },
    "tier4": {
        "name": "Premium Plus",
        "credits": 10,
        "models": get_tier_4()
    }
}

print("Suggested tier definitions based on cost:")
print(json.dumps(model_tiers, indent=4))