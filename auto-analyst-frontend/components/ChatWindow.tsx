"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"


// Chat Window Component
const ChatWindow: React.FC<{ messages: { text: string; sender: "user" | "ai" }[] }> = ({ messages }) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900/50">
      {messages.map((message, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-xl p-4 ${
              message.sender === "user" 
                ? "bg-gray-700 text-white" 
                : "bg-gray-800 text-gray-300"
            }`}
          >
            {message.text}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default ChatWindow;
