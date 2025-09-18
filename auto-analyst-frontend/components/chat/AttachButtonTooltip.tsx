"use client"

import React, { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { Paperclip } from "lucide-react"

interface AttachButtonTooltipProps {
  onClick: () => void
  disabled?: boolean  // Make it optional
  sessionId?: string | null
}

export default function AttachButtonTooltip({ 
  onClick, 
  disabled = false,  // Default to false
  sessionId 
}: AttachButtonTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Check if tooltip should be shown (once per login session)
  useEffect(() => {
    if (sessionId) {
      const tooltipKey = `attach_tooltip_shown_${sessionId}`
      const hasShownTooltip = localStorage.getItem(tooltipKey)
      
      if (!hasShownTooltip) {
        // Show tooltip after a short delay
        const timer = setTimeout(() => {
          setShowTooltip(true)
          // Mark as shown for this session
          localStorage.setItem(tooltipKey, 'true')
          // Hide tooltip after 4 seconds
          setTimeout(() => {
            setShowTooltip(false)
          }, 4000)
        }, 1000) // 1 second delay after component mounts
        
        return () => clearTimeout(timer)
      }
    }
  }, [sessionId])

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className="text-gray-500 hover:text-[#FF7F7F] hover:bg-[#FF7F7F]/10 transition-colors duration-200 p-2.5 rounded-xl flex-shrink-0 self-center"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="bg-[#FF7F7F] text-white text-sm px-4 py-3 border-2 border-[#FF6666] shadow-lg max-w-xs"
        >
          <div className="text-center text-white">
            <p className="font-medium text-white">Upload Your Data</p>
            <p className="text-xs opacity-90 mt-1 text-white">CSV or Excel files for analysis</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
