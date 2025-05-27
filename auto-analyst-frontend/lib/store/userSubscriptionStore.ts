/**
 * User Subscription Store using Zustand
 * Manages user subscription state and tier information
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSubscription } from '../features/feature-access';
import { UserTier } from '../features/feature-config';

interface UserSubscriptionState {
  subscription: UserSubscription | null;
  isLoading: boolean;
  error: string | null;
}

interface UserSubscriptionActions {
  setSubscription: (subscription: UserSubscription | null) => void;
  updateTier: (tier: UserTier) => void;
  setActiveStatus: (isActive: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearSubscription: () => void;
  fetchSubscription: () => Promise<void>;
}

type UserSubscriptionStore = UserSubscriptionState & UserSubscriptionActions;

export const useUserSubscriptionStore = create<UserSubscriptionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      subscription: null,
      isLoading: false,
      error: null,

      // Actions
      setSubscription: (subscription) => {
        set({ subscription, error: null });
      },

      updateTier: (tier) => {
        const currentSubscription = get().subscription;
        if (currentSubscription) {
          set({
            subscription: {
              ...currentSubscription,
              tier,
            },
          });
        }
      },

      setActiveStatus: (isActive) => {
        const currentSubscription = get().subscription;
        if (currentSubscription) {
          set({
            subscription: {
              ...currentSubscription,
              isActive,
            },
          });
        }
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      clearSubscription: () => {
        set({ subscription: null, error: null });
      },

      fetchSubscription: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Make API call to fetch user subscription
          const response = await fetch('/api/user/subscription');
          
          if (!response.ok) {
            if (response.status === 401) {
              // User not authenticated - set as free tier
              set({
                subscription: {
                  tier: 'free',
                  isActive: true,
                },
                isLoading: false,
              });
              return;
            }
            throw new Error('Failed to fetch subscription');
          }
          
          const data = await response.json();
          
          // Transform API response to UserSubscription format
          const subscription: UserSubscription = {
            tier: data.tier || 'free',
            isActive: data.isActive ?? true,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            features: data.features,
          };
          
          set({ subscription, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch subscription:', error);
          // Fallback to free tier on error
          set({
            subscription: {
              tier: 'free',
              isActive: true,
            },
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'user-subscription-storage',
      partialize: (state: UserSubscriptionState) => ({ 
        subscription: state.subscription 
      }), // Only persist subscription data, not loading states
    }
  )
);

// Selectors for easy access to specific parts of the state
export const useUserTier = () => {
  return useUserSubscriptionStore((state) => state.subscription?.tier || 'free');
};

export const useIsSubscriptionActive = () => {
  return useUserSubscriptionStore((state) => state.subscription?.isActive ?? true);
};

export const useUserSubscription = () => {
  return useUserSubscriptionStore((state) => state.subscription);
}; 