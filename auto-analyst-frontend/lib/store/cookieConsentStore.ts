import { create } from 'zustand'

interface CookieConsentStore {
  hasConsented: boolean | null
  setConsent: (consent: boolean) => void
  resetConsent: () => void
}

// Simple in-memory store without persistence
export const useCookieConsentStore = create<CookieConsentStore>((set) => ({
  hasConsented: null,
  setConsent: (consent) => {
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
    set({ hasConsented: null })
  }
}))

// Add an initialization effect to check localStorage on page load
if (typeof window !== 'undefined') {
  const storedConsent = localStorage.getItem('cookie-consent')
  if (storedConsent === 'true') {
    useCookieConsentStore.getState().setConsent(true)
  } else {
    // If no stored consent or stored consent is false, reset to null
    useCookieConsentStore.getState().resetConsent()
  }
} 