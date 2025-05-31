import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

const loadingStates = [
  {
    message: "Analyzing request...",
    progress: 15,
  },
  {
    message: "Processing data...",
    progress: 30,
  },
  {
    message: "Generating insights...",
    progress: 45,
  },
  {
    message: "Refining analysis...",
    progress: 60,
  },
  {
    message: "Creating visualization...",
    progress: 75,
  },
  {
    message: "Finalizing results...",
    progress: 85,
  },
  {
    message: "Almost there...",
    progress: 95,
  },
]

const LoadingIndicator: React.FC = () => {
  const [loadingStep, setLoadingStep] = useState(0)

  useEffect(() => {
    if (loadingStep < loadingStates.length - 1) {
      // Longer delay for "Generating insights" state
      const delay = loadingStep === 2 ? 5000 : 3000
      const timer = setTimeout(() => {
        setLoadingStep((prev) => prev + 1)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [loadingStep])

  return (
    <div className="flex flex-col items-center space-y-4 p-4 bg-gray-100 rounded-lg">
      <div className="flex items-center h-8 w-full min-w-[250px]">
        <Loader2 className="w-6 h-6 text-[#FF7F7F] animate-spin mr-3" />
        <div className="relative h-6 flex-1 overflow-hidden">
          <motion.span
            key={loadingStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
            className="absolute inset-0 text-gray-700 font-medium whitespace-nowrap"
          >
            {loadingStates[loadingStep].message}
          </motion.span>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div
          className="bg-[#FF7F7F] h-full rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${loadingStates[loadingStep].progress}%` }}
          transition={{
            duration: 1.5,
            ease: [0.4, 0.0, 0.2, 1],
          }}
        />
      </div>
    </div>
  )
}

export default React.memo(LoadingIndicator)

