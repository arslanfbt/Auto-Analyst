import { useCredits } from '@/lib/contexts/credit-context'
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
      incrementQueries: () => set((state: FreeTrialStore) => ({ queriesUsed: state.queriesUsed + 1 })),
      resetQueries: () => set({ queriesUsed: 0 }),
      hasFreeTrial: () => {
        // Check if user is authenticated (either admin or Google)
        const isAuthenticated = localStorage.getItem('isAdmin') === 'true' || 
                              document.cookie.includes('next-auth.session-token')
        
        // If authenticated, check credits instead of free trial limit
        if (isAuthenticated) {
          return true
        }
        
        // For unauthenticated users, check free trial limit
        const freeTrialLimit = process.env.NEXT_PUBLIC_FREE_TRIAL_LIMIT || '2'
        return get().queriesUsed < parseInt(freeTrialLimit)
      },
    }),
    {
      name: 'free-trial-storage',
    }
  )
) 