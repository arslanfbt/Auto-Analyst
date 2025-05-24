"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "../ui/button"

export default function FreeTrialOverlay() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to get started?
        </h2>
        <p className="text-gray-600 mb-6">
          Sign up now to get your free trial and start analyzing your data with our AI-powered platform.
        </p>
        <div className="space-y-4">
          <Button
            onClick={() => router.push('/login?callbackUrl=/chat')}
            className="w-full bg-[#FF7F7F] text-white hover:bg-[#FF6666]"
          >
            Sign up for Free Trial
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="w-full"
          >
            Learn More
          </Button>
        </div>
      </div>
    </motion.div>
  )
} 