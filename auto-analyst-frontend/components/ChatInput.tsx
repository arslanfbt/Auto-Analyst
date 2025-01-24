"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Send } from "lucide-react"

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
    <form onSubmit={handleSubmit} className="bg-white border-t border-gray-200 p-4">
      <div className="flex items-center space-x-2 max-w-4xl mx-auto">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-100 text-gray-900 placeholder-gray-500 border-0 rounded-full py-3 px-6 focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:bg-white transition-colors"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          className="bg-[#FF7F7F] text-white p-3 rounded-full hover:bg-[#FF6666] transition-colors"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
    </form>
  )
}

export default ChatInput

