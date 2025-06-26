'use client'

import React, { useState, useEffect } from 'react'
import { useCredits } from '@/lib/contexts/credit-context'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { ChevronUp, CreditCard, Coins, Infinity as InfinityIcon, RefreshCcw } from 'lucide-react'
import { motion } from 'framer-motion'

const CreditBalance = () => {
  const { remainingCredits, isLoading, checkCredits, creditResetDate } = useCredits()
  const [isHovering, setIsHovering] = useState(false)
  const [daysToReset, setDaysToReset] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Check if credits represent unlimited (Pro plan)
  const isUnlimited = remainingCredits > 999998;
  
  // Format reset date info
  useEffect(() => {
    if (creditResetDate) {
      const resetDate = new Date(creditResetDate);
      const now = new Date();
      const diffTime = resetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysToReset(diffDays > 0 ? diffDays : null);
    }
  }, [creditResetDate]);

  // Enhanced credit refresh detection
  useEffect(() => {
    // Listen for navigation events that might trigger credit refresh
    const handleCreditRefresh = () => {
      setIsRefreshing(true)
      setTimeout(() => setIsRefreshing(false), 2000) // Show refreshing for 2 seconds
    }

    window.addEventListener('creditsUpdated', handleCreditRefresh)
    
    return () => {
      window.removeEventListener('creditsUpdated', handleCreditRefresh)
    }
  }, [])
  
  // Display for credits
  const creditsDisplay = isUnlimited ? (
    <div className="flex items-center">
      <InfinityIcon className="h-4 w-4 mr-1" /> 
      <span>Unlimited</span>
    </div>
  ) : remainingCredits;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Link 
            href="/pricing" 
            className={`flex items-center gap-1 p-1 rounded-md transition-all duration-200 overflow-hidden ${
              isHovering ? 'bg-[#FF7F7F]/10 text-[#FF7F7F]' : 'bg-gray-100 text-gray-700'
            }`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <motion.div
              className="flex items-center"
              initial={{ width: 'auto' }}
              animate={{ 
                width: isHovering ? 'auto' : 'auto',
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <motion.span 
                className={`flex items-center px-2 py-1 rounded-md text-sm ${
                  isHovering ? 'font-medium' : ''
                }`}
                animate={{ 
                  x: isHovering ? 0 : 0,
                  scale: isHovering ? 1.05 : 1
                }}
                transition={{ duration: 0.2 }}
              >
                <Coins className="h-4 w-4 text-[#FF7F7F]" />
                <span className="ml-1">
                  {isLoading || isRefreshing ? (
                    <span className="flex items-center">
                      <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
                      ...
                    </span>
                  ) : creditsDisplay}
                </span>
                {!isUnlimited && daysToReset && daysToReset <= 7 && (
                  <span className="ml-1 text-xs text-gray-500 flex items-center">
                    <RefreshCcw className="h-3 w-3 mr-0.5" />
                    {daysToReset}d
                  </span>
                )}
              </motion.span>
            </motion.div>
            
            <motion.div
              className="flex items-center overflow-hidden"
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: isHovering ? 'auto' : 0,
                opacity: isHovering ? 1 : 0
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <motion.span 
                className="flex items-center text-[#FF7F7F] pr-1 whitespace-nowrap"
              >
                <ChevronUp className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">Upgrade</span>
              </motion.span>
            </motion.div>
            
            {!isHovering && (
              <motion.span
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1 opacity-70" />
              </motion.span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[#FF7F7F] text-white">
          <p className="text-sm font-medium">
            {isUnlimited 
              ? "You have unlimited credits with your Pro plan"
              : daysToReset && daysToReset <= 7
                ? `Credits refresh in ${daysToReset} days. Upgrade for more.`
                : "Get more credits with a plan upgrade"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CreditBalance 