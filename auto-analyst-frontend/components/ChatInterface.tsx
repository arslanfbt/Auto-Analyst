"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import ChatWindow from "./ChatWindow"
import ChatInput from "./ChatInput"
import Sidebar from "./Sidebar"
import axios from "axios"

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "ai" }[]>([])
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const handleSendMessage = async (message: string) => {
    setMessages((prev) => [...prev, { text: message, sender: "user" }])

    try {
      const endpoint = selectedAgent ? `http://localhost:8000/chat/${selectedAgent}` : `http://localhost:8000/chat`
      const response = await axios.post(endpoint, { query: message })

      console.log("Server response:", response.data)

      let aiMessage = ""

      if (typeof response.data === "string") {
        // If the response is a string, use it directly
        aiMessage = response.data
      } else if (typeof response.data === "object") {
        if (response.data.response) {
          // If it's a response object, use the response property
          aiMessage = response.data.response
        } else if (response.data.plotly_data && response.data.plotly_layout) {
          aiMessage = {
            type: "plotly",
            data: response.data.plotly_data,
            layout: response.data.plotly_layout,
          }
        }
         else {
          // If it's some other object, stringify it
          aiMessage = "```json\n" + JSON.stringify(response.data, null, 2) + "\n```"
        }
      } else {
        // If it's neither a string nor an object, convert it to a string
        aiMessage = String(response.data)
      }

      setMessages((prev) => [
        ...prev,
        {
          text: aiMessage,
          sender: "ai",
        },
      ])
    } catch (error) {
      console.error("Error in handleSendMessage:", error)
      setMessages((prev) => [
        ...prev,
        {
          text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
          sender: "ai",
        },
      ])
    }
  }

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("styling_instructions", "Please analyze the data and provide a detailed report.")

    try {
      const response = await axios.post("http://localhost:8000/upload_dataframe", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      setMessages((prev) => [
        ...prev,
        {
          text: "```json\n" + JSON.stringify(response.data, null, 2) + "\n```",
          sender: "ai",
        },
      ])
    } catch (error) {
      console.error("Error in handleFileUpload:", error)
      setMessages((prev) => [
        ...prev,
        {
          text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred during file upload"}`,
          sender: "ai",
        },
      ])
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <motion.div
        animate={{ marginLeft: isSidebarOpen ? "16rem" : "0rem" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="flex-1 flex flex-col min-w-0" // Added min-w-0 to prevent flex item from overflowing
      >
        <header className="bg-white/70 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-32 h-8 relative">
              {" "}
              {/* Constrained image container */}
              <Image
                src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/auto-analyst-logo-R9wBx0kWOUA96KxwKBtl1onOHp6o02.png"
                alt="Auto-Analyst Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="text-gray-500 hover:text-[#FF7F7F] focus:outline-none transition-colors"
          >
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
        <div className="flex-1 overflow-hidden">
          <ChatWindow messages={messages} />
        </div>
        <ChatInput onSendMessage={handleSendMessage} onFileUpload={handleFileUpload} />
      </motion.div>
    </div>
  )
}

export default ChatInterface

