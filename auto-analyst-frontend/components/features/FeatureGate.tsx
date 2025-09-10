/**
 * Feature Gate Component
 * Conditionally renders content based on feature access
 */

'use client';

import React from 'react';
import { Lock, Crown, Clock } from 'lucide-react';
import Link from 'next/link';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getFeature } from '@/lib/features/feature-access';

interface FeatureGateProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  className?: string;
}

export default function FeatureGate({ 
  featureId, 
  children, 
  fallback,
  showUpgradePrompt = true,
  className = ""
}: FeatureGateProps) {
  const userSubscription = useUserSubscriptionStore();
  const access = useFeatureAccess(featureId, userSubscription.subscription);

  // If user has access, render children
  if (access.hasAccess) {
    return <div className={className}>{children}</div>;
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  // Default fallback with upgrade prompt
  if (showUpgradePrompt) {
    return (
      <div className={`p-6 border-2 border-dashed border-gray-300 rounded-lg text-center ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          {access.isComingSoon ? (
            <>
              <Clock className="h-12 w-12 text-orange-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
                <p className="text-gray-600">
                  {access.reason}
                </p>
              </div>
            </>
          ) : access.upgradeRequired ? (
            <>
              {access.requiredTier === 'enterprise' ? (
                <Crown className="h-12 w-12 text-purple-400" />
              ) : (
                <Lock className="h-12 w-12 text-blue-400" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {access.requiredTier === 'enterprise' ? 'Enterprise Feature' : 'Premium Feature'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {access.reason}
                </p>
                <Link href={`/pricing?plan=${access.requiredTier}`}>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    {access.requiredTier === 'enterprise' ? 'Contact Sales' : 'Upgrade Now'}
                  </button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <Lock className="h-12 w-12 text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Feature Unavailable</h3>
                <p className="text-gray-600">
                  {access.reason || 'This feature is not available.'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // No fallback, render nothing
  return null;
}

// Convenience component for inline feature checks
interface InlineFeatureCheckProps {
  featureId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function InlineFeatureCheck({ 
  featureId, 
  children, 
  fallback = null 
}: InlineFeatureCheckProps) {
  const userSubscription = useUserSubscriptionStore();
  const access = useFeatureAccess(featureId, userSubscription.subscription);

  if (access.hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

// Hook-based feature check for use in components
export function useFeatureGate(featureId: string) {
  const userSubscription = useUserSubscriptionStore();
  const access = useFeatureAccess(featureId, userSubscription.subscription);

  return {
    canAccess: access.hasAccess,
    access,
    isComingSoon: access.isComingSoon,
    needsUpgrade: access.upgradeRequired,
    requiredTier: access.requiredTier,
    reason: access.reason,
  };
}

/**
 * PremiumFeatureButton Component
 * Shows a button with a lock icon for premium features and displays upgrade prompt when clicked
 */
export function PremiumFeatureButton({ 
  featureId, 
  buttonText = "Premium Feature", 
  requiredTier,
  icon = <Lock className="h-4 w-4 mr-2" />,
  variant = "default" 
}: { 
  featureId: string; 
  buttonText?: string;
  requiredTier?: string;
  icon?: React.ReactNode;
  variant?: "default" | "ghost" | "outline" | "icon"; 
}) {
  const { subscription } = useUserSubscriptionStore();
  const access = useFeatureAccess(featureId, subscription);
  const { toast } = useToast();
  const feature = getFeature(featureId);
  
  const handleClick = () => {
    toast({
      title: "Premium Feature",
      description: `${feature?.name || featureId} requires a ${requiredTier || access.requiredTier} subscription.`,
      duration: 5000,
    });
  };
  
  if (variant === "icon") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClick}
              className="text-gray-500 hover:bg-gray-100"
            >
              <Lock className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-1">
              <p className="text-sm font-medium">{feature?.name || featureId}</p>
              <p className="text-xs text-gray-500">
                Requires {requiredTier || access.requiredTier} subscription
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <Button
      variant={variant}
      onClick={handleClick}
      className={variant === "default" ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200" : ""}
    >
      {icon}
      {buttonText}
    </Button>
  );
} 