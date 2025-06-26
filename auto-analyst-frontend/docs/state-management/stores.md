# State Management Documentation

The Auto-Analyst frontend uses a hybrid state management approach combining React Context, Zustand stores, and local component state.

## 🏗️ Architecture Overview

```
Global State Layer
├── React Context (Authentication, Credits, Analysis)
├── Zustand Stores (Client-side persistence)
├── Redis Cache (Server-side persistence)
└── Component State (Local UI state)
```

## 🌍 React Context Providers

### **1. Credit Provider**
Manages user credit balance and usage tracking.

```typescript
// lib/contexts/credit-context.tsx
interface CreditContextType {
  remainingCredits: number
  isLoading: boolean
  checkCredits: () => Promise<void>
  hasEnoughCredits: (amount: number) => Promise<boolean>
  deductCredits: (amount: number) => Promise<boolean>
  isChatBlocked: boolean
  creditResetDate: string | null
}

const CreditContext = createContext<CreditContextType | undefined>(undefined)

export function CreditProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [remainingCredits, setRemainingCredits] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isChatBlocked, setIsChatBlocked] = useState<boolean>(false)

  // Get user identifier
  const getUserId = (): string => {
    if (session?.user?.email) {
      return session.user.email
    } else if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
      return 'admin-user'
    } else {
      // Guest user handling
      const guestId = typeof window !== 'undefined' ? 
        (localStorage.getItem('guestUserId') || `guest-${Date.now()}`) : 
        `guest-${Date.now()}`;
      
      if (typeof window !== 'undefined' && !localStorage.getItem('guestUserId')) {
        localStorage.setItem('guestUserId', guestId)
      }
      return guestId
    }
  }

  // Fetch current credit balance
  const checkCredits = async () => {
    try {
      setIsLoading(true)
      const userId = session?.user ? ((session.user as any).sub || session.user.id) : getUserId()
      
      let currentCredits = 100; // Default
      let resetDate = null;
      
      try {
        // Try API endpoint first
        const response = await fetch('/api/user/credits');
        if (response.ok) {
          const data = await response.json();
          currentCredits = data.total === 999999 ? Infinity : data.total - data.used;
          resetDate = data.resetDate;
        } else {
          // Fall back to Redis
          currentCredits = await creditUtils.getRemainingCredits(userId);
        }
      } catch (error) {
        currentCredits = 10; // Fallback
      }
      
      setRemainingCredits(currentCredits);
      setIsChatBlocked(currentCredits <= 0);
      
      // Cache for offline usage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`user_credits_${userId}`, currentCredits.toString());
        localStorage.setItem(`user_credits_updated_${userId}`, Date.now().toString());
      }
    } catch (error) {
      console.error('Error checking credits:', error);
      setRemainingCredits(100);
      setIsChatBlocked(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Credit validation
  const hasEnoughCredits = async (amount: number): Promise<boolean> => {
    const hasEnough = remainingCredits >= amount;
    if (!hasEnough) {
      setIsChatBlocked(true);
    }
    return hasEnough;
  }

  // Credit deduction
  const deductCredits = async (amount: number): Promise<boolean> => {
    try {
      const userId = getUserId();
      
      if (remainingCredits < amount) {
        setIsChatBlocked(true);
        return false;
      }
      
      let success = false;
      
      try {
        success = await creditUtils.deductCredits(userId, amount);
      } catch (redisError) {
        success = true; // Fallback to local state
      }
      
      if (success) {
        const newBalance = remainingCredits - amount;
        setRemainingCredits(newBalance);
        setIsChatBlocked(newBalance <= 0);
        
        // Keep local storage in sync
        if (typeof window !== 'undefined') {
          localStorage.setItem(`user_credits_${userId}`, newBalance.toString());
        }
      }
      
      return success;
    } catch (error) {
      console.error('[CREDIT-CONTEXT] Error in deductCredits:', error);
      return false;
    }
  };

  return (
    <CreditContext.Provider value={{
      remainingCredits,
      isLoading,
      checkCredits,
      hasEnoughCredits,
      deductCredits,
      isChatBlocked,
      creditResetDate: null
    }}>
      {children}
    </CreditContext.Provider>
  )
}

export function useCredits() {
  const context = useContext(CreditContext)
  if (!context) {
    throw new Error('useCredits must be used within CreditProvider')
  }
  return context
}
```

