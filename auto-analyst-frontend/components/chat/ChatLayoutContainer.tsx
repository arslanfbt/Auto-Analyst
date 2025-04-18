"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Menu } from "lucide-react"
import { useFreeTrialStore } from "@/lib/store/freeTrialStore"
import { useChatHistoryStore } from "@/lib/store/chatHistoryStore"
import FreeTrialOverlay from "./FreeTrialOverlay"
import { useCredits } from '@/lib/contexts/credit-context'
import ChatHeader from "./ChatHeader"
import ChatSidebar from "./ChatSidebar"
import ChatMessageArea from "./ChatMessageArea"
import ChatInputArea from "./ChatInputArea"
import ChatSettingsModal from "./ChatSettingsModal"
import InsufficientCreditsModal from '@/components/chat/InsufficientCreditsModal'
import { useChatState } from "./ChatStateProvider"

const ChatLayoutContainer = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { hasFreeTrial } = useFreeTrialStore()
  const [mounted, setMounted] = useState(false)
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const { isUserProfileOpen, setIsUserProfileOpen, isSettingsOpen, setIsSettingsOpen } = useChatState()
  const { insufficientCreditsModalOpen, setInsufficientCreditsModalOpen, requiredCredits } = useChatState()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Add useEffect to check admin status
  useEffect(() => {
    if (mounted) {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true')
    }
  }, [mounted])

  const handleNavigateToAccount = () => {
    router.push('/account')
    setIsUserProfileOpen(false)
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      {/* Include sidebar for signed-in users or admin */}
      {(session || isAdmin) && (
        <ChatSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <motion.div
        animate={{ 
          marginLeft: (session || isAdmin) && isSidebarOpen ? "16rem" : "0rem" 
        } as any}
        transition={{ type: "tween", duration: 0.3 }}
        className="flex-1 flex flex-col min-w-0 relative"
      >
        {mounted && !session && !hasFreeTrial() && <FreeTrialOverlay />}
        
        <ChatHeader 
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setSidebarOpen(true)}
          onNavigateToAccount={handleNavigateToAccount}
          showSidebarToggle={!!session || isAdmin}
        />

        <div className="flex-1 overflow-hidden">
          <ChatMessageArea />
        </div>
        
        <ChatInputArea />

        <ChatSettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
        
        <InsufficientCreditsModal
          isOpen={insufficientCreditsModalOpen}
          onClose={() => setInsufficientCreditsModalOpen(false)}
          requiredCredits={requiredCredits}
        />
      </motion.div>
    </div>
  )
}

export default ChatLayoutContainer