"use client"

import { useEffect } from "react"
import ChatInterface from "@/components/chat/ChatInterface"
import ResponsiveLayout from "../../components/ResponsiveLayout"
import "../globals.css"
import { useFreeTrialStore } from "@/lib/store/freeTrialStore"
import { useSession } from "next-auth/react"

export default function ChatPage() {
  const { status } = useSession()
  const { queriesUsed, hasFreeTrial } = useFreeTrialStore()
  
  // Check for first-time free trial users
  useEffect(() => {
    if (status === "unauthenticated" && queriesUsed === 0 && hasFreeTrial()) {
      // First-time free trial user, set flag to show onboarding tooltip
      if (!localStorage.getItem('hasSeenOnboarding')) {
        localStorage.setItem('showOnboarding', 'true')
      }
    }
  }, [status, queriesUsed, hasFreeTrial])
  
  return (
    <ResponsiveLayout>
      <ChatInterface />
    </ResponsiveLayout>
  )
}

