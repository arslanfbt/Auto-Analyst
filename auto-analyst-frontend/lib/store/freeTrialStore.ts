import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FreeTrialStore {
  queriesUsed: number
  incrementQueries: () => void
  resetQueries: () => void
  hasFreeTrial: () => boolean
}

export const useFreeTrialStore = create<FreeTrialStore>()(
  persist(
    (set, get) => ({
      queriesUsed: 0,
      incrementQueries: () => set((state) => ({ queriesUsed: state.queriesUsed + 1 })),
      resetQueries: () => set({ queriesUsed: 0 }),
      hasFreeTrial: () => {
        // Check if user is authenticated (either admin or Google)
        const isAuthenticated = localStorage.getItem('isAdmin') === 'true' || 
                              document.cookie.includes('next-auth.session-token')
        
        // If authenticated, always return true (unlimited access)
        if (isAuthenticated) {
          return true
        }
        
        // For unauthenticated users, check free trial limit
        return get().queriesUsed < 2
      },
    }),
    {
      name: 'free-trial-storage',
    }
  )
) 