"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { useSession } from "next-auth/react"
import axios from "axios"
import API_URL from '@/config/api'
import { useCredits } from '@/lib/contexts/credit-context'
import { getModelCreditCost } from '@/lib/model-tiers'
import { useChatHistoryStore } from '@/lib/store/chatHistoryStore'
import { useSessionStore } from '@/lib/store/sessionStore'

// Define the context type
interface ChatStateContextType {
  // UI State
  isLoading: boolean
  setIsLoading: (value: boolean) => void
  showWelcome: boolean
  setShowWelcome: (value: boolean) => void
  isUserProfileOpen: boolean
  setIsUserProfileOpen: React.Dispatch<React.SetStateAction<boolean>>
  isSettingsOpen: boolean
  setIsSettingsOpen: (value: boolean) => void
  
  // Messaging
  abortController: AbortController | null
  setAbortController: (controller: AbortController | null) => void
  
  // Chat History
  activeChatId: number | null
  setActiveChatId: (id: number | null) => void
  chatHistories: any[]
  setChatHistories: (histories: any[]) => void
  isLoadingHistory: boolean
  setIsLoadingHistory: (value: boolean) => void
  userId: number | null
  setUserId: (id: number | null) => void
  
  // Credits
  insufficientCreditsModalOpen: boolean
  setInsufficientCreditsModalOpen: (value: boolean) => void
  requiredCredits: number
  setRequiredCredits: (value: number) => void
  
  // Model Settings
  modelSettings: any
  setModelSettings: (settings: any) => void
  
  // Functions
  fetchChatHistories: () => Promise<void>
  loadChat: (chatId: number) => Promise<void>
  createNewChat: () => Promise<number>
  handleNewChat: () => Promise<void>
  handleStopGeneration: () => void
  handleSendMessage: (message: string) => Promise<void>
  handleFileUpload: (file: File) => Promise<void>
  handleChatDelete: (chatId: number) => void
}

// Create the context
const ChatStateContext = createContext<ChatStateContextType | undefined>(undefined)

// Provider component
export const ChatStateProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = useSession()
  const { sessionId } = useSessionStore()
  const { addMessage, updateMessage, clearMessages } = useChatHistoryStore()
  const { hasEnoughCredits, checkCredits } = useCredits()
  
  // State
  const [isLoading, setIsLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [activeChatId, setActiveChatId] = useState<number | null>(null)
  const [chatHistories, setChatHistories] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [insufficientCreditsModalOpen, setInsufficientCreditsModalOpen] = useState(false)
  const [requiredCredits, setRequiredCredits] = useState(0)
  const [modelSettings, setModelSettings] = useState({
    provider: process.env.NEXT_PUBLIC_DEFAULT_MODEL_PROVIDER || 'openai',
    model: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'gpt-4o-mini',
    hasCustomKey: false,
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    temperature: process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || 0.7,
    maxTokens: process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || 6000
  })
  
  // Functions (implement stubs for now)
  const fetchChatHistories = useCallback(async () => {
    // Implementation goes here
  }, [])
  
  const loadChat = useCallback(async (chatId: number) => {
    // Implementation goes here
  }, [])
  
  const createNewChat = useCallback(async () => {
    return Date.now() // Temporary ID
  }, [])
  
  const handleNewChat = useCallback(async () => {
    // Implementation goes here
  }, [])
  
  const handleStopGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setIsLoading(false)
      setAbortController(null)
    }
  }, [abortController])
  
  const handleSendMessage = useCallback(async (message: string) => {
    // Implementation goes here
  }, [])
  
  const handleFileUpload = useCallback(async (file: File) => {
    // Implementation goes here
  }, [])
  
  const handleChatDelete = useCallback((chatId: number) => {
    // Implementation goes here
  }, [])
  
  // Context value
  const value = {
    isLoading,
    setIsLoading,
    showWelcome,
    setShowWelcome,
    isUserProfileOpen,
    setIsUserProfileOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    abortController,
    setAbortController,
    activeChatId,
    setActiveChatId,
    chatHistories,
    setChatHistories,
    isLoadingHistory,
    setIsLoadingHistory,
    userId,
    setUserId,
    insufficientCreditsModalOpen,
    setInsufficientCreditsModalOpen,
    requiredCredits,
    setRequiredCredits,
    modelSettings,
    setModelSettings,
    
    // Functions
    fetchChatHistories,
    loadChat,
    createNewChat,
    handleNewChat,
    handleStopGeneration,
    handleSendMessage,
    handleFileUpload,
    handleChatDelete
  }
  
  return (
    <ChatStateContext.Provider value={value}>
      {children}
    </ChatStateContext.Provider>
  )
}

// Hook to use the context
export const useChatState = () => {
  const context = useContext(ChatStateContext)
  if (context === undefined) {
    throw new Error('useChatState must be used within a ChatStateProvider')
  }
  return context
} 