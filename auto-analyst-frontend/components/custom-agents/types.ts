export interface CustomAgent {
  agent_id: number
  agent_name: string
  display_name?: string
  description: string
  prompt_template: string
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface CustomAgentCreate {
  agent_name: string
  display_name?: string
  description: string
  prompt_template: string
}

export interface CustomAgentUpdate {
  display_name?: string
  description?: string
  prompt_template?: string
  is_active?: boolean
}

export interface CustomAgentList {
  agent_id: number
  agent_name: string
  display_name?: string
  description: string
  is_active: boolean
  usage_count: number
  created_at: string
}

export interface AgentValidationResponse {
  agent_name: string
  is_available: boolean
  message: string
}

export type AgentFormStep = 'name' | 'description' | 'prompt' | 'review' 