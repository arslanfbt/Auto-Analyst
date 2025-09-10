"use client"

import React from "react"
import { Code } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CodeIndicatorProps {
  language: string
  onClick: () => void
}

const CodeIndicator: React.FC<CodeIndicatorProps> = ({ language, onClick }) => {
  return (
    <div className="my-3 bg-gray-50 border border-gray-200 rounded-md w-full overflow-hidden">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center space-x-2 text-gray-600">
          <Code size={16} />
          <span className="text-sm font-medium">_{language} code</span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClick}
          className="text-xs py-1 px-3 h-7 border-gray-300"
        >
          View in canvas
        </Button>
      </div>
    </div>
  )
}

export default CodeIndicator 