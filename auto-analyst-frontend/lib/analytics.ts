import { useCookieConsentStore } from "./store/cookieConsentStore"

export const initializeAnalytics = () => {
  const { hasConsented } = useCookieConsentStore.getState()
  
  if (hasConsented === true) {
    // Initialize your analytics here
    // Example: Google Analytics, Mixpanel, etc.
  } else {
    // Disable analytics and clear any existing cookies
    clearAnalyticsCookies()
  }
}

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  const { hasConsented } = useCookieConsentStore.getState()
  
  if (hasConsented !== true) {
    return
  }
  // Track analytics event
  // Example: GA4, Mixpanel track, etc.
}

const clearAnalyticsCookies = () => {
  // Clear analytics cookies
  const cookies = document.cookie.split(';')
  
  for (let cookie of cookies) {
    const cookieName = cookie.split('=')[0].trim()
    // Remove analytics-related cookies
    if (cookieName.includes('_ga') || 
        cookieName.includes('_gid') || 
        cookieName.includes('_gat') ||
        cookieName.includes('_fbp')) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    }
  }
} 