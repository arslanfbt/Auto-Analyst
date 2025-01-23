"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import ChatWindow from "./ChatWindow"
import ChatInput from "./ChatInput"
import Sidebar from "./Sidebar"

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "ai" }[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSendMessage = (message: string) => {
    setMessages([...messages, { text: message, sender: "user" }])
    // TODO: Implement API call to get AI response
    setTimeout(() => {
      setMessages((prevMessages) => [...prevMessages, { text: "This is a placeholder AI response.", sender: "ai" }])
    }, 1000)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Auto-Analyst Chat</h1>
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-800 focus:outline-none">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 overflow-hidden"
        >
          <ChatWindow messages={messages} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ChatInput onSendMessage={handleSendMessage} />
        </motion.div>
      </div>
    </div>
  )
}

export default ChatInterface

