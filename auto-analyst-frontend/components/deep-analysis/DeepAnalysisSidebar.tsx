"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Loader2, 
  CheckCircle2, 
  Brain, 
  BarChart3, 
  TrendingUp, 
  Target, 
  FileText, 
  Download,
  ChevronRight,
  ChevronLeft,
  Clock,
  AlertCircle,
  Archive,
  Trash2
} from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { useSessionStore } from '@/lib/store/sessionStore'
import API_URL from '@/config/api'
import ReactMarkdown from 'react-markdown'
import PlotlyChart from '../chat/PlotlyChart'
import { ScrollArea } from '../ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useDeepAnalysis } from '@/lib/contexts/deep-analysis-context'

interface DeepAnalysisSidebarProps {
  isOpen: boolean
  onClose: () => void
  sessionId?: string
}

interface AnalysisStep {
  step: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
  content?: string
  progress?: number
  timestamp?: string
}

interface DeepAnalysisReport {
  id: string
  goal: string
  status: 'running' | 'completed' | 'failed'
  startTime: string
  endTime?: string
  deep_questions: string
  deep_plan: string
  summaries: string[]
  code: string
  plotly_figs: any[]
  synthesis: string[]
  final_conclusion: string
  html_report?: string
  steps: AnalysisStep[]
  progress: number
}

interface StoredReport {
  id: string
  goal: string
  status: 'completed' | 'failed'
  startTime: string
  endTime: string
  html_report?: string
  summary: string
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
  const [storedReports, setStoredReports] = useState<StoredReport[]>([])
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<StoredReport | null>(null)
  const { sessionId: storeSessionId } = useSessionStore()
  
  // Use sessionId prop or fall back to store sessionId
  const activeSessionId = sessionId || storeSessionId

  const initialSteps: AnalysisStep[] = [
    { step: 'initialization', status: 'pending', message: 'Preparing analysis...' },
    { step: 'questions', status: 'pending', message: 'Generating analytical questions...' },
    { step: 'planning', status: 'pending', message: 'Creating analysis plan...' },
    { step: 'analysis', status: 'pending', message: 'Executing analysis...' },
    { step: 'report', status: 'pending', message: 'Generating report...' },
    { step: 'completed', status: 'pending', message: 'Finalizing results...' }
  ]

