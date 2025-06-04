"use client"

import React from 'react'
import { Brain, Lock, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { Badge } from '../ui/badge'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { UserSubscription } from '@/lib/features/feature-access'

interface DeepAnalysisButtonProps {
  onClick: () => void
  userProfile: UserSubscription | null
  disabled?: boolean
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  showLabel?: boolean
  className?: string
  isRunning?: boolean
}

export default function DeepAnalysisButton({
  onClick,
  userProfile,
  disabled = false,
  size = 'sm',
  variant = 'outline',
  showLabel = false,
  className = '',
  isRunning = false
}: DeepAnalysisButtonProps) {
  const accessResult = useFeatureAccess('DEEP_ANALYSIS', userProfile)
  const hasAccess = accessResult.hasAccess
  const isDisabled = disabled

  const handleClick = () => {
    if (!isDisabled) {
      onClick()
    }
  }

  const buttonContent = (
    <Button
      onClick={handleClick}
      disabled={isDisabled}
      size={size}
      variant={hasAccess ? variant : 'outline'}
      className={`relative ${className} ${!hasAccess ? 'opacity-60' : ''} ${isRunning ? 'animate-pulse' : ''}`}
    >
      {hasAccess ? (
        <>
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          {showLabel && (
            <span className="ml-2">
              {isRunning ? 'Analyzing...' : 'Deep Analysis'}
            </span>
          )}
          {hasAccess && !isRunning && (
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-[#FF7F7F]" />
          )}
          {isRunning && (
            <span className="ml-1 w-2 h-2 bg-[#FF7F7F] rounded-full animate-pulse"></span>
          )}
        </>
      ) : (
        <>
          <Lock className="w-4 h-4" />
          {showLabel && <span className="ml-2">Deep Analysis</span>}
        </>
      )}
    </Button>
  )

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
                  {isRunning ? 'Deep Analysis Running' : 'Deep Analysis'}
                </div>
                <div className="text-xs text-gray-600">
                  {isRunning 
                    ? 'Analysis in progress - check sidebar for details'
                    : 'Comprehensive multi-step analysis with automated planning'
                  }
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium">Deep Analysis (Premium)</div>
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
  )
} 