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
import FreeTrialOverlay from "./FreeTrialOverlay"
import { useChatHistoryStore } from "@/lib/store/chatHistoryStore"
import { useCookieConsentStore } from "@/lib/store/cookieConsentStore"
import { useRouter } from "next/navigation"
import { AwardIcon, User, Menu } from "lucide-react"
import { useSessionStore } from '@/lib/store/sessionStore'
import API_URL from '@/config/api'
import { useCredits } from '@/lib/contexts/credit-context'
import { getModelCreditCost } from '@/lib/model-tiers'
import InsufficientCreditsModal from '@/components/chat/InsufficientCreditsModal'
import CreditBalance from '@/components/chat/CreditBalance'
import { Avatar } from '@/components/ui/avatar'
import UserProfilePopup from './UserProfilePopup'
import SettingsPopup from './SettingsPopup'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "../ui/button"
import DatasetResetPopup from './DatasetResetPopup'

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
  const [isAdmin, setIsAdmin] = useState(false);
  const { remainingCredits, isLoading: creditsLoading, checkCredits, hasEnoughCredits } = useCredits()
  const [insufficientCreditsModalOpen, setInsufficientCreditsModalOpen] = useState(false)
  const [requiredCredits, setRequiredCredits] = useState(0)
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modelSettings, setModelSettings] = useState({
    provider: process.env.NEXT_PUBLIC_DEFAULT_MODEL_PROVIDER || 'openai',
    model: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'gpt-4o-mini',
    hasCustomKey: false,
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    temperature: process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || 0.7,
    maxTokens: process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || 6000
  });
  const [showDatasetResetConfirm, setShowDatasetResetConfirm] = useState(false);
  const [hasUploadedDataset, setHasUploadedDataset] = useState(false);
  const [tempChatIdForReset, setTempChatIdForReset] = useState<number | null>(null);
  const [recentlyUploadedDataset, setRecentlyUploadedDataset] = useState(false);
  const datasetPopupShownRef = useRef(false);

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await axios.get(`${API_URL}/agents`)
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

  // Define createNewChat function that was removed
  const createNewChat = useCallback(async () => {
    // Clear local messages state
    clearMessages();
    setShowWelcome(true);
    
    // Just set a temporary ID - we'll create the actual chat when the user sends a message
    const tempId = Date.now(); // Use timestamp as temporary ID
    setActiveChatId(tempId);
    return tempId;
  }, [clearMessages]);

  // Define loadChat before it's used in the fetchChatHistories dependency array
  const loadChat = useCallback(async (chatId: number) => {
    try {
      // Before loading the chat, check if there's a dataset mismatch
      // that might happen when switching between chats
      try {
        // Skip dataset popup check if we just uploaded a dataset
        if (recentlyUploadedDataset) {
          console.log("Skipping dataset popup because dataset was just uploaded");
          setRecentlyUploadedDataset(false);
          
          // Just load the chat normally
          setActiveChatId(chatId);
          console.log(`Loading chat ${chatId}...`);
          const response = await axios.get(`${API_URL}/chats/${chatId}`, {
            params: { user_id: userId },
            headers: { 'X-Session-ID': sessionId }
          });
          
          if (response.data && response.data.messages) {
            clearMessages();
            response.data.messages.forEach((msg: any) => {
              addMessage({
                text: msg.content,
                sender: msg.sender,
                message_id: msg.message_id,
                chat_id: msg.chat_id,
                timestamp: msg.timestamp
              });
            });
            setShowWelcome(false);
          }
          return;
        }
        
        const sessionResponse = await axios.get(`${API_URL}/api/session-info`, {
          headers: {
            'X-Session-ID': sessionId,
          }
        });
        
        console.log("Session info before loading chat:", sessionResponse.data);
        
        // If we have a custom dataset, check if this chat should show the popup
        if (sessionResponse.data && sessionResponse.data.is_custom_dataset) {
          // Don't show popup if we already showed it this session
          if (!datasetPopupShownRef.current) {
            console.log(`Dataset selection popup shown for chat ${chatId}`);
            datasetPopupShownRef.current = true;
            setTempChatIdForReset(chatId);
            setShowDatasetResetConfirm(true);
            return; // Wait for user decision before loading chat
          } else {
            console.log(`Dataset popup already shown, loading chat ${chatId} directly`);
          }
        }
      } catch (error) {
        console.error("Error checking dataset before loading chat:", error);
        // Continue with loading chat if check fails
      }
      
      // Normal chat loading logic
      setActiveChatId(chatId);
      console.log(`Loading chat ${chatId}...`);
      const response = await axios.get(`${API_URL}/chats/${chatId}`, {
        params: { user_id: userId },
        headers: { 'X-Session-ID': sessionId }
      });
      
      console.log("Chat data:", response.data);
      
      if (response.data && response.data.messages) {
        // Clear existing messages
        clearMessages();
        
        // Verify we have all messages before processing
        if (response.data.messages.length === 0) {
          console.warn("No messages found in chat history");
        } else {
          console.log(`Found ${response.data.messages.length} messages in history`);
        }
        
        // Map messages to the format expected by the chat window
        response.data.messages.forEach((msg: any) => {
          console.log("Processing message:", msg.message_id, msg.sender, msg.timestamp);
          addMessage({
            text: msg.content,
            sender: msg.sender,
            message_id: msg.message_id,
            chat_id: msg.chat_id,
            timestamp: msg.timestamp
          });
        });
        
        setShowWelcome(false);
      } else {
        console.error("No messages found in the chat data");
      }
    } catch (error) {
      console.error(`Failed to load chat ${chatId}:`, error);
    }
  }, [addMessage, clearMessages, userId, sessionId, recentlyUploadedDataset]);

  // Now fetchChatHistories can use loadChat in its dependency array
  const fetchChatHistories = useCallback(async (userIdParam?: number) => {
    // Fetch chat histories for signed-in users or admin
    if (!session && !isAdmin) return;
    
    const currentUserId = userIdParam || userId;
    
    // For admin users, we might not have a userId but still want to fetch chats
    if (!currentUserId && !isAdmin) return;
    
    setIsLoadingHistory(true);
    try {
      // Fetch chat histories for the user or admin
      const response = await axios.get(`${API_URL}/chats/`, {
        params: { user_id: currentUserId, is_admin: isAdmin },
        headers: { 'X-Session-ID': sessionId }
      });
      
      console.log("Fetched chat histories:", response.data);
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
  }, [session, userId, activeChatId, sessionId, loadChat, isAdmin]);

  const handleNewChat = useCallback(async () => {
    // Clean up empty chats before creating a new one
    if (session || isAdmin) {
      try {
        // Call backend endpoint to clean up empty chats for this user
        await axios.post(`${API_URL}/chats/cleanup-empty`, {
          user_id: userId,
          is_admin: isAdmin
        }, {
          headers: { 'X-Session-ID': sessionId }
        });
      } catch (error) {
        console.error('Failed to clean up empty chats:', error);
      }
    }
    
    // Set a temporary ID - real chat will be created on first message
    const tempId = Date.now();
    
    // Only check for custom dataset if we haven't just uploaded one
    // This prevents unnecessary popup when starting a new chat after upload
    if (!recentlyUploadedDataset) {
      try {
        const response = await axios.get(`${API_URL}/api/session-info`, {
          headers: {
            'X-Session-ID': sessionId,
          }
        });
        
        console.log("Session info when creating new chat:", response.data);
        
        // For new chat button, only show dataset popup if using custom dataset
        // and we haven't shown the popup already
        if (response.data && response.data.is_custom_dataset && !datasetPopupShownRef.current) {
          console.log("Custom dataset detected when creating new chat");
          
          datasetPopupShownRef.current = true;
          setTempChatIdForReset(tempId);
          setShowDatasetResetConfirm(true);
          
          // Don't set any chat state yet - wait for user decision in handleDatasetResetConfirm
          return;
        }
      } catch (error) {
        console.error("Error checking for custom dataset:", error);
      }
    } else {
      // Reset the recently uploaded flag after using it
      setRecentlyUploadedDataset(false);
    }
    
    // No custom dataset or popup already shown, proceed normally
    clearMessages();
    setShowWelcome(true);
    setActiveChatId(tempId);
    fetchChatHistories();
    
  }, [clearMessages, fetchChatHistories, userId, sessionId, session, isAdmin, recentlyUploadedDataset]);

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort()
      setIsLoading(false)
      setAbortController(null)
    }
  }

  // Move these function definitions to appear BEFORE handleSendMessage
  const processRegularMessage = async (
    message: string, 
    controller: AbortController, 
    currentId: number | null
  ) => {
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

    // Important: Use currentId instead of activeChatId
    // currentId is the actual database chat ID passed from handleSendMessage
    const queryParams = new URLSearchParams();
    if (userId) {
      queryParams.append('user_id', userId.toString());
    }
    if (currentId) { // Use currentId which is the real database ID
      queryParams.append('chat_id', currentId.toString());
    }
    if (isAdmin) {
      queryParams.append('is_admin', 'true');
    }
    
    const fullEndpoint = `${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    // Streaming response handling
    const response = await fetch(fullEndpoint, {
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

    // Save the final AI response to the database for signed-in or admin users
    if (currentId && (session || isAdmin)) {
      try {
        console.log("Saving AI response for chat ID:", currentId);
        
        // More robust save process with retry for the critical first message
        const saveAIResponse = async (retryCount = 0) => {
          try {
            const response = await axios.post(`${API_URL}/chats/${currentId}/messages`, {
              content: accumulatedResponse.trim(),
              sender: 'ai'
            }, {
              params: { user_id: userId, is_admin: isAdmin },
              headers: { 'X-Session-ID': sessionId }
            });
            
            console.log("AI response saved successfully:", response.data);
            return response;
          } catch (error) {
            console.error(`Failed to save AI response (attempt ${retryCount + 1}):`, error);
            
            // Retry up to 3 times for the first AI response
            if (retryCount < 3) {
              console.log(`Retrying in ${(retryCount + 1) * 500}ms...`);
              await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
              return saveAIResponse(retryCount + 1);
            }
            throw error;
          }
        };
        
        await saveAIResponse();
      } catch (error) {
        console.error('Failed to save AI response after retries:', error);
      }
    }
  }

  const processAgentMessage = async (
    agentName: string, 
    message: string, 
    controller: AbortController, 
    currentId: number | null
  ) => {
    let accumulatedResponse = ""
    const baseUrl = API_URL
    const endpoint = `${baseUrl}/chat/${agentName}`

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...(sessionId && { 'X-Session-ID': sessionId }),
    }

    // Important: Use currentId instead of activeChatId
    const queryParams = new URLSearchParams();
    if (userId) {
      queryParams.append('user_id', userId.toString());
    }
    if (currentId) { // Use currentId which is the real database ID
      queryParams.append('chat_id', currentId.toString());
    }
    if (isAdmin) {
      queryParams.append('is_admin', 'true');
    }
    
    const fullEndpoint = `${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    // Streaming response handling (potentially with SSE)
    const response = await fetch(fullEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: message }),
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

    // Save the final agent response to the database for signed-in or admin users
    if (currentId && (session || isAdmin)) {
      try {
        console.log("Saving agent response for chat ID:", currentId);
        await axios.post(`${API_URL}/chats/${currentId}/messages`, {
          content: accumulatedResponse.trim(),
          sender: 'ai'
        }, {
          params: { user_id: userId, is_admin: isAdmin },
          headers: { 'X-Session-ID': sessionId }
        });
      } catch (error) {
        console.error('Failed to save agent response:', error);
      }
    }
  }

  // Updated fetchModelSettings function to use the correct endpoint
  const fetchModelSettings = async () => {
    try {
      // Change from /settings/model to /api/model-settings to match the backend
      const response = await axios.get(`${API_URL}/api/model-settings`, {
        headers: { 'X-Session-ID': sessionId }
      });
      
      if (response.data) {
        setModelSettings({
          provider: response.data.provider,
          model: response.data.model,
          hasCustomKey: !!response.data.api_key,
          apiKey: response.data.api_key || '',
          temperature: response.data.temperature,
          maxTokens: response.data.maxTokens // Note: backend uses maxTokens not max_tokens
        });
        
        // Log the model that was successfully fetched
        console.log(`[Settings] Fetched model settings: ${response.data.model}`);
      }
    } catch (error) {
      console.error('Failed to fetch model settings:', error);
    }
  };

  // Then keep the handleSendMessage function as is
  const handleSendMessage = useCallback(async (message: string) => {
    if (isLoading || !message.trim()) return

    // If a dataset was recently uploaded, mark it so consent popup doesn't appear
    // during this message processing flow
    if (recentlyUploadedDataset) {
      console.log("Dataset was just uploaded, suppressing consent popup for this message");
      // Ensure the popup won't show during this entire message flow
      datasetPopupShownRef.current = true;
      // We'll keep the flag true until the message is fully processed
    }

    // First, refresh model settings to ensure we have the latest
    try {
      await fetchModelSettings();
    } catch (error) {
      console.error("Error refreshing model settings:", error);
      // Continue with existing settings if refresh fails
    }

    // Check if the user has sufficient credits
    if (session && !isAdmin) {
      try {
        // Get the model that will be used for this query
        let modelName = modelSettings.model || "gpt-3.5-turbo";
        
        // Calculate required credits based on model tier
        const creditCost = getModelCreditCost(modelName);
        console.log(`[Credits] Required credits for ${modelName}: ${creditCost}`);
        
        // Check if user has enough credits
        const hasEnough = await hasEnoughCredits(creditCost);
        if (!hasEnough) {
          setRequiredCredits(creditCost);
          setInsufficientCreditsModalOpen(true);
          return;
        }
      } catch (error) {
        console.error("Error checking credits:", error);
        // Continue anyway to avoid blocking experience
      }
    }

    // Get current chat ID or create a real one when the user sends a message
    let currentChatId = activeChatId;
    let isFirstMessage = false;
    
    // For signed-in or admin users, ensure we have a real database chat ID
    if (session || isAdmin) {
      const existingChat = chatHistories.find(chat => chat.chat_id === currentChatId);
      
      // If the currentChatId is a temporary one (not in chat histories), create a real chat
      if (!existingChat) {
        isFirstMessage = true;
        try {
          console.log("Creating new chat on first message with user_id:", userId, "isAdmin:", isAdmin);
          const response = await axios.post(`${API_URL}/chats/`, { 
            user_id: userId,
            is_admin: isAdmin 
          }, { 
            headers: { 'X-Session-ID': sessionId } 
          });
          
          console.log("New chat created:", response.data);
          currentChatId = response.data.chat_id;
          // Wait for the state to be updated
          await new Promise(resolve => {
            setActiveChatId(currentChatId);
            resolve(true);
          });
        } catch (error) {
          console.error("Failed to create new chat:", error);
          return;
        }
      }

      // Save user message to the database
      try {
        await axios.post(`${API_URL}/chats/${currentChatId}/messages`, {
          content: message,
          sender: 'user'
        }, {
          params: { user_id: userId, is_admin: isAdmin },
          headers: { 'X-Session-ID': sessionId }
        });
      } catch (error) {
        console.error('Failed to save user message:', error);
      }
    }

    // Add user message to local state for all users
    addMessage({
      text: message,
      sender: "user",
    });
    setShowWelcome(false);

    // Counting user queries for free trial
    if (!session) {
      incrementQueries();
    }

    setIsLoading(true);
    
    // Store original message for later use with chat title generation
    const originalQuery = message;

    try {
      // Create an abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);

      // Match all @agent mentions in the query
      const agentRegex = /@(\w+)/g
      const matches = [...message.matchAll(agentRegex)]
      
      // If no agent calls are found, process as a regular message
      if (matches.length === 0) {
        await processRegularMessage(message, controller, currentChatId)
      } else {
        // Extract all unique agent names
        const agentNames = [...new Set(matches.map(match => match[1]))]
        
        if (agentNames.length === 1) {
          // Single agent case - use the original logic
          const agentName = agentNames[0]
          
          // Add a system message indicating which agent is being called
          addMessage({
            text: "",
            sender: "ai",
            agent: agentName
          })
          
          // Extract the query text by removing the @mentions
          const cleanQuery = message.replace(agentRegex, '').trim()
          await processAgentMessage(agentName, cleanQuery, controller, currentChatId)
        } else {
          // Multiple agents case - send a single request with comma-separated agent names
          const combinedAgentName = agentNames.join(",")
          
          // Add a system message indicating which agents are being called
          addMessage({
            text: "",
            sender: "ai",
            agent: `Using agents: ${agentNames.join(", ")}`
          })
          
          // Extract the query text by removing the @mentions
          const cleanQuery = message.replace(agentRegex, '').trim()
          await processAgentMessage(combinedAgentName, cleanQuery, controller, currentChatId)
        }
      }

      // AFTER successful message processing - deduct credits using the correct user ID
      if (session?.user) {
        try {
          // Get the model directly from the API instead of relying on React state
          let modelName;
          try {
            const settingsResponse = await axios.get(`${API_URL}/api/model-settings`, {
              headers: { 'X-Session-ID': sessionId }
            });
            modelName = settingsResponse.data.model;
            console.log(`[Credits] Using freshly fetched model: ${modelName}`);
          } catch (settingsError) {
            console.error('[Credits] Failed to fetch fresh model settings:', settingsError);
            // Fall back to the model in state
            modelName = modelSettings.model || "gpt-3.5-turbo";
          }
          
          // Use more robust user ID extraction with logging
          let userIdForCredits = '';
          
          if ((session.user as any).sub) {
            userIdForCredits = (session.user as any).sub;
          } else if (session.user.id) {
            userIdForCredits = session.user.id;
          } else if (session.user.email) {
            userIdForCredits = session.user.email;
          } else {
            // Fallback to logged in user ID from component state
            userIdForCredits = userId?.toString() || '';
          }
          
          // Skip credit deduction if we still can't identify the user
          if (!userIdForCredits) {
            console.warn('[Credits] Cannot identify user for credit deduction');
            return;
          }
          
          // Calculate credit cost based on the fresh model name
          const creditCost = getModelCreditCost(modelName);
          
          console.log(`[Credits] Deducting ${creditCost} credits for user ${userIdForCredits} for model ${modelName}`);
          
          // Deduct credits directly through an API call
          const response = await axios.post('/api/user/deduct-credits', {
            userId: userIdForCredits,
            credits: creditCost,
            description: `Used ${modelName} for chat`
          });
          
          console.log('[Credits] Deduction result:', response.data);
          
          // Refresh the credits display in the UI after deduction
          if (checkCredits) {
            await checkCredits();
          }
        } catch (creditError) {
          console.error('[Credits] Failed to deduct credits:', creditError);
          // Don't block the user experience if credit deduction fails
        }
      }

      // After the AI response is generated and saved, update the chat title for new chats
      if (isFirstMessage) {
        try {
          console.log("Generating title for new chat using query:", message);
          // Generate a title from the first message
          const titleResponse = await axios.post(`${API_URL}/chat_history_name`, {
            query: message
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
      
      // Reset the recently uploaded dataset flag now that message processing is complete
      if (recentlyUploadedDataset) {
        console.log("Message processing complete, resetting recentlyUploadedDataset flag");
        setRecentlyUploadedDataset(false);
      }
    }
  }, [addMessage, clearMessages, incrementQueries, session, isAdmin, activeChatId, userId, sessionId, modelSettings, hasEnoughCredits, processRegularMessage, processAgentMessage, fetchChatHistories, checkCredits, recentlyUploadedDataset]);

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
      
      // Set flag to indicate we just uploaded a dataset
      setRecentlyUploadedDataset(true);
      
      // Mark that we have an uploaded dataset
      setHasUploadedDataset(true);
      
      // Reset the popup shown flag to ensure a clean state for future operations
      datasetPopupShownRef.current = false;

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

  // Add useEffect to fetch chat histories on mount for signed-in or admin users
  useEffect(() => {
    if (mounted && (session || isAdmin)) {
      fetchChatHistories();
    }
  }, [mounted, fetchChatHistories, session, isAdmin]);

  // Add back the initial page load effect
  useEffect(() => {
    if (mounted) {
      // Just set up an empty chat initially, the dataset check will handle the rest
      clearMessages();
      setShowWelcome(true);
      
      // Only set activeChatId if we don't already have one
      if (!activeChatId) {
        setActiveChatId(Date.now());
      }
    }
  }, [mounted, clearMessages, activeChatId]);

  // Add useEffect to check admin status
  useEffect(() => {
    if (mounted) {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    }
  }, [mounted]);

  // Use the fetchModelSettings function in the useEffect hook
  useEffect(() => {
    if (isSettingsOpen) {
      fetchModelSettings();
    }
  }, [isSettingsOpen]);

  // Modify the session info useEffect to prevent duplicate popups
  useEffect(() => {
    if (sessionId) {
      // Check if there's a previously uploaded dataset in the session
      const checkSessionDataset = async () => {
        try {
          // Skip check if we just uploaded a dataset
          if (recentlyUploadedDataset) {
            console.log("Skipping initial dataset check because dataset was just uploaded");
            return;
          }
          
          console.log("Checking session dataset with ID:", sessionId);
          const response = await axios.get(`${API_URL}/api/session-info`, {
            headers: {
              'X-Session-ID': sessionId,
            }
          });
          
          console.log("Session info response:", response.data);
          
          // If the dataset isn't the default, mark as having an uploaded dataset
          if (response.data && response.data.is_custom_dataset) {
            console.log("Custom dataset detected:", response.data.dataset_name);
            setHasUploadedDataset(true);
            
            // Only show the popup on page load if:
            // 1. We haven't shown it already in this component lifecycle
            // 2. We have a custom dataset loaded
            if (!datasetPopupShownRef.current) {
              console.log("Showing dataset reset popup on page load");
              datasetPopupShownRef.current = true;
              const tempId = activeChatId || Date.now();
              setTempChatIdForReset(tempId);
              setShowDatasetResetConfirm(true);
            } else {
              console.log("Dataset popup already shown this session, skipping");
            }
          } else {
            console.log("Using default dataset");
            setHasUploadedDataset(false);
          }
        } catch (error) {
          console.error("Error checking session dataset:", error);
        }
      };
      
      // Slight delay to ensure it runs after initial render
      setTimeout(() => {
        checkSessionDataset();
      }, 100);
    }
  }, [sessionId, activeChatId, recentlyUploadedDataset]);
  
  // Also fix the reset confirmation handler to properly update dataset state
  const handleDatasetResetConfirm = async (shouldReset: boolean) => {
    try {
      if (shouldReset) {
        // User chose to reset to default dataset
        console.log("Resetting to default dataset");
        
        // Reset the session to use the default dataset
        const resetResponse = await axios.post(`${API_URL}/reset-session`, null, {
          headers: { 'X-Session-ID': sessionId }
        });
        
        console.log("Reset response:", resetResponse.data);
        
        // Reset the flag since we're now using the default dataset
        setHasUploadedDataset(false);
        
        // Show the default dataset preview and ensure file upload state is fully reset
        if (chatInputRef.current) {
          // This will reset all file upload state including localStorage and the file input
          chatInputRef.current.handlePreviewDefaultDataset();
          
          // Also clear localStorage to prevent confusion with stored file reference
          localStorage.removeItem('lastUploadedFile');
          
          // We need to ensure the file upload HTML element is also reset
          // This is a workaround since we can't directly reset it from here
          setTimeout(() => {
            // Force a re-render by toggling a small state change
            setHasUploadedDataset(false);
          }, 100);
        }
      } else {
        // User chose to keep their uploaded dataset
        console.log("Keeping custom dataset");
        
        // No need to force them to reselect the file if we have session state
        // Just ensure the UI reflects the current dataset
        try {
          const sessionResponse = await axios.get(`${API_URL}/api/session-info`, {
            headers: {
              'X-Session-ID': sessionId,
            }
          });
          
          if (sessionResponse.data && sessionResponse.data.is_custom_dataset) {
            // The server already has the custom dataset, so we just need
            // to update the UI to show it's loaded
            setHasUploadedDataset(true);
            
            // Let the ChatInput know that we want to keep using the custom dataset
            if (chatInputRef.current && sessionResponse.data.dataset_name) {
              // DON'T call handlePreviewDefaultDataset as this resets to the default dataset
              // Instead, just ensure the file info is properly stored in localStorage
              const datasetName = sessionResponse.data.dataset_name;
              
              // Create a mock file info for the custom dataset
              const fileInfo = {
                name: datasetName.endsWith('.csv') ? datasetName : `${datasetName}.csv`,
                type: 'text/csv',
                lastModified: new Date().getTime()
              };
              
              // Store this in localStorage for ChatInput to detect
              localStorage.setItem('lastUploadedFile', JSON.stringify(fileInfo));
              
              // Force a refresh of the ChatInput component
              setTimeout(() => {
                setHasUploadedDataset(prev => !prev);
                setTimeout(() => setHasUploadedDataset(true), 10);
              }, 10);
            }
          }
        } catch (error) {
          console.error("Error getting session info for dataset handling:", error);
        }
      }
      
      // Hide the popup
      setShowDatasetResetConfirm(false);
      
      // Now proceed with loading the chat
      if (tempChatIdForReset) {
        loadChat(tempChatIdForReset);
        setTempChatIdForReset(null);
      }
      
      // Reset the popup shown flag after a delay to avoid immediate re-trigger
      setTimeout(() => {
        datasetPopupShownRef.current = false;
      }, 500);
    } catch (error) {
      console.error("Error handling dataset reset:", error);
      setShowDatasetResetConfirm(false);
      
      // Also reset the flag in case of error
      datasetPopupShownRef.current = false;
    }
  };

  const handleChatDelete = useCallback((chatId: number) => {
    axios.delete(`${API_URL}/chats/${chatId}`, {
      params: { user_id: userId },
      headers: { 'X-Session-ID': sessionId }
    }).then(() => {
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
    }).catch(error => {
      console.error(`Failed to delete chat ${chatId}:`, error);
    });
  }, [activeChatId, chatHistories, clearMessages, createNewChat, loadChat, userId, sessionId]);

  const handleNavigateToAccount = useCallback(() => {
    router.push('/account');
    setIsUserProfileOpen(false);
  }, [router, setIsUserProfileOpen]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      {/* Include sidebar for signed-in users or admin */}
      {(session || isAdmin) && (
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
      )}

      <motion.div
        animate={{ 
          marginLeft: (session || isAdmin) && isSidebarOpen ? "16rem" : "0rem" 
        } as any}
        transition={{ type: "tween", duration: 0.3 }}
        className="flex-1 flex flex-col min-w-0 relative"
      >
        {mounted && !session && !hasFreeTrial() && <FreeTrialOverlay />}
        
        <header className="bg-white/70 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-4">
            {(session || isAdmin) && !isSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-full text-gray-500 hover:text-[#FF7F7F] hover:bg-[#FF7F7F]/5 focus:outline-none transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            
            <div className="flex items-center cursor-pointer" onClick={() => router.push("/")}>
              <div className="w-8 h-8 relative">
                <Image
                  src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
                  alt="Auto-Analyst Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="text-xl font-semibold text-gray-900 ml-3">
                Auto-Analyst
              </h1>
            </div>
          </div>

          {/* Show credit balance and user profile */}
          <div className="flex items-center gap-3">
            {(session || isAdmin) && <CreditBalance />}
            
            {(session || isAdmin) && (
              <div className="relative">
                <div 
                  onClick={() => setIsUserProfileOpen(prev => !prev)}
                  className="cursor-pointer"
                >
                  {session?.user?.image ? (
                    <Avatar className="h-8 w-8">
                      <img src={session.user.image} alt={session.user.name || "User"} />
                    </Avatar>
                  ) : (
                    <Avatar className="h-8 w-8 bg-gray-100">
                      <User className="h-5 w-5 text-gray-600" />
                    </Avatar>
                  )}
                </div>
                
                <div className="relative">
                  <UserProfilePopup 
                    isOpen={isUserProfileOpen}
                    onClose={() => setIsUserProfileOpen(false)}
                    onSettingsOpen={() => {
                      setIsUserProfileOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    onAccountOpen={handleNavigateToAccount}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
            )}
          </div>
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

        <SettingsPopup 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialSettings={modelSettings as any}
          onSettingsUpdated={(updatedSettings) => {
            // Update the local modelSettings state immediately when settings are saved
            setModelSettings(updatedSettings);
            // Also refresh from server to ensure we have the latest settings
            fetchModelSettings();
          }}
        />
        
        <InsufficientCreditsModal
          isOpen={insufficientCreditsModalOpen}
          onClose={() => setInsufficientCreditsModalOpen(false)}
          requiredCredits={requiredCredits}
        />

        <DatasetResetPopup 
          isOpen={showDatasetResetConfirm}
          onClose={() => setShowDatasetResetConfirm(false)}
          onConfirm={() => handleDatasetResetConfirm(true)}
          onCancel={() => handleDatasetResetConfirm(false)}
        />
      </motion.div>
    </div>
  )
}

export default ChatInterface