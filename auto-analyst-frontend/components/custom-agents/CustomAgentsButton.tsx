'use client';

import React from 'react';
import { Bot, Lock, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { UserSubscription } from '@/lib/features/feature-access';

interface CustomAgentsButtonProps {
  onClick: () => void;
  userProfile: UserSubscription | null;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  showLabel?: boolean;
  className?: string;
  isCreating?: boolean;
}

export default function CustomAgentsButton({
  onClick,
  userProfile,
  disabled = false,
  size = 'sm',
  variant = 'outline',
  showLabel = false,
  className = '',
  isCreating = false
}: CustomAgentsButtonProps) {
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
      variant={hasAccess ? variant : 'outline'}
      className={`relative ${className} ${!hasAccess ? 'opacity-60' : ''} ${isCreating ? 'animate-pulse' : ''}`}
    >
      {hasAccess ? (
        <>
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          {showLabel && (
            <span className="ml-2">
              {isCreating ? 'Creating...' : 'Custom Agents'}
            </span>
          )}
          {hasAccess && !isCreating && (
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-[#FF7F7F]" />
          )}
          {isCreating && (
            <span className="ml-1 w-2 h-2 bg-[#FF7F7F] rounded-full animate-pulse"></span>
          )}
        </>
      ) : (
        <>
          <Lock className="w-4 h-4" />
          {showLabel && <span className="ml-2">Custom Agents</span>}
        </>
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
                  {isCreating ? 'Custom Agents Creating' : 'Custom Agents'}
                </div>
                <div className="text-xs text-gray-600">
                  {isCreating
                    ? 'Agent creation in progress - check sidebar for details'
                    : 'Create and deploy specialized AI agents for your tasks'}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium">Custom Agents (Premium)</div>
                <div className="text-xs text-gray-600">
                  {accessResult.reason || 'Requires Standard or Enterprise subscription'}
                </div>
                <div className="text-xs text-[#FF7F7F] mt-1">
                  Upgrade to unlock
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 