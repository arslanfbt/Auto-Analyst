"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { WrenchIcon, CreditCard, Copy, Check } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/components/ui/use-toast"
import axios from "axios"
import API_URL from '@/config/api'
import { useSession } from "next-auth/react"
import { useCredits } from '@/lib/contexts/credit-context'
import { motion } from "framer-motion"

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
  const { hasEnoughCredits } = useCredits()
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  
  // Get the number of fixes for this code entry
  const fixCount = codeFixes[codeId] || 0
  const isFreeFix = fixCount < 3

  const handleFixCode = async () => {
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
        
        // Notify parent component that fix is complete
        onFixComplete(codeId, fixedCode)
        
        toast({
          title: "Code fixed",
          description: "AI has fixed your code. Run it to see if the fix works.",
          variant: "default",
          duration: 3000,
        })
      } else if (response.data && response.data.error) {
        toast({
          title: "Error fixing code",
          description: response.data.error,
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error("Error fixing code with AI:", error)
      toast({
        title: "Error",
        description: "Failed to fix code. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  const copyToClipboard = async () => {
    try {
      // Format the output as a markdown code block with appropriate syntax
      const formattedOutput = `\`\`\`\n${errorOutput}\n\`\`\``;
      await navigator.clipboard.writeText(formattedOutput);
      
      // Show success indicator
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Output has been copied",
        duration: 2000,
      });
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy output:", error);
      toast({
        title: "Copy failed",
        description: "Could not copy output to clipboard",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Render different button styles based on variant
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 absolute top-3 right-3 ${className}`}>
        {/* Fix Button with hover expansion */}
        <motion.div
          className="rounded-md overflow-hidden flex items-center px-1"
          initial={{ backgroundColor: "transparent" }}
          animate={{ backgroundColor: hovered ? "rgba(254, 226, 226, 0.5)" : "transparent" }}
          transition={{ duration: 0.2 }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
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
            {isFreeFix ? `Fix error (${3 - fixCount} free left)` : "Fix error (1 credit)"}
          </motion.span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFixCode}
            disabled={isFixing}
            className="h-6 w-6 p-0 rounded-full bg-red-50 hover:bg-red-100 border border-red-200"
          >
            {isFixing ? (
              <svg className="animate-spin h-3 w-3 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <WrenchIcon className="h-4 w-4 text-red-500" />
            )}
          </Button>
        </motion.div>
        
        {/* Copy Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-6 w-6 p-0 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200"
        >
          {copied ? (
            <Check className="h-4 w-4 text-blue-500" />
          ) : (
            <Copy className="h-4 w-4 text-blue-500" />
          )}
        </Button>
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
              disabled={isFixing}
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