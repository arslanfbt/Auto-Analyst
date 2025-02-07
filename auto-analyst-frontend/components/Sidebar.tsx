"use client"

import type React from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { X, MessageSquarePlus, History, Settings, LogOut } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useChatHistoryStore } from "@/lib/store/chatHistoryStore"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNewChat }) => {
  const { clearMessages } = useChatHistoryStore()
  const { data: session } = useSession()
  const router = useRouter()

  const handleNewChat = () => {
    clearMessages()
    onNewChat()
    onClose()
  }

  return (
    <motion.div
      initial={{ x: "-100%" }}
      animate={{ x: isOpen ? 0 : "-100%" }}
      transition={{ type: "tween", duration: 0.3 }}
      className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 p-6"
    >
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
      <nav className="space-y-4">
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
        <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-[#FF7F7F] transition-colors group">
          <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Settings</span>
        </a>
      </nav>
      
      {session && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{session.user?.name}</p>
              <p className="text-xs text-gray-500">{session.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/signout')}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </motion.div>
  )
}

export default Sidebar

