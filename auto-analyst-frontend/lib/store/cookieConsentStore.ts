import { create } from 'zustand'

interface CookieConsentStore {
  hasConsented: boolean | null
  setConsent: (consent: boolean) => void
}

// Simple in-memory store without persistence
export const useCookieConsentStore = create<CookieConsentStore>((set) => ({
  hasConsented: null,
  setConsent: (consent) => {
    if (consent) {
      // Only set the consent state
      set({ hasConsented: true })
    } else {
      // Clear all storage and cookies when rejected
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
})) 