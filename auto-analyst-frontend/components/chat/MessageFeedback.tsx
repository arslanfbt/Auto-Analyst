"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import axios from "axios"
import API_URL from '@/config/api'
import { useSessionStore } from '@/lib/store/sessionStore'
import { useSession } from "next-auth/react"
import logger from '@/lib/utils/logger'

interface MessageFeedbackProps {
  messageId: number
  chatId: number
}

interface ModelSettings {
  model_name: string;
  model_provider: string;
  temperature: number;
  max_tokens: number;
}

const MessageFeedback = ({ messageId, chatId }: MessageFeedbackProps) => {
  const [rating, setRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [existingFeedback, setExistingFeedback] = useState<any>(null)
  const { data: session } = useSession()
  const { sessionId } = useSessionStore()
  const [modelSettings, setModelSettings] = useState<ModelSettings | null>(null)

  // Add debug logging
  useEffect(() => {
    console.log(`MessageFeedback component mounted with messageId: ${messageId}, chatId: ${chatId}`)
  }, [messageId, chatId])

  // Fetch existing feedback on mount
  useEffect(() => {
    const fetchExistingFeedback = async () => {
      try {
        console.log(`Fetching feedback from ${API_URL}/feedback/message/${messageId}`)
        const response = await axios.get(`${API_URL}/feedback/message/${messageId}`)
        if (response.data) {
          console.log("Received existing feedback:", response.data)
          setExistingFeedback(response.data)
          setRating(response.data.rating)
        }
      } catch (error) {
        // This is expected if no feedback exists yet
        if (axios.isAxiosError(error) && error.response?.status !== 404) {
          console.error("Error fetching feedback:", error)
        } else {
          console.log("No existing feedback found (404 is expected)")
        }
      }
    }

    if (messageId) {
      fetchExistingFeedback()
    } else {
      console.warn("No messageId provided, skipping feedback fetch")
    }
  }, [messageId])

  // Get model settings from localStorage
  useEffect(() => {
    try {
      const userModelSettingsStr = localStorage.getItem('userModelSettings')
      
      if (userModelSettingsStr) {
        const userSettings = JSON.parse(userModelSettingsStr)
        
        const settings: ModelSettings = {
          model_name: userSettings.model || process.env.DEFAULT_PUBLIC_MODEL || 'gpt-4',
          model_provider: userSettings.provider || process.env.DEFAULT_MODEL_PROVIDER || 'openai',
          temperature: userSettings.temperature ?? 0.7,
          max_tokens: userSettings.maxTokens ?? 6000
        }
        
        setModelSettings(settings)
      } else {
        // Fallback to environment defaults
        const settings: ModelSettings = {
          model_name: process.env.DEFAULT_PUBLIC_MODEL || 'gpt-4',
          model_provider: process.env.DEFAULT_MODEL_PROVIDER || 'openai',
          temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7'),
          max_tokens: parseInt(process.env.PUBLIC_DEFAULT_MAX_TOKENS || '6000')
        }
        
        setModelSettings(settings)
      }
    } catch (error) {
      console.error("Error getting model settings from localStorage:", error)
    }
  }, [])

  const handleRatingClick = async (selectedRating: number) => {
    setIsSubmitting(true)
    setRating(selectedRating)
    console.log(`Submitting rating ${selectedRating} for message ${messageId}`)

    try {
      console.log(`POST to ${API_URL}/feedback/message/${messageId}`, {
        message_id: messageId,
        rating: selectedRating,
        model_name: modelSettings?.model_name,
        model_provider: modelSettings?.model_provider,
        temperature: modelSettings?.temperature,
        max_tokens: modelSettings?.max_tokens
      })
      
      const response = await axios.post(`${API_URL}/feedback/message/${messageId}`, {
        message_id: messageId,
        rating: selectedRating,
        model_name: modelSettings?.model_name,
        model_provider: modelSettings?.model_provider,
        temperature: modelSettings?.temperature,
        max_tokens: modelSettings?.max_tokens
      })
      
      console.log("Rating submitted successfully:", response.data)

      setShowThankYou(true)
      setTimeout(() => {
        setShowThankYou(false)
      }, 3000)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      setRating(existingFeedback?.rating || null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // If already rated, show the current rating
  if (rating !== null && !showThankYou) {
    return (
      <div className="flex items-center space-x-1 text-sm text-gray-500">
        <span className="mr-1">Your rating:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${
              star <= rating ? "text-[#FF7F7F] fill-[#FF7F7F]" : "text-gray-300"
            } cursor-pointer`}
            onClick={() => handleRatingClick(star)}
          />
        ))}
      </div>
    )
  }

  // Show thank you message after rating
  if (showThankYou) {
    return (
      <div className="text-sm text-green-600 flex items-center">
        <span>Thanks for your feedback!</span>
      </div>
    )
  }

  // Default view - not yet rated
  return (
    <div className="flex items-center space-x-1">
      <span className="text-sm text-gray-500 mr-1">Rate response:</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={`${
            star <= (hoveredRating || 0) ? "text-[#FF7F7F] fill-[#FF7F7F]" : "text-gray-300"
          } cursor-pointer transition-colors`}
          onMouseEnter={() => setHoveredRating(star)}
          onMouseLeave={() => setHoveredRating(null)}
          onClick={() => handleRatingClick(star)}
        />
      ))}
    </div>
  )
}

export default MessageFeedback 