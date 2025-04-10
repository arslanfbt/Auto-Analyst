"use client"

import { useModelSettings } from "@/lib/hooks/useModelSettings"
import SettingsPopup from './SettingsPopup'

interface ChatSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const ChatSettingsModal = ({ isOpen, onClose }: ChatSettingsModalProps) => {
  const { modelSettings, fetchModelSettings } = useModelSettings()
  
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