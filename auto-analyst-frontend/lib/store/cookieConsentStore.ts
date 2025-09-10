import { create } from 'zustand'
import { useSession } from 'next-auth/react'

interface CookieConsentStore {
  hasConsented: boolean | null
  setConsent: (consent: boolean) => void
  resetConsent: () => void
}

// Simple in-memory store without persistence
export const useCookieConsentStore = create<CookieConsentStore>((set) => ({
  hasConsented: null,
  setConsent: (consent) => {
    // Auto-accept for any authenticated user (including admin)
    if (typeof window !== 'undefined') {
      const isAuthenticated = localStorage.getItem('isAdmin') === 'true' || 
                            document.cookie.includes('next-auth.session-token')
      
      if (isAuthenticated) {
        localStorage.setItem('cookie-consent', 'true')
        set({ hasConsented: true })
        return
      }
    }

    if (consent) {
      // If user accepts, store in localStorage to persist
      localStorage.setItem('cookie-consent', 'true')
      set({ hasConsented: true })
    } else {
      // If user rejects, clear storage but don't persist the rejection
      localStorage.clear()
      sessionStorage.clear()
      document.cookie.split(';').forEach(cookie => {
        document.cookie = cookie
          .replace(/^ +/, '')
          .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/;domain=${window.location.hostname}`)
      })
      set({ hasConsented: false })
    }
  },
  resetConsent: () => {
    // Don't reset consent for authenticated users
    if (typeof window !== 'undefined') {
      const isAuthenticated = localStorage.getItem('isAdmin') === 'true' || 
                            document.cookie.includes('next-auth.session-token')
      if (isAuthenticated) {
        return
      }
    }
    set({ hasConsented: null })
  }
}))

// Update initialization effect to handle authenticated users
if (typeof window !== 'undefined') {
  const storedConsent = localStorage.getItem('cookie-consent')
  const isAuthenticated = localStorage.getItem('isAdmin') === 'true' || 
                         document.cookie.includes('next-auth.session-token')
  
  if (storedConsent === 'true' || isAuthenticated) {
    useCookieConsentStore.getState().setConsent(true)
  } else {
    useCookieConsentStore.getState().resetConsent()
  }
} 