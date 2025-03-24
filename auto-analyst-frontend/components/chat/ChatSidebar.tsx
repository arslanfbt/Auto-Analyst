"use client"

import { useChatState } from "./ChatStateProvider"
import Sidebar from "./Sidebar"

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
}

const ChatSidebar = ({ isOpen, onClose }: ChatSidebarProps) => {
  const { 
    chatHistories, 
    activeChatId, 
    isLoadingHistory, 
    loadChat,
    handleNewChat,
    handleChatDelete
  } = useChatState()
  
  return (
    <Sidebar 
      isOpen={isOpen} 
      onClose={onClose} 
      onNewChat={handleNewChat}
      chatHistories={chatHistories}
      activeChatId={activeChatId}
      onChatSelect={loadChat}
      isLoading={isLoadingHistory}
      onDeleteChat={handleChatDelete}
    />
  )
}

export default ChatSidebar 