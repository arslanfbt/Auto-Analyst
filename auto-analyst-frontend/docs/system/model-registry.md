# Model Registry Management

This guide explains how to add, modify, and manage AI models in the Auto-Analyst platform using the synchronized model registry files.

## Overview

Auto-Analyst uses two synchronized model registry files to maintain consistency between frontend and backend:

- **Frontend**: `lib/model-registry.ts` - TypeScript configuration for UI and client-side logic
- **Backend**: `src/utils/model_registry.py` - Python configuration for API and server-side operations

> **Important**: Both files must be updated simultaneously to maintain consistency across the platform.

## Model Registry Structure

Both registries contain the same core information:

- **Providers** - Supported AI providers (OpenAI, Anthropic, GROQ, Gemini)
- **Model Costs** - Token pricing for each model
- **Model Tiers** - Credit cost groupings (1, 3, 5, 20 credits)
- **Model Metadata** - Display names and context windows

## Adding a New Model

### Step 1: Update Frontend Registry (`model-registry.ts`)

Add the model to the appropriate provider in `MODEL_COSTS`:

```typescript
// lib/model-registry.ts
export const MODEL_COSTS = {
  openai: {
    // ... existing models
    "gpt-5": { input: 0.005, output: 0.015 },  // New model
  },
  anthropic: {
    // ... existing models
    "claude-4-haiku": { input: 0.0001, output: 0.0005 },  // New model
  }
}
```

Add display metadata:

```typescript
export const MODEL_METADATA: Record<string, { displayName: string; contextWindow: number }> = {
  // ... existing models
  "gpt-5": { displayName: "GPT-5", contextWindow: 256000 },
  "claude-4-haiku": { displayName: "Claude 4 Haiku", contextWindow: 300000 },
}
```

Add to appropriate tier:

```typescript
export const MODEL_TIERS = {
  "tier3": {
    "name": "Premium",
    "credits": 5,
    "models": [
      // ... existing models
      "gpt-5"
    ]
  },
  "tier1": {
    "name": "Basic", 
    "credits": 1,
    "models": [
      // ... existing models
      "claude-4-haiku"
    ]
  }
}
```

### Step 2: Update Backend Registry (`model_registry.py`)

Mirror the same changes in the Python file:

```python
# src/utils/model_registry.py
MODEL_COSTS = {
    "openai": {
        # ... existing models
        "gpt-5": {"input": 0.005, "output": 0.015},  # New model
    },
    "anthropic": {
        # ... existing models  
        "claude-4-haiku": {"input": 0.0001, "output": 0.0005},  # New model
    }
}
```

Add metadata:

```python
MODEL_METADATA = {
    # ... existing models
    "gpt-5": {"display_name": "GPT-5", "context_window": 256000},
    "claude-4-haiku": {"display_name": "Claude 4 Haiku", "context_window": 300000},
}
```

Add to tiers:

```python
MODEL_TIERS = {
    "tier3": {
        "name": "Premium",
        "credits": 5, 
        "models": [
            # ... existing models
            "gpt-5"
        ]
    },
    "tier1": {
        "name": "Basic",
        "credits": 1,
        "models": [
            # ... existing models
            "claude-4-haiku"
        ]
    }
}
```

### Step 3: Test the Changes

**Frontend Testing:**
```typescript
// Test in browser console
import { getModelCreditCost, getDisplayName } from '@/lib/model-registry'

console.log(getModelCreditCost('gpt-5'))  // Should return 5
console.log(getDisplayName('claude-4-haiku'))  // Should return "Claude 4 Haiku"
```

**Backend Testing:**
```python
# Test in Python shell
from src.utils.model_registry import get_credit_cost, get_display_name

print(get_credit_cost('gpt-5'))  # Should return 5
print(get_display_name('claude-4-haiku'))  # Should return "Claude 4 Haiku"
```

## Adding a New Provider

### Step 1: Add Provider Constants

**Frontend (`model-registry.ts`):**
```typescript
export const PROVIDERS = {
  openai: "OpenAI",
  anthropic: "Anthropic", 
  groq: "GROQ",
  gemini: "Google Gemini",
  newprovider: "New Provider"  // Add new provider
};
```

**Backend (`model_registry.py`):**
```python
PROVIDERS = {
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "groq": "GROQ", 
    "gemini": "Google Gemini",
    "newprovider": "New Provider"  # Add new provider
}
```

### Step 2: Add Provider Models

**Frontend:**
```typescript
export const MODEL_COSTS = {
  // ... existing providers
  newprovider: {
    "new-model-1": { input: 0.001, output: 0.002 },
    "new-model-2": { input: 0.003, output: 0.006 }
  }
}
```

**Backend:**
```python
MODEL_COSTS = {
    # ... existing providers
    "newprovider": {
        "new-model-1": {"input": 0.001, "output": 0.002},
        "new-model-2": {"input": 0.003, "output": 0.006}
    }
}
```

### Step 3: Update UI Configuration

Add to `MODEL_PROVIDERS_UI` in frontend:

