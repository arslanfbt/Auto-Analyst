"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import Sidebar from "./Sidebar"
import { useChatHistoryStore } from "@/lib/store/chatHistoryStore"

interface ResponsiveLayoutProps {
  children: React.ReactNode
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { clearMessages } = useChatHistoryStore()

  const handleNewChat = () => {
    clearMessages()
    setSidebarOpen(false)
  }

  const handleChatSelect = (chatId: number) => {
    console.log("Chat selected:", chatId)
    setSidebarOpen(false)
  }

  const handleDeleteChat = (chatId: number) => {
    console.log("Delete chat:", chatId)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        chatHistories={[]}
        activeChatId={null}
        onChatSelect={handleChatSelect}
        isLoading={false}
        onDeleteChat={handleDeleteChat}
      />
      <motion.div
        className="flex-1 flex flex-col"
        animate={{
          marginLeft: sidebarOpen ? "16rem" : "0",
          transition: { duration: 0.3 },
        }}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { setSidebarOpen } as any)
          }
          return child
        })}
      </motion.div>
    </div>
  )
}

export default ResponsiveLayout

