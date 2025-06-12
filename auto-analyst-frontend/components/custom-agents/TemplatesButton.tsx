'use client';

import React from 'react';
import { Bot, Lock, Sparkles, Loader2, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { UserSubscription } from '@/lib/features/feature-access';

interface TemplatesButtonProps {
  onClick: () => void;
  userProfile: UserSubscription | null;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  showLabel?: boolean;
  className?: string;
  isLoading?: boolean;
}

export default function TemplatesButton({
  onClick,
  userProfile,
  disabled = false,
  size = 'sm',
  variant = 'outline',
  showLabel = false,
  className = '',
  isLoading = false
}: TemplatesButtonProps) {
  const accessResult = useFeatureAccess('CUSTOM_AGENTS', userProfile);
  const hasAccess = accessResult.hasAccess;
  const isDisabled = disabled;

  const handleClick = () => {
    if (!isDisabled) {
      onClick();
    }
  };

  const buttonContent = (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      size={size}
      variant={variant}
      className={`relative ${className} ${isLoading ? 'animate-pulse' : ''}`}
    >
      {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
        <Library className="w-4 h-4" />
          )}
          {showLabel && (
            <span className="ml-2">
          {isLoading ? 'Loading...' : 'Agent Templates'}
            </span>
          )}
      {!hasAccess && !isLoading && (
        <Lock className="w-3 h-3 absolute -top-1 -right-1 text-gray-400" />
      )}
      {hasAccess && !isLoading && (
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-[#FF7F7F]" />
          )}
      {isLoading && (
            <span className="ml-1 w-2 h-2 bg-[#FF7F7F] rounded-full animate-pulse"></span>
      )}
    </Button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-flex">
            {buttonContent}
            {!hasAccess && (
              <Badge
                variant="outline"
                className="absolute -top-2 -right-2 text-xs bg-white border-[#FF7F7F] text-[#FF7F7F]"
              >
                Premium
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            {hasAccess ? (
              <div>
                <div className="font-medium">
                  {isLoading ? 'Loading Templates' : 'Agent Templates'}
                </div>
                <div className="text-xs text-gray-600">
                  {isLoading
                    ? 'Loading professional agent templates...'
                    : 'Browse and clone professional AI agent templates'}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium">Agent Templates</div>
                <div className="text-xs text-gray-600">
                  Browse professional templates. Upgrade to clone and use them.
                </div>
                <div className="text-xs text-[#FF7F7F] mt-1">
                  Premium required to clone
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 