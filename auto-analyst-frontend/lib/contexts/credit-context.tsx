'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { creditUtils } from '../redis'

interface CreditContextType {
  remainingCredits: number
  isLoading: boolean
  checkCredits: () => Promise<void>
  hasEnoughCredits: (amount: number) => boolean
  deductCredits: (amount: number) => Promise<boolean>
}

const CreditContext = createContext<CreditContextType | undefined>(undefined)

export function CreditProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [remainingCredits, setRemainingCredits] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)

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
      
      // Check if this is the first time checking credits for this user
      const currentCredits = await creditUtils.getRemainingCredits(userId)
      if (currentCredits === 0) {
        // Initialize with 100 credits for new users
        await creditUtils.initializeCredits(userId, 100)
        setRemainingCredits(100)
      } else {
        setRemainingCredits(currentCredits)
      }
    } catch (error) {
      console.error('Error checking credits:', error)
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
        setRemainingCredits(prev => prev - amount)
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

  return (
    <CreditContext.Provider value={{ 
      remainingCredits, 
      isLoading, 
      checkCredits,
      hasEnoughCredits,
      deductCredits
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