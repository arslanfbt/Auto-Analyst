'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { creditUtils } from '../redis'

interface CreditContextType {
  remainingCredits: number
  isLoading: boolean
  checkCredits: () => Promise<void>
  hasEnoughCredits: (amount: number) => boolean
  deductCredits: (amount: number) => Promise<boolean>
  isChatBlocked: boolean
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
    } else if (localStorage.getItem('isAdmin') === 'true') {
      return 'admin-user'
    } else {
      // Guest user - use a browser fingerprint or session ID
      const guestId = localStorage.getItem('guestUserId') || `guest-${Date.now()}`
      if (!localStorage.getItem('guestUserId')) {
        localStorage.setItem('guestUserId', guestId)
      }
      return guestId
    }
  }

  // Fetch current credit balance
  const checkCredits = async () => {
    try {
      setIsLoading(true)
      const userId = getUserId()
      
      // Always check local storage first as fallback
      const cachedCredits = localStorage.getItem(`user_credits_${userId}`)
      const lastCreditUpdate = localStorage.getItem(`user_credits_updated_${userId}`)
      
      let currentCredits = 100; // Default
      let redisSuccess = false;
      
      try {
        // Try to get credits from Redis
        currentCredits = await creditUtils.getRemainingCredits(userId)
        console.log(`[Credits] Redis credits for ${userId}: ${currentCredits}`)
        redisSuccess = true;
      } catch (redisError) {
        console.error('[Credits] Redis error, using fallback:', redisError);
        // Use cached credits if available
        if (cachedCredits) {
          currentCredits = parseInt(cachedCredits)
        }
      }
      
      // Update local storage with current credits (from Redis or fallback)
      localStorage.setItem(`user_credits_${userId}`, currentCredits.toString())
      localStorage.setItem(`user_credits_updated_${userId}`, Date.now().toString())
      
      // Update state
      setRemainingCredits(currentCredits)
      setIsChatBlocked(currentCredits <= 0)
      
    } catch (error) {
      console.error('Error checking credits:', error)
      // Ultimate fallback
      setRemainingCredits(100)
      setIsChatBlocked(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if user has enough credits without deducting
  const hasEnoughCredits = (amount: number): boolean => {
    return remainingCredits >= amount
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
        // Fall back to local storage if Redis fails
        success = true;
      }
      
      if (success) {
        // Always update local state regardless of Redis result
        const newBalance = remainingCredits - amount;
        console.log(`[CREDIT-CONTEXT] Updating local credits: ${remainingCredits} -> ${newBalance}`);
        
        setRemainingCredits(newBalance);
        setIsChatBlocked(newBalance <= 0);
        
        // Always keep localStorage in sync
        localStorage.setItem(`user_credits_${userId}`, newBalance.toString());
        localStorage.setItem(`user_credits_updated_${userId}`, Date.now().toString());
      }
      
      return success;
    } catch (error) {
      console.error('[CREDIT-CONTEXT] Error in deductCredits:', error);
      return false;
    }
  };

  // Initialize credits on component mount or when session changes
  useEffect(() => {
    checkCredits()
    
    // Refresh credits periodically (every 5 minutes)
    const intervalId = setInterval(checkCredits, 5 * 60 * 1000)
    
    return () => clearInterval(intervalId)
  }, [session])

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
      
      // Update context with new data structure
      setCreditsState({
        total: data.credits.total,
        used: data.credits.used,
        remaining: data.credits.total - data.credits.used,
        resetDate: data.credits.resetDate,
        lastUpdate: data.credits.lastUpdate,
        plan: data.subscription?.plan || 'Free Plan',
        subscription: data.subscription
      });
      setError(null);
    } catch (err: any) {
      console.error('Error fetching credits:', err);
      setError(err.message || 'Failed to fetch credit data');
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
      isChatBlocked
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