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
import { AwardIcon } from "lucide-react"

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
  const [showWelcome, setShowWelcome] = useState(true)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

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

  useEffect(() => {
    // Show welcome section if there are no messages
    setShowWelcome(storedMessages.length === 0)
  }, [storedMessages])

  const handleNewChat = () => {
    setShowWelcome(true)
  }

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort()
      setIsLoading(false)
      setAbortController(null)
    }
  }

  const handleSendMessage = async (message: string) => {
    setShowWelcome(false)
    if (!hasConsented || (!session && !hasFreeTrial())) {
      return
    }

    addMessage({ text: message, sender: "user" })

    const controller = new AbortController()
    setAbortController(controller)
    setIsLoading(true)

    try {
      // Check for agent mention anywhere in the message
      const agentRegex = /@(\w+)/
      const match = message.match(agentRegex)
      let selectAgent = null
      let query = message

      if (match) {
        selectAgent = match[1]
        // Remove the @agent_name from the query
        query = message.replace(/@\w+/, '').trim()
        // Set the selected agent when @ is used
        setSelectedAgent(selectAgent)
      } else {
        // Reset the selected agent when no @ is used
        setSelectedAgent(null)
      }

      // Use selectAgent directly instead of falling back to selectedAgent
      const endpoint = selectAgent
        ? `https://ashad001-auto-analyst-backend.hf.space/chat/${selectAgent}`
        : `https://ashad001-auto-analyst-backend.hf.space/chat`

      // Local endpoint
      // const endpoint = selectAgent
      //   ? `http://localhost:8000/chat/${selectAgent}`
      //   : `http://localhost:8000/chat`
        
      console.log("Using endpoint:", endpoint)
      console.log("With query:", query)

      const response = await axios.post(endpoint, 
        { query }, 
        { signal: controller.signal }
      )

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
      if (axios.isCancel(error)) {
        addMessage({
          text: "Generation stopped by user",
          sender: "ai",
        })
      } else {
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
      }
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("styling_instructions", "Please analyze the data and provide a detailed report.")

    try {
      await axios.post("https://ashad001-auto-analyst-backend.hf.space/upload_dataframe", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // 30 seconds
        maxContentLength: 10 * 1024 * 1024, // 10MB
      })
      // await axios.post("http://localhost:8000/upload_dataframe", formData, {
      //   headers: {
      //     "Content-Type": "multipart/form-data",
      //   },
      //   timeout: 30000, // 30 seconds
      //   maxContentLength: 10 * 1024 * 1024, // 10MB
      // })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Upload timeout')
        }
        throw error
      }
      throw error
    }
  }

  const isInputDisabled = () => {
    if (session) return false // Allow input if user is signed in
    return !hasFreeTrial() // Only check free trial if not signed in
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onNewChat={handleNewChat}
      />

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

          {/* {session && (  */}
          {(
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
          )}
        </header>

        <div className="flex-1 overflow-hidden">
          <ChatWindow 
            messages={storedMessages} 
            isLoading={isLoading} 
            onSendMessage={handleSendMessage}
            showWelcome={showWelcome}
          />
        </div>
        <ChatInput 
          onSendMessage={handleSendMessage} 
          onFileUpload={handleFileUpload}
          disabled={isInputDisabled()} 
          isLoading={isLoading}
          onStopGeneration={handleStopGeneration}
        />
      </motion.div>
    </div>
  )
}

export default ChatInterface

