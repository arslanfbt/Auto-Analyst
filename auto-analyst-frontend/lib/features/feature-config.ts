/**
 * Feature Configuration for Auto-Analyst
 */

// Feature access levels
export type FeatureAccessLevel = 'free' | 'paid' | 'enterprise';
export type FeatureStatus = 'available' | 'coming_soon' | 'beta';
export type UserTier = 'free' | 'standard' | 'enterprise';

// Feature interface
export interface Feature {
  id: string;
  name: string;
  description: string;
  accessLevel: FeatureAccessLevel;
  status: FeatureStatus;
  category: string;
  icon?: string;
  requiredTier?: UserTier[];
  betaAccess?: boolean;
  comingSoonEta?: string;
  documentationUrl?: string;
}

// Feature categories
export const FEATURE_CATEGORIES = {
  MODELS: 'AI Models',
  CODE: 'Code Features',
  ANALYSIS: 'Analysis',
  AGENTS: 'Custom Agents',
  ENTERPRISE: 'Enterprise'
} as const;

// Core feature definitions
export const FEATURES: Record<string, Feature> = {
  // AI Models - Free tier
  ALL_TIER_MODELS: {
    id: 'all_tier_models',
    name: 'All Tier Models',
    description: 'Access to Basic, Standard, Premium, and Premium+ AI models',
    accessLevel: 'free',
    status: 'available',
    category: FEATURE_CATEGORIES.MODELS,
    icon: '🤖',
    requiredTier: ['free', 'standard', 'enterprise'],
  },

  // Code Features - Free (may change)
  AI_CODE_EDIT: {
    id: 'ai_code_edit',
    name: 'AI Code Edit',
    description: 'AI-powered code editing and refactoring assistance',
    accessLevel: 'free',
    status: 'available',
    category: FEATURE_CATEGORIES.CODE,
    icon: '✏️',
    requiredTier: ['free', 'standard', 'enterprise'],
  },

  AI_CODE_FIX: {
    id: 'ai_code_fix',
    name: 'AI Code Fix',
    description: 'Automated bug detection and code fixes',
    accessLevel: 'free',
    status: 'available',
    category: FEATURE_CATEGORIES.CODE,
    icon: '🔧',
    requiredTier: ['free', 'standard', 'enterprise'],
  },

  // Paid Features - Available
  DEEP_ANALYSIS: {
    id: 'DEEP_ANALYSIS',
    name: 'Deep Analysis',
    description: 'Advanced data analysis with comprehensive insights and visualizations',
    accessLevel: 'paid',
    status: 'available',
    category: FEATURE_CATEGORIES.ANALYSIS,
    icon: '📊',
    requiredTier: ['standard', 'enterprise'],
  },

  CUSTOM_AGENTS: {
    id: 'CUSTOM_AGENTS',
    name: 'Custom Agents',
    description: 'Create and deploy custom AI agents for specific tasks',
    accessLevel: 'paid',
    status: 'available',
    category: FEATURE_CATEGORIES.AGENTS,
    icon: '🤖',
    requiredTier: ['standard', 'enterprise'],
    betaAccess: true,
  },

  // Enterprise Features
  PRIORITY_SUPPORT: {
    id: 'priority_support',
    name: 'Priority Support',
    description: '24/7 dedicated support with priority response times',
    accessLevel: 'enterprise',
    status: 'available',
    category: FEATURE_CATEGORIES.ENTERPRISE,
    icon: '🎧',
    requiredTier: ['enterprise'],
  },

  CUSTOM_INTEGRATIONS: {
    id: 'custom_integrations',
    name: 'Custom Integrations',
    description: 'Tailored API integrations and custom solutions',
    accessLevel: 'enterprise',
    status: 'available',
    category: FEATURE_CATEGORIES.ENTERPRISE,
    icon: '🔗',
    requiredTier: ['enterprise'],
  },
};

// Helper functions
export function getFeaturesByCategory(category: string): Feature[] {
  return Object.values(FEATURES).filter(feature => feature.category === category);
}

export function getFeaturesByAccessLevel(accessLevel: FeatureAccessLevel): Feature[] {
  return Object.values(FEATURES).filter(feature => feature.accessLevel === accessLevel);
}

export function getFeaturesByStatus(status: FeatureStatus): Feature[] {
  return Object.values(FEATURES).filter(feature => feature.status === status);
}

export function getAvailableFeatures(): Feature[] {
  return getFeaturesByStatus('available');
}

export function getComingSoonFeatures(): Feature[] {
  return getFeaturesByStatus('coming_soon');
}

export function getFreeFeatures(): Feature[] {
  return getFeaturesByAccessLevel('free');
}

export function getPaidFeatures(): Feature[] {
  return getFeaturesByAccessLevel('paid');
}

export function getEnterpriseFeatures(): Feature[] {
  return getFeaturesByAccessLevel('enterprise');
} 