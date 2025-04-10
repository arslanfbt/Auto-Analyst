'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { creditUtils } from '../redis'

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
  const [creditsState, setCreditsState] = useState({
    total: 0,
    used: 0,
    remaining: 0,
    resetDate: '',
    lastUpdate: '',
    plan: 'Free Plan',
    subscription: null
  })
  const [error, setError] = useState<string | null>(null)

  // Get a unique identifier for the current user
  const getUserId = (): string => {
    if (session?.user?.email) {
      return session.user.email
    } else if (typeof window !== 'undefined' && localStorage.getItem('isAdmin') === 'true') {
      return 'admin-user'
    } else {
      // Guest user - use a browser fingerprint or session ID
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
      // Use token.sub as the primary ID when available
      const userId = session?.user ? ((session.user as any).sub || session.user.id) : getUserId()
      
      console.log(`[Credits] Checking credits for user ID: ${userId}`);
      
      let currentCredits = 100; // Default
      let resetDate = null;
      
      try {
        // First try to get from API endpoint for most up-to-date data
        const response = await fetch('/api/user/credits');
        if (response.ok) {
          const data = await response.json();
          currentCredits = data.total === 999999 ? Infinity : data.total - data.used;
          resetDate = data.resetDate; // Get reset date from API
          console.log('[Credits] API credits data:', data);
          console.log('[Credits] Reset date from API:', resetDate);
        } else {
          // Fall back to direct Redis access
          currentCredits = await creditUtils.getRemainingCredits(userId);
          
          // Try to get reset date from Redis directly
          try {
            // We need to fetch the raw hash to get the resetDate field
            const creditsKey = `user:${userId}:credits`;
            const creditsHash = await fetch('/api/redis/hgetall', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: creditsKey })
            }).then(res => res.json());
            
            if (creditsHash && creditsHash.resetDate) {
              resetDate = creditsHash.resetDate;
              console.log('[Credits] Reset date from Redis hash:', resetDate);
            } else {
              resetDate = creditUtils.getNextMonthFirstDay();
              console.log('[Credits] Using calculated next month date:', resetDate);
            }
          } catch (resetError) {
            console.error('[Credits] Error fetching reset date:', resetError);
            resetDate = creditUtils.getNextMonthFirstDay();
          }
        }
        console.log(`[Credits] Current credits for ${userId}: ${currentCredits}`);
      } catch (error) {
        console.error('[Credits] Error fetching credits:', error);
        // Use cached credits as fallback if available
        if (typeof window !== 'undefined') {
          const cachedCredits = localStorage.getItem(`user_credits_${userId}`);
          if (cachedCredits) {
            currentCredits = parseInt(cachedCredits);
          }
        }
      }
      
      // Store credits in state
      setRemainingCredits(currentCredits);
      
      // Update the credits state to include the reset date
      if (resetDate) {
        setCreditsState(prev => ({
          ...prev,
          resetDate: resetDate,
          remaining: currentCredits,
          lastUpdate: new Date().toISOString()
        }));
        console.log(`[Credits] Updated credits state with reset date: ${resetDate}`);
      }
      
      // Determine if chat should be blocked based on available credits
      const shouldBeBlocked = currentCredits <= 0;
      console.log(`[Credits] Should chat be blocked? ${shouldBeBlocked} (credits: ${currentCredits})`);
      
      // Update isChatBlocked state
      setIsChatBlocked(shouldBeBlocked);
      
      // Update local storage with current credits for caching only
      if (typeof window !== 'undefined') {
        localStorage.setItem(`user_credits_${userId}`, currentCredits.toString());
        localStorage.setItem(`user_credits_updated_${userId}`, Date.now().toString());
      }
    } catch (error) {
      console.error('Error checking credits:', error);
      // Ultimate fallback
      setRemainingCredits(100);
      setIsChatBlocked(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has enough credits without deducting
  const hasEnoughCredits = async (amount: number): Promise<boolean> => {
    const hasEnough = remainingCredits >= amount;
    
    // If not enough credits, block chat input immediately
    if (!hasEnough) {
      setIsChatBlocked(true);
      console.log('[Credits] Chat blocked due to insufficient credits');
    }
    
    return hasEnough;
  }

  // Deduct credits for an operation
  const deductCredits = async (amount: number): Promise<boolean> => {
    try {
      console.log(`[CREDIT-CONTEXT] Attempting to deduct ${amount} credits`);
      const userId = getUserId();
      
      // First check if we have enough credits locally
      if (remainingCredits < amount) {
        console.log(`[CREDIT-CONTEXT] Insufficient credits locally: ${remainingCredits} < ${amount}`);
        setIsChatBlocked(true);
        return false;
      }
      
      let success = false;
      
      try {
        // Try to deduct from Redis
        success = await creditUtils.deductCredits(userId, amount);
        console.log(`[CREDIT-CONTEXT] Redis deduction result: ${success}`);
      } catch (redisError) {
        console.error('[CREDIT-CONTEXT] Redis deduction error:', redisError);
        // Fall back to local state if Redis fails
        success = true;
      }
      
      if (success) {
        // Always update local state regardless of Redis result
        const newBalance = remainingCredits - amount;
        console.log(`[CREDIT-CONTEXT] Updating local credits: ${remainingCredits} -> ${newBalance}`);
        
        setRemainingCredits(newBalance);
        
        // Block chat if new balance is zero or negative
        const shouldBlock = newBalance <= 0;
        setIsChatBlocked(shouldBlock);
        
        // Keep local storage in sync for caching purposes only
        if (typeof window !== 'undefined') {
          localStorage.setItem(`user_credits_${userId}`, newBalance.toString());
          localStorage.setItem(`user_credits_updated_${userId}`, Date.now().toString());
        }
      }
      
      return success;
    } catch (error) {
      console.error('[CREDIT-CONTEXT] Error in deductCredits:', error);
      return false;
    }
  };

  // Initialize credits on component mount or when session changes
  useEffect(() => {
    if (session?.user) {
      // Fetch comprehensive credit data first
      fetchCredits().then(() => {
        console.log('[Credits] Comprehensive credit data fetched');
      });
      
      // Also fetch simple credit data as a fallback
      checkCredits();
    } else {
      // Just check credits for non-logged in users
      checkCredits();
    }
    
    // Refresh credits periodically (every 5 minutes)
    const intervalId = setInterval(() => {
      if (session?.user) {
        // For logged in users, alternate between comprehensive and simple fetches
        if (Math.random() > 0.5) {
          fetchCredits();
        } else {
          checkCredits();
        }
      } else {
        checkCredits();
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [session]);

  const fetchCredits = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Fetch from the user/data endpoint to get comprehensive data
      const response = await fetch('/api/user/data');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch credits');
      }
      
      const data = await response.json();
      console.log('[Credits] Comprehensive data from API:', data);
      
      if (data.credits) {
        // Update context with new data structure
        setCreditsState({
          total: data.credits.total,
          used: data.credits.used,
          remaining: data.credits.total - data.credits.used,
          resetDate: data.credits.resetDate,
          lastUpdate: data.credits.lastUpdate || new Date().toISOString(),
          plan: data.subscription?.plan || 'Free Plan',
          subscription: data.subscription
        });
        
        // Log the reset date for debugging
        console.log('[Credits] Reset date from comprehensive data:', data.credits.resetDate);
        
        // Also update the remaining credits for calculations
        const currentCredits = data.credits.total - data.credits.used;
        setRemainingCredits(currentCredits);
        
        // Make sure we update the isChatBlocked state based on the new data
        setIsChatBlocked(currentCredits <= 0);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching comprehensive credits:', err);
      setError(err.message || 'Failed to fetch credit data');
      
      // Fall back to simple credit check if comprehensive fetch fails
      checkCredits();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <CreditContext.Provider value={{ 
      remainingCredits, 
      isLoading, 
      checkCredits,
      hasEnoughCredits,
      deductCredits,
      isChatBlocked,
      creditResetDate: creditsState.resetDate
    }}>
      {children}
    </CreditContext.Provider>
  )
}

// Custom hook to use the credit context
export function useCredits() {
  const context = useContext(CreditContext)
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditProvider')
  }
  return context
} 