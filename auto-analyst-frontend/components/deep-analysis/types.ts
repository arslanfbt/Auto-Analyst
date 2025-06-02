export interface AnalysisStep {
  step: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'starting' | 'success'
  message?: string
  content?: string
  progress?: number
  timestamp?: string
}

export interface DeepAnalysisReport {
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

export interface StoredReport {
  id: string
  goal: string
  status: 'completed' | 'failed'
  startTime: string
  endTime: string
  html_report?: string
  summary: string
  deep_questions?: string
  deep_plan?: string
  summaries?: string[]
  code?: string
  plotly_figs?: any[]
  synthesis?: string[]
  final_conclusion?: string
} 