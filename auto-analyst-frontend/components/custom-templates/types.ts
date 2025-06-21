// Template-related types
export interface TemplateAgent {
  template_id: number
  template_name: string
  display_name: string
  description: string
  prompt_template: string
  template_category: string
  icon_url?: string
  is_premium_only: boolean
  is_active: boolean
  usage_count: number
  created_at: string
}

export interface TemplatePreference {
  template_id: number
  template_name: string
  display_name: string
  description: string
  template_category: string
  icon_url?: string
  is_premium_only: boolean
  is_enabled: boolean
  usage_count: number
  last_used_at: string | null
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

// Template modal states
export type TemplateModalTab = 'browse' | 'manage' | 'details'

export interface TemplateModalState {
  isOpen: boolean
  activeTab: TemplateModalTab
  selectedTemplate?: TemplateAgent
  searchQuery: string
}

// Feature access types
export interface FeatureAccess {
  hasAccess: boolean
  reason?: string
  upgrade_required?: boolean
} 