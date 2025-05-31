"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle2, Brain, BarChart3, TrendingUp, Target, FileText, Download } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { useSessionStore } from '@/lib/store/sessionStore'
import API_URL from '@/config/api'
import ReactMarkdown from 'react-markdown'
import PlotlyChart from '../chat/PlotlyChart'

interface DeepAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  initialGoal?: string
  sessionId?: string
}

interface AnalysisStep {
  step: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
  content?: string
  progress?: number
}

interface DeepAnalysisResponse {
  goal: string
  deep_questions: string
  deep_plan: string
  summaries: string[]
  code: string
  plotly_figs: any[]
  synthesis: string[]
  final_conclusion: string
  html_report?: string
}

export default function DeepAnalysisModal({ 
  isOpen, 
  onClose, 
  initialGoal = '',
  sessionId 
}: DeepAnalysisModalProps) {
  const [goal, setGoal] = useState(initialGoal)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([])
  const [currentStep, setCurrentStep] = useState('')
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<DeepAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { sessionId: storeSessionId } = useSessionStore()
  const eventSourceRef = useRef<EventSource | null>(null)

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

  useEffect(() => {
    if (isOpen && initialGoal) {
      setGoal(initialGoal)
    }
  }, [isOpen, initialGoal])

  useEffect(() => {
    if (isOpen) {
      setAnalysisSteps(initialSteps)
      setProgress(0)
      setResults(null)
      setError(null)
    }
  }, [isOpen])

  const updateStep = (stepName: string, status: AnalysisStep['status'], message?: string, content?: string, progressValue?: number) => {
    setAnalysisSteps(prev => 
      prev.map(step => 
        step.step === stepName 
          ? { ...step, status, message: message || step.message, content, progress: progressValue }
          : step
      )
    )
    
    if (progressValue !== undefined) {
      setProgress(progressValue)
    }
  }

  const handleAnalyze = async () => {
    if (!goal.trim()) return
    
    setIsAnalyzing(true)
    setError(null)
    setCurrentStep('Starting analysis...')
    
    try {
      // Use streaming endpoint for real-time updates
      const response = await fetch(`${API_URL}/deep_analysis_streaming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeSessionId && { 'X-Session-ID': activeSessionId })
        },
        body: JSON.stringify({ goal })
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            
            if (data.step && data.status) {
              updateStep(data.step, data.status, data.message, data.content, data.progress)
              
              if (data.step === 'completed' && data.status === 'success') {
                setResults({
                  goal: data.analysis?.goal || goal,
                  deep_questions: data.analysis?.deep_questions || '',
                  deep_plan: data.analysis?.deep_plan || '',
                  summaries: data.analysis?.summaries || [],
                  code: data.analysis?.code || '',
                  plotly_figs: data.analysis?.plotly_figs || [],
                  synthesis: data.analysis?.synthesis || [],
                  final_conclusion: data.analysis?.final_conclusion || '',
                  html_report: data.html_report
                })
                setProgress(100)
              } else if (data.status === 'failed') {
                setError(data.message || 'Analysis failed')
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse streaming data:', parseError)
          }
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      setError(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDownloadReport = () => {
    if (results?.html_report) {
      const blob = new Blob([results.html_report], { type: 'text/html' })
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Deep Analysis
            <Badge variant="secondary" className="ml-2">Premium Feature</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Goal Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Analysis Goal</label>
            <Textarea
              placeholder="What would you like to analyze? Be specific about your goals..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isAnalyzing}
              rows={3}
            />
          </div>

          {/* Start Analysis Button */}
          {!isAnalyzing && !results && (
            <Button 
              onClick={handleAnalyze}
              disabled={!goal.trim()}
              className="w-full"
            >
              <Target className="w-4 h-4 mr-2" />
              Start Deep Analysis
            </Button>
          )}

          {/* Progress Section */}
          {isAnalyzing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Analysis Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {analysisSteps.map((step, index) => (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
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
                    <div className="flex-1">
                      <div className="font-medium text-sm capitalize">
                        {step.step.replace('_', ' ')}
                      </div>
                      {step.message && (
                        <div className="text-xs text-gray-600 mt-1">
                          {step.message}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <X className="w-4 h-4" />
                <span className="font-medium">Analysis Failed</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  Analysis Results
                </h3>
                {results.html_report && (
                  <Button onClick={handleDownloadReport} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                )}
              </div>

              {/* Deep Questions */}
              {results.deep_questions && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Key Questions Analyzed
                  </h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <ReactMarkdown className="prose prose-sm max-w-none">
                      {results.deep_questions}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Visualizations */}
              {results.plotly_figs && results.plotly_figs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Visualizations
                  </h4>
                  <div className="space-y-4">
                    {results.plotly_figs.map((figArray, arrayIndex) => (
                      figArray.map((fig: any, figIndex: number) => (
                        <div key={`${arrayIndex}-${figIndex}`} className="border rounded-lg p-4">
                          <PlotlyChart data={fig} />
                        </div>
                      ))
                    ))}
                  </div>
                </div>
              )}

              {/* Final Conclusion */}
              {results.final_conclusion && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Conclusion
                  </h4>
                  <div className="bg-green-50 rounded-lg p-4">
                    <ReactMarkdown className="prose prose-sm max-w-none">
                      {results.final_conclusion}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 