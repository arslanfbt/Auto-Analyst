'use client'

import React, { useState } from 'react'
import { useCredits } from '@/lib/contexts/credit-context'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import Link from 'next/link'
import { ChevronUp, CreditCard } from 'lucide-react'

const CreditBalance = () => {
  const { remainingCredits } = useCredits()
  const [isHovering, setIsHovering] = useState(false)
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Link 
            href="/pricing" 
            className={`flex items-center gap-1 p-1 rounded-md transition-all duration-200 ${
              isHovering ? 'bg-[#FF7F7F]/10 text-[#FF7F7F]' : 'bg-gray-100 text-gray-700'
            }`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <span className={`flex items-center px-2 py-1 rounded-md text-sm ${
              isHovering ? 'font-medium' : ''
            }`}>
              <span>{remainingCredits.toLocaleString()}</span>
              <span className="ml-1">tokens</span>
            </span>
            
            {isHovering ? (
              <span className="flex items-center text-[#FF7F7F] pr-1">
                <ChevronUp className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">Upgrade</span>
              </span>
            ) : (
              <CreditCard className="h-3.5 w-3.5 mr-1 opacity-70" />
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm font-medium">Get more tokens with a plan upgrade</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CreditBalance 