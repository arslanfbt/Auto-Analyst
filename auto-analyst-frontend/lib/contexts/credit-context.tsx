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
      
      // First, check if we have cached credits in localStorage
      const cachedCredits = localStorage.getItem(`user_credits_${userId}`)
      const lastCreditUpdate = localStorage.getItem(`user_credits_updated_${userId}`)
      
      // Get actual credits from Redis
      const currentCredits = await creditUtils.getRemainingCredits(userId)
      console.log(`[Credits] Redis credits for ${userId}: ${currentCredits}`)
      
      // Determine if this is a new user that needs initial credits
      const hasInitializedCredits = localStorage.getItem(`credits_initialized_${userId}`)
      const isNewUser = !hasInitializedCredits && currentCredits === 0
      
      if (isNewUser) {
        // Only initialize credits for brand new users
        const initialAmount = process.env.NEXT_PUBLIC_CREDITS_INITIAL_AMOUNT || '100'
        console.log(`[Credits] Initializing new user ${userId} with ${initialAmount} credits`)
        
        await creditUtils.initializeCredits(userId, parseInt(initialAmount))
        setRemainingCredits(parseInt(initialAmount))
        setIsChatBlocked(false)
        
        // Mark this user as having initialized credits with timestamp
        localStorage.setItem(`credits_initialized_${userId}`, 'true')
        localStorage.setItem(`user_credits_${userId}`, initialAmount)
        localStorage.setItem(`user_credits_updated_${userId}`, Date.now().toString())
      } else {
        // For existing users, use the higher of Redis vs localStorage credits
        // This protects against cases where Redis might reset but localStorage still has the value
        let finalCredits = currentCredits
        
        if (cachedCredits && parseInt(cachedCredits) > currentCredits) {
          // If localStorage has more credits than Redis, update Redis
        } else if (currentCredits > 0) {
          // Update localStorage with latest Redis value
          localStorage.setItem(`user_credits_${userId}`, currentCredits.toString())
          localStorage.setItem(`user_credits_updated_${userId}`, Date.now().toString())
        }
        
        setRemainingCredits(finalCredits)
        setIsChatBlocked(finalCredits <= 0)
      }
    } catch (error) {
      console.error('Error checking credits:', error)
      
      // Fallback to localStorage if Redis is unavailable
      const userId = getUserId()
      const cachedCredits = localStorage.getItem(`user_credits_${userId}`)
      
      if (cachedCredits) {
        console.log(`[Credits] Redis error, using cached credits: ${cachedCredits}`)
        setRemainingCredits(parseInt(cachedCredits))
        setIsChatBlocked(parseInt(cachedCredits) <= 0)
      } else {
        setIsChatBlocked(true)
      }
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
      const userId = getUserId()
      const success = await creditUtils.deductCredits(userId, amount)
      
      if (success) {
        // Update local state to reflect new balance
        const newBalance = remainingCredits - amount
        setRemainingCredits(newBalance)
        setIsChatBlocked(newBalance <= 0)
        
        // Keep localStorage in sync
        localStorage.setItem(`user_credits_${userId}`, newBalance.toString())
        localStorage.setItem(`user_credits_updated_${userId}`, Date.now().toString())
      }
      
      return success
    } catch (error) {
      console.error('Error deducting credits:', error)
      return false
    }
  }

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