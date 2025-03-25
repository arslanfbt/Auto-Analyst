"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Menu, User } from "lucide-react"
import { useSession } from "next-auth/react"
import { Avatar } from '@/components/ui/avatar'
import UserProfilePopup from './UserProfilePopup'
import CreditBalance from './CreditBalance'
import { useChatState } from "./ChatStateProvider"

interface ChatHeaderProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  onNavigateToAccount: () => void
  showSidebarToggle: boolean
}

const ChatHeader = ({ 
  isSidebarOpen, 
  onToggleSidebar, 
  onNavigateToAccount,
  showSidebarToggle 
}: ChatHeaderProps) => {
  const router = useRouter()
  const { data: session } = useSession()
  const { isUserProfileOpen, setIsUserProfileOpen, setIsSettingsOpen } = useChatState()
  const isAdmin = localStorage.getItem('isAdmin') === 'true'

  return (
    <header className="bg-white/70 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-200">
      <div className="flex items-center gap-4">
        {showSidebarToggle && !isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
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
                onAccountOpen={onNavigateToAccount}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default ChatHeader 