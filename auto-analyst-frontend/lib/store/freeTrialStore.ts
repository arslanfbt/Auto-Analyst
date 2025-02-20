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
      hasFreeTrial: () => get().queriesUsed < 10000, // change this to 1 after testing
    }),
    {
      name: 'free-trial-storage',
    }
  )
) 