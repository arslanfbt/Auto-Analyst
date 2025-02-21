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

// const PREVIEW_API_URL = 'http://localhost:8000';
const PREVIEW_API_URL = API_URL;

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNewChat }) => {
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
  const [histories, setHistories] = useState([])
  const [currentChatId, setCurrentChatId] = useState('')

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

  return (
    <>
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ type: "tween", duration: 0.3 }}
        className="fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-white to-gray-50 text-gray-900 shadow-lg z-50 flex flex-col h-full"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="relative w-8 h-8">
                <Image
                  src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/Auto-analysts%20icon%20small-S682Oi8nbFhOADUHXJSD9d0KtSWKCe.png"
                  alt="Auto-Analyst Logo"
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
              <span className="font-semibold text-gray-800 text-lg">Auto-Analyst</span>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-[#FF7F7F] transition-colors p-1 hover:bg-gray-50 rounded-md"
            >
              <X className="h-5 w-5" />
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
            <div className="space-y-1">
              {/* Chat history items would go here */}
            </div>
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
    </>
  )
}

export default Sidebar

