"use client"

import { useEffect } from "react"
import { useChatHistoryStore } from "@/lib/store/chatHistoryStore"
import { useChatState } from "./ChatStateProvider"
import ChatWindow from "./ChatWindow"

const ChatMessageArea = () => {
  const { messages } = useChatHistoryStore()
  const { isLoading, showWelcome, handleSendMessage } = useChatState()
  
  return (
    <ChatWindow 
      messages={messages}
      isLoading={isLoading}
      onSendMessage={handleSendMessage}
      showWelcome={showWelcome}
    />
  )
}

export default ChatMessageArea 