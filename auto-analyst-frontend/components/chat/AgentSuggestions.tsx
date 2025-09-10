"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import API_URL from '@/config/api'
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'

interface AgentSuggestion {
  name: string
  description: string
  isCustom?: boolean
  isTemplate?: boolean
  isPremium?: boolean
}







interface AgentSuggestionsProps {
  message: string
  cursorPosition: number
  onSuggestionSelect: (agentName: string) => void
  isVisible: boolean
  userId?: number | null
  onStateChange?: (hasSelection: boolean) => void
}

export default function AgentSuggestions({
  message,
  cursorPosition,
  onSuggestionSelect,
  isVisible,
  userId,
  onStateChange
}: AgentSuggestionsProps) {
  const [agents, setAgents] = useState<AgentSuggestion[]>([])
  const [filteredAgents, setFilteredAgents] = useState<AgentSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const { data: session } = useSession()
  const { subscription } = useUserSubscriptionStore()
  const customAgentsAccess = useFeatureAccess('CUSTOM_AGENTS', subscription)
  const containerRef = useRef<HTMLDivElement>(null)

  // Standard agents
  const standardAgents: AgentSuggestion[] = [
    { name: "data_viz_agent", description: "Specializes in data visualization" },
    { name: "sk_learn_agent", description: "Handles machine learning tasks" },
    { name: "statistical_analytics_agent", description: "Performs statistical analysis" },
    { name: "preprocessing_agent", description: "Handles data preprocessing tasks" },
  ]

  // Get user ID helper function
  const getUserId = (): number | null => {
    // Prioritize userId prop if provided
    if (userId !== undefined && userId !== null) {
      return userId
    }
    
    if (session?.user?.id) {
      return parseInt(session.user.id)
    }
    const adminId = localStorage.getItem('adminUserId')
    if (adminId) {
      return parseInt(adminId)
    }
    return null
  }

  // Fetch agents from the main agents endpoint (now all are templates in DB)
  const fetchAllAgents = async (): Promise<AgentSuggestion[]> => {
    const currentUserId = getUserId()
    
    try {
      // Build URL with user_id if available
      let agentsUrl = `${API_URL}/agents`
      if (currentUserId) {
        agentsUrl += `?user_id=${currentUserId}`
      }
      
      const response = await fetch(agentsUrl)
      
      if (response.ok) {
        const data = await response.json()
        const allAgents: AgentSuggestion[] = []
        
        // All agents are now template agents from the database
        // Load all template agents, filtering will be done based on premium access
        if (data.template_agents && data.template_agents.length > 0) {
          const templateAgents = await fetchTemplateAgents()
          allAgents.push(...templateAgents)
        }
        
        return allAgents
      } else {
        console.error('Failed to fetch agents:', response.status, await response.text())
        // Fallback to empty array since all agents should be in DB now
        return []
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      // Fallback to empty array since all agents should be in DB now
      return []
    }
  }

  // Fetch template agents
  const fetchTemplateAgents = async (): Promise<AgentSuggestion[]> => {
    try {
      // Only fetch individual variants for @ mentions
      const templatesUrl = `${API_URL}/templates/categories?variant_type=individual`
      const response = await fetch(templatesUrl)
      
      if (response.ok) {
        const templateCategories = await response.json()
        const allTemplates: AgentSuggestion[] = []
        console.log("templateCategories", templateCategories)
        // Flatten all templates from all categories
        templateCategories.forEach((category: any) => {
          if (category.templates) {
            const mappedTemplates = category.templates.map((template: any) => ({
              name: template.agent_name,
              description: template.description,
              isTemplate: true,
              isPremium: template.is_premium_only
            }))
            // Filter out premium agents if user doesn't have access
            const filteredTemplates = customAgentsAccess.hasAccess 
              ? mappedTemplates 
              : mappedTemplates.filter((template: any) => !template.isPremium)
            allTemplates.push(...filteredTemplates)
          }
        })
        
        return allTemplates
      } else {
        console.error('Failed to fetch template agents:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Error fetching template agents:', error)
    }
    return []
  }

  // Load all agents on component mount
  useEffect(() => {
    const loadAgents = async () => {
      const allAgents = await fetchAllAgents()
      setAgents(allAgents)
    }
    loadAgents()
  }, [session, userId, customAgentsAccess.hasAccess])

  // Filter agents based on current typing
  useEffect(() => {
    if (!isVisible || !message.includes('@')) {
      setFilteredAgents([])
      setSelectedIndex(-1)
      return
    }

    // Find all @ symbol positions in the message
    const atPositions: number[] = []
    let pos = -1
    while ((pos = message.indexOf('@', pos + 1)) !== -1) {
      atPositions.push(pos)
    }

    // Find the @ position closest to the cursor that's being typed
    let activeAtPos = -1
    for (const pos of atPositions) {
      // Check if the cursor is within or at the end of an agent mention
      const textAfterAt = message.slice(pos + 1)
      const spaceAfterAt = textAfterAt.indexOf(' ')
      const endOfMention = spaceAfterAt !== -1 ? pos + 1 + spaceAfterAt : message.length
      
      if (cursorPosition >= pos + 1 && cursorPosition <= endOfMention) {
        activeAtPos = pos
        break
      }
    }

    if (activeAtPos !== -1) {
      // Get the text being typed for the agent name
      const textAfterAt = message.slice(activeAtPos + 1)
      const spaceIndex = textAfterAt.indexOf(' ')
      const typedText = spaceIndex !== -1 
        ? message.slice(activeAtPos + 1, activeAtPos + 1 + spaceIndex) 
        : textAfterAt
      
      // Show suggestions if we're actively typing an agent name or just typed @
      if (!typedText.includes(' ')) {
        // If no text after @, show all agents
        if (typedText === '') {
          setFilteredAgents(agents)
          setSelectedIndex(agents.length > 0 ? 0 : -1)
          return
        }
        
        // If there's text after @, filter agents that START WITH the typed text (autocomplete-style)
        const filtered = agents.filter(agent => 
          agent.name.toLowerCase().startsWith(typedText.toLowerCase())
        )
        setFilteredAgents(filtered)
        setSelectedIndex(filtered.length > 0 ? 0 : -1)
        return
      }
    }
    
    setFilteredAgents([])
    setSelectedIndex(-1)
  }, [message, cursorPosition, agents, isVisible])

  // Report state changes to parent component
  useEffect(() => {
    const hasValidSelection = filteredAgents.length > 0 && selectedIndex >= 0 && selectedIndex < filteredAgents.length
    onStateChange?.(hasValidSelection)
  }, [filteredAgents, selectedIndex, onStateChange])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || filteredAgents.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex(prev => 
            prev < filteredAgents.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredAgents.length - 1
          )
          break
        case 'Enter':
          // Only handle Enter if there's a valid selection
          if (selectedIndex >= 0 && selectedIndex < filteredAgents.length) {
            e.preventDefault()
            e.stopPropagation()
            onSuggestionSelect(filteredAgents[selectedIndex].name)
          }
          // If no valid selection, let the event bubble up to ChatInput
          break
        case 'Escape':
          e.preventDefault()
          e.stopPropagation()
          setFilteredAgents([])
          setSelectedIndex(-1)
          break
      }
    }

    // Add event listener to document to capture keyboard events
    document.addEventListener('keydown', handleKeyDown, true) // Use capture phase
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isVisible, filteredAgents, selectedIndex, onSuggestionSelect])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && containerRef.current) {
      const selectedElement = containerRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [selectedIndex])

  if (!isVisible || filteredAgents.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-0 mb-2 w-full max-h-40 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50"
      >
        {filteredAgents.map((agent, index) => (
          <div
            key={agent.name}
            onClick={() => onSuggestionSelect(agent.name)}
            className={`px-4 py-2 cursor-pointer transition-colors ${
              index === selectedIndex 
                ? 'bg-blue-50 border-l-4 border-blue-500' 
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-900">{agent.name}</div>
              <div className="flex gap-1">
                {agent.isPremium && (
                  <span className="text-xs px-2 py-1 bg-[#FF7F7F]/12 text-[#000000] rounded-full">
                    Template
                  </span>
                )}
                {agent.isCustom && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                    Custom
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">{agent.description}</div>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  )
} 