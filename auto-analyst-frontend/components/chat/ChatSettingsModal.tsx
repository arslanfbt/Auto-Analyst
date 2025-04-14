"use client"

import { useEffect } from 'react'
import { useModelSettings } from "@/lib/hooks/useModelSettings"
import SettingsPopup from './SettingsPopup'

interface ChatSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const ChatSettingsModal = ({ isOpen, onClose }: ChatSettingsModalProps) => {
  const { modelSettings, fetchModelSettings } = useModelSettings()
  
  // Fetch latest settings when modal is opened
  useEffect(() => {
    if (isOpen) {
      fetchModelSettings();
    }
  }, [isOpen, fetchModelSettings]);
  
  return (
    <SettingsPopup 
      isOpen={isOpen}
      onClose={onClose}
      initialSettings={modelSettings}
      onSettingsUpdated={() => {
        // Refresh from server
        fetchModelSettings()
      }}
    />
  )
}

export default ChatSettingsModal 