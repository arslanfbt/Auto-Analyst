"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

interface DeepAnalysisState {
  isRunning: boolean
  currentGoal: string | null
  progress: number
  currentStep: string | null
}

interface DeepAnalysisContextType {
  state: DeepAnalysisState
  startAnalysis: (goal: string) => void
  updateProgress: (progress: number, step?: string) => void
  completeAnalysis: () => void
  failAnalysis: () => void
}

const DeepAnalysisContext = createContext<DeepAnalysisContextType | undefined>(undefined)

const initialState: DeepAnalysisState = {
  isRunning: false,
  currentGoal: null,
  progress: 0,
  currentStep: null
}

export function DeepAnalysisProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DeepAnalysisState>(initialState)

  const startAnalysis = useCallback((goal: string) => {
    setState({
      isRunning: true,
      currentGoal: goal,
      progress: 0,
      currentStep: 'Starting analysis...'
    })
  }, [])

  const updateProgress = useCallback((progress: number, step?: string) => {
    setState(prev => ({
      ...prev,
      progress,
      ...(step && { currentStep: step })
    }))
  }, [])

  const completeAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      progress: 100,
      currentStep: 'Completed'
    }))
  }, [])

  const failAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentStep: 'Failed'
    }))
  }, [])

  const contextValue: DeepAnalysisContextType = {
    state,
    startAnalysis,
    updateProgress,
    completeAnalysis,
    failAnalysis
  }

  return (
    <DeepAnalysisContext.Provider value={contextValue}>
      {children}
    </DeepAnalysisContext.Provider>
  )
}

export function useDeepAnalysis() {
  const context = useContext(DeepAnalysisContext)
  if (context === undefined) {
    throw new Error('useDeepAnalysis must be used within a DeepAnalysisProvider')
  }
  return context
} 