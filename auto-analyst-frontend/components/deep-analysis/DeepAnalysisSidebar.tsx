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
import { DeepAnalysisService } from './DeepAnalysisService'

interface DeepAnalysisSidebarProps {
  isOpen: boolean
  onClose: () => void
  sessionId?: string
}

export default function DeepAnalysisSidebar({ 
  isOpen, 
  onClose, 
  sessionId 
}: DeepAnalysisSidebarProps) {
  const { state: analysisState, startAnalysis, updateProgress, completeAnalysis, failAnalysis } = useDeepAnalysis()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'new' | 'current' | 'history'>('new')
  const [goal, setGoal] = useState('')
  const [currentReport, setCurrentReport] = useState<DeepAnalysisReport | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
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
  const [isDownloadingReport, setIsDownloadingReport] = useState(false)
  
  const activeSessionId = sessionId || storeSessionId

  const forceUpdate = () => setRefreshTrigger(prev => prev + 1)

  const initialSteps: AnalysisStep[] = [
    { step: 'initialization', status: 'pending', message: 'Preparing analysis...' },
    { step: 'questions', status: 'pending', message: 'Generating analytical questions...' },
    { step: 'planning', status: 'pending', message: 'Creating analysis plan...' },
    { step: 'analysis', status: 'pending', message: 'Executing analysis...' },
    { step: 'report', status: 'pending', message: 'Generating report...' },
    { step: 'completed', status: 'pending', message: 'Finalizing results...' }
  ]

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

  const updateStep = (stepName: string, status: AnalysisStep['status'], message?: string, content?: string, progressValue?: number) => {
    setCurrentReport(prevReport => {
      if (!prevReport) return prevReport
      
      const updatedSteps = prevReport.steps.map(step => 
        step.step === stepName 
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

  const markPreviousStepsCompleted = (currentStepName: string) => {
    const stepOrder = ['initialization', 'questions', 'planning', 'analysis', 'report', 'completed']
    const currentStepIndex = stepOrder.indexOf(currentStepName)
    
    if (currentStepIndex > 0) {
      setCurrentReport(prevReport => {
        if (!prevReport) return prevReport
        
        const updatedSteps = prevReport.steps.map(step => {
          const stepIndex = stepOrder.indexOf(step.step)
          if (stepIndex < currentStepIndex && step.status === 'pending') {
            return { ...step, status: 'completed' as AnalysisStep['status'], timestamp: new Date().toISOString() }
          }
          return step
        })
        
        const updatedReport = {
          ...prevReport,
          steps: updatedSteps
        }
        
        setTimeout(() => forceUpdate(), 10)
        
        return updatedReport
      })
    }
  }

  const handleStartAnalysis = async () => {
    if (!goal.trim()) return
    
    // Check if user has access to Deep Analysis feature
    if (!deepAnalysisAccess.hasAccess) {
      console.log('[Deep Analysis] Feature access denied:', deepAnalysisAccess.reason)
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
          console.log(`[Deep Analysis] Insufficient credits. Required: ${deepAnalysisCost}, Available: ${remainingCredits}`)
          
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
      // Extract user ID for database operations
      let userId: number | undefined = undefined
      if (session?.user) {
        // Try different ways to extract user ID
        if ((session.user as any).sub) {
          // Use sub as user ID (Auth0/OAuth style)
          userId = parseInt((session.user as any).sub) || undefined
        } else if ((session.user as any).id) {
          userId = parseInt((session.user as any).id) || undefined
        }
        
        // If we still don't have a numeric user ID, let's create/get user via email
        if (!userId && session.user.email) {
          try {
            const userResponse = await fetch(`${API_URL}/chats/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(activeSessionId && { 'X-Session-ID': activeSessionId })
              },
              body: JSON.stringify({
                username: session.user.name || 'Anonymous User',
                email: session.user.email
              })
            })
            
            if (userResponse.ok) {
              const userData = await userResponse.json()
              userId = userData.user_id
              console.log('[Deep Analysis] Created/found user with ID:', userId)
            }
          } catch (userError) {
            console.warn('[Deep Analysis] Failed to create/get user:', userError)
          }
        }
      }
      
      console.log('[Deep Analysis] Using user ID:', userId)
      
      // Use the new database-integrated streaming endpoint
      const response = await fetch(`${API_URL}/deep_analysis/streaming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeSessionId && { 'X-Session-ID': activeSessionId })
        },
        body: JSON.stringify({ 
          goal: goal.trim(),
          user_id: userId
        })
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
              console.log('Skipping non-JSON line:', trimmedLine)
              continue
            }
            
            console.log('Received streaming data:', data)
            
            if (data.type === 'step_update' || (data.step && data.status)) {
              const step = data.step
              const status = data.status
              const message = data.message
              const progress = data.progress
              
              console.log(`Step update: ${step} - ${status} (${progress}%)`)
              
              if (status === 'processing' || status === 'starting' || status === 'completed' || status === 'success') {
                markPreviousStepsCompleted(step)
                
                if (step === 'report') {
                  setTimeout(() => {
                    setCurrentReport(prevReport => {
                      if (!prevReport) return prevReport
                      
                      const updatedSteps = prevReport.steps.map(s => {
                        if (['initialization', 'questions', 'planning', 'analysis'].includes(s.step) && s.status !== 'completed') {
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
              
              updateStep(step, status, message, data.content, progress)
              
              if (progress !== undefined) {
                updateProgress(progress, message)
              }
              
              if (step === 'completed' && (status === 'completed' || status === 'success')) {
                console.log('Analysis completed successfully')
                
                markAllStepsCompleted()
                
                // Show completion notification
                toast({
                  title: "Deep Analysis Complete! 🎉",
                  description: "Your analysis report is ready for download.",
                  duration: 5000,
                })
                
                setCurrentReport(prevReport => {
                  if (!prevReport) return prevReport
                  
                  return {
                    ...prevReport,
                    status: 'completed',
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
                
                completeAnalysis()
                
                // Deduct credits for successful deep analysis (only for paid users)
                if (session) {
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
                      console.log(`[Deep Analysis] Deducting ${deepAnalysisCost} credits for user ${userIdForCredits}`)
                      
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
                        console.log('[Deep Analysis] Credits deducted successfully')
                        
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
                
                // Analysis is now saved automatically by the database streaming endpoint
              }
            } else if (data.type === 'final_result') {
              console.log('Received final result')
              
              markAllStepsCompleted()
              
              setCurrentReport(prevReport => {
                if (!prevReport) return prevReport
                
                return {
                  ...prevReport,
                  status: 'completed',
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
              
              completeAnalysis()
              
              // Deduct credits for successful deep analysis (only for paid users)
              if (session) {
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
                    console.log(`[Deep Analysis] Deducting ${deepAnalysisCost} credits for user ${userIdForCredits}`)
                    
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
                      console.log('[Deep Analysis] Credits deducted successfully')
                      
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
              
              // Analysis is now saved automatically by the database streaming endpoint
            } else if (data.type === 'error' || data.error) {
              console.error('Analysis error:', data.error || data.message)
              
              toast({
                title: "Analysis Failed",
                description: data.error || data.message || "An error occurred during analysis.",
                variant: "destructive",
                duration: 5000,
              })
              
              setCurrentReport(prev => prev ? {
                ...prev,
                status: 'failed',
                endTime: new Date().toISOString()
              } : null)
              
              failAnalysis()
              
              // Error handling - could optionally save to database here too
            }
            
          } catch (parseError) {
            console.warn('Failed to parse streaming data:', parseError, 'Raw line:', trimmedLine)
          }
        }
      }
      
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim())
          console.log('Processing final buffer data:', data)
        } catch (error) {
          console.warn('Failed to parse final buffer:', error)
        }
      }
      
    } catch (error) {
      console.error('Analysis failed:', error)
      
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Network error occurred during analysis.",
        variant: "destructive",
        duration: 5000,
      })
      
      setCurrentReport(prev => prev ? {
        ...prev,
        status: 'failed',
        endTime: new Date().toISOString()
      } : null)
      
      failAnalysis()
      
      // Error handling - could optionally save to database here too
    }
  }

  const handleDownloadReport = async (chatId?: number, reportData?: any) => {
    console.log('[DeepAnalysisSidebar] handleDownloadReport called with:', { chatId, reportData, chatIdType: typeof chatId })
    
    if (isDownloadingReport) {
      toast({
        title: "Download in progress",
        description: "Please wait while your report is being prepared...",
        duration: 3000,
      })
      return
    }

    setIsDownloadingReport(true)
    
    toast({
      title: "Preparing your report...",
      description: "This may take a few seconds. Please don't close this window.",
      duration: 3000,
    })

    try {
      if (chatId && typeof chatId === 'number') {
        console.log('[DeepAnalysisSidebar] Using database download for chatId:', chatId)
        // Use database download
        const userId = DeepAnalysisService.getUserId(session)
        await DeepAnalysisService.downloadReport(chatId, activeSessionId || undefined, userId)
      } else {
        console.log('[DeepAnalysisSidebar] Using legacy download, chatId:', chatId, 'reportData:', !!reportData)
        // Fallback to legacy download for current report
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
          }
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
          }
        } else {
          throw new Error('No analysis data available for download')
        }

        const response = await fetch(`${API_URL}/deep_analysis/download_report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(activeSessionId && { 'X-Session-ID': activeSessionId })
          },
          body: JSON.stringify({ analysis_data: analysisData })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = `deep-analysis-report-${Date.now()}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      
      toast({
        title: "Report downloaded successfully! 📄",
        description: "Your deep analysis report has been saved to your downloads folder.",
        duration: 4000,
      })
      
    } catch (error) {
      console.error('Failed to download report:', error)
      
      toast({
        title: "Download failed",
        description: "Failed to generate report. Please try again later.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsDownloadingReport(false)
    }
  }

  const handleDeleteReport = async (chatId: number) => {
    try {
      const userId = DeepAnalysisService.getUserId(session)
      await DeepAnalysisService.deleteReport(chatId, activeSessionId || undefined, userId)
      
      toast({
        title: "Analysis deleted",
        description: "The analysis has been removed from your history.",
        duration: 3000,
      })
    } catch (error) {
      console.error('Failed to delete analysis:', error)
      toast({
        title: "Delete failed",
        description: "Failed to delete the analysis. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.3 }}
      className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 ${
        isCollapsed ? 'w-16' : 'w-96'
      }`}
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

            <TabsContent value="new" className="flex-1 min-h-0">
              <NewAnalysisForm
                goal={goal}
                setGoal={setGoal}
                onStartAnalysis={handleStartAnalysis}
                isAnalysisRunning={currentReport?.status === 'running'}
                storedReports={[]}
                onSelectReport={() => {}}
              />
            </TabsContent>

            <TabsContent value="current" className="flex-1 min-h-0">
              <CurrentAnalysisView
                currentReport={currentReport}
                refreshTrigger={refreshTrigger}
                onDownloadReport={handleDownloadReport}
                isDownloadingReport={isDownloadingReport}
              />
            </TabsContent>

            <TabsContent value="history" className="flex-1 min-h-0">
              <HistoryView
                sessionId={activeSessionId || undefined}
                onDownloadReport={handleDownloadReport}
                onDeleteReport={handleDeleteReport}
                isDownloadingReport={isDownloadingReport}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Collapsed State Indicator */}
      {isCollapsed && currentReport?.status === 'running' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-1">
            <Loader2 className="w-5 h-5 animate-spin text-[#FF7F7F]" />
            <div className="text-xs text-gray-600 text-center font-medium">
              {Math.round(currentReport.progress)}%
            </div>
            <div className="text-xs text-gray-500 text-center max-w-[50px] leading-tight">
              {currentReport.steps.find(s => s.status === 'processing' || s.status === 'starting')?.step?.replace('_', ' ') || 'Processing'}
            </div>
          </div>
        </div>
      )}

      {/* Premium Upgrade Modal */}
      <Dialog open={showPremiumUpgradeModal} onOpenChange={setShowPremiumUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Deep Analysis - Premium Feature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-[#FF7F7F]/20">
              <Lock className="w-6 h-6 text-[#FF7F7F]" />
              <div>
                <h4 className="font-medium text-gray-900">Upgrade Required</h4>
                <p className="text-sm text-gray-600">
                  Deep Analysis is a premium feature that provides a comprehensive research report examining your data from every possible angle, uncovering hidden patterns and relationships.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h5 className="font-medium text-gray-900">What you'll get:</h5>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Advanced statistical analysis</li>
                <li>• Detailed visualizations and insights</li>
                <li>• Comprehensive research report</li>
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
    </motion.div>
  )
} 