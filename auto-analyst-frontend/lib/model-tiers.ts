// Model tier definitions matching the backend
export const MODEL_TIERS = {
  tier1: {
    name: "Basic",
    credits: 1,
    models: [
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
  tier2: {
    name: "Standard",
    credits: 3,
    models: [
      "gpt-4o-mini",
      "o1-mini",
      "o3-mini"
    ]
  },
  tier3: {
    name: "Premium",
    credits: 5,
    models: [
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

// Get the tier of a specific model
export function getModelTier(modelName: string): string {
  for (const [tierId, tierInfo] of Object.entries(MODEL_TIERS)) {
    if (tierInfo.models.includes(modelName)) {
      return tierId
    }
  }
  // Default to the highest tier if model not found
  return 'tier3'
}

// Get credit cost for a specific model
export function getModelCreditCost(modelName: string): number {
  const tierId = getModelTier(modelName)
  return MODEL_TIERS[tierId as keyof typeof MODEL_TIERS].credits
} 