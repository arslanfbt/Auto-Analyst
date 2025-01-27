"use client"

import type React from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { X, MessageSquarePlus, History, Settings } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
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
        <a href="#" className="flex items-center space-x-3 text-gray-600 hover:text-[#FF7F7F] transition-colors group">
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
    </motion.div>
  )
}

export default Sidebar

