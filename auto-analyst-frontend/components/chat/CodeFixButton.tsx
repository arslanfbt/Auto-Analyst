"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { WrenchIcon, CreditCard, Lock } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import axios from "axios"
import API_URL from '@/config/api'
import { useSession } from "next-auth/react"
import { useCredits } from '@/lib/contexts/credit-context'
import { motion } from "framer-motion"
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'

interface CodeFixButtonProps {
  codeId: string
  errorOutput: string
  code: string 
  isFixing: boolean
  codeFixes: Record<string, number>
  sessionId?: string
  onFixStart: (codeId: string) => void
  onFixComplete: (codeId: string, fixedCode: string) => void
  onCreditCheck: (codeId: string, hasEnough: boolean) => void
  className?: string
  variant?: 'inline' | 'button' // 'inline' for output blocks, 'button' for code canvas
}

const CodeFixButton: React.FC<CodeFixButtonProps> = ({ 
  codeId, 
  errorOutput, 
  code,
  isFixing,
  codeFixes,
  sessionId,
  onFixStart,
  onFixComplete,
  onCreditCheck,
  className = '',
  variant = 'button'
}) => {
  const { toast } = useToast()
  const { data: session } = useSession()
  const { hasEnoughCredits, checkCredits } = useCredits()
  const [hovered, setHovered] = useState(false)
  const { subscription } = useUserSubscriptionStore()
  const featureAccess = useFeatureAccess('AI_CODE_FIX', subscription)
  
  // Get the number of fixes for this code entry
  const fixCount = codeFixes[codeId] || 0
  const isFreeFix = fixCount < 3

  const handleFixCode = async () => {
    // Check if user has access to the feature
    if (!featureAccess.hasAccess) {
      toast({
        title: "Premium Feature",
        description: `AI Code Fix requires a ${featureAccess.requiredTier} subscription.`,
        variant: "destructive",
        duration: 5000,
      })
      return
    }
    
    // Check if the error output exists
    if (!errorOutput) return
    
    // Mark as fixing in parent component
    onFixStart(codeId)
    
    // Track number of fixes and check credits if needed
    const newFixCount = fixCount + 1
    const needsCredits = newFixCount > 3
    
    // Show notification after 3rd fix
    if (newFixCount === 4) {
      toast({
        title: "Free fix limit reached",
        description: "You've used your 3 free code fixes. Additional fixes will use 1 credit each.",
        duration: 5000,
      })
    }
    
    // Check if user has credits for AI fix (only if beyond free limit)
    if (needsCredits && session) {
      try {
        const creditCost = 1
        const hasEnough = await hasEnoughCredits(creditCost)
        
        if (!hasEnough) {
          // Notify parent component that user doesn't have enough credits
          onCreditCheck(codeId, false)
          return
        } else {
          // User has enough credits, continue with fix
          onCreditCheck(codeId, true)
        }
      } catch (error) {
        console.error("Error checking credits:", error)
        return
      }
    }
    
    try {
      toast({
        title: "Fixing code",
        description: "AI is attempting to fix the errors...",
        duration: 3000,
      })
      
      // Send fix request to backend
      const response = await axios.post(`${API_URL}/code/fix`, {
        code: code,
        error: errorOutput,
        session_id: sessionId,
      }, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      })

      if (response.data && response.data.fixed_code) {
        const fixedCode = response.data.fixed_code
        
        // Deduct credits if this was not a free fix and user is logged in
        if (needsCredits && session?.user) {
          try {
            // Determine user ID for credit deduction
            let userIdForCredits = '';
            
            if ((session.user as any).sub) {
              userIdForCredits = (session.user as any).sub;
            } else if ((session.user as any).id) {
              userIdForCredits = (session.user as any).id;
            } else if (session.user.email) {
              userIdForCredits = session.user.email;
            }
            
            if (userIdForCredits) {
              // Deduct 1 credit for AI code fix
              await axios.post('/api/user/deduct-credits', {
                userId: userIdForCredits,
                credits: 1,
                description: 'Used AI to fix code error'
              });
              
              // Refresh credits display
              if (checkCredits) {
                await checkCredits();
              }
              
              toast({
                title: "Credit used",
                description: "1 credit has been deducted for this code fix",
                duration: 3000,
              });
            }
          } catch (creditError) {
            console.error("Failed to deduct credits for code fix:", creditError);
            // Don't stop the process if credit deduction fails
          }
        }
        
        // Notify parent component that fix is complete
        try {
          onFixComplete(codeId, fixedCode)
        } catch (completionError) {
          console.error("Error in onFixComplete callback:", completionError);
          // Don't show an error toast for this, as the fix itself was successful
        }
        
        toast({
          title: "Code fixed",
          description: "AI has fixed your code. Run it to see if the fix works.",
          variant: "default",
          duration: 3000,
        })
        
        // Exit successfully
        return
        
      } else if (response.data && response.data.error) {
        toast({
          title: "Error fixing code",
          description: response.data.error,
          variant: "destructive",
          duration: 5000,
        })
        return
      } else {
        // No fixed code or error in response
        toast({
          title: "Error fixing code", 
          description: "No fixed code received from the server.",
          variant: "destructive",
          duration: 5000,
        })
        return
      }
    } catch (error) {
      console.error("Error fixing code with AI:", error)
      toast({
        title: "Network error",
        description: "Failed to connect to the server. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  // If user doesn't have access to the feature, show lock icon instead of wrench
  if (!featureAccess.hasAccess) {
    // Default 'button' variant with lock icon
    if (variant === 'button') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`flex items-center ${className}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    toast({
                      title: "Premium Feature",
                      description: `AI Code Fix requires a ${featureAccess.requiredTier} subscription.`,
                      duration: 5000,
                    });
                  }}
                  className="text-gray-500 hover:bg-gray-100 relative"
                >
                  <Lock className="h-4 w-4" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="px-3 py-1.5">
              <div className="space-y-1">
                <p className="text-sm font-medium">AI Code Fix</p>
                <p className="text-xs text-gray-500">
                  Requires {featureAccess.requiredTier} subscription
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    // Inline variant with lock icon for error outputs
    return (
      <div className={`inline-flex items-center absolute top-3 right-3 ${className}`}
           onMouseEnter={() => setHovered(true)}
           onMouseLeave={() => setHovered(false)}>
        <motion.div
          initial={{ width: "auto" }}
          animate={{ 
            width: hovered ? "auto" : "auto",
            backgroundColor: hovered ? "rgba(243, 244, 246, 0.5)" : "transparent"
          }}
          transition={{ duration: 0.2 }}
          className="rounded-md overflow-hidden flex items-center justify-end px-1 cursor-pointer"
          onClick={() => {
            toast({
              title: "Premium Feature",
              description: `AI Code Fix requires a ${featureAccess.requiredTier} subscription.`,
              duration: 5000,
            });
          }}
        >
          <motion.span 
            initial={{ opacity: 0, width: 0 }}
            animate={{ 
              opacity: hovered ? 1 : 0,
              width: hovered ? "auto" : 0,
              marginRight: hovered ? "4px" : 0
            }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium whitespace-nowrap text-gray-600 overflow-hidden"
          >
            Premium Feature
          </motion.span>
          
          <div className="flex items-center">
            <div className="h-6 w-6 p-0 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200">
              <Lock className="h-3 w-3 text-gray-500" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render different button styles based on variant
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center absolute top-3 right-3 ${className}`}
           onMouseEnter={() => setHovered(true)}
           onMouseLeave={() => setHovered(false)}>
        <motion.div
          initial={{ width: "auto" }}
          animate={{ 
            width: hovered ? "auto" : "auto",
            backgroundColor: hovered ? "rgba(254, 226, 226, 0.5)" : "transparent"
          }}
          transition={{ duration: 0.2 }}
          className="rounded-md overflow-hidden flex items-center justify-end px-1 cursor-pointer"
          onClick={handleFixCode}
        >
          <motion.span 
            initial={{ opacity: 0, width: 0 }}
            animate={{ 
              opacity: hovered ? 1 : 0,
              width: hovered ? "auto" : 0,
              marginRight: hovered ? "4px" : 0
            }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium whitespace-nowrap text-red-500 overflow-hidden"
          >
            {isFreeFix ? `Fix error with AI (${3 - fixCount} free left)` : "Fix error with AI (1 credit)"}
          </motion.span>
          
          <div className="flex items-center">
            <div className="h-6 w-6 p-0 flex items-center justify-center rounded-full bg-red-50 border border-red-200">
              {isFixing ? (
                <svg className="animate-spin h-3 w-3 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <WrenchIcon className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // Default 'button' variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center ${className}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFixCode}
              className="text-[#FF7F7F] hover:bg-[#FF7F7F]/20 relative"
            >
              {isFixing ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <WrenchIcon className="h-4 w-4" />
                  {isFreeFix && (
                    <div className="absolute -top-1 -right-1 flex items-center justify-center">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold shadow-sm">
                        {3 - fixCount}
                      </div>
                    </div>
                  )}
                  {!isFreeFix && (
                    <div className="absolute -top-1 -right-1 flex items-center justify-center">
                      <div className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold shadow-sm flex items-center">
                        <CreditCard className="h-2 w-2 mr-0.5" />1
                      </div>
                    </div>
                  )}
                </>
              )}
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="px-3 py-1.5">
          {isFreeFix ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Fix code error</p>
              <p className="text-xs text-gray-500">
                {3 - fixCount} free {3 - fixCount === 1 ? 'fix' : 'fixes'} remaining
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium">Fix code error</p>
              <p className="text-xs text-amber-500 flex items-center">
                <CreditCard className="h-3 w-3 mr-1" /> Uses 1 credit per fix
              </p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CodeFixButton; 