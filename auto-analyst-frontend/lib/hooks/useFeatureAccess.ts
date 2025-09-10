/**
 * React hooks for feature access management
 */

import { useMemo } from 'react';
import { 
  hasFeatureAccess, 
  getAccessibleFeatures, 
  getUpgradeRequiredFeatures,
  UserSubscription,
  FeatureAccessResult 
} from '../features/feature-access';
import { 
  Feature, 
  FEATURES, 
  getFeaturesByCategory, 
  getFeaturesByStatus,
  FEATURE_CATEGORIES 
} from '../features/feature-config';

/**
 * Hook to check if user has access to a specific feature
 */
export function useFeatureAccess(
  featureId: string, 
  userSubscription: UserSubscription | null
): FeatureAccessResult {
  return useMemo(() => {
    return hasFeatureAccess(featureId, userSubscription);
  }, [featureId, userSubscription]);
}

/**
 * Hook to get all accessible features for a user
 */
export function useAccessibleFeatures(
  userSubscription: UserSubscription | null
): Feature[] {
  return useMemo(() => {
    return getAccessibleFeatures(userSubscription);
  }, [userSubscription]);
}

/**
 * Hook to get features that require an upgrade
 */
export function useUpgradeRequiredFeatures(
  userSubscription: UserSubscription | null
): Feature[] {
  return useMemo(() => {
    return getUpgradeRequiredFeatures(userSubscription);
  }, [userSubscription]);
}

/**
 * Hook to get features by category with access status
 */
export function useFeaturesWithAccess(
  userSubscription: UserSubscription | null,
  category?: string
): Array<Feature & { access: FeatureAccessResult }> {
  return useMemo(() => {
    const features = category 
      ? getFeaturesByCategory(category)
      : Object.values(FEATURES);
    
    return features.map(feature => ({
      ...feature,
      access: hasFeatureAccess(feature.id, userSubscription)
    }));
  }, [userSubscription, category]);
}

/**
 * Hook to get feature categories with their features and access status
 */
export function useFeatureCategories(
  userSubscription: UserSubscription | null
): Array<{
  category: string;
  features: Array<Feature & { access: FeatureAccessResult }>;
  hasAnyAccess: boolean;
}> {
  return useMemo(() => {
    return Object.values(FEATURE_CATEGORIES).map(category => {
      const categoryFeatures = getFeaturesByCategory(category).map(feature => ({
        ...feature,
        access: hasFeatureAccess(feature.id, userSubscription)
      }));
      
      const hasAnyAccess = categoryFeatures.some(f => f.access.hasAccess);
      
      return {
        category,
        features: categoryFeatures,
        hasAnyAccess
      };
    });
  }, [userSubscription]);
}

/**
 * Hook to get coming soon features
 */
export function useComingSoonFeatures(): Feature[] {
  return useMemo(() => {
    return getFeaturesByStatus('coming_soon');
  }, []);
}

/**
 * Hook to check if user can access a feature by ID (simple boolean)
 */
export function useCanAccessFeature(
  featureId: string,
  userSubscription: UserSubscription | null
): boolean {
  return useMemo(() => {
    const access = hasFeatureAccess(featureId, userSubscription);
    return access.hasAccess;
  }, [featureId, userSubscription]);
}

/**
 * Hook to get feature upgrade information
 */
export function useFeatureUpgradeInfo(
  featureId: string,
  userSubscription: UserSubscription | null
): {
  needsUpgrade: boolean;
  requiredTier?: string;
  upgradeUrl?: string;
} {
  return useMemo(() => {
    const access = hasFeatureAccess(featureId, userSubscription);
    
    if (!access.upgradeRequired) {
      return { needsUpgrade: false };
    }
    
    return {
      needsUpgrade: true,
      requiredTier: access.requiredTier,
      upgradeUrl: access.requiredTier ? `/pricing?plan=${access.requiredTier}` : '/pricing'
    };
  }, [featureId, userSubscription]);
} 