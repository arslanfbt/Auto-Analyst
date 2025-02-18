"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import ChatWindow from "./ChatWindow"
import ChatInput from "./ChatInput"
import Sidebar from "./Sidebar"
import axios from "axios"
import { useSession } from "next-auth/react"
import { useFreeTrialStore } from "@/lib/store/freeTrialStore"
import FreeTrialOverlay from "./chat/FreeTrialOverlay"
import { useChatHistoryStore } from "@/lib/store/chatHistoryStore"
import { useCookieConsentStore } from "@/lib/store/cookieConsentStore"
import { useRouter } from "next/navigation"
import { AwardIcon } from "lucide-react"
import { useSessionStore } from '@/lib/store/sessionStore'

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

interface ChatMessage {
  text: string | PlotlyMessage;
  sender: "user" | "ai";
  agent?: string;
  
}


const ChatInterface: React.FC = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { hasConsented } = useCookieConsentStore()
  const { queriesUsed, incrementQueries, hasFreeTrial } = useFreeTrialStore()
  const { messages: storedMessages, addMessage, updateMessage, clearMessages } = useChatHistoryStore()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [showWelcome, setShowWelcome] = useState(true)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const { sessionId } = useSessionStore()
  const chatInputRef = useRef<{ handlePreviewDefaultDataset: () => void }>(null);

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

  useEffect(() => {
    if (status === "unauthenticated") {
      clearMessages()
      setShowWelcome(true)
    }
  }, [status, clearMessages])

  const handleNewChat = async () => {
    setShowWelcome(true)
    clearMessages()
    
    if (sessionId) {
      try {
        // const baseUrl = 'http://localhost:8000'
        const baseUrl = 'https://ashad001-auto-analyst-backend.hf.space'
        
        // Reset session first
        await axios.post(`${baseUrl}/reset-session`, null, {
          headers: {
            'X-Session-ID': sessionId,
          },
        });

        // Small delay to ensure backend state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Now show the preview dialog - this will also ensure we're using the default dataset
        chatInputRef.current?.handlePreviewDefaultDataset();
      } catch (error) {
        console.error('Failed to reset session:', error);
      }
    }
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
    let accumulatedResponse = ""

    const controller = new AbortController()
    setAbortController(controller)
    setIsLoading(true)

    try {
      const agentRegex = /@(\w+)/
      const match = message.match(agentRegex)
      let selectAgent = null
      let query = message

      if (match) {
        selectAgent = match[1]
        query = message.replace(/@\w+/, '').trim()

        setSelectedAgent(selectAgent)
      } else {
        setSelectedAgent(null)
      }

      const baseUrl = 'https://ashad001-auto-analyst-backend.hf.space'
      // const baseUrl = 'http://localhost:8000'
      const endpoint = selectAgent
        ? `${baseUrl}/chat/${selectAgent}`
        : `${baseUrl}/chat`

      const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...(sessionId && { 'X-Session-ID': sessionId }),
      }

      if (selectAgent) {
        // Individual agent handling
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        addMessage({
          text: data.response || data.content || JSON.stringify(data),
          sender: "ai"
        })
      } else {
        // Streaming response handling
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query }),
          signal: controller.signal,
        })

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        // Add initial AI message that we'll update
        const messageId = addMessage({
          text: "",
          sender: "ai"
        })

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())

          for (const line of lines) {
            try {
              const { agent, content, error } = JSON.parse(line)
              if (error) {
                accumulatedResponse += `\nError: ${error}`
              } else {
                accumulatedResponse += `\n${content}`
              }
              
              // Update the existing message with accumulated content
              updateMessage(messageId, {
                text: accumulatedResponse.trim(),
                sender: "ai"
              })
            } catch (e) {
              console.error('Error parsing chunk:', e)
            }
          }
        }

        if (!session) {
          incrementQueries()
        }
      }

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        addMessage({
          text: "Generation stopped by user",
          sender: "ai"
        })
      } else {
        console.error("Error:", error)
        addMessage({
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sender: "ai"
        })
      }
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }

  const handleFileUpload = async (file: File) => {
    // More thorough CSV validation
    const isCSVByExtension = file.name.toLowerCase().endsWith('.csv');
    const isCSVByType = file.type === 'text/csv' || file.type === 'application/csv';
    
    if (!isCSVByExtension || !isCSVByType) {
      addMessage({
        text: "Error: Please upload a valid CSV file. Other file formats are not supported.",
        sender: "ai"
      });
      return;
    }

    // Add file size validation (30MB)
    if (file.size > 30 * 1024 * 1024) {
      addMessage({
        text: "Error: File size exceeds 30MB limit. Please upload a smaller file.",
        sender: "ai"
      });
      return;
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("styling_instructions", "Please analyze the data and provide a detailed report.")

    try {
      // const baseUrl = 'http://localhost:8000'
      const baseUrl = 'https://ashad001-auto-analyst-backend.hf.space'
     
      await axios.post(`${baseUrl}/upload_dataframe`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
        timeout: 30000, // 30 seconds
        maxContentLength: 30 * 1024 * 1024, // 30MB
      })
      
      // Add success message
      // addMessage({
      //   text: "File uploaded successfully! You can now ask questions about your data.",
      //   sender: "ai"
      // });

    } catch (error) {
      let errorMessage = "An error occurred while uploading the file.";
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = "Upload timeout: The request took too long to complete. Please try again with a smaller file.";
        } else if (error.response) {
          // Use backend error message if available
          errorMessage = `Upload failed: ${error.response.data?.message || error.message}`;
        }
      }
      
      addMessage({
        text: errorMessage,
        sender: "ai"
      });
      
      throw error;
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
          ref={chatInputRef}
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

