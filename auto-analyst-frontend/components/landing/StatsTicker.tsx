"use client"

import { useState, useEffect } from 'react'
import { Users, Sparkles, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface TickerData {
  total_signups: number
  total_tokens: number
  total_requests: number
  last_updated: string
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const startValue = displayValue

    const updateCounter = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      
      // Use easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.floor(startValue + (value - startValue) * easeOut)
      
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(updateCounter)
      }
    }

    requestAnimationFrame(updateCounter)
  }, [value, duration, displayValue])

  return <span>{formatNumber(displayValue)}</span>
}

export default function StatsTicker() {
  const [tickerData, setTickerData] = useState<TickerData>({
    total_signups: 0,
    total_tokens: 0,
    total_requests: 0,
    last_updated: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTickerData = async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/analytics/public/ticker?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch ticker data')
      }
      const data = await response.json()
      // console.log('Ticker data fetched:', data) // Debug log
      setTickerData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching ticker data:', err)
      setError('Unable to load community stats')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchTickerData()

    // Set up auto-refresh every 12 hours
    const interval = setInterval(fetchTickerData, 12 * 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  // Don't render anything if loading or error
  if (isLoading || error) {
    return null
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="bg-gradient-to-br from-white via-[#fff6f6] to-white border border-gray-100 rounded-2xl p-8 mb-8 shadow-sm"
    >
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
        Be part of the data-driven wave
        </h3>
        <p className="text-gray-600">
            Thousands have already joined.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Total Signups */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center group"
        >
          <div className="flex justify-center mb-3">
            <div className="p-4 bg-[#FF7F7F] rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            <AnimatedCounter value={tickerData.total_signups} />
          </div>
          <p className="text-gray-600 font-medium">Data Professionals Trust Us</p>
        </motion.div>

        {/* Total Tokens */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center group"
        >
          <div className="flex justify-center mb-3">
            <div className="p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            <AnimatedCounter value={tickerData.total_tokens} />
          </div>
          <p className="text-gray-600 font-medium">Smart Insights Delivered</p>
        </motion.div>

        {/* Total Requests */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center group"
        >
          <div className="flex justify-center mb-3">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            <AnimatedCounter value={tickerData.total_requests} />
          </div>
          <p className="text-gray-600 font-medium">Data Questions Answered</p>
        </motion.div>
      </div>

      <div className="text-center mt-8">
        <p className="text-lg text-gray-700 mb-4">
          Ready to unlock your data's potential?
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.href = '/login'}
          className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-colors duration-300"
        >
          Start Analyzing
        </motion.button>
      </div>
    </motion.div>
  )
} 