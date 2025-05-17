'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useCredits } from '@/lib/contexts/credit-context'
import { useEffect, useCallback } from 'react'
import logger from '@/lib/utils/logger'
interface InsufficientCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  requiredCredits: number
}

export default function InsufficientCreditsModal({ 
  isOpen, 
  onClose, 
  requiredCredits 
}: InsufficientCreditsModalProps) {
  // Get the credit context to manage the blocked state
  const { checkCredits, remainingCredits, hasEnoughCredits } = useCredits()
  
  // Force ensure chat is blocked when modal opens
  useEffect(() => {
    if (isOpen) {
      // logger.log("[Credits Modal] Modal opened - checking credits and ensuring chat is blocked");
      
      // Check if we have sufficient credits (this will set isChatBlocked=true if not enough)
      const checkCreditBalance = async () => {
        // Force a credit check to get latest data
        await checkCredits();
        
        // Double check against required amount and block if insufficient
        // This will set isChatBlocked to true in the context
        await hasEnoughCredits(requiredCredits);
      };
      
      checkCreditBalance();
    }
  }, [isOpen, checkCredits, hasEnoughCredits, requiredCredits]);
  
  // Create a custom close handler to maintain the blocked state
  const handleClose = useCallback(() => {
    // logger.log("[Credits Modal] Modal closing - ensuring chat remains blocked");
    
    // Force another credit check when closing to ensure block state persists
    // This should happen after the modal closes to avoid UI glitches
    const maintainBlockedState = async () => {
      // Call the parent's onClose handler
      onClose();
      
      // Small delay to let the UI update first
      setTimeout(async () => {
        // Force a fresh credit check which should reflect insufficient credits
        await checkCredits();
        
        // Double check the required amount to ensure block state is applied
        await hasEnoughCredits(requiredCredits);
      }, 100);
    };
    
    maintainBlockedState();
  }, [onClose, checkCredits, hasEnoughCredits, requiredCredits]);

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md border-gray-200 bg-white">
        <DialogHeader className="flex flex-col items-center">
          <AlertTriangle className="h-12 w-12 text-[#FF7F7F] mb-4" />
          <DialogTitle className="text-center text-xl text-[#FF7F7F] font-semibold">
            Insufficient Credits
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-center text-gray-700 mb-2">
            You don't have enough credits to perform this action.
          </p>
          <p className="text-center text-gray-700 mb-4">
            This operation requires <span className="font-bold text-[#FF7F7F]">{requiredCredits} credits</span>.
          </p>
          <p className="text-center text-gray-700 mb-4">
            Your current balance: <span className="font-bold">{remainingCredits} credits</span>
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
            <h3 className="font-medium mb-2 text-gray-800">Options:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2 text-gray-700">
                <span className="text-[#FF7F7F]">•</span>
                <span>Try a lower-tier model to use fewer credits</span>
              </li>
              <li className="flex gap-2 text-gray-700">
                <span className="text-[#FF7F7F]">•</span>
                <span>Wait for your credits to reset next month</span>
              </li>
              <li className="flex gap-2 text-gray-700">
                <span className="text-[#FF7F7F]">•</span>
                <span>Contact support for enterprise solutions</span>
              </li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="sm:flex-1 bg-white border-[#FF7F7F] text-[#FF7F7F] hover:bg-[#FFE5E5] hover:text-[#FF6666]"
          >
            Close
          </Button>
          <Link href="/pricing" className="sm:flex-1" onClick={handleClose}>
            <Button 
              variant="default"
              className="w-full bg-[#FF7F7F] hover:bg-[#FF6666] text-white transition-colors"
            >
              Upgrade
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 