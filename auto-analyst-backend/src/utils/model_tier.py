from src.utils.model_registry import MODEL_TIERS, get_model_tier as get_model_tier_from_registry

# For backward compatibility, keep the get_model_tier function exposed
def get_model_tier(model_name):
    return get_model_tier_from_registry(model_name)
