"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
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
import API_URL from '@/config/api'

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
  message_id?: number;
  chat_id?: number | null;
  timestamp?: string;
}

interface ChatHistory {
  chat_id: number;
  title: string;
  created_at: string;
  user_id?: number;
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
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [showWelcome, setShowWelcome] = useState(true)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const { sessionId } = useSessionStore()
  const chatInputRef = useRef<{ handlePreviewDefaultDataset: () => void }>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

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

  useEffect(() => {
    if (session?.user && mounted) {
      const createOrGetUser = async () => {
        try {
          const response = await axios.post(`${API_URL}/chats/users`, {
            username: session.user.name || 'Anonymous User',
            email: session.user.email || `anonymous-${Date.now()}@example.com`
          });
          
          setUserId(response.data.user_id);
          
          // Now fetch chat history for this user
          fetchChatHistories(response.data.user_id);
        } catch (error) {
          console.error("Error creating/getting user:", error);
        }
      };
      
      createOrGetUser();
    }
  }, [session, mounted]);

  // Define loadChat before it's used in the fetchChatHistories dependency array
  const loadChat = useCallback(async (chatId: number) => {
    try {
      setActiveChatId(chatId);
      console.log(`Loading chat ${chatId}...`);
      const response = await axios.get(`${API_URL}/chats/${chatId}`);
      console.log("Chat data:", response.data);
      
      if (response.data && response.data.messages) {
        // Clear existing messages
        clearMessages();
        
        // Map messages to the format expected by the chat window
        response.data.messages.forEach((msg: any) => {
          addMessage({
            text: msg.content,
            sender: msg.sender
          });
        });
        
        setShowWelcome(false);
      } else {
        console.error("No messages found in the chat data");
      }
    } catch (error) {
      console.error(`Failed to load chat ${chatId}:`, error);
    }
  }, [addMessage, clearMessages]);