```typescript
export const MODEL_PROVIDERS_UI = [
  // ... existing providers
  {
    name: 'newprovider',
    models: Object.keys(MODEL_COSTS.newprovider).map(id => ({
      id,
      name: MODEL_METADATA[id]?.displayName || id
    })),
    displayName: PROVIDERS.newprovider
  }
];
```

## Credit Tier Guidelines

Choose the appropriate tier based on model capability and cost:

| Tier | Credits | Typical Models | Use Case |
|------|---------|----------------|----------|
| **Tier 1** | 1 credit | Basic models, fast responses | Quick queries, code completion |
| **Tier 2** | 3 credits | Standard models, good quality | General conversation, analysis |
| **Tier 3** | 5 credits | Premium models, high quality | Complex reasoning, detailed analysis |
| **Tier 4** | 20 credits | Top-tier models, best quality | Advanced reasoning, critical tasks |

### Example Tier Assignments:

```typescript
// Low-cost, fast models → Tier 1
"claude-3-5-haiku-latest": Tier 1 (1 credit)
"llama3-8b-8192": Tier 1 (1 credit)

// Mid-range models → Tier 2-3  
"gpt-4o-mini": Tier 2 (3 credits)
"claude-3-5-sonnet-latest": Tier 3 (5 credits)

// Premium, expensive models → Tier 4
"o1-pro": Tier 4 (20 credits)
"claude-3-opus-latest": Tier 4 (20 credits)
```

## Pricing Research

When adding models, research current pricing from provider documentation:

### OpenAI Pricing
- Visit: https://openai.com/api/pricing/
- Look for input/output token costs per 1K tokens

### Anthropic Pricing  
- Visit: https://www.anthropic.com/pricing
- Convert per-token to per-1K-token pricing

### GROQ Pricing
- Visit: https://groq.com/pricing/
- Usually very competitive pricing

### Google Gemini Pricing
- Visit: https://cloud.google.com/vertex-ai/generative-ai/pricing
- Check for Gemini model pricing

## Validation and Testing

### 1. Sync Validation

Create a script to validate sync between files:

```typescript
// scripts/validate-model-sync.ts
import { MODEL_COSTS as FRONTEND_COSTS } from '../lib/model-registry'

// Compare with backend costs (would need to import Python data)
function validateSync() {
  // Implementation to compare frontend and backend registries
}
```

### 2. Credit Cost Testing

Test credit calculations:

```typescript
// Test credit costs match expectations
const testModels = ['gpt-4o', 'claude-3-5-sonnet-latest', 'o1-pro']
testModels.forEach(model => {
  const cost = getModelCreditCost(model)
  console.log(`${model}: ${cost} credits`)
})
```

### 3. UI Testing

Verify models appear correctly in:
- Model selection dropdown
- Credit cost display  
- Tier indicators
- Provider grouping

## Backend Integration

### Credit Deduction

The backend uses the registry for credit calculations:

```python
# In chat processing
model_name = request.model
credit_cost = get_credit_cost(model_name)

# Deduct credits from user account
success = deduct_user_credits(user_id, credit_cost)
if not success:
    return {"error": "Insufficient credits"}
```

### Model Validation

Validate requested models exist:

```python
from src.utils.model_registry import MODEL_COSTS

def validate_model(model_name: str, provider: str) -> bool:
    provider_models = MODEL_COSTS.get(provider, {})
    return model_name in provider_models
```

## Maintenance Best Practices

### 1. Regular Updates
- Monitor provider pricing changes
- Update costs monthly or when providers announce changes
- Test thoroughly after updates

### 2. Version Control
- Always update both files in the same commit
- Include tests for new models
- Document breaking changes

### 3. Documentation
- Update this documentation when adding new providers
- Maintain changelog of model additions/removals
- Document any special model requirements

## Troubleshooting

### Common Issues

1. **Model not appearing in UI**
   - Check `MODEL_PROVIDERS_UI` configuration
   - Verify model is in `MODEL_METADATA`
   - Clear browser cache

2. **Incorrect credit costs**
   - Verify model is in correct tier
   - Check tier credit amounts
   - Validate backend synchronization

3. **Frontend/Backend mismatch**
   - Compare both registry files
   - Run validation scripts
   - Check recent commits for partial updates

### Debug Commands

```typescript
// Frontend debugging
console.log('All tiers:', MODEL_TIERS)
console.log('Model tier:', getModelTier('gpt-4o'))
console.log('Credit cost:', getModelCreditCost('gpt-4o'))
```

```python
# Backend debugging
print("All tiers:", MODEL_TIERS)
print("Model tier:", get_model_tier('gpt-4o'))
print("Credit cost:", get_credit_cost('gpt-4o'))
```

## Future Enhancements

Potential improvements to the model registry system:

1. **Automated Sync Validation** - CI/CD checks for registry consistency
2. **Dynamic Pricing** - API-based pricing updates
3. **A/B Testing** - Different credit costs for user segments
4. **Usage Analytics** - Track model popularity and adjust tiers
5. **Cost Optimization** - Automatic tier adjustments based on usage patterns 