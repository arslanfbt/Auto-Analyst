/**
 * User Subscription Store for Auto-Analyst
 * Manages user subscription state using Zustand with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSubscription } from '../features/feature-access';
import { getUserStorageKey } from '../utils/userStorage';

interface UserSubscriptionState {
  subscription: UserSubscription | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

interface UserSubscriptionActions {
  setSubscription: (subscription: UserSubscription | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchSubscription: () => Promise<void>;
  clearSubscription: () => void;
}

type UserSubscriptionStore = UserSubscriptionState & UserSubscriptionActions;

export const useUserSubscriptionStore = create<UserSubscriptionStore>()(
  persist(
    (set, get) => ({
      // State
      subscription: null,
      isLoading: false,
      error: null,
      lastFetched: null,

      // Actions
      setSubscription: (subscription) => 
        set({ subscription, lastFetched: new Date(), error: null }),

      setLoading: (isLoading) => 
        set({ isLoading }),

      setError: (error) => 
        set({ error, isLoading: false }),

      fetchSubscription: async () => {
        const state = get();
        
        if (state.isLoading) return;
        
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/user/data?force=true');
          
          if (!response.ok) {
            throw new Error('Failed to fetch subscription data');
          }

          const userData = await response.json();
          const subscription: UserSubscription = userData.subscription;

          set({ 
            subscription, 
            isLoading: false, 
            error: null,
            lastFetched: new Date() 
          });
        } catch (error) {
          set({ 
            subscription: null,
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch subscription',
            lastFetched: new Date()
          });
        }
      },

      clearSubscription: () => 
        set({ 
          subscription: null, 
          isLoading: false, 
          error: null, 
          lastFetched: null 
        }),
    }),
    {
      name: 'user-subscription-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const userKey = getUserStorageKey(name);
          const item = localStorage.getItem(userKey);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name, value) => {
          const userKey = getUserStorageKey(name);
          localStorage.setItem(userKey, JSON.stringify(value));
        },
        removeItem: (name) => {
          const userKey = getUserStorageKey(name);
          localStorage.removeItem(userKey);
        },
      })),
      partialize: (state: UserSubscriptionStore) => ({
        subscription: state.subscription,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// Selectors
export const useUserTier = () => useUserSubscriptionStore((state) => {
  if (!state.subscription) return 'free';
  
  const planName = state.subscription.plan?.toLowerCase() || '';
  const planType = state.subscription.planType?.toUpperCase() || '';
  
  if (planName.includes('enterprise') || planType === 'ENTERPRISE') {
    return 'enterprise';
  } else if (planName.includes('standard') || planType === 'STANDARD') {
    return 'standard';
  } else if (planName.includes('pro') || planType === 'PRO') {
    return 'standard';
  }
  
  return 'free';
});

export const useIsSubscriptionActive = () => useUserSubscriptionStore((state) => {
  if (!state.subscription) return false;
  return state.subscription.status === 'active';
});

export const useUserSubscription = () => useUserSubscriptionStore((state) => state.subscription);

// Auto-fetch subscription on store initialization
if (typeof window !== 'undefined') {
  const store = useUserSubscriptionStore.getState();
  
  // Fetch if no subscription data or data is stale (older than 30 minutes)
  const shouldFetch = !store.subscription || 
    !store.lastFetched || 
    (new Date().getTime() - new Date(store.lastFetched).getTime()) > 30 * 60 * 1000;
    
  if (shouldFetch) {
    store.fetchSubscription();
  }
} 