  // Now fetchChatHistories can use loadChat in its dependency array
  const fetchChatHistories = useCallback(async (userIdParam?: number) => {
    if (!session && !hasFreeTrial()) return;
    
    const currentUserId = userIdParam || userId;
    if (!currentUserId && !hasFreeTrial()) return; // Allow fetching without userId for free trial
    
    setIsLoadingHistory(true);
    try {
      // Fetch chat histories for the user
      const response = await axios.get(`${API_URL}/chats/`, {
        params: { user_id: currentUserId },
        headers: { 'X-Session-ID': sessionId }
      });
      
      console.log("Fetched chat histories:", response.data); // Add logging
      setChatHistories(response.data);
      
      // If we have chat histories but no active chat, set the most recent one
      if (response.data.length > 0 && !activeChatId) {
        // Sort by created_at descending and take the first one
        const mostRecentChat = [...response.data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        setActiveChatId(mostRecentChat.chat_id);
        loadChat(mostRecentChat.chat_id);
      }
    } catch (error) {
      console.error("Failed to fetch chat histories:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [session, hasFreeTrial, userId, activeChatId, sessionId, loadChat]);

  const createNewChat = useCallback(async () => {
    try {
      console.log("Creating new chat with user_id:", userId); // Add logging
      const response = await axios.post(`${API_URL}/chats/`, 
        { user_id: userId },
        { headers: { 'X-Session-ID': sessionId } }
      );
      
      console.log("New chat created:", response.data); // Add logging
      setActiveChatId(response.data.chat_id);
      // Refresh the chat list
      fetchChatHistories();
      return response.data.chat_id;
    } catch (error) {
      console.error("Failed to create new chat:", error);
      return null;
    }
  }, [userId, sessionId, fetchChatHistories]);

  const handleNewChat = useCallback(async () => {
    clearMessages();
    setShowWelcome(true);
    await createNewChat();
  }, [clearMessages, createNewChat]);

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort()
      setIsLoading(false)
      setAbortController(null)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // Get current chat ID or create a new one
    let currentChatId = activeChatId;
    const isNewChat = !currentChatId || 
      chatHistories.find(chat => chat.chat_id === currentChatId)?.title === 'New Chat';
    
    // If no active chat, create a new one
    if (!currentChatId) {
      const newChatId = await createNewChat();
      if (!newChatId) return; // Failed to create chat
      currentChatId = newChatId;
    }

    // Add user message to local state
    addMessage({
      text: message,
      sender: "user",
    });
    setShowWelcome(false);

    // Also save user message to the database immediately
    try {
      await axios.post(`${API_URL}/chats/${currentChatId}/messages`, {
        content: message,
        sender: 'user'
      });
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    // Counting user queries for free trial
    if (!session) {
      incrementQueries()
    }

    setIsLoading(true);
    
    // Store original message for later use with chat title generation
    const originalQuery = message;

    try {
      // Create an abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);

      // Update the regex to match the format without requiring curly braces
      // This will match patterns like "@agent_name query text"
      const agentRegex = /@(\w+)(?:\s+\{([^}]+)\}|\s+([^@]+))/g
      const matches = [...message.matchAll(agentRegex)]
      
      // If no agent calls are found, process as a regular message
      if (matches.length === 0) {
        await processRegularMessage(message, controller)
      } else {
        // Process each agent call separately
        for (const match of matches) {
          const agentName = match[1]
          // Use either the content in braces or the text until the next @ or end of string
          const agentQuery = (match[2] || match[3] || "").trim()
          
          // Add a system message indicating which agent is being called
          addMessage({
            text: "",
            sender: "ai",
            agent: agentName
          })
          
          await processAgentMessage(agentName, agentQuery, controller)
        }
      }

      // After the AI response is generated and saved, update the chat title for new chats
      if (isNewChat) {
        try {
          console.log("Generating title for new chat using query:", originalQuery);
          // Generate a title from the first message
          const titleResponse = await axios.post(`${API_URL}/chat_history_name`, {
            query: originalQuery
          });
          
          console.log("Title response:", titleResponse.data);
          
          if (titleResponse.data && titleResponse.data.name) {
            // Update the chat title in the backend
            await axios.put(`${API_URL}/chats/${currentChatId}`, {
              title: titleResponse.data.name
            });
            
            // Refresh chat histories to get the updated title
            fetchChatHistories();
          }
        } catch (error) {
          console.error('Failed to update chat title:', error);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add error message
      addMessage({
        text: "Sorry, there was an error processing your request. Please try again.",
        sender: "ai"
      });
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  // Update the processRegularMessage function to save AI responses
  const processRegularMessage = async (message: string, controller: AbortController) => {
    let accumulatedResponse = ""
    const baseUrl = API_URL
    const endpoint = `${baseUrl}/chat`

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...(sessionId && { 'X-Session-ID': sessionId }),
    }

    // First, save the user message to the database
    if (activeChatId) {
      try {
        await axios.post(`${API_URL}/chats/${activeChatId}/messages`, {
          content: message,
          sender: 'user'
        });
      } catch (error) {
        console.error('Failed to save user message:', error);
      }
    }

    // Streaming response handling
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: message }),
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

    // Save the final AI response to the database
    if (activeChatId) {
      try {
        await axios.post(`${API_URL}/chats/${activeChatId}/messages`, {
          content: accumulatedResponse.trim(),
          sender: 'ai'
        });
      } catch (error) {
        console.error('Failed to save AI response:', error);
      }
    }
  }

  // Update the processAgentMessage function
  const processAgentMessage = async (agentName: string, query: string, controller: AbortController) => {
    let accumulatedResponse = ""
    const baseUrl = API_URL

    // First, save the agent query to the database
    if (activeChatId) {
      try {
        await axios.post(`${API_URL}/chats/${activeChatId}/messages`, {
          content: `@${agentName} ${query}`,
          sender: 'user'
        });
      } catch (error) {
        console.error('Failed to save agent query:', error);
      }
    }

    const endpoint = `${baseUrl}/chat/${agentName}`

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...(sessionId && { 'X-Session-ID': sessionId }),
    }

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
    accumulatedResponse = data.response || data.content || JSON.stringify(data)
    addMessage({
      text: accumulatedResponse,
      sender: "ai",
      agent: agentName
    })

    // Save the final agent response to the database
    if (activeChatId) {
      try {
        await axios.post(`${API_URL}/chats/${activeChatId}/messages`, {
          content: accumulatedResponse.trim(),
          sender: 'ai'
        });
      } catch (error) {
        console.error('Failed to save agent response:', error);
      }
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
      const baseUrl = API_URL
     
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

  // Add useEffect to fetch chat histories on mount
  useEffect(() => {
    if (mounted) {
      fetchChatHistories();
    }
  }, [mounted, fetchChatHistories]);

  // Add useEffect to create a new chat on mount if needed
  useEffect(() => {
    if (mounted && !activeChatId && (session || hasFreeTrial())) {
      createNewChat();
    }
  }, [mounted, activeChatId, session, hasFreeTrial, createNewChat]);

  const handleChatDelete = useCallback((chatId: number) => {
    // Remove the chat from the chat histories
    setChatHistories(prev => prev.filter(chat => chat.chat_id !== chatId));
    
    // If the deleted chat was the active chat, reset the active chat and clear messages
    if (chatId === activeChatId) {
      setActiveChatId(null);
      clearMessages();
      setShowWelcome(true);
      
      // If there are other chats, select the most recent one
      const remainingChats = chatHistories.filter(chat => chat.chat_id !== chatId);
      if (remainingChats.length > 0) {
        const mostRecentChat = [...remainingChats].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        setActiveChatId(mostRecentChat.chat_id);
        loadChat(mostRecentChat.chat_id);
      } else {
        // If no chats remain, create a new one
        createNewChat();
      }
    }
  }, [activeChatId, chatHistories, clearMessages, createNewChat, loadChat]);

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
        chatHistories={chatHistories}
        activeChatId={activeChatId}
        onChatSelect={loadChat}
        isLoading={isLoadingHistory}
        onDeleteChat={handleChatDelete}
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