  // Load stored reports from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('deepAnalysisReports')
    if (stored) {
      try {
        setStoredReports(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to parse stored reports:', error)
      }
    }
  }, [])

  // Save reports to localStorage when storedReports changes
  useEffect(() => {
    localStorage.setItem('deepAnalysisReports', JSON.stringify(storedReports))
  }, [storedReports])

  const updateStep = (stepName: string, status: AnalysisStep['status'], message?: string, content?: string, progressValue?: number) => {
    if (!currentReport) return
    
    const updatedSteps = currentReport.steps.map(step => 
      step.step === stepName 
        ? { ...step, status, message: message || step.message, content, progress: progressValue, timestamp: new Date().toISOString() }
        : step
    )
    
    const updatedReport = {
      ...currentReport,
      steps: updatedSteps,
      progress: progressValue !== undefined ? progressValue : currentReport.progress
    }
    
    setCurrentReport(updatedReport)
  }

  const handleStartAnalysis = async () => {
    if (!goal.trim()) return
    
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
    
    // Update context state
    startAnalysis(goal.trim())
    
    try {
      // Use streaming endpoint for real-time updates
      const response = await fetch(`${API_URL}/deep_analysis_streaming`, {
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
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue
          
          try {
            // Handle different possible formats
            let data
            if (trimmedLine.startsWith('data: ')) {
              // SSE format
              data = JSON.parse(trimmedLine.substring(6))
            } else if (trimmedLine.startsWith('{')) {
              // Raw JSON format
              data = JSON.parse(trimmedLine)
            } else {
              // Skip non-JSON lines (like backend log messages)
              console.log('Skipping non-JSON line:', trimmedLine)
              continue
            }
            
            console.log('Received streaming data:', data)
            
            // Handle different types of streaming updates
            if (data.type === 'step_update' || (data.step && data.status)) {
              const step = data.step
              const status = data.status
              const message = data.message
              const progress = data.progress
              
              console.log(`Step update: ${step} - ${status} (${progress}%)`)
              
              updateStep(step, status, message, data.content, progress)
              
              // Update context progress
              if (progress !== undefined) {
                updateProgress(progress, message)
              }
              
              // Handle completion
              if (step === 'completed' && (status === 'completed' || status === 'success')) {
                console.log('Analysis completed successfully')
                const completedReport: DeepAnalysisReport = {
                  ...newReport,
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
                
                setCurrentReport(completedReport)
                completeAnalysis()
                
                // Store completed report
                const storedReport: StoredReport = {
                  id: reportId,
                  goal: goal.trim(),
                  status: 'completed',
                  startTime: newReport.startTime,
                  endTime: completedReport.endTime!,
                  html_report: data.html_report,
                  summary: (data.analysis?.final_conclusion || data.final_conclusion || 'Analysis completed').substring(0, 200) + '...'
                }
                
                setStoredReports(prev => [storedReport, ...prev])
              }
            } else if (data.type === 'final_result') {
              // Handle final result
              console.log('Received final result')
              const completedReport: DeepAnalysisReport = {
                ...newReport,
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
              
              setCurrentReport(completedReport)
              completeAnalysis()
              
              // Store completed report
              const storedReport: StoredReport = {
                id: reportId,
                goal: goal.trim(),
                status: 'completed',
                startTime: newReport.startTime,
                endTime: completedReport.endTime!,
                html_report: data.html_report,
                summary: (data.final_conclusion || 'Analysis completed').substring(0, 200) + '...'
              }
              
              setStoredReports(prev => [storedReport, ...prev])
            } else if (data.type === 'error' || data.error) {
              // Handle explicit errors
              console.error('Analysis error:', data.error || data.message)
              setCurrentReport(prev => prev ? {
                ...prev,
                status: 'failed',
                endTime: new Date().toISOString()
              } : null)
              
              failAnalysis()
              
              // Store failed report
              const failedReport: StoredReport = {
                id: reportId,
                goal: goal.trim(),
                status: 'failed',
                startTime: newReport.startTime,
                endTime: new Date().toISOString(),
                summary: data.error || data.message || 'Analysis failed'
              }
              
              setStoredReports(prev => [failedReport, ...prev])
            }
            
          } catch (parseError) {
            console.warn('Failed to parse streaming data:', parseError, 'Raw line:', trimmedLine)
            // Don't fail the entire analysis for parsing errors
          }
        }
      }
      
      // Process any remaining buffer content
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim())
          console.log('Processing final buffer data:', data)
          // Handle final data if needed
        } catch (error) {
          console.warn('Failed to parse final buffer:', error)
        }
      }
      
    } catch (error) {
      console.error('Analysis failed:', error)
      setCurrentReport(prev => prev ? {
        ...prev,
        status: 'failed',
        endTime: new Date().toISOString()
      } : null)
      
      // Update context to failed
      failAnalysis()
      
      // Store failed report
      const failedReport: StoredReport = {
        id: reportId,
        goal: goal.trim(),
        status: 'failed',
        startTime: newReport.startTime,
        endTime: new Date().toISOString(),
        summary: error instanceof Error ? error.message : 'Analysis failed'
      }
      
      setStoredReports(prev => [failedReport, ...prev])
    }
  }

  const handleDownloadReport = (htmlReport?: string) => {
    if (htmlReport) {
      const blob = new Blob([htmlReport], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deep-analysis-report-${Date.now()}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleDeleteReport = (reportId: string) => {
    setStoredReports(prev => prev.filter(report => report.id !== reportId))
    if (selectedHistoryReport?.id === reportId) {
      setSelectedHistoryReport(null)
    }
  }

  const getStepIcon = (status: AnalysisStep['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'Running...'
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
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
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-gray-800">Deep Analysis</h2>
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
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 m-4 mb-0">
              <TabsTrigger value="new" className="text-xs">New</TabsTrigger>
              <TabsTrigger value="current" className="text-xs">
                Current
                {currentReport?.status === 'running' && (
                  <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
            </TabsList>

            {/* New Analysis Tab */}
            <TabsContent value="new" className="flex-1 p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Analysis Goal</label>
                <Textarea
                  placeholder="What would you like to analyze? Be specific about your goals..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  disabled={currentReport?.status === 'running'}
                  rows={4}
                  className="resize-none"
                />
              </div>
              
              <Button 
                onClick={handleStartAnalysis}
                disabled={!goal.trim() || currentReport?.status === 'running'}
                className="w-full"
              >
                <Target className="w-4 h-4 mr-2" />
                Start Deep Analysis
              </Button>

              {storedReports.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Reports</h3>
                  <div className="space-y-2">
                    {storedReports.slice(0, 3).map((report) => (
                      <div
                        key={report.id}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedHistoryReport(report)
                          setActiveTab('history')
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{report.goal}</p>
                            <p className="text-xs text-gray-500">{formatTime(report.endTime)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            {report.status === 'completed' ? (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Current Analysis Tab */}
            <TabsContent value="current" className="flex-1 p-4">
              <ScrollArea className="h-full">
                {currentReport ? (
                  <div className="space-y-4">
                    {/* Analysis Info */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h3 className="font-medium text-sm text-gray-800 mb-1">{currentReport.goal}</h3>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Started: {formatTime(currentReport.startTime)}</span>
                        <span>{formatDuration(currentReport.startTime, currentReport.endTime)}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    {currentReport.status === 'running' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{Math.round(currentReport.progress)}%</span>
                        </div>
                        <Progress value={currentReport.progress} className="w-full" />
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex justify-center">
                      <Badge 
                        variant={
                          currentReport.status === 'completed' ? 'default' :
                          currentReport.status === 'running' ? 'secondary' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {currentReport.status === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {currentReport.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {currentReport.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {currentReport.status.charAt(0).toUpperCase() + currentReport.status.slice(1)}
                      </Badge>
                    </div>

                    {/* Steps */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Analysis Steps</h4>
                      {currentReport.steps.map((step, index) => (
                        <div
                          key={step.step}
                          className={`flex items-center gap-3 p-2 rounded-lg border ${
                            step.status === 'processing' 
                              ? 'bg-blue-50 border-blue-200' 
                              : step.status === 'completed'
                              ? 'bg-green-50 border-green-200'
                              : step.status === 'failed'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          {getStepIcon(step.status)}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium capitalize">
                              {step.step.replace('_', ' ')}
                            </div>
                            {step.message && (
                              <div className="text-xs text-gray-600 truncate">
                                {step.message}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Download Button */}
                    {currentReport.status === 'completed' && currentReport.html_report && (
                      <Button 
                        onClick={() => handleDownloadReport(currentReport.html_report)}
                        variant="outline" 
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                      </Button>
                    )}

                    {/* Results Preview */}
                    {currentReport.status === 'completed' && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Quick Preview</h4>
                        
                        {currentReport.final_conclusion && (
                          <div className="bg-green-50 rounded-lg p-3">
                            <h5 className="text-xs font-medium text-green-800 mb-1">Conclusion</h5>
                            <div className="text-xs text-green-700">
                              <ReactMarkdown className="prose prose-xs max-w-none">
                                {currentReport.final_conclusion.substring(0, 300) + '...'}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}

                        {currentReport.plotly_figs && currentReport.plotly_figs.length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <h5 className="text-xs font-medium text-blue-800 mb-1">
                              {currentReport.plotly_figs.flat().length} Visualization(s) Generated
                            </h5>
                            <p className="text-xs text-blue-700">View full report for interactive charts</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Brain className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-sm text-gray-500 mb-2">No active analysis</p>
                    <p className="text-xs text-gray-400">Start a new analysis to see progress here</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 p-4">
              <ScrollArea className="h-full">
                {selectedHistoryReport ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        onClick={() => setSelectedHistoryReport(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <h3 className="text-sm font-medium text-gray-800">Report Details</h3>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium text-sm text-gray-800 mb-2">{selectedHistoryReport.goal}</h4>
                      <div className="space-y-1 text-xs text-gray-500">
                        <div>Started: {formatTime(selectedHistoryReport.startTime)}</div>
                        <div>Completed: {formatTime(selectedHistoryReport.endTime)}</div>
                        <div>Duration: {formatDuration(selectedHistoryReport.startTime, selectedHistoryReport.endTime)}</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border p-3">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Summary</h5>
                      <p className="text-xs text-gray-600">{selectedHistoryReport.summary}</p>
                    </div>

                    <div className="flex gap-2">
                      {selectedHistoryReport.html_report && (
                        <Button 
                          onClick={() => handleDownloadReport(selectedHistoryReport.html_report)}
                          variant="outline" 
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                      <Button 
                        onClick={() => handleDeleteReport(selectedHistoryReport.id)}
                        variant="outline"
                        className="px-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Report History</h3>
                    
                    {storedReports.length > 0 ? (
                      <div className="space-y-2">
                        {storedReports.map((report) => (
                          <div
                            key={report.id}
                            className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedHistoryReport(report)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-xs font-medium text-gray-800 line-clamp-2">{report.goal}</h4>
                              <div className="flex items-center gap-1 ml-2">
                                {report.status === 'completed' ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-red-500" />
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteReport(report.id)
                                  }}
                                  className="text-gray-400 hover:text-red-500 p-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{formatTime(report.endTime)}</span>
                              <span>{formatDuration(report.startTime, report.endTime)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Archive className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500 mb-1">No reports yet</p>
                        <p className="text-xs text-gray-400">Completed analyses will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Collapsed State Indicator */}
      {isCollapsed && currentReport?.status === 'running' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <div className="text-xs text-gray-600 text-center">
              {Math.round(currentReport.progress)}%
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
} 