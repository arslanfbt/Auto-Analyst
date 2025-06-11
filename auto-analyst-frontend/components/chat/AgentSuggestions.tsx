"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import API_URL from '@/config/api'

interface AgentSuggestion {
  name: string
  description: string
  isCustom?: boolean
}

interface AgentSuggestionsProps {
  message: string
  cursorPosition: number
  onSuggestionSelect: (agentName: string) => void
  isVisible: boolean
  userId?: number | null
}

export default function AgentSuggestions({
  message,
  cursorPosition,
  onSuggestionSelect,
  isVisible,
  userId
}: AgentSuggestionsProps) {
  const [agents, setAgents] = useState<AgentSuggestion[]>([])
  const [filteredAgents, setFilteredAgents] = useState<AgentSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const { data: session } = useSession()
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
      console.log('AgentSuggestions - Using userId prop:', userId);
      return userId
    }
    
    if (session?.user?.id) {
      console.log('AgentSuggestions - Using session user ID:', parseInt(session.user.id));
      return parseInt(session.user.id)
    }
    const adminId = localStorage.getItem('adminUserId')
    if (adminId) {
      console.log('AgentSuggestions - Using adminUserId from localStorage:', parseInt(adminId));
      return parseInt(adminId)
    }
    console.log('AgentSuggestions - No userId found');
    return null
  }

  // Fetch agents from the main agents endpoint (includes both standard and custom)
  const fetchAllAgents = async (): Promise<AgentSuggestion[]> => {
    const currentUserId = getUserId()
    console.log('fetchAllAgents - currentUserId:', currentUserId);
    
    try {
      // Build URL with user_id if available
      let agentsUrl = `${API_URL}/agents`
      if (currentUserId) {
        agentsUrl += `?user_id=${currentUserId}`
      }
      
      console.log('fetchAllAgents - agentsUrl:', agentsUrl);
      const response = await fetch(agentsUrl)
      console.log('fetchAllAgents - response status:', response.status);
      
      if (response.ok) {
        const data = await response.json()
        console.log('fetchAllAgents - response data:', data);
        const allAgents: AgentSuggestion[] = []
        
        // Add standard agents
        if (data.standard_agents) {
          data.standard_agents.forEach((agentName: string) => {
            const standardAgent = standardAgents.find(agent => agent.name === agentName)
            if (standardAgent) {
              allAgents.push(standardAgent)
            }
          })
        }
        
        // Add custom agents
        if (data.custom_agents && data.custom_agents.length > 0) {
          console.log('fetchAllAgents - found custom agents, fetching details...');
          // Fetch custom agent details
          const customAgents = await fetchCustomAgents()
          console.log('fetchAllAgents - custom agent details:', customAgents);
          allAgents.push(...customAgents)
        }
        
        console.log('fetchAllAgents - final allAgents:', allAgents);
        return allAgents
      } else {
        console.error('Failed to fetch agents:', response.status, await response.text())
        // Fallback to standard agents only
        return standardAgents
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      // Fallback to standard agents only
      return standardAgents
    }
  }

  // Fetch custom agents
  const fetchCustomAgents = async (): Promise<AgentSuggestion[]> => {
    const currentUserId = getUserId()
    if (!currentUserId) {
      return []
    }

    try {
      const customAgentsUrl = `${API_URL}/custom_agents/?user_id=${currentUserId}`
      const response = await fetch(customAgentsUrl)
      
      if (response.ok) {
        const customAgents = await response.json()
        const mappedAgents = customAgents.map((agent: any) => ({
          name: agent.agent_name,
          description: agent.description,
          isCustom: true
        }))
        return mappedAgents
      } else {
        console.error('Failed to fetch custom agents:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Error fetching custom agents:', error)
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
  }, [session, userId])

  // Add event listener to refresh agents when custom agents are created/updated
  useEffect(() => {
    const handleRefreshAgents = () => {
      const loadAgents = async () => {
        const allAgents = await fetchAllAgents()
        setAgents(allAgents)
      }
      loadAgents()
    }

    // Listen for custom events that signal agent changes
    window.addEventListener('custom-agents-updated', handleRefreshAgents)
    
    return () => {
      window.removeEventListener('custom-agents-updated', handleRefreshAgents)
    }
  }, [session, userId])

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
      
      // Only show suggestions if we're actively typing an agent name
      if (typedText && !typedText.includes(' ')) {
        const filtered = agents.filter(agent => 
          agent.name.toLowerCase().includes(typedText.toLowerCase())
        )
        setFilteredAgents(filtered)
        setSelectedIndex(filtered.length > 0 ? 0 : -1)
        return
      }
    }
    
    setFilteredAgents([])
    setSelectedIndex(-1)
  }, [message, cursorPosition, agents, isVisible])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || filteredAgents.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < filteredAgents.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredAgents.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < filteredAgents.length) {
            onSuggestionSelect(filteredAgents[selectedIndex].name)
          }
          break
        case 'Escape':
          e.preventDefault()
          setFilteredAgents([])
          setSelectedIndex(-1)
          break
      }
    }

    // Add event listener to document to capture keyboard events
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
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
              {agent.isCustom && (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                  Custom
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">{agent.description}</div>
          </div>
        ))}
      </motion.div>
    </AnimatePresence>
  )
} 