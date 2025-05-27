/**
 * Feature Access Management for Auto-Analyst
 * Handles user permissions and feature availability checks
 */

import { Feature, FeatureAccessLevel, UserTier, FEATURES } from './feature-config';

// User subscription interface
export interface UserSubscription {
  tier: UserTier;
  isActive: boolean;
  expiresAt?: Date;
  features?: string[]; // Custom feature access for enterprise users
}

// Feature access result
export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  requiredTier?: UserTier;
  isComingSoon?: boolean;
}

/**
 * Check if a user has access to a specific feature
 */
export function hasFeatureAccess(
  featureId: string,
  userSubscription: UserSubscription | null
): FeatureAccessResult {
  const feature = FEATURES[featureId];
  
  if (!feature) {
    return {
      hasAccess: false,
      reason: 'Feature not found',
    };
  }

  // Check if feature is coming soon
  if (feature.status === 'coming_soon') {
    return {
      hasAccess: false,
      reason: `${feature.name} is coming soon${feature.comingSoonEta ? ` (${feature.comingSoonEta})` : ''}`,
      isComingSoon: true,
    };
  }

  // If no subscription, user is on free tier
  const userTier: UserTier = userSubscription?.tier || 'free';
  const isActiveSubscription = userSubscription?.isActive !== false;

  // Check if subscription is active (for paid tiers)
  if (userTier !== 'free' && !isActiveSubscription) {
    return {
      hasAccess: false,
      reason: 'Subscription expired or inactive',
      upgradeRequired: true,
      requiredTier: 'standard',
    };
  }

  // Free features are accessible to everyone
  if (feature.accessLevel === 'free') {
    return {
      hasAccess: true,
    };
  }

  // Check tier requirements
  if (feature.requiredTier && !feature.requiredTier.includes(userTier)) {
    const lowestRequiredTier = getLowestRequiredTier(feature.requiredTier);
    return {
      hasAccess: false,
      reason: `${feature.name} requires ${getTierDisplayName(lowestRequiredTier)} or higher`,
      upgradeRequired: true,
      requiredTier: lowestRequiredTier,
    };
  }

  // Enterprise features require enterprise tier
  if (feature.accessLevel === 'enterprise' && userTier !== 'enterprise') {
    return {
      hasAccess: false,
      reason: `${feature.name} is only available for Enterprise customers`,
      upgradeRequired: true,
      requiredTier: 'enterprise',
    };
  }

  // Paid features require at least standard tier
  if (feature.accessLevel === 'paid' && userTier === 'free') {
    return {
      hasAccess: false,
      reason: `${feature.name} requires a paid subscription`,
      upgradeRequired: true,
      requiredTier: 'standard',
    };
  }

  // Check custom feature access for enterprise users
  if (userSubscription?.features && !userSubscription.features.includes(featureId)) {
    return {
      hasAccess: false,
      reason: `${feature.name} is not included in your custom plan`,
    };
  }

  return {
    hasAccess: true,
  };
}

/**
 * Get all features accessible to a user
 */
export function getAccessibleFeatures(
  userSubscription: UserSubscription | null
): Feature[] {
  return Object.values(FEATURES).filter(feature => {
    const access = hasFeatureAccess(feature.id, userSubscription);
    return access.hasAccess;
  });
}

/**
 * Get features that require an upgrade
 */
export function getUpgradeRequiredFeatures(
  userSubscription: UserSubscription | null
): Feature[] {
  return Object.values(FEATURES).filter(feature => {
    const access = hasFeatureAccess(feature.id, userSubscription);
    return access.upgradeRequired;
  });
}

/**
 * Check if user can access any features in a category
 */
export function hasCategoryAccess(
  category: string,
  userSubscription: UserSubscription | null
): boolean {
  const categoryFeatures = Object.values(FEATURES).filter(
    feature => feature.category === category
  );
  
  return categoryFeatures.some(feature => {
    const access = hasFeatureAccess(feature.id, userSubscription);
    return access.hasAccess;
  });
}

/**
 * Get the lowest required tier from a list of tiers
 */
function getLowestRequiredTier(tiers: UserTier[]): UserTier {
  const tierOrder: UserTier[] = ['free', 'standard', 'enterprise'];
  
  for (const tier of tierOrder) {
    if (tiers.includes(tier)) {
      return tier;
    }
  }
  
  return 'standard'; // Default fallback
}

/**
 * Get display name for a tier
 */
function getTierDisplayName(tier: UserTier): string {
  const displayNames: Record<UserTier, string> = {
    free: 'Free',
    standard: 'Standard',
    enterprise: 'Enterprise',
  };
  
  return displayNames[tier];
}

/**
 * Check if a feature is available (not coming soon)
 */
export function isFeatureAvailable(featureId: string): boolean {
  const feature = FEATURES[featureId];
  return feature?.status === 'available';
}

/**
 * Get feature by ID
 */
export function getFeature(featureId: string): Feature | undefined {
  return FEATURES[featureId];
}

/**
 * Get upgrade URL for a specific tier
 */
export function getUpgradeUrl(requiredTier: UserTier): string {
  const baseUrl = '/pricing';
  
  switch (requiredTier) {
    case 'standard':
      return `${baseUrl}?plan=standard`;
    case 'enterprise':
      return `${baseUrl}?plan=enterprise`;
    default:
      return baseUrl;
  }
} 