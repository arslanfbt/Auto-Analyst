/**
 * Model Registry for the Auto-Analyst frontend
 * This file serves as the single source of truth for all model information on the frontend
 */

// Model providers
export const PROVIDERS = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  groq: "GROQ",
  gemini: "Google Gemini"
};

// Cost per 1K tokens for different models
export const MODEL_COSTS = {
  openai: {
    "gpt-4.1": { input: 0.002, output: 0.008 },
    "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
    "gpt-4.1-nano": { input: 0.00010, output: 0.0004 },
    "gpt-4.5-preview": { input: 0.075, output: 0.15 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },  
    "o1": { input: 0.015, output: 0.06 },  
    "o1-pro": { input: 0.015, output: 0.6 },
    "o1-mini": { input: 0.00011, output: 0.00044 }, 
    "o3": { input: 0.001, output: 0.04 },
    "o3-mini": { input: 0.00011, output: 0.00044 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 }
  },
  anthropic: {
    "claude-3-opus-latest": { input: 0.015, output: 0.075 },  
    "claude-3-7-sonnet-latest": { input: 0.003, output: 0.015 },   
    "claude-3-5-sonnet-latest": { input: 0.003, output: 0.015 }, 
    "claude-3-5-haiku-latest": { input: 0.0008, output: 0.0004 },
    "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
    "claude-opus-4-20250514": { input: 0.015, output: 0.075 }
  },
  groq: {
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
  gemini: {
    "gemini-2.5-pro-preview-03-25": { input: 0.00015, output: 0.001 }
  }
};

// Models by tier
export const MODEL_TIERS = {
  tier1: {
    name: "Basic",
    credits: 1,
    models: [
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
  tier2: {
    name: "Standard",
    credits: 3,
    models: [
      "gpt-4.1-nano",
      "gpt-4o-mini",
      "o1-mini",
      "o3-mini",
      "qwen-qwq-32b",
      "meta-llama/llama-4-maverick-17b-128e-instruct"
    ]
  },
  tier3: {
    name: "Premium",
    credits: 5,
    models: [
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
  tier4: {
    name: "Enterprise",
    credits: 10,
    models: ["claude-opus-4-20250514"]
  }
};

// Tier colors for UI components
export const TIER_COLORS = {
  tier1: "#10B981", // Green for Basic tier
  tier2: "#3B82F6", // Blue for Standard tier
  tier3: "#8B5CF6"  // Purple for Premium tier
};

// Model metadata (display name, context window, etc.)
export const MODEL_METADATA: Record<string, { displayName: string; contextWindow: number }> = {
  // OpenAI
  "gpt-4.1": { displayName: "GPT-4.1", contextWindow: 128000 },
  "gpt-4.1-mini": { displayName: "GPT-4.1 Mini", contextWindow: 128000 },
  "gpt-4.1-nano": { displayName: "GPT-4.1 Nano", contextWindow: 128000 },
  "gpt-4o": { displayName: "GPT-4o", contextWindow: 128000 },
  "gpt-4.5-preview": { displayName: "GPT-4.5 Preview", contextWindow: 128000 },
  "gpt-4o-mini": { displayName: "GPT-4o Mini", contextWindow: 128000 },
  "gpt-3.5-turbo": { displayName: "GPT-3.5 Turbo", contextWindow: 16385 },
  "o1": { displayName: "o1", contextWindow: 128000 },
  "o1-pro": { displayName: "o1 Pro", contextWindow: 128000 },
  "o1-mini": { displayName: "o1-mini", contextWindow: 128000 },
  "o3": { displayName: "o3", contextWindow: 128000 },
  "o3-mini": { displayName: "o3-mini", contextWindow: 128000 },
  
  // Anthropic
  "claude-3-opus-latest": { displayName: "Claude 3 Opus", contextWindow: 200000 },
  "claude-3-7-sonnet-latest": { displayName: "Claude 3.7 Sonnet", contextWindow: 200000 },
  "claude-3-5-sonnet-latest": { displayName: "Claude 3.5 Sonnet", contextWindow: 200000 },
  "claude-3-5-haiku-latest": { displayName: "Claude 3.5 Haiku", contextWindow: 200000 },
  "claude-sonnet-4-20250514": { displayName: "Claude Sonnet 4", contextWindow: 200000 },
  "claude-opus-4-20250514": { displayName: "Claude Opus 4", contextWindow: 200000 },
  // GROQ
  "deepseek-r1-distill-llama-70b": { displayName: "DeepSeek R1 Distill Llama 70b", contextWindow: 32768 },
  "deepseek-r1-distill-qwen-32b": { displayName: "DeepSeek R1 Distill Qwen 32b", contextWindow: 32768 },
  "llama-3.3-70b-versatile": { displayName: "Llama 3.3 70b", contextWindow: 8192 },
  "llama3-8b-8192": { displayName: "Llama 3 8b", contextWindow: 8192 },
  "llama3-70b-8192": { displayName: "Llama 3 70b", contextWindow: 8192 },
  "mistral-saba-24b": { displayName: "Mistral Saba 24b", contextWindow: 32768 },
  "gemma2-9b-it": { displayName: "Gemma 2 9b", contextWindow: 8192 },
  "qwen-qwq-32b": { displayName: "Qwen QWQ 32b | Alibaba", contextWindow: 32768 },
  "meta-llama/llama-4-maverick-17b-128e-instruct": { displayName: "Llama 4 Maverick 17b", contextWindow: 128000 },
  "meta-llama/llama-4-scout-17b-16e-instruct": { displayName: "Llama 4 Scout 17b", contextWindow: 16000 },

    
  // Gemini
  "gemini-2.5-pro-preview-03-25": { displayName: "Gemini 2.5 Pro", contextWindow: 1000000 }
};

// Type definitions to improve type safety
type Provider = keyof typeof PROVIDERS;
type OpenAIModels = keyof typeof MODEL_COSTS.openai;
type AnthropicModels = keyof typeof MODEL_COSTS.anthropic;
type GroqModels = keyof typeof MODEL_COSTS.groq;
type GeminiModels = keyof typeof MODEL_COSTS.gemini;
type ModelName = OpenAIModels | AnthropicModels | GroqModels | GeminiModels;
type TierId = keyof typeof MODEL_TIERS;

// Model configurations for UI
export const MODEL_PROVIDERS_UI = [
  {
    name: 'openai',
    models: Object.keys(MODEL_COSTS.openai).map(id => ({
      id,
      name: MODEL_METADATA[id]?.displayName || id
    })),
    displayName: PROVIDERS.openai
  },
  {
    name: 'anthropic',
    models: Object.keys(MODEL_COSTS.anthropic).map(id => ({
      id,
      name: MODEL_METADATA[id]?.displayName || id
    })),
    displayName: PROVIDERS.anthropic
  },
  {
    name: 'groq',
    models: Object.keys(MODEL_COSTS.groq).map(id => ({
      id,
      name: MODEL_METADATA[id]?.displayName || id
    })),
    displayName: PROVIDERS.groq
  },
  {
    name: 'gemini',
    models: Object.keys(MODEL_COSTS.gemini).map(id => ({
      id, 
      name: MODEL_METADATA[id]?.displayName || id
    })),
    displayName: PROVIDERS.gemini
  }
];

// Helper functions

/**
 * Get the provider for a given model
 */
export function getProviderForModel(modelName: string): Provider | "Unknown" {
  if (!modelName) {
    return "Unknown";
  }
  
  modelName = modelName.toLowerCase();
  
  for (const [provider, models] of Object.entries(MODEL_COSTS)) {
    if (Object.keys(models).some(model => model.includes(modelName))) {
      return provider as Provider;
    }
  }
  
  return "Unknown";
}

/**
 * Get the tier for a given model
 */
export function getModelTier(modelName: string): TierId {
  for (const [tierId, tierInfo] of Object.entries(MODEL_TIERS)) {
    if (tierInfo.models.includes(modelName)) {
      return tierId as TierId;
    }
  }
  return "tier1"; // Default to tier1 if not found
}

/**
 * Calculate cost for using a model based on tokens
 */
export function calculateCost(modelName: string, inputTokens: number, outputTokens: number): number {
  if (!modelName) {
    return 0;
  }
  
  // Convert tokens to thousands
  const inputTokensInThousands = inputTokens / 1000;
  const outputTokensInThousands = outputTokens / 1000;
  
  // Get model provider
  const modelProvider = getProviderForModel(modelName);
  
  // Handle case where model is not found
  if (modelProvider === "Unknown") {
    return 0;
  }
  
  const providerCosts = MODEL_COSTS[modelProvider as Provider];
  if (!providerCosts) {
    return 0;
  }
  
  // Safe type checking
  if (!(modelName in providerCosts)) {
    return 0;
  }
  
  // TypeScript needs this explicit type assertion to understand the structure
  const costs = providerCosts as Record<string, { input: number; output: number }>;
  
  return (
    inputTokensInThousands * costs[modelName].input +
    outputTokensInThousands * costs[modelName].output
  );
}

/**
 * Get the credit cost for a model
 */
export function getModelCreditCost(modelName: string): number {
  const tierId = getModelTier(modelName);
  return MODEL_TIERS[tierId].credits;
}

/**
 * Get the display name for a model
 */
export function getDisplayName(modelName: string): string {
  return MODEL_METADATA[modelName]?.displayName || modelName;
}

/**
 * Get the context window size for a model
 */
export function getContextWindow(modelName: string): number {
  return MODEL_METADATA[modelName]?.contextWindow || 4096;
}

/**
 * Get all models for a specific provider
 */
export function getAllModelsForProvider(provider: string): string[] {
  const providerCosts = MODEL_COSTS[provider as Provider];
  if (!providerCosts) {
    return [];
  }
  return Object.keys(providerCosts);
}

/**
 * Get all models for a specific tier
 */
export function getModelsByTier(tierId: string): string[] {
  return MODEL_TIERS[tierId as TierId]?.models || [];
} 