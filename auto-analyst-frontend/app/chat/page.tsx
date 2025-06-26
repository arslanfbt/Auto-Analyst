"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import ChatInterface from "@/components/chat/ChatInterface"
import ResponsiveLayout from "../../components/ResponsiveLayout"
import "../globals.css"
import { useFreeTrialStore } from "@/lib/store/freeTrialStore"
import { useSession } from "next-auth/react"
import { useCredits } from "@/lib/contexts/credit-context"

export default function ChatPage() {
  const { status } = useSession()
  const { queriesUsed, hasFreeTrial } = useFreeTrialStore()
  const { checkCredits } = useCredits()
  const searchParams = useSearchParams()
  
  // Check for first-time free trial users
  useEffect(() => {
    if (status === "unauthenticated" && queriesUsed === 0 && hasFreeTrial()) {
      // First-time free trial user, set flag to show onboarding tooltip
      if (!localStorage.getItem('hasSeenOnboarding')) {
        localStorage.setItem('showOnboarding', 'true')
      }
    }
  }, [status, queriesUsed, hasFreeTrial])

  // Enhanced credit refresh when navigating from account page
  useEffect(() => {
    if (status === "authenticated" && searchParams) {
      const refreshParam = searchParams.get('refresh')
      const fromParam = searchParams.get('from')
      
      // Refresh credits if:
      // 1. Explicit refresh parameter is present
      // 2. Coming from account or pricing page
      // 3. Recent navigation from account page (check localStorage)
      const shouldRefresh = refreshParam || 
                           fromParam === 'account' || 
                           fromParam === 'pricing' ||
                           localStorage.getItem('navigateFromAccount') === 'true'

      if (shouldRefresh && checkCredits) {
                 console.log('Refreshing credits due to navigation from account/pricing page')
         
         // Emit event to show loading state in credit display
         window.dispatchEvent(new CustomEvent('creditsUpdated'))
         
         // Small delay to ensure any backend processes have completed
         setTimeout(() => {
           checkCredits()
         }, 500)
        
        // Clear the navigation flag
        localStorage.removeItem('navigateFromAccount')
        
        // Clean up URL parameters
        if (refreshParam || fromParam) {
          const url = new URL(window.location.href)
          url.searchParams.delete('refresh')
          url.searchParams.delete('from')
          window.history.replaceState({}, '', url.toString())
        }
      }
    }
  }, [status, searchParams, checkCredits])
  
  return (
    <ResponsiveLayout>
      <ChatInterface />
    </ResponsiveLayout>
  )
}

