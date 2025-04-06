'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
            onClick={onClose}
            className="sm:flex-1 bg-white border-[#FF7F7F] text-[#FF7F7F] hover:bg-[#FFE5E5] hover:text-[#FF6666]"
          >
            Close
          </Button>
          <Link href="/pricing" className="sm:flex-1">
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