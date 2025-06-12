// Template-related types
export interface TemplateAgent {
  agent_id: number
  agent_name: string
  display_name: string
  description: string
  prompt_template: string
  template_category: string
  is_premium_only: boolean
  is_active: boolean
  usage_count: number
  created_at: string
}

export interface TemplatesByCategory {
  category: string
  templates: TemplateAgent[]
}

// Types for cloning templates to custom agents
export interface CustomAgentCreate {
  agent_name: string
  display_name?: string
  description: string
  prompt_template: string
}

export interface AgentValidationResponse {
  agent_name: string
  is_available: boolean
  message: string
}

// Tab types for navigation
export type TemplateTabType = 'templates' | 'template-details' 