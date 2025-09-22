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
import { useUserTier } from '@/lib/store/userSubscriptionStore'

interface CodeFixButtonProps {
  codeId: string                    // For tracking which code block
  code: string                      // ✅ For the request  
  errorOutput: string               // ✅ For the request
  isFixing: boolean                 // UI state (is this button currently fixing)
  codeFixes: Record<string, number> // Track fix attempts per code block
  sessionId: string                 // ✅ Add this back - required for backend
  onFixStart: (codeId: string) => void           // Callback when fix starts
  onFixComplete: (codeId: string, fixedCode: string) => void  // Callback when fix completes
  onCreditCheck: (codeId: string, hasEnough: boolean) => void // Credit check callback
  className?: string
  variant?: 'default' | 'inline' | 'icon-only'  // ✅ Add 'icon-only'
  checkCredits?: () => Promise<void>
}

const CodeFixButton: React.FC<CodeFixButtonProps> = ({
  codeId,
  code,           // ✅ Used in request
  errorOutput,    // ✅ Used in request  
  isFixing,       // ✅ This comes from props now
  codeFixes,
  sessionId,           // ✅ Get from props (passed by ChatWindow)
  onFixStart,
  onFixComplete,
  onCreditCheck,
  className = "",
  variant = 'default',
  checkCredits
}) => {
  // Remove this line - isFixing comes from props now
  // const [isFixing, setIsFixing] = useState(false) ❌ DELETE THIS
  
  const [hovered, setHovered] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const { toast } = useToast()
  const { data: session } = useSession()
  const { remainingCredits } = useCredits()  // ✅ Change from 'credits' to 'remainingCredits'
  const tier = useUserTier()
  
  // ✅ Fix: Get fix count from props instead of store
  const fixCount = codeFixes[codeId] || 0
  const freeFixLimit = 3
  const needsCredits = fixCount >= freeFixLimit && (!remainingCredits || remainingCredits <= 0)  // ✅ Use remainingCredits

  // Enhanced fix function with retry logic
  const handleFixCode = async (isRetry = false, currentRetryCount = 0) => {
    // Start fixing
    onFixStart?.(codeId)

    // Validation checks - be more lenient with empty strings but ensure we have meaningful content
    if (!code || code.trim().length === 0) {
      toast({
        title: "Missing code",
        description: "No code available to fix. Please ensure code is loaded in the canvas.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    if (!errorOutput || errorOutput.trim().length === 0) {
      toast({
        title: "Missing error information",
        description: "No error message available. Please run the code first to see any errors.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    if (!sessionId) {
      toast({
        title: "Session error",
        description: "No active session. Please refresh the page.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    // Credit check for non-free fixes
    if (needsCredits && !session?.user) {
      toast({
        title: "Login required",
        description: "Please log in to use AI code fixing.",
        variant: "destructive",
        duration: 5000,
      })
      return
    }

    // setIsFixing(true) // This line is removed as isFixing is now a prop
    
    try {
      // Show appropriate toast message
      if (isRetry) {
        toast({
          title: `Retrying fix (${currentRetryCount + 1}/3)`,
          description: "Attempting to fix the code again...",
          duration: 3000,
        })
      } else {
        toast({
          title: "Fixing code",
          description: "AI is attempting to fix the errors...",
          duration: 3000,
        })
      }

      console.log('🔧 Sending fix request:', {
        codeLength: code.length,
        errorLength: errorOutput.length,
        sessionId: sessionId,
        retryCount: currentRetryCount
      })
      
      // Create request with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      // ✅ Simple request with just code + error
      const response = await axios.post(`${API_URL}/code/fix`, {
        code: code.trim(),
        error: errorOutput.trim(),
      }, {
        headers: {
          'X-Session-ID': sessionId,  // ✅ Use prop value
        }
      })

      clearTimeout(timeoutId)

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
                description: "1 credit deducted for AI code fix",
                duration: 3000,
              })
            }
          } catch (creditError) {
            console.warn("Failed to deduct credits:", creditError)
            // Don't block the fix if credit deduction fails
          }
        }

        // Complete fixing
        onFixComplete?.(codeId, fixedCode)
        
        // Reset retry count on success
        setRetryCount(0)
        
        toast({
          title: "Code fixed successfully!",
          description: "The AI has provided a potential fix for your code.",
          duration: 5000,
        })
        
      } else if (response.data && response.data.error) {
        // Server returned an error
        toast({
          title: "Error fixing code",
          description: response.data.error,
          variant: "destructive", 
          duration: 5000,
        })
      } else {
        // No fixed code or error in response
        toast({
          title: "Error fixing code", 
          description: "No fixed code received from the server.",
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error("Error fixing code with AI:", error)
      
      // Handle different types of errors
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.name === 'AbortError') {
          // Timeout error
          if (currentRetryCount < 2) {
            toast({
              title: "Request timeout",
              description: `Request timed out. Retrying in 2 seconds... (${currentRetryCount + 1}/3)`,
              duration: 3000,
            })
            
            setTimeout(() => {
              handleFixCode(true, currentRetryCount + 1)
            }, 2000)
            return
          } else {
            toast({
              title: "Request timeout",
              description: "Request timed out after 3 attempts. Please try again later.",
              variant: "destructive",
              duration: 5000,
            })
          }
        } else if (error.response && error.response.status === 400 && error.response?.data?.detail === "Session ID required") {
          // Session ID error - retry once
          if (currentRetryCount < 1) {
            toast({
              title: "Session expired",
              description: "Retrying with fresh session...",
              duration: 3000,
            })
            
            setTimeout(() => {
              handleFixCode(true, currentRetryCount + 1)
            }, 1000)
            return
          } else {
            toast({
              title: "Session error",
              description: "Session expired. Please refresh the page.",
              variant: "destructive",
              duration: 5000,
            })
          }
        } else if (error.response && error.response.status >= 500) {
          // Server error - retry
          if (currentRetryCount < 2) {
            toast({
              title: "Server error",
              description: `Server error occurred. Retrying in 3 seconds... (${currentRetryCount + 1}/3)`,
              duration: 3000,
            })
            
            setTimeout(() => {
              handleFixCode(true, currentRetryCount + 1)
            }, 3000)
            return
          } else {
            toast({
              title: "Server error",
              description: "Server error after 3 attempts. Please try again later.",
              variant: "destructive",
              duration: 5000,
            })
          }
        } else if (error.response && error.response.status === 400) {
          // Bad request - don't retry, show specific error
          const errorMessage = error.response?.data?.detail || "Invalid request. Please check your code and error message."
          toast({
            title: "Request error",
            description: errorMessage,
            variant: "destructive",
            duration: 5000,
          })
        } else {
          // Network error - retry
          if (currentRetryCount < 2) {
            toast({
              title: "Network error",
              description: `Connection failed. Retrying in 2 seconds... (${currentRetryCount + 1}/3)`,
              duration: 3000,
            })
            
            setTimeout(() => {
              handleFixCode(true, currentRetryCount + 1)
            }, 2000)
            return
          } else {
            toast({
              title: "Network error",
              description: "Failed to connect after 3 attempts. Please check your connection.",
              variant: "destructive",
              duration: 5000,
            })
          }
        }
      } else {
        // Unknown error
        toast({
          title: "Unexpected error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
          duration: 5000,
        })
      }
      
      setRetryCount(currentRetryCount)
    } finally {
      // setIsFixing(false) // This line is removed as isFixing is now a prop
    }
  }

  // Render different button styles based on variant
  if (variant === 'inline') {
    const remainingFixes = Math.max(0, freeFixLimit - fixCount)
    
    return (
      <div className={`inline-flex items-center absolute top-3 right-3 ${className}`}
           onMouseEnter={() => setHovered(true)}
           onMouseLeave={() => setHovered(false)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ width: "auto" }}
                animate={{ 
                  width: hovered ? "auto" : "auto",
                  backgroundColor: hovered ? "rgba(254, 226, 226, 0.5)" : "transparent"
                }}
                transition={{ duration: 0.2 }}
                className="rounded-md overflow-hidden flex items-center justify-end px-1 cursor-pointer"
                onClick={() => handleFixCode()}
              >
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
                  <span className="ml-2 text-xs font-semibold text-red-600">Fix Code</span>
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-[#FF7F7F] text-white text-xs px-3 py-2 border-2 border-[#FF6666] shadow-lg">
              <div className="text-center">
                <p className="font-medium">Fix Error with AI</p>
                <p className="opacity-90">Click to open code canvas and auto-fix the error.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  if (variant === 'icon-only') {
    const remainingFixes = Math.max(0, freeFixLimit - fixCount)
    
    return (
      <div className={`inline-flex items-center absolute top-3 right-3 ${className}`}
           onMouseEnter={() => setHovered(true)}
           onMouseLeave={() => setHovered(false)}>
        <motion.div
          initial={{ width: "auto" }}
          animate={{ 
            backgroundColor: hovered ? "rgba(254, 226, 226, 0.5)" : "transparent"
          }}
          transition={{ duration: 0.2 }}
          className="rounded-md overflow-hidden flex items-center justify-end px-1 cursor-pointer"
          onClick={() => handleFixCode()}
        >
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
  const remainingFixes = Math.max(0, freeFixLimit - fixCount)
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center ${className}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFixCode()}
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
                  <span className="ml-2 text-sm font-semibold">Fix Code</span>
                  {remainingFixes > 0 && (
                    <div className="absolute -top-1 -right-1 flex items-center justify-center">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold shadow-sm">
                        {remainingFixes}
                      </div>
                    </div>
                  )}
                  {needsCredits && (
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
          {remainingFixes > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Fix & auto-run code</p>
              <p className="text-xs text-gray-500">
                {remainingFixes} free {remainingFixes === 1 ? 'fix' : 'fixes'} remaining
                {tier === 'free' && (
                  <span className="block text-blue-500 mt-1">
                    Upgrade for 3 free fixes per code
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium">Fix & auto-run code</p>
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