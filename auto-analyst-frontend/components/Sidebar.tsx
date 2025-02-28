"use client"

import { type FC, useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { X, MessageSquarePlus, History, Settings, LogOut, Trash2, Database } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useChatHistoryStore } from "@/lib/store/chatHistoryStore"
import SettingsPopup from './SettingsPopup'
import axios from "axios"
import { useSessionStore } from '@/lib/store/sessionStore'
import API_URL from '@/config/api'
import { Button } from "@/components/ui/button"
import { format } from 'date-fns'

// const PREVIEW_API_URL = 'http://localhost:8000';
const PREVIEW_API_URL = API_URL;

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
  chatHistories: Array<{
    chat_id: number;
    title: string;
    created_at: string;
    user_id?: number;
  }>
  activeChatId: number | null
  onChatSelect: (chatId: number) => void
  isLoading: boolean
  onDeleteChat: (chatId: number) => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNewChat, chatHistories = [], activeChatId, onChatSelect, isLoading, onDeleteChat }) => {
  const { clearMessages } = useChatHistoryStore()
  const { data: session } = useSession()
  const router = useRouter()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [modelSettings, setModelSettings] = useState({
    provider: '',
    model: '',
    hasCustomKey: false,
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000
  });
  const { sessionId } = useSessionStore()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<number | null>(null);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('isAdmin') === 'true')
  }, [])

  useEffect(() => {
    // Fetch current model settings when settings popup is opened
    if (isSettingsOpen) {
      const fetchModelSettings = async () => {
        try {
          const response = await axios.get(`${PREVIEW_API_URL}/api/model-settings`);
          setModelSettings(response.data);
        } catch (error) {
          console.error('Failed to fetch model settings:', error);
        }
      };
      fetchModelSettings();
    }
  }, [isSettingsOpen]);

  const handleNewChat = async () => {
    if (sessionId) {
      try {
        // Wait for reset to complete
        await axios.post(`${PREVIEW_API_URL}/reset-session`, null, {
          headers: {
            'X-Session-ID': sessionId,
          },
        });
        
        clearMessages()
        onClose()
        // Call onNewChat last to ensure proper order
        onNewChat()  // This will trigger handleNewChat in ChatInterface
      } catch (error) {
        console.error('Failed to reset session:', error);
      }
    } else {
      clearMessages()
      onClose()
      onNewChat()
    }
  }

  const handleSignOut = async () => {
    if (localStorage.getItem('isAdmin') === 'true') {
      // Clear admin status
      localStorage.removeItem('isAdmin')
      // Redirect to home page
      window.location.href = '/'
    } else {
      // Sign out from next-auth (Google)
      await signOut({ callbackUrl: '/' })
    }
  }

  // Add a function to delete a chat
  const handleDeleteChat = (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setIsDeleteModalOpen(true);
  };

  // Add a function to confirm deletion
  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;
    
    // Call onDeleteChat to update the sidebar - this will handle the API call in ChatInterface
    onDeleteChat(chatToDelete);
    
    // Close the modal
    setIsDeleteModalOpen(false);
  };
  
  // Format the date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Update the onClick handler to call onChatSelect
  const handleChatSelect = (chatId: number) => {
    onChatSelect(chatId);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 flex flex-col"
      >
        <div className="flex-1 flex flex-col h-full">
          <div className="flex justify-between items-center p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-[#FF7F7F] focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="mx-3 mt-4 mb-2 flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:shadow-md hover:text-[#FF7F7F] border border-gray-100 hover:border-[#FF7F7F]/20 transition-all duration-200"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF7F7F]"></div>
              </div>
            ) : chatHistories && chatHistories.length > 0 ? (
              <div className="space-y-1">
                {chatHistories.map((chat) => (
                  <motion.div 
                    key={chat.chat_id}
                    onClick={() => handleChatSelect(chat.chat_id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group ${
                      activeChatId === chat.chat_id 
                        ? 'bg-[#FF7F7F]/10 text-[#FF7F7F]' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chat.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(chat.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(chat.chat_id, e)}
                      className={`opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 focus:outline-none transition-opacity ${
                        activeChatId === chat.chat_id ? 'opacity-100' : ''
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No chat history yet</p>
                <p className="text-xs mt-1">Start a new conversation</p>
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="border-t border-gray-100 bg-white/50 backdrop-blur-sm">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#FF7F7F] transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            {(session || isAdmin) && (
              <div className="px-4 py-3 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3 mb-3">
                  {session?.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={36}
                      height={36}
                      className="rounded-full ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm font-medium">
                        {(session?.user?.name?.[0] || 'A').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {isAdmin ? "Administrator" : session?.user?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {isAdmin ? "Admin Access" : session?.user?.email}
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-[#FF7F7F] hover:bg-gray-50 rounded-xl py-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
      
      <SettingsPopup 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialSettings={modelSettings}
      />

      {isDeleteModalOpen && (
        <>
          {/* Modal backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            {/* Modal content */}
            <div 
              className="bg-white rounded-xl shadow-lg p-6 max-w-md w-[90%] mx-4 z-[70]"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Chat</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this chat? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteChat}
                  className="px-4 py-2 rounded-lg bg-[#FF7F7F] text-white hover:bg-[#FF7F7F]/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default Sidebar