### **2. Deep Analysis Provider**
Manages deep analysis feature state.

## 🗄️ Zustand Stores

### **1. Chat History Store**
Persists chat messages across sessions.

```typescript
// lib/store/chatHistoryStore.ts
export interface ChatMessage {
  text: string | {
    type: "plotly"
    data: any
    layout: any
  }
  sender: "user" | "ai"
  agent?: string
  id?: string
  message_id?: number
  chat_id?: number
  timestamp?: string
}

interface ChatHistoryStore {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => string
  updateMessage: (id: string, updatedMessage: Partial<ChatMessage>) => void
  clearMessages: () => void
}

export const useChatHistoryStore = create<ChatHistoryStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) => {
        const id = Math.random().toString(36).substring(7)
        set((state: ChatHistoryStore) => ({
          messages: [...state.messages, { ...message, id }],
        }))
        return id
      },
      updateMessage: (id, updatedMessage) => {
        set((state: ChatHistoryStore) => ({
          messages: state.messages.map((message) =>
            message.id === id ? { ...message, ...updatedMessage } : message
          ),
        }))
      },
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-history',
      // Custom storage with compression
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          try {
            return JSON.parse(str)
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)
```

### **2. User Subscription Store**
Manages subscription and billing information.

```typescript
// lib/store/userSubscriptionStore.ts
interface Subscription {
  plan: string
  status: string
  amount: number
  interval: string
  planType: string
  nextBilling?: string
  cancelAtPeriodEnd?: boolean
}

interface UserSubscriptionStore {
  subscription: Subscription | null
  isLoading: boolean
  error: string | null
  fetchSubscription: () => Promise<void>
  setSubscription: (subscription: Subscription) => void
  clearSubscription: () => void
}

export const useUserSubscriptionStore = create<UserSubscriptionStore>((set, get) => ({
  subscription: null,
  isLoading: false,
  error: null,

  fetchSubscription: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch('/api/user/subscription')
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }
      
      const subscription = await response.json()
      set({ subscription, isLoading: false })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      })
    }
  },

  setSubscription: (subscription) => {
    set({ subscription, error: null })
  },

  clearSubscription: () => {
    set({ subscription: null, error: null })
  },
}))
```

### **3. Free Trial Store**
Handles free trial state for non-authenticated users (development only).

```typescript
// lib/store/freeTrialStore.ts
interface FreeTrialStore {
  queriesUsed: number
  maxQueries: number
  hasFreeTrial: () => boolean
  incrementQueries: () => void
  resetTrial: () => void
  getRemainingQueries: () => number
}

export const useFreeTrialStore = create<FreeTrialStore>()(
  persist(
    (set, get) => ({
      queriesUsed: 0,
      maxQueries: 0, // Disabled in production, configurable in development
      
      hasFreeTrial: () => {
        const { queriesUsed, maxQueries } = get()
        return queriesUsed < maxQueries
      },
      
      incrementQueries: () => {
        set((state) => ({
          queriesUsed: Math.min(state.queriesUsed + 1, state.maxQueries)
        }))
      },
      
      resetTrial: () => {
        set({ queriesUsed: 0 })
      },
      
      getRemainingQueries: () => {
        const { queriesUsed, maxQueries } = get()
        return Math.max(0, maxQueries - queriesUsed)
      },
    }),
    {
      name: 'free-trial-storage',
    }
  )
)
```

### **4. Cookie Consent Store**
Manages GDPR compliance state.

```typescript
// lib/store/cookieConsentStore.ts
interface CookieConsentStore {
  hasConsented: boolean
  showBanner: boolean
  acceptedCategories: string[]
  giveConsent: (categories: string[]) => void
  withdrawConsent: () => void
  isFirstVisit: () => boolean
}

export const useCookieConsentStore = create<CookieConsentStore>()(
  persist(
    (set, get) => ({
      hasConsented: false,
      showBanner: true,
      acceptedCategories: [],
      
      giveConsent: (categories) => {
        set({
          hasConsented: true,
          showBanner: false,
          acceptedCategories: categories
        })
        
        // Set analytics cookies if consented
        if (categories.includes('analytics')) {
          // Enable Google Analytics
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('consent', 'update', {
              analytics_storage: 'granted'
            })
          }
        }
      },
      
      withdrawConsent: () => {
        set({
          hasConsented: false,
          showBanner: true,
          acceptedCategories: []
        })
        
        // Disable analytics
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('consent', 'update', {
            analytics_storage: 'denied'
          })
        }
      },
      
      isFirstVisit: () => {
        return !get().hasConsented && get().showBanner
      },
    }),
    {
      name: 'cookie-consent',
    }
  )
)
```

