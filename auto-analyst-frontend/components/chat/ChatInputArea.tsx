"use client"

import { useRef } from "react"
import { useSession } from "next-auth/react"
import { useFreeTrialStore } from "@/lib/store/freeTrialStore"
import { useChatState } from "./ChatStateProvider"
import ChatInput from "./ChatInput"

const ChatInputArea = () => {
  const { data: session } = useSession()
  const { hasFreeTrial } = useFreeTrialStore()
  const { isLoading, handleSendMessage, handleFileUpload, handleStopGeneration } = useChatState()
  const chatInputRef = useRef<{ 
    handlePreviewDefaultDataset: () => void; 
    handleSilentDefaultDataset: () => void; 
  }>(null)
  const isAdmin = localStorage.getItem('isAdmin') === 'true'
  
  const isInputDisabled = () => {
    if (session) return false // Allow input if user is signed in
    return !hasFreeTrial() // Only check free trial if not signed in
  }
  
  return (
    <ChatInput 
      ref={chatInputRef}
      onSendMessage={handleSendMessage}
      onFileUpload={handleFileUpload}
      disabled={isInputDisabled()}
      isLoading={isLoading}
      onStopGeneration={handleStopGeneration}
    />
  )
}

export default ChatInputArea 