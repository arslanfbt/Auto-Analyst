import React, { useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"

const ChatWindow: React.FC<{ messages: { text: string; sender: "user" | "ai" }[] }> = ({ messages }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  return (
    <div
      ref={chatWindowRef}
      className={`
        flex-1 
        p-6 
        space-y-4 
        overflow-y-auto 
        scrollbar 
        scrollbar-thin 
        scrollbar-track-gray-100 
        scrollbar-thumb-gray-300 
        hover:scrollbar-thumb-gray-400 
        transition-all 
        duration-300 
        ease-in-out
      `}
      style={{ 
        height: '100%',
        scrollBehavior: 'smooth',
        // Webkit-specific scrollbar styling for Chrome, Safari
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgb(209 213 219) rgb(243 244 246)'
      }}
    >
      {messages.map((message, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`
              max-w-xs 
              md:max-w-md 
              lg:max-w-lg 
              xl:max-w-xl 
              rounded-2xl 
              p-4 
              shadow-sm 
              ${message.sender === "user" 
                ? "bg-[#FF7F7F] text-white" 
                : "bg-gray-100 text-gray-900"
              }
            `}
          >
            {message.text}
          </div>
        </motion.div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default ChatWindow