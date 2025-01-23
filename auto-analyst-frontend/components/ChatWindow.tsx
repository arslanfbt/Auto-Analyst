import type React from "react"
import { motion } from "framer-motion"

interface Message {
  text: string
  sender: "user" | "ai"
}

interface ChatWindowProps {
  messages: Message[]
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg p-3 ${
              message.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
            }`}
          >
            {message.text}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default ChatWindow

