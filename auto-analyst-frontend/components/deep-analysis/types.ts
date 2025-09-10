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
  status: 'running' | 'completed' | 'failed' | 'pending'
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
  status: 'completed' | 'failed' | 'pending' | 'running'
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
  report_id?: number
  duration_seconds?: number
  created_at?: string
  updated_at?: string
}

// Interface for backend report model
export interface BackendReport {
  report_id: number
  report_uuid: string
  user_id?: number
  chat_id?: number
  goal: string
  status: 'completed' | 'failed' | 'pending' | 'running'
  start_time: string
  end_time?: string
  duration_seconds?: number
  deep_questions?: string
  deep_plan?: string
  summaries?: any[] 
  analysis_code?: string
  plotly_figures?: any[]
  synthesis?: any[]
  final_conclusion?: string
  html_report?: string
  report_summary?: string
  progress_percentage?: number
  steps_completed?: string[]
  created_at: string
  updated_at: string
}

// Interface for creating reports in the backend
export interface CreateReportRequest {
  report_uuid: string
  user_id?: number
  chat_id?: number
  goal: string
  status: string
  deep_questions?: string
  deep_plan?: string
  summaries?: any[]
  analysis_code?: string
  plotly_figures?: any[]
  synthesis?: any[]
  final_conclusion?: string
  html_report?: string
  report_summary?: string
  progress_percentage?: number
  duration_seconds?: number
} 