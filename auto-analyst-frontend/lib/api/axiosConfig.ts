import axios from 'axios'
import { useSessionStore } from '@/lib/store/sessionStore'
import API_URL from '@/config/api'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL
})

// Response interceptor to handle "Session ID required" errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Check if error is "Session ID required" and we haven't already retried
    if (
      error.response?.status === 400 && 
      error.response?.data?.detail === "Session ID required" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true
      
      console.log('🔄 Session ID required - auto-generating and retrying...')
      
      try {
        // Generate new sessionId
        const newSessionId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Store in sessionStore
        const { setSessionId } = useSessionStore.getState()
        setSessionId(newSessionId)
        
        // Store in localStorage
        localStorage.setItem('auto-analyst-session-id', newSessionId)
        sessionStorage.setItem('auto-analyst-session-id', newSessionId)
        
        // Initialize session on backend
        await apiClient.post('/initialize-session', {
          session_id: newSessionId,
          user_id: 0, // Anonymous user
          user_email: '',
          user_name: 'Anonymous'
        }, {
          headers: { 'X-Session-ID': newSessionId }
        })
        
        console.log('✅ Auto-generated session:', newSessionId)
        
        // Retry original request with new sessionId
        originalRequest.headers['X-Session-ID'] = newSessionId
        return apiClient(originalRequest)
        
      } catch (retryError) {
        console.error('❌ Failed to auto-generate session:', retryError)
        return Promise.reject(error)
      }
    }
    
    return Promise.reject(error)
  }
)

// Request interceptor to always add sessionId header
apiClient.interceptors.request.use(
  (config) => {
    const { sessionId } = useSessionStore.getState()
    const storedSessionId = sessionId || 
      localStorage.getItem('auto-analyst-session-id') || 
      sessionStorage.getItem('auto-analyst-session-id')
    
    if (storedSessionId) {
      config.headers['X-Session-ID'] = storedSessionId
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

export default apiClient
