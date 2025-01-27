"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Chat Input Component
const ChatInput: React.FC<{ onSendMessage: (message: string) => void }> = ({ onSendMessage }) => {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message)
      setMessage("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800/20 backdrop-blur-sm p-4">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-700/30 text-white placeholder-gray-400 border-none rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-gray-600"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          className="bg-gray-700 text-gray-200 py-3 px-6 rounded-xl hover:bg-gray-600 transition duration-300 ease-in-out"
        >
          Send
        </motion.button>
      </div>
    </form>
  )
}


export default ChatInput

