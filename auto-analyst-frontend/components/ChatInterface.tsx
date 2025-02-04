"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import ChatWindow from "./ChatWindow"
import ChatInput from "./ChatInput"
import Sidebar from "./Sidebar"
import axios from "axios"

interface PlotlyMessage {
  type: "plotly"
  data: any
  layout: any
}

interface Message {
  text: string | PlotlyMessage
  sender: "user" | "ai"
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const handleSendMessage = async (message: string) => {
    // Check for agent selection via @ symbol
    const agentMatch = message.match(/^@(\w+)\s+(.+)/)
    let selectAgent = null
    let query = message

    if (agentMatch) {
      selectAgent = agentMatch[1]
      query = agentMatch[2]
    }

    setMessages((prev) => [...prev, { text: message, sender: "user" }])
    setIsLoading(true)

    try {
      // Use the newly selected agent or fall back to the stored selectedAgent
      const currentAgent = selectAgent || selectedAgent
      console.log("currentAgent: ", currentAgent)
      const endpoint = currentAgent
        ? `https://ashad001-auto-analyst-backend.hf.space/chat/${currentAgent}`
        : `https://ashad001-auto-analyst-backend.hf.space/chat`


      console.log("Using endpoint:", endpoint)
      console.log("With query:", query)

      const response = await axios.post(endpoint, { query })

      // Update the selected agent after successful request
      setSelectedAgent(selectAgent)

      let aiMessage: string | PlotlyMessage = ""

      try {
        if (!response.data) {
          throw new Error("Empty response from server")
        }

        if (typeof response.data === "string") {
          aiMessage = response.data
        } else if (typeof response.data === "object") {
          if (response.data.error) {
            throw new Error(response.data.error)
          } else if (response.data.response) {
            aiMessage = response.data.response
          } else if (response.data.plotly_data && response.data.plotly_layout) {
            aiMessage = {
              type: "plotly",
              data: response.data.plotly_data,
              layout: response.data.plotly_layout,
            }
          } else {
            aiMessage = "```json\n" + JSON.stringify(response.data, null, 2) + "\n```"
          }
        } else {
          throw new Error("Invalid response format from server")
        }

        setMessages((prev) => [...prev, {
          text: typeof aiMessage === "string" ? aiMessage : aiMessage,
          sender: "ai",
        }])
      } catch (parseError) {
        console.error("Error processing response:", parseError)
        setMessages((prev) => [...prev, {
          text: "Sorry, I encountered an error processing the response. Please try again.",
          sender: "ai",
        }])
      }
    } catch (error) {
      console.error("Network or server error:", error)
      const errorMessage = axios.isAxiosError(error) && error.response?.status === 500
        ? "The server encountered an error. Please try again later."
        : error instanceof Error 
          ? error.message 
          : "An unknown error occurred"

      setMessages((prev) => [...prev, {
        text: `Error: ${errorMessage}`,
        sender: "ai",
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("styling_instructions", "Please analyze the data and provide a detailed report.")

    setIsLoading(true)

    try {
      const response = await axios.post("https://ashad001-auto-analyst-backend.hf.space/upload_dataframe", formData, {
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
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <motion.div
        animate={{ marginLeft: isSidebarOpen ? "16rem" : "0rem" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="flex-1 flex flex-col min-w-0"
      >
        <header className="bg-white/70 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-32 h-8 relative">
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
          <ChatWindow messages={messages} isLoading={isLoading} />
        </div>
        <ChatInput onSendMessage={handleSendMessage} onFileUpload={handleFileUpload} />
      </motion.div>
    </div>
  )
}

export default ChatInterface

