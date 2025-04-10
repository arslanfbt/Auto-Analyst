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
      
      try {
        // First try to get from API endpoint for most up-to-date data
        const response = await fetch('/api/user/credits');
        if (response.ok) {
          const data = await response.json();
          currentCredits = data.total === 999999 ? Infinity : data.total - data.used;
          console.log('[Credits] API credits data:', data);
        } else {
          // Fall back to direct Redis access
          currentCredits = await creditUtils.getRemainingCredits(userId);
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
    // Fetch credits data immediately
    checkCredits();
    
    // Refresh credits periodically (every 5 minutes)
    const intervalId = setInterval(checkCredits, 5 * 60 * 1000);
    
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
      
      // Make sure we update the isChatBlocked state based on the new data
      setIsChatBlocked(data.credits.total - data.credits.used <= 0);
      
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