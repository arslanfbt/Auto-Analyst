'use client';

import React from 'react';
import { Library, Lock, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import { UserSubscription } from '@/lib/features/feature-access';

interface TemplatesButtonProps {
  onClick: () => void;
  userProfile: UserSubscription | null;
  disabled?: boolean;
  isLoading?: boolean;
  templateCount?: number;
  enabledCount?: number;
}

export default function TemplatesButton({
  onClick,
  userProfile,
  disabled = false,
  isLoading = false,
  templateCount = 0,
  enabledCount = 0
}: TemplatesButtonProps) {
  const accessResult = useFeatureAccess('CUSTOM_AGENTS', userProfile);
  const hasAccess = accessResult.hasAccess;
  const isDisabled = disabled || isLoading;

  const handleClick = () => {
    if (!isDisabled) {
      onClick();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            disabled={isDisabled}
            size="sm"
            variant="ghost"
            className={`w-full justify-start gap-3 px-3 py-2 h-auto transition-all duration-200 ${
              isLoading ? 'animate-pulse' : ''
            } ${
              hasAccess 
                ? 'hover:bg-[#FF7F7F]/10 hover:text-[#FF7F7F]' 
                : 'hover:bg-gray-100 opacity-75'
            }`}
          >
            <div className="relative">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Library className="w-4 h-4" />
              )}
              {!hasAccess && !isLoading && (
                <Lock className="w-2 h-2 absolute -top-1 -right-1 text-gray-400" />
              )}
              {hasAccess && !isLoading && enabledCount > 0 && (
                <div className="w-2 h-2 absolute -top-1 -right-1 bg-[#FF7F7F] rounded-full"></div>
              )}
            </div>
            
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {isLoading ? 'Loading...' : 'Add Agents'}
                </span>
                {hasAccess && !isLoading && templateCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs h-5 px-2">
                      {enabledCount}/{templateCount}
                    </Badge>
                  </div>
                )}
                {!hasAccess && (
                  <Badge variant="outline" className="text-xs h-5 px-2 border-[#FF7F7F]/40 text-[#FF7F7F] bg-[#FF7F7F]/10">
                    <Lock className="w-2 h-2 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {isLoading
                  ? 'Loading agents...'
                  : hasAccess
                  ? 'Browse and enable AI agents'
                  : 'Professional AI agents'}
              </p>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="text-center">
            {hasAccess ? (
              <div>
                <div className="font-medium">Add Agents</div>
                <div className="text-xs text-gray-600 mt-1">
                  Browse, enable, and manage professional AI agents. 
                  {templateCount > 0 && ` You have ${enabledCount} of ${templateCount} agents enabled.`}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium">Add Agents</div>
                <div className="text-xs text-gray-600 mt-1">
                  Access professional AI agents to enhance your workflow.
                </div>
                <div className="text-xs text-[#FF7F7F] mt-1 font-medium">
                  Upgrade to Premium to unlock
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 