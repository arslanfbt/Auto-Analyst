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
        className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 flex flex-col h-full"
      >
        <div className="p-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-[#FF7F7F] transition-colors">
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-3 mb-8 mt-10">
            <Image
              src="https://4q2e4qu710mvgubg.public.blob.vercel-storage.com/auto-analyst-logo-R9wBx0kWOUA96KxwKBtl1onOHp6o02.png"
              alt="Auto-Analyst Logo"
              width={256}
              height={256}
            />
          </div>

          <nav className="space-y-4 mb-6">
            <a 
              onClick={handleNewChat}
              className="flex items-center space-x-3 text-gray-600 hover:text-[#FF7F7F] transition-colors group cursor-pointer"
            >
              <MessageSquarePlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>New Chat</span>
            </a>
            <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-[#FF7F7F] transition-colors group">
              <History className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>History</span>
            </a>
            <a 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center space-x-3 text-gray-600 hover:text-[#FF7F7F] transition-colors group cursor-pointer"
            >
              <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Settings</span>
            </a>
          </nav>
        </div>

        {(session || isAdmin) && (
          <div className="mt-auto p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              {session?.user?.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isAdmin ? "Administrator" : session?.user?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {isAdmin ? "Admin Access" : session?.user?.email}
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full flex items-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        )}
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

