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

// Updated to match database structure from history endpoint
export interface StoredReport {
  chat_id: number
  title: string
  goal: string
  summary: string
  duration?: string
  created_at: string
  updated_at: string
  status: 'completed' | 'failed' | 'unknown'
  analysis_type: 'deep_analysis'
}

// Full report structure from database summary endpoint
export interface DatabaseAnalysisReport {
  chat_id: number
  title: string
  created_at: string
  user_id: number
  messages: Array<{
    message_id: number
    chat_id: number
    content: string
    sender: string
    timestamp: string
  }>
  analysis_summary: {
    goal: string
    summary: string
    duration?: string
    timestamp: string
    status: string
  }
} 