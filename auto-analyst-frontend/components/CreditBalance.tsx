'use client'

import { useCredits } from '@/lib/contexts/credit-context'
import { BadgeDollarSign, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function CreditBalance() {
  const { remainingCredits, isLoading, checkCredits } = useCredits()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
            <BadgeDollarSign className="h-4 w-4 text-[#FF7F7F]" />
            <span>{isLoading ? '...' : remainingCredits}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 ml-1 hover:bg-gray-200 rounded-full"
              onClick={() => checkCredits()}
              disabled={isLoading}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>You have {remainingCredits} credits remaining this month</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 