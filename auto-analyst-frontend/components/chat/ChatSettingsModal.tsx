"use client"

import { useEffect } from "react"
import axios from "axios"
import API_URL from '@/config/api'
import { useSessionStore } from '@/lib/store/sessionStore'
import { useChatState } from "./ChatStateProvider"
import SettingsPopup from './SettingsPopup'

interface ChatSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const ChatSettingsModal = ({ isOpen, onClose }: ChatSettingsModalProps) => {
  const { sessionId } = useSessionStore()
  const { modelSettings, setModelSettings } = useChatState()
  
  // Fetch model settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchModelSettings()
    }
  }, [isOpen])
  
  const fetchModelSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/model-settings`, {
        headers: { 'X-Session-ID': sessionId }
      })
      
      if (response.data) {
        setModelSettings({
          provider: response.data.provider,
          model: response.data.model,
          hasCustomKey: !!response.data.api_key,
          apiKey: response.data.api_key || '',
          temperature: response.data.temperature,
          maxTokens: response.data.maxTokens
        })
        
        console.log(`[Settings] Fetched model settings: ${response.data.model}`)
      }
    } catch (error) {
      console.error('Failed to fetch model settings:', error)
    }
  }
  
  return (
    <SettingsPopup 
      isOpen={isOpen}
      onClose={onClose}
      initialSettings={modelSettings}
      onSettingsUpdated={(updatedSettings) => {
        // Update the local modelSettings state
        setModelSettings(updatedSettings)
        // Also refresh from server
        fetchModelSettings()
      }}
    />
  )
}

export default ChatSettingsModal 