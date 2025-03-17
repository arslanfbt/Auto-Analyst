'use client'

import React, { useState } from 'react'
import { useCredits } from '@/lib/contexts/credit-context'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import Link from 'next/link'
import { ChevronUp, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'

const CreditBalance = () => {
  const { remainingCredits } = useCredits()
  const [isHovering, setIsHovering] = useState(false)
  
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
                <span>{remainingCredits.toLocaleString()}</span>
                <span className="ml-1">tokens</span>
              </motion.span>
            </motion.div>
            
            {isHovering ? (
              <motion.span 
                className="flex items-center text-[#FF7F7F] pr-1"
                initial={{ width: 0, opacity: 0, x: -10 }}
                animate={{ width: 'auto', opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <ChevronUp className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">Upgrade</span>
              </motion.span>
            ) : (
              <motion.span
                initial={{ width: 'auto' }}
                animate={{ width: 'auto' }}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1 opacity-70" />
              </motion.span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[#FF7F7F] text-white">
          <p className="text-sm font-medium">Get more tokens with a plan upgrade</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CreditBalance 