"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import ChatWindow from "./ChatWindow"
import ChatInput from "./ChatInput"
import Sidebar from "./Sidebar"
import axios from "axios"
import { useSession } from "next-auth/react"
import { useFreeTrialStore } from "@/lib/store/freeTrialStore"
import FreeTrialOverlay from "./chat/FreeTrialOverlay"
import { useChatHistoryStore, ChatMessage } from "@/lib/store/chatHistoryStore"
import { useCookieConsentStore } from "@/lib/store/cookieConsentStore"
import { useRouter } from "next/navigation"

interface PlotlyMessage {
  type: "plotly"
  data: any
  layout: any
}

interface Message {
  text: string | PlotlyMessage
  sender: "user" | "ai"
}

interface AgentInfo {
  name: string
  description: string
}

const ChatInterface: React.FC = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { hasConsented } = useCookieConsentStore()
  const { queriesUsed, incrementQueries, hasFreeTrial } = useFreeTrialStore()
  const { messages: storedMessages, addMessage } = useChatHistoryStore()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [agents, setAgents] = useState<AgentInfo[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axios.get("https://ashad001-auto-analyst-backend.hf.space/agents")
        if (response.data && response.data.available_agents) {
          const agentList: AgentInfo[] = response.data.available_agents.map((name: string) => ({
            name,
            description: `Specialized ${name.replace(/_/g, " ")} agent`,
          }))
          setAgents(agentList)
        }
      } catch (error) {
        console.error("Error fetching agents:", error)
      }
    }

    fetchAgents()
  }, [])

  const handleSendMessage = async (message: string) => {
    // Check for cookie consent before using storage
    if (!hasConsented) {
      return
    }

    if (!session && !hasFreeTrial()) {
      return
    }

    // Add user message to persistent store
    addMessage({ text: message, sender: "user" })

    setIsLoading(true)

    try {
      // Check for agent selection via @ symbol
      const agentMatch = message.match(/^@(\w+)\s+(.+)/)
      let selectAgent = null
      let query = message

      if (agentMatch) {
        selectAgent = agentMatch[1]
        query = agentMatch[2]
      }

      // Use the newly selected agent or fall back to the stored selectedAgent
      const currentAgent = selectAgent || selectedAgent
      console.log("currentAgent: ", currentAgent)
      // Deployed endpoint
      const endpoint = currentAgent
        ? `https://ashad001-auto-analyst-backend.hf.space/chat/${currentAgent}`
        : `https://ashad001-auto-analyst-backend.hf.space/chat`

      // Local endpoint
      // const endpoint = currentAgent
      //   ? `http://localhost:8000/chat/${currentAgent}`
      //   : `http://localhost:8000/chat`

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

        // Add AI response to persistent store
        addMessage({
          text: typeof aiMessage === "string" ? aiMessage : aiMessage,
          sender: "ai",
        })

        if (!session) {
          incrementQueries()
        }

      } catch (parseError) {
        console.error("Error processing response:", parseError)
        aiMessage = "Sorry, I encountered an error processing the response. Please try again."

        // Add error message to persistent store
        addMessage({
          text: aiMessage,
          sender: "ai",
        })
      }
    } catch (error) {
      console.error("Network or server error:", error)
      const errorMessage =
        axios.isAxiosError(error) && error.response?.status === 500
          ? "The server encountered an error. Please try again later."
          : error instanceof Error
            ? error.message
            : "An unknown error occurred"

      // Add error message to persistent store
      addMessage({
        text: `Error: ${errorMessage}`,
        sender: "ai",
      })
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
      // Add AI response to persistent store
      addMessage({
        text: "```json\n" + JSON.stringify(response.data, null, 2) + "\n```",
        sender: "ai",
      })
    } catch (error) {
      console.error("Error in handleFileUpload:", error)
      // Add error message to persistent store
      addMessage({
        text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred during file upload"}`,
        sender: "ai",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <motion.div
        animate={{ marginLeft: isSidebarOpen ? "16rem" : "0rem" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="flex-1 flex flex-col min-w-0 relative"
      >
        {mounted && !session && !hasFreeTrial() && <FreeTrialOverlay />}
        
        <header className="bg-white/70 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push("/")}>
              <div className="w-8 h-8 relative">
                <Image
                  src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
                  alt="Auto-Analyst Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Auto-Analyst
              </h1>
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
          <ChatWindow 
            messages={storedMessages} 
            isLoading={isLoading} 
            onSendMessage={handleSendMessage} 
          />
        </div>
        <ChatInput 
          onSendMessage={handleSendMessage} 
          onFileUpload={handleFileUpload}
          disabled={!session && !hasFreeTrial()} 
        />
      </motion.div>
    </div>
  )
}

export default ChatInterface

