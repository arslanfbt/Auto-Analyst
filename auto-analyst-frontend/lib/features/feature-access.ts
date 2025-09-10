/**
 * Feature Access Management for Auto-Analyst
 */

import { Feature, FeatureAccessLevel, UserTier, FEATURES } from './feature-config';

// User subscription interface matching existing API structure
export interface UserSubscription {
  plan: string;
  planType?: string;
  status: string;
  amount: number;
  interval: string;
  renewalDate?: string;
  isYearly?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  requiredTier?: UserTier;
  isComingSoon?: boolean;
}

function planToTier(subscription: UserSubscription | null): UserTier {
  if (!subscription) return 'free';
  
  const planName = subscription.plan?.toLowerCase() || '';
  const planType = subscription.planType?.toUpperCase() || '';
  
  if (planName.includes('enterprise') || planType === 'ENTERPRISE') {
    return 'enterprise';
  } else if (planName.includes('standard') || planType === 'STANDARD') {
    return 'standard';
  } else if (planName.includes('pro') || planType === 'PRO') {
    return 'standard';
  }
  
  return 'free';
}

function isSubscriptionActive(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  
  const tier = planToTier(subscription);
  if (tier === 'free') return true;
  
  // Accept 'active', 'trialing', 'cancelling', and 'cancel_at_period_end' as active statuses
  // This allows users who are cancelling to keep access until their billing period ends
  return subscription.status === 'active' || 
         subscription.status === 'trialing' || 
         subscription.status === 'cancelling' || 
         subscription.status === 'cancel_at_period_end';
}

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

  if (feature.status === 'coming_soon') {
    return {
      hasAccess: false,
      reason: `${feature.name} is coming soon${feature.comingSoonEta ? ` (${feature.comingSoonEta})` : ''}`,
      isComingSoon: true,
    };
  }

  const userTier = planToTier(userSubscription);
  const isActiveSubscription = isSubscriptionActive(userSubscription);

  if (userTier !== 'free' && !isActiveSubscription) {
    return {
      hasAccess: false,
      reason: 'Subscription expired or inactive',
      upgradeRequired: true,
      requiredTier: 'standard',
    };
  }

  if (feature.accessLevel === 'free') {
    return {
      hasAccess: true,
    };
  }

  if (feature.requiredTier && feature.requiredTier.includes(userTier)) {
    return {
      hasAccess: true,
    };
  }
  
  if (feature.requiredTier && !feature.requiredTier.includes(userTier)) {
    const lowestRequiredTier = getLowestRequiredTier(feature.requiredTier);
    return {
      hasAccess: false,
      reason: `${feature.name} requires ${getTierDisplayName(lowestRequiredTier)} or higher`,
      upgradeRequired: true,
      requiredTier: lowestRequiredTier,
    };
  }

  if (feature.accessLevel === 'enterprise' && userTier !== 'enterprise') {
    return {
      hasAccess: false,
      reason: `${feature.name} is only available for Enterprise customers`,
      upgradeRequired: true,
      requiredTier: 'enterprise',
    };
  }

  if (feature.accessLevel === 'paid' && userTier === 'free') {
    return {
      hasAccess: false,
      reason: `${feature.name} requires a paid subscription`,
      upgradeRequired: true,
      requiredTier: 'standard',
    };
  }

  return {
    hasAccess: true,
  };
}

export function getAccessibleFeatures(
  userSubscription: UserSubscription | null
): Feature[] {
  return Object.values(FEATURES).filter(feature => {
    const access = hasFeatureAccess(feature.id, userSubscription);
    return access.hasAccess;
  });
}

export function getUpgradeRequiredFeatures(
  userSubscription: UserSubscription | null
): Feature[] {
  return Object.values(FEATURES).filter(feature => {
    const access = hasFeatureAccess(feature.id, userSubscription);
    return access.upgradeRequired;
  });
}

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

function getLowestRequiredTier(tiers: UserTier[]): UserTier {
  const tierOrder: UserTier[] = ['free', 'standard', 'enterprise'];
  
  for (const tier of tierOrder) {
    if (tiers.includes(tier)) {
      return tier;
    }
  }
  
  return 'standard';
}

function getTierDisplayName(tier: UserTier): string {
  const displayNames: Record<UserTier, string> = {
    free: 'Free',
    standard: 'Standard',
    enterprise: 'Enterprise',
  };
  
  return displayNames[tier];
}

export function isFeatureAvailable(featureId: string): boolean {
  const feature = FEATURES[featureId];
  return feature?.status === 'available';
}

export function getFeature(featureId: string): Feature | undefined {
  return FEATURES[featureId];
}

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