### **5. Session Store**
Manages session identifiers and temporary state.

```typescript
// lib/store/sessionStore.ts
interface SessionStore {
  sessionId: string
  tempData: any
  setSessionId: (id: string) => void
  setTempData: (data: any) => void
  clearSession: () => void
  generateNewSession: () => string
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionId: '',
  tempData: null,
  
  setSessionId: (id: string) => {
    set({ sessionId: id })
  },
  
  setTempData: (data: any) => {
    set({ tempData: data })
  },
  
  clearSession: () => {
    set({ sessionId: '', tempData: null })
  },
  
  generateNewSession: () => {
    const newId = crypto.randomUUID()
    set({ sessionId: newId })
    return newId
  },
}))
```

## 🔄 State Synchronization

### **Server-Client Sync**
```typescript
// lib/hooks/useServerSync.ts
export function useServerSync() {
  const { checkCredits } = useCredits()
  const { fetchSubscription } = useUserSubscriptionStore()
  const { data: session } = useSession()

  const syncAll = useCallback(async () => {
    if (session) {
      await Promise.all([
        checkCredits(),
        fetchSubscription(),
      ])
    }
  }, [session, checkCredits, fetchSubscription])

  // Sync on session change
  useEffect(() => {
    syncAll()
  }, [session, syncAll])

  // Periodic sync every 5 minutes
  useEffect(() => {
    const interval = setInterval(syncAll, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [syncAll])

  return { syncAll }
}
```

### **Optimistic Updates**
```typescript
// lib/hooks/useOptimisticUpdate.ts
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
) {
  const [data, setData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const update = useCallback(async (optimisticData: T) => {
    // Immediately update UI
    setData(optimisticData)
    setIsLoading(true)
    setError(null)

    try {
      // Send to server
      const serverData = await updateFn(optimisticData)
      setData(serverData)
    } catch (err) {
      // Revert on error
      setData(initialData)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [initialData, updateFn])

  return { data, isLoading, error, update }
}
```

## 🎯 State Management Best Practices

### **1. Provider Hierarchy**
```typescript
// components/ClientLayout.tsx
export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AuthProvider>
          <CreditProvider>
            <DeepAnalysisProvider>
              {children}
            </DeepAnalysisProvider>
          </CreditProvider>
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
```

### **2. Selective Re-renders**
```typescript
// Use selectors to prevent unnecessary re-renders
const useSelectedChatMessages = () => {
  return useChatHistoryStore((state) => state.messages)
}

const useMessageById = (id: string) => {
  return useChatHistoryStore((state) => 
    state.messages.find(msg => msg.id === id)
  )
}
```

### **3. State Validation**
```typescript
// lib/utils/stateValidation.ts
export function validateChatMessage(message: any): ChatMessage | null {
  if (!message || typeof message !== 'object') return null
  
  if (!message.text || !message.sender) return null
  
  if (message.sender !== 'user' && message.sender !== 'ai') return null
  
  return {
    text: message.text,
    sender: message.sender,
    agent: message.agent || undefined,
    id: message.id || undefined,
    timestamp: message.timestamp || new Date().toISOString()
  }
}
```

### **4. State Debugging**
```typescript
// lib/utils/stateDebug.ts
export function createStoreLogger<T>(storeName: string) {
  return (config: any) => (set: any, get: any, api: any) => {
    const loggedSet = (...args: any[]) => {
      console.group(`🔄 ${storeName} State Update`)
      console.log('Previous:', get())
      set(...args)
      console.log('Current:', get())
      console.groupEnd()
    }
    
    return config(loggedSet, get, api)
  }
}

// Usage
export const useChatHistoryStore = create<ChatHistoryStore>()(
  createStoreLogger('ChatHistory')(
    persist(
      (set) => ({
        // store implementation
      }),
      { name: 'chat-history' }
    )
  )
)
``` 