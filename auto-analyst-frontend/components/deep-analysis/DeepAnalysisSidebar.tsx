"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  Loader2, 
  Brain, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { useSessionStore } from '@/lib/store/sessionStore'
import API_URL from '@/config/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useDeepAnalysis } from '@/lib/contexts/deep-analysis-context'
import NewAnalysisForm from './NewAnalysisForm'
import CurrentAnalysisView from './CurrentAnalysisView'
import HistoryView from './HistoryView'
import { AnalysisStep, DeepAnalysisReport, StoredReport } from './types'
import { useCredits } from '@/lib/contexts/credit-context'
import { FEATURE_COSTS, CreditConfig } from '@/lib/credits-config'
import InsufficientCreditsModal from '@/components/chat/InsufficientCreditsModal'
import { useSession } from 'next-auth/react'
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Crown, Lock } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '../ui/use-toast'
import { backendReportToStoredReport, convertBackendReports } from '@/lib/utils/report-converters'

interface DeepAnalysisSidebarProps {
  isOpen: boolean
  onClose: () => void
  sessionId?: string
  userId?: number | null
  forceExpanded?: boolean
}

export default function DeepAnalysisSidebar({ 
  isOpen, 
  onClose, 
  sessionId,
  userId,
  forceExpanded = false
}: DeepAnalysisSidebarProps) {
  const { state: analysisState, startAnalysis, updateProgress, completeAnalysis, failAnalysis } = useDeepAnalysis()
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Reset collapsed state only when initially opening with forceExpanded
  useEffect(() => {
    if (forceExpanded && isOpen) {
      setIsCollapsed(false)
    }
  }, [forceExpanded, isOpen])
  const [activeTab, setActiveTab] = useState<'new' | 'current' | 'history'>('new')
  const [goal, setGoal] = useState('')
  const [currentReport, setCurrentReport] = useState<DeepAnalysisReport | null>(null)
  const [storedReports, setStoredReports] = useState<StoredReport[]>([])
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<StoredReport | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { sessionId: storeSessionId } = useSessionStore()
  const { remainingCredits, isLoading: creditsLoading, checkCredits, hasEnoughCredits } = useCredits()
  const { data: session } = useSession()
  const [insufficientCreditsModalOpen, setInsufficientCreditsModalOpen] = useState(false)
  const [requiredCredits, setRequiredCredits] = useState(0)
  const { subscription } = useUserSubscriptionStore()
  const deepAnalysisAccess = useFeatureAccess('DEEP_ANALYSIS', subscription)
  const [showPremiumUpgradeModal, setShowPremiumUpgradeModal] = useState(false)
  const { toast } = useToast()
  const [downloadingFormat, setDownloadingFormat] = useState<'html' | null>(null)
  
  const activeSessionId = sessionId || storeSessionId

  // Check access immediately when sidebar opens
  useEffect(() => {
    if (isOpen && !deepAnalysisAccess.hasAccess) {
      setShowPremiumUpgradeModal(true)
    }
  }, [isOpen, deepAnalysisAccess.hasAccess])

  const forceUpdate = () => setRefreshTrigger(prev => prev + 1)

  // Helper function to detect known errors that should not result in credit deduction
  const isKnownError = (content: string): boolean => {
    const knownErrorPatterns = [
      'BadRequestError',
      'AnthropicException',
      'credit balance is too low',
      'invalid_request_error',
      'rate_limit_exceeded',
      'insufficient_quota',
      'authentication_error',
      'permission_denied',
      'service_unavailable',
      'timeout',
      'connection_error',
      'network_error',
      'api_error'
    ]
    
    const contentLower = content.toLowerCase()
    return knownErrorPatterns.some(pattern => contentLower.includes(pattern.toLowerCase()))
  }

  // Helper function to check if analysis completed successfully (no errors in final content)
  const isSuccessfulCompletion = (data: any): boolean => {
    // Check final conclusion for errors
    if (data.final_conclusion && isKnownError(data.final_conclusion)) {
      return false
    }
    
    // Check analysis final conclusion for errors
    if (data.analysis?.final_conclusion && isKnownError(data.analysis.final_conclusion)) {
      return false
    }
    
    // Check if there are any error indicators in the data
    if (data.error || data.type === 'error') {
      return false
    }
    
    return true
  }

  const initialSteps: AnalysisStep[] = [
    { step: 'initialization', status: 'pending', message: 'Preparing analysis...' },
    { step: 'questions', status: 'pending', message: 'Generating analytical questions...' },
    { step: 'planning', status: 'pending', message: 'Creating analysis plan...' },
    { step: 'analysis', status: 'pending', message: 'Executing analysis...' },
    { step: 'synthesis', status: 'pending', message: 'Synthesizing results...' },
    { step: 'report', status: 'pending', message: 'Generating report...' },
    { step: 'completed', status: 'pending', message: 'Finalizing results...' }
  ]

  // Fetch stored reports from backend when session is available
  useEffect(() => {
    const fetchReports = async () => {
      if (userId) {
        try {
          const response = await fetch(`${API_URL}/deep_analysis/reports/user_historical?user_id=${userId}&limit=10`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch reports: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // Convert backend format to frontend StoredReport format using utility
          const reports = convertBackendReports(data);
          
          setStoredReports(reports);
        } catch (error) {
          console.error('Failed to fetch reports:', error);
          // If fetching fails, try to use localStorage as fallback
          const stored = localStorage.getItem('deepAnalysisReports');
          if (stored) {
            try {
              setStoredReports(JSON.parse(stored));
            } catch (error) {
              console.error('Failed to parse stored reports:', error);
            }
          }
        }
      }
    };
    
    fetchReports();
  }, [userId]);

  const markAllStepsCompleted = () => {
    setCurrentReport(prevReport => {
      if (!prevReport) return prevReport
      
      const updatedSteps = prevReport.steps.map(step => ({
        ...step,
        status: 'completed' as AnalysisStep['status'],
        timestamp: step.timestamp || new Date().toISOString()
      }))
      
      return {
        ...prevReport,
        steps: updatedSteps
      }
    })
  }

  // Map backend step names to frontend step names
  const mapBackendStepToFrontend = (backendStep: string): string => {
    const stepMapping: Record<string, string> = {
      'initialization': 'initialization',
      'questions': 'questions',
      'planning': 'planning',
      'agent_execution': 'analysis',
      'code_synthesis': 'synthesis',
      'code_execution': 'synthesis',
      'synthesis': 'synthesis',
      'conclusion': 'report',
      'completed': 'completed',
      'error': 'report'
    }
    return stepMapping[backendStep] || backendStep
  }

    const stepOrder = ['initialization', 'questions', 'planning', 'analysis', 'synthesis', 'report', 'completed']
    
  const markPreviousStepsCompleted = (currentStep: string) => {
    const frontendStep = mapBackendStepToFrontend(currentStep)
    const currentIndex = stepOrder.indexOf(frontendStep)
    
      setCurrentReport(prevReport => {
        if (!prevReport) return prevReport
        
      const updatedSteps = prevReport.steps.map((step, index) => {
        // Mark all previous steps as completed
        if (index < currentIndex && step.status !== 'completed') {
            return { ...step, status: 'completed' as AnalysisStep['status'], timestamp: new Date().toISOString() }
          }
          return step
        })
      
      return { ...prevReport, steps: updatedSteps }
    })
  }

  const updateStep = (backendStepName: string, status: AnalysisStep['status'], message?: string, content?: string, progressValue?: number) => {
    const frontendStepName = mapBackendStepToFrontend(backendStepName)
    
    setCurrentReport(prevReport => {
      if (!prevReport) return prevReport
      
      const updatedSteps = prevReport.steps.map(step => 
        step.step === frontendStepName 
          ? { ...step, status, message: message || step.message, content, progress: progressValue, timestamp: new Date().toISOString() }
          : step
      )
        
        const updatedReport = {
          ...prevReport,
        steps: updatedSteps,
        progress: progressValue !== undefined ? progressValue : prevReport.progress
        }
        
        setTimeout(() => forceUpdate(), 10)
        
        return updatedReport
      })
  }

  const handleStartAnalysis = async () => {
    if (!goal.trim()) return
    
    // Check if user has access to Deep Analysis feature
    if (!deepAnalysisAccess.hasAccess) {
      setShowPremiumUpgradeModal(true)
      return
    }
    
    // Check credits for signed-in users (paid users) before starting analysis
    if (session) {
      try {
        const deepAnalysisCost = CreditConfig.getDeepAnalysisCost() // 29 credits
        
        // Check if user has enough credits
        const hasEnough = await hasEnoughCredits(deepAnalysisCost)
        
        if (!hasEnough) {
          
          // Store the required credits amount for the modal
          setRequiredCredits(deepAnalysisCost)
          
          // Show the insufficient credits modal
          setInsufficientCreditsModalOpen(true)
          
          // Ensure credits are refreshed
          await checkCredits()
          
          // Stop processing here if not enough credits
          return
        }
      } catch (error) {
        console.error("Error checking credits for deep analysis:", error)
        // Continue anyway to avoid blocking experience for credit check errors
      }
    }
    
    const reportId = `report_${Date.now()}`
    const newReport: DeepAnalysisReport = {
      id: reportId,
      goal: goal.trim(),
      status: 'running',
      startTime: new Date().toISOString(),
      deep_questions: '',
      deep_plan: '',
      summaries: [],
      code: '',
      plotly_figs: [],
      synthesis: [],
      final_conclusion: '',
      steps: [...initialSteps],
      progress: 0
    }
    
    setCurrentReport(newReport)
    setActiveTab('current')
    startAnalysis(goal.trim())
    
    try {
      // Build URL with query parameters
      const url = new URL(`${API_URL}/deep_analysis_streaming`);
      if (userId) {
        url.searchParams.append('user_id', userId.toString());
      }
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeSessionId && { 'X-Session-ID': activeSessionId })
        },
        body: JSON.stringify({ goal: goal.trim() })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue
          
          try {
            let data
            if (trimmedLine.startsWith('data: ')) {
              data = JSON.parse(trimmedLine.substring(6))
            } else if (trimmedLine.startsWith('{')) {
              data = JSON.parse(trimmedLine)
            } else {
              continue
            }
            
            if (data.type === 'step_update' || (data.step && data.status)) {
              const step = data.step
              const status = data.status
              const message = data.message
              const progress = data.progress
              
              // Mark previous steps as completed when we start or complete a new step
              if (status === 'processing' || status === 'starting' || status === 'completed' || status === 'success') {
                markPreviousStepsCompleted(step)
              }
              
              // Update the current step
              updateStep(step, status, message, data.content, progress)
              
              // Update overall progress
              if (progress !== undefined) {
                updateProgress(progress, message)
              }
              
              // Handle specific step completions
              if (status === 'completed' || status === 'success') {
                const frontendStep = mapBackendStepToFrontend(step)
                                
                // When conclusion completes, mark report step as completed
                if (step === 'conclusion') {
                  setTimeout(() => {
                    setCurrentReport(prevReport => {
                      if (!prevReport) return prevReport
                      
                      const updatedSteps = prevReport.steps.map(s => {
                        if (s.step === 'report' && s.status !== 'completed') {
                          return { ...s, status: 'completed' as AnalysisStep['status'], timestamp: new Date().toISOString() }
                        }
                        return s
                      })
                      
                      return { ...prevReport, steps: updatedSteps }
                    })
                    forceUpdate()
                  }, 100)
                }
              }
              
              if (step === 'completed' && (status === 'completed' || status === 'success')) {
                markAllStepsCompleted()
                
                // Check if the analysis completed successfully without errors
                const isSuccessful = isSuccessfulCompletion(data)
                
                if (isSuccessful) {
                  // Show success notification
                  toast({
                    title: "Deep Analysis Complete! 🎉",
                    description: "Your analysis report is ready for download.",
                    duration: 5000,
                  })
                } else {
                  // Show error notification with retry suggestion
                  toast({
                    title: "Analysis completed with errors",
                    description: "The analysis encountered issues. You might want to try again with a different approach.",
                    variant: "destructive",
                    duration: 8000,
                  })
                }
                
                setCurrentReport(prevReport => {
                  if (!prevReport) return prevReport
                  
                  return {
                    ...prevReport,
                    status: isSuccessful ? 'completed' : 'failed',
                    endTime: new Date().toISOString(),
                    deep_questions: data.analysis?.deep_questions || data.deep_questions || '',
                    deep_plan: data.analysis?.deep_plan || data.deep_plan || '',
                    summaries: data.analysis?.summaries || data.summaries || [],
                    code: data.analysis?.code || data.code || '',
                    plotly_figs: data.analysis?.plotly_figs || data.plotly_figs || [],
                    synthesis: data.analysis?.synthesis || data.synthesis || [],
                    final_conclusion: data.analysis?.final_conclusion || data.final_conclusion || '',
                    html_report: data.html_report,
                    progress: 100
                  }
                })
                
                if (isSuccessful) {
                  completeAnalysis()
                } else {
                  failAnalysis()
                }
                
                // Only deduct credits for successful deep analysis (only for paid users)
                if (session && isSuccessful) {
                  try {
                    const deepAnalysisCost = CreditConfig.getDeepAnalysisCost()
                    
                    // Use more robust user ID extraction
                    let userIdForCredits = ''
                    
                    if ((session.user as any).sub) {
                      userIdForCredits = (session.user as any).sub
                    } else if (session.user.id) {
                      userIdForCredits = session.user.id
                    } else if (session.user.email) {
                      userIdForCredits = session.user.email
                    }
                    
                    if (userIdForCredits) {
                      
                      // Deduct credits through API call
                      const response = await fetch('/api/user/deduct-credits', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          userId: userIdForCredits,
                          credits: deepAnalysisCost,
                          description: `Deep Analysis: ${goal.trim().substring(0, 50)}...`
                        })
                      })
                      
                      if (response.ok) {
                        
                        // Refresh the credits display in the UI
                        if (checkCredits) {
                          await checkCredits()
                        }
                      } else {
                        console.error('[Deep Analysis] Failed to deduct credits:', await response.text())
                      }
                    } else {
                      console.warn('[Deep Analysis] Cannot identify user for credit deduction')
                    }
                  } catch (creditError) {
                    console.error('[Deep Analysis] Failed to deduct credits:', creditError)
                    // Don't block the user experience if credit deduction fails
                  }
                }
                
                const storedReport: StoredReport = {
                  id: reportId,
                  goal: goal.trim(),
                  status: isSuccessful ? 'completed' : 'failed',
                  startTime: newReport.startTime,
                  endTime: new Date().toISOString(),
                  html_report: isSuccessful ? data.html_report : '',
                  summary: isSuccessful 
                    ? (data.analysis?.final_conclusion || data.final_conclusion || 'Analysis completed').substring(0, 200) + '...'
                    : 'Analysis failed due to errors. You might want to try again.',
                  deep_questions: data.analysis?.deep_questions || '',
                  deep_plan: data.analysis?.deep_plan || '',
                  summaries: data.analysis?.summaries || [],
                  code: data.analysis?.code || '',
                  plotly_figs: data.analysis?.plotly_figs || [],
                  synthesis: data.analysis?.synthesis || [],
                  final_conclusion: data.analysis?.final_conclusion || ''
                }
                
                // Store in local state
                setStoredReports(prev => [storedReport, ...prev])
                
                // Also save to backend if user is logged in and analysis was successful
                if (session?.user && isSuccessful) {
                  try {
                    // Extract user ID from session
                    let userId = '';
                    if ((session.user as any).sub) {
                      userId = (session.user as any).sub;
                    } else if ((session.user as any).id) {
                      userId = (session.user as any).id;
                    }
                    
                    if (userId) {
                      // Create the report in the backend
                      const backendReport = {
                        report_uuid: reportId,
                        user_id: parseInt(userId),
                        goal: storedReport.goal,
                        status: storedReport.status,
                        deep_questions: storedReport.deep_questions,
                        deep_plan: storedReport.deep_plan,
                        summaries: storedReport.summaries,
                        analysis_code: storedReport.code,
                        plotly_figures: storedReport.plotly_figs,
                        synthesis: storedReport.synthesis,
                        final_conclusion: storedReport.final_conclusion,
                        html_report: storedReport.html_report,
                        report_summary: storedReport.summary,
                        // Credit and error tracking
                        credits_consumed: isSuccessful ? CreditConfig.getDeepAnalysisCost() : 0,
                        error_message: isSuccessful ? null : 'Analysis completed with errors',
                        model_provider: '', // Default provider
                        model_name: '', // Default model
                        total_tokens_used: 0, // Could be enhanced to track actual tokens
                        estimated_cost: 0.0 // Could be enhanced to track actual cost
                      };
                      
                      const response = await fetch(`${API_URL}/deep_analysis/reports`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(backendReport),
                      });
                      
                      if (!response.ok) {
                        console.error('Failed to save report to backend:', await response.text());
                      } else {
                        console.log('Report saved to backend successfully');
                      }
                    }
                  } catch (error) {
                    console.error('Error saving report to backend:', error);
                    // Continue even if saving to backend fails
                  }
                }
              }
            } else if (data.type === 'final_result') {
              markAllStepsCompleted()
              
              // Check if the analysis completed successfully without errors
              const isSuccessful = isSuccessfulCompletion(data)
              
              if (isSuccessful) {
                // Show success notification
                toast({
                  title: "Deep Analysis Complete! 🎉",
                  description: "Your analysis report is ready for download.",
                  duration: 5000,
                })
              } else {
                // Show error notification with retry suggestion
                toast({
                  title: "Analysis completed with errors",
                  description: "The analysis encountered issues. You might want to try again with a different approach.",
                  variant: "destructive",
                  duration: 8000,
                })
              }
              
              setCurrentReport(prevReport => {
                if (!prevReport) return prevReport
                
                return {
                  ...prevReport,
                  status: isSuccessful ? 'completed' : 'failed',
                  endTime: new Date().toISOString(),
                  deep_questions: data.deep_questions || '',
                  deep_plan: data.deep_plan || '',
                  summaries: data.summaries || [],
                  code: data.code || '',
                  plotly_figs: data.plotly_figs || [],
                  synthesis: data.synthesis || [],
                  final_conclusion: data.final_conclusion || '',
                  html_report: data.html_report,
                  progress: 100
                }
              })
              
              if (isSuccessful) {
                completeAnalysis()
              } else {
                failAnalysis()
              }
              
              // Only deduct credits for successful deep analysis (only for paid users)
              if (session && isSuccessful) {
                try {
                  const deepAnalysisCost = CreditConfig.getDeepAnalysisCost()
                  
                  // Use more robust user ID extraction
                  let userIdForCredits = ''
                  
                  if ((session.user as any).sub) {
                    userIdForCredits = (session.user as any).sub
                  } else if (session.user.id) {
                    userIdForCredits = session.user.id
                  } else if (session.user.email) {
                    userIdForCredits = session.user.email
                  }
                  
                  if (userIdForCredits) {
                    // console.log(`[Deep Analysis] Deducting ${deepAnalysisCost} credits for user ${userIdForCredits}`)
                    
                    // Deduct credits through API call
                    const response = await fetch('/api/user/deduct-credits', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        userId: userIdForCredits,
                        credits: deepAnalysisCost,
                        description: `Deep Analysis: ${goal.trim().substring(0, 50)}...`
                      })
                    })
                    
                    if (response.ok) {
                      // console.log('[Deep Analysis] Credits deducted successfully')
                      
                      // Refresh the credits display in the UI
                      if (checkCredits) {
                        await checkCredits()
                      }
                    } else {
                      console.error('[Deep Analysis] Failed to deduct credits:', await response.text())
                    }
                  } else {
                    console.warn('[Deep Analysis] Cannot identify user for credit deduction')
                  }
                } catch (creditError) {
                  console.error('[Deep Analysis] Failed to deduct credits:', creditError)
                  // Don't block the user experience if credit deduction fails
                }
              }
              
              const storedReport: StoredReport = {
                id: reportId,
                goal: goal.trim(),
                status: isSuccessful ? 'completed' : 'failed',
                startTime: newReport.startTime,
                endTime: new Date().toISOString(),
                html_report: isSuccessful ? data.html_report : '',
                summary: isSuccessful 
                  ? (data.final_conclusion || 'Analysis completed').substring(0, 200) + '...'
                  : 'Analysis failed due to errors. You might want to try again.',
                deep_questions: data.deep_questions || '',
                deep_plan: data.deep_plan || '',
                summaries: data.summaries || [],
                code: data.code || '',
                plotly_figs: data.plotly_figs || [],
                synthesis: data.synthesis || [],
                final_conclusion: data.final_conclusion || ''
              }
              
              // Store in local state
              setStoredReports(prev => [storedReport, ...prev])
              
              // Also save to backend if user is logged in and analysis was successful
              if (session?.user && isSuccessful) {
                try {
                  // Extract user ID from session
                  let userId = '';
                  if ((session.user as any).sub) {
                    userId = (session.user as any).sub;
                  } else if ((session.user as any).id) {
                    userId = (session.user as any).id;
                  }
                  
                  if (userId) {
                    // Create the report in the backend
                    const backendReport = {
                      report_uuid: reportId,
                      user_id: parseInt(userId),
                      goal: storedReport.goal,
                      status: storedReport.status,
                      deep_questions: storedReport.deep_questions,
                      deep_plan: storedReport.deep_plan,
                      summaries: storedReport.summaries,
                      analysis_code: storedReport.code,
                      plotly_figures: storedReport.plotly_figs,
                      synthesis: storedReport.synthesis,
                      final_conclusion: storedReport.final_conclusion,
                      html_report: storedReport.html_report,
                      report_summary: storedReport.summary,
                      // Credit and error tracking
                      credits_consumed: isSuccessful ? CreditConfig.getDeepAnalysisCost() : 0,
                      error_message: isSuccessful ? null : 'Analysis completed with errors',
                      model_provider: 'anthropic', 
                      model_name: 'claude-sonnet-4-20250514',
                      total_tokens_used: 0, 
                      estimated_cost: 0.0
                    };
                    
                    const response = await fetch(`${API_URL}/deep_analysis/reports`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(backendReport),
                    });
                    
                    if (!response.ok) {
                      console.error('Failed to save report to backend:', await response.text());
                    } else {
                      console.log('Report saved to backend successfully');
                    }
                  }
                } catch (error) {
                  console.error('Error saving report to backend:', error);
                  // Continue even if saving to backend fails
                }
              }
            } else if (data.type === 'error' || data.error) {
              console.error('Analysis error:', data.error || data.message)
              
              const errorMessage = data.error || data.message || "An error occurred during analysis."
              const isKnownErrorType = isKnownError(errorMessage)
              
              toast({
                title: "Analysis Failed",
                description: isKnownErrorType 
                  ? "Analysis failed due to service limitations. You might want to try again later or with a simpler request."
                  : errorMessage,
                variant: "destructive",
                duration: 8000,
              })
              
              setCurrentReport(prev => prev ? {
                ...prev,
                status: 'failed',
                endTime: new Date().toISOString()
              } : null)
              
              failAnalysis()
              
              const failedReport: StoredReport = {
                id: reportId,
                goal: goal.trim(),
                status: 'failed',
                startTime: newReport.startTime,
                endTime: new Date().toISOString(),
                summary: data.error || data.message || 'Analysis failed',
                deep_questions: '',
                deep_plan: '',
                summaries: [],
                code: '',
                plotly_figs: [],
                synthesis: [],
                final_conclusion: ''
              }
              
              setStoredReports(prev => [failedReport, ...prev])
              
              // Save failed report to backend if user is logged in
              if (session?.user) {
                try {
                  // Extract user ID from session
                  let userId = '';
                  if ((session.user as any).sub) {
                    userId = (session.user as any).sub;
                  } else if ((session.user as any).id) {
                    userId = (session.user as any).id;
                  }
                  
                  if (userId) {
                    // Create the failed report in the backend
                    const backendReport = {
                      report_uuid: reportId,
                      user_id: parseInt(userId),
                      goal: failedReport.goal,
                      status: 'failed',
                      deep_questions: '',
                      deep_plan: '',
                      summaries: [],
                      analysis_code: '',
                      plotly_figures: [],
                      synthesis: [],
                      final_conclusion: '',
                      html_report: '',
                      report_summary: failedReport.summary,
                      // Credit and error tracking
                      credits_consumed: 0, // No credits charged for failed analyses
                      error_message: data.error || data.message || 'Analysis failed',
                      model_provider: '',
                      model_name: '',
                      total_tokens_used: 0,
                      estimated_cost: 0.0
                    };
                    
                    const response = await fetch(`${API_URL}/deep_analysis/reports`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(backendReport),
                    });
                    
                    if (!response.ok) {
                      console.error('Failed to save failed report to backend:', await response.text());
                    } else {
                      console.log('Failed report saved to backend successfully');
                    }
                  }
                } catch (error) {
                  console.error('Error saving failed report to backend:', error);
                  // Continue even if saving to backend fails
                }
              }
            }
            
          } catch (parseError) {
            console.warn('Failed to parse streaming data:', parseError, 'Raw line:', trimmedLine)
          }
        }
      }
      
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim())
          // console.log('Processing final buffer data:', data)
        } catch (error) {
          console.warn('Failed to parse final buffer:', error)
        }
      }
      
    } catch (error) {
      console.error('Analysis failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : "Network error occurred during analysis."
      
      toast({
        title: "Analysis Failed",
        description: "A network or connection error occurred. Please check your internet connection and try again.",
        variant: "destructive",
        duration: 8000,
      })
      
      setCurrentReport(prev => prev ? {
        ...prev,
        status: 'failed',
        endTime: new Date().toISOString()
      } : null)
      
      failAnalysis()
      
      const failedReport: StoredReport = {
        id: reportId,
        goal: goal.trim(),
        status: 'failed',
        startTime: newReport.startTime,
        endTime: new Date().toISOString(),
        summary: error instanceof Error ? error.message : 'Analysis failed',
        deep_questions: '',
        deep_plan: '',
        summaries: [],
        code: '',
        plotly_figs: [],
        synthesis: [],
        final_conclusion: ''
      }
      
      setStoredReports(prev => [failedReport, ...prev])
      
      // Save failed report to backend if user is logged in
      if (session?.user) {
        try {
          // Extract user ID from session
          let userId = '';
          if ((session.user as any).sub) {
            userId = (session.user as any).sub;
          } else if ((session.user as any).id) {
            userId = (session.user as any).id;
          }
          
          if (userId) {
            // Create the failed report in the backend
            const backendReport = {
              report_uuid: reportId,
              user_id: parseInt(userId),
              goal: failedReport.goal,
              status: 'failed',
              deep_questions: '',
              deep_plan: '',
              summaries: [],
              analysis_code: '',
              plotly_figures: [],
              synthesis: [],
              final_conclusion: '',
              html_report: '',
              report_summary: failedReport.summary,
              // Credit and error tracking
              credits_consumed: 0, // No credits charged for failed analyses
              error_message: errorMessage,
              model_provider: '',
              model_name: '',
              total_tokens_used: 0,
              estimated_cost: 0.0
            };
            
            const response = await fetch(`${API_URL}/deep_analysis/reports`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(backendReport),
            });
            
            if (!response.ok) {
              console.error('Failed to save failed report to backend:', await response.text());
            } else {
              console.log('Network error report saved to backend successfully');
            }
          }
        } catch (backendError) {
          console.error('Error saving network error report to backend:', backendError);
          // Continue even if saving to backend fails
        }
      }
    }
  }

  const handleDownloadReport = async (reportData?: any) => {
    if (downloadingFormat) {
      toast({
        title: "Download in progress",
        description: "Please wait while your report is being prepared...",
        duration: 3000,
      });
      return;
    }

    setDownloadingFormat('html')
    
    toast({
      title: "Preparing your HTML report...",
      description: "This may take a few seconds. Please don't close this window.",
      duration: 3000,
    });

    try {
      let report_uuid;
      
      if (reportData && reportData.id) {
        report_uuid = reportData.id;
        
        // Try to get the report directly from the backend
        try {
          const endpoint = `${API_URL}/deep_analysis/download_from_db/${report_uuid}${userId ? `?user_id=${userId}` : ''}`;
          
          const response = await fetch(endpoint, {
            method: 'POST'
          });
          
          if (response.ok) {
            // Get the blob directly
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `deep-analysis-report-${Date.now()}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast({
              title: "HTML report downloaded successfully! 📄",
              description: "Your deep analysis report has been saved to your downloads folder. You can print it as PDF using your browser.",
              duration: 4000,
            });
            
            setDownloadingFormat(null);
            return;
          } else if (response.status !== 404) {
            // If error other than 404, log it but continue with the fallback below
            console.warn(`Failed to download report from backend: ${response.statusText}`);
          }
        } catch (error) {
          console.warn('Error downloading report from backend:', error);
          // Continue with fallback below
        }
      }
      
      // Fallback to the previous approach if backend download fails or we don't have a report_uuid
      let analysisData;
      
      if (reportData && reportData.goal) {
        analysisData = {
          goal: reportData.goal,
          deep_questions: reportData.deep_questions || '',
          deep_plan: reportData.deep_plan || '',
          summaries: reportData.summaries || [],
          code: reportData.code || '',
          plotly_figs: reportData.plotly_figs || [],
          synthesis: reportData.synthesis || [],
          final_conclusion: reportData.final_conclusion || ''
        };
      } else if (currentReport) {
        analysisData = {
          goal: currentReport.goal,
          deep_questions: currentReport.deep_questions || '',
          deep_plan: currentReport.deep_plan || '',
          summaries: currentReport.summaries || [],
          code: currentReport.code || '',
          plotly_figs: currentReport.plotly_figs || [],
          synthesis: currentReport.synthesis || [],
          final_conclusion: currentReport.final_conclusion || ''
        };
      } else {
        console.error('No analysis data available for download');
        toast({
          title: "Download failed",
          description: "No analysis data available for download.",
          variant: "destructive",
          duration: 3000,
        });
        setDownloadingFormat(null);
        return;
      }

      // Add report_uuid for backend storage if available
      interface RequestData {
        analysis_data: {
          goal: any;
          deep_questions: any;
          deep_plan: any;
          summaries: any;
          code: any;
          plotly_figs: any;
          synthesis: any;
          final_conclusion: any;
        };
        report_uuid?: string;
      }
      
      let requestData: RequestData = { analysis_data: analysisData };
      if (report_uuid) {
        requestData.report_uuid = report_uuid;
      } else if (currentReport?.id) {
        requestData.report_uuid = currentReport.id;
      }

      // console.log('Sending analysis data to backend:', requestData);

      const response = await fetch(`${API_URL}/deep_analysis/download_report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeSessionId && { 'X-Session-ID': activeSessionId })
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `deep-analysis-report-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "HTML report downloaded successfully! 📄",
        description: "Your deep analysis report has been saved to your downloads folder. You can print it as PDF using your browser.",
        duration: 4000,
      });
      
    } catch (error) {
      console.error('Failed to download report:', error);
      
      toast({
        title: "Download failed",
        description: "Failed to generate HTML report. Please try again later.",
        variant: "destructive",
        duration: 5000,
      });
      
      // Try fallback with cached data
      const fallbackHtml = currentReport?.html_report || reportData?.html_report;
      if (fallbackHtml) {
        const blob = new Blob([fallbackHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deep-analysis-report-fallback-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Fallback download successful",
          description: "Report downloaded using cached data. You can print it as PDF using your browser.",
          duration: 3000,
        });
      } else {
        toast({
          title: "Download completely failed",
          description: "Unable to download the report. Please try again later.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } finally {
      setDownloadingFormat(null);
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    try {
      // Delete from backend
      // Find the report to get its report_id (if we have it)
      const reportToDelete = storedReports.find(report => report.id === reportId);
      
      if (reportToDelete) {
        // Try to delete from backend first
        const response = await fetch(`${API_URL}/deep_analysis/reports/${reportId}${userId ? `?user_id=${userId}` : ''}`, {
          method: 'DELETE'
        });
        
        if (!response.ok && response.status !== 404) {
          console.warn(`Failed to delete report from backend: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    } finally {
      // Always update local state regardless of backend success
      setStoredReports(prev => prev.filter(report => report.id !== reportId));
      if (selectedHistoryReport?.id === reportId) {
        setSelectedHistoryReport(null);
      }
    }
  }

  const handleSelectHistoryReport = (report: StoredReport) => {
    setSelectedHistoryReport(report)
    setActiveTab('history')
  }

  if (!isOpen) return null

  return (
    <>
      {/* Minimized simple arrow */}
      {isCollapsed && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed top-1/2 right-0 transform -translate-y-1/2 z-50"
        >
          <button
            onClick={() => setIsCollapsed(false)}
            className="bg-white shadow-lg border border-gray-200 rounded-l-md p-2 hover:bg-gray-50 transition-colors flex items-center"
            title="Expand Deep Analysis"
          >
            <ChevronLeft className="w-4 h-4 text-[#FF7F7F]" />
            {currentReport?.status === 'running' && (
              <div className="w-1 h-4 bg-[#FF7F7F] rounded-full ml-1 animate-pulse" />
            )}
          </button>
        </motion.div>
      )}

      {/* Full sidebar */}
      {!isCollapsed && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 w-96 overflow-hidden"
        >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#FF7F7F]" />
            <h2 className="font-semibold text-sm text-gray-800">Deep Analysis</h2>
            <Badge variant="secondary" className="text-xs">Premium</Badge>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 mx-3 mt-3 mb-2 flex-shrink-0">
              <TabsTrigger value="new" className="text-xs">New</TabsTrigger>
              <TabsTrigger value="current" className="text-xs">
                Current
                {currentReport?.status === 'running' && (
                  <span className="ml-1 w-2 h-2 bg-[#FF7F7F] rounded-full animate-pulse"></span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="flex-1 min-h-0 overflow-hidden">
              <NewAnalysisForm
                goal={goal}
                setGoal={setGoal}
                onStartAnalysis={handleStartAnalysis}
                isAnalysisRunning={currentReport?.status === 'running'}
                storedReports={storedReports}
                onSelectReport={handleSelectHistoryReport}
              />
            </TabsContent>

            <TabsContent value="current" className="flex-1 min-h-0 overflow-hidden">
              <CurrentAnalysisView
                currentReport={currentReport}
                refreshTrigger={refreshTrigger}
                onDownloadReport={handleDownloadReport}
                downloadingFormat={downloadingFormat}
              />
            </TabsContent>

            <TabsContent value="history" className="flex-1 min-h-0 overflow-hidden">
              <HistoryView
                storedReports={storedReports}
                selectedHistoryReport={selectedHistoryReport}
                onSelectReport={setSelectedHistoryReport}
                onDownloadReport={handleDownloadReport}
                onDeleteReport={handleDeleteReport}
                downloadingFormat={downloadingFormat}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

        </motion.div>
      )}
      
      {/* Premium Upgrade Modal */}
      <Dialog open={showPremiumUpgradeModal} onOpenChange={setShowPremiumUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Crown className="w-6 h-6 text-yellow-500" />
              Deep Analysis - Premium Feature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-[#FF7F7F]/20">
              <Lock className="w-6 h-6 text-[#FF7F7F]" />
              <div>
                <h4 className="font-semibold text-gray-900 text-base">Upgrade Required</h4>
                <p className="text-base text-gray-700 mt-1">
                  You need to upgrade to the standard tier to use this. Here is a <a href="https://firebird-technologies.github.io/" className="text-[#FF7F7F] hover:underline underline" target="_blank" rel="noopener noreferrer">sample report</a>.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-900 text-base">What it can do:</h5>
              <ul className="text-base text-gray-700 space-y-2 ml-4">
                <li>• Asks deeper, smarter questions.</li>
                <li>• Builds a strategic plan and delegates with precision.</li>
                <li>• Synthesizes everything into a clear conclusion.</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-4">
              <Link href="/pricing" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-[#FF7F7F] to-[#FF6666] hover:from-[#FF6666] hover:to-[#E55555] text-white">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => setShowPremiumUpgradeModal(false)}
                className="px-6"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={insufficientCreditsModalOpen}
        onClose={() => {
          // When the modal is closed, hide the modal
          setInsufficientCreditsModalOpen(false)
          
          // Force a credits check to ensure the current state is accurate
          if (checkCredits) {
            checkCredits().then(() => {
              console.log("[Deep Analysis] Credits checked after modal closed")
            })
          }
        }}
        requiredCredits={requiredCredits}
      />
    </>
  )
} 