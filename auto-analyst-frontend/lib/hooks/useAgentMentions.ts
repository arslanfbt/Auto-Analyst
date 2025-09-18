"use client"

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import API_URL from '@/config/api'
import { useSessionStore } from '@/lib/store/sessionStore'
import apiClient from '@/lib/api/axiosConfig'

// Export the interface (was missing export)
export interface AgentInfo {
  name: string;
  description?: string;
}

export function useAgentMentions(sessionId?: string | null) {
  const [availableAgents, setAvailableAgents] = useState<AgentInfo[]>([])
  const [showAgentMentions, setShowAgentMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [filteredAgents, setFilteredAgents] = useState<AgentInfo[]>([])
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const mentionRef = useRef<HTMLDivElement>(null)

  // Fixed fetch function with proper sessionId handling
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        console.log('�� Fetching agents...')
        
        // Use apiClient instead of axios - it will auto-handle sessionId
        const response = await apiClient.get('/agents')
        
        console.log('�� Agents response:', response.data)
        
        if (response.data && response.data.available_agents) {
          const agentList = response.data.available_agents.map((name: string) => ({
            name,
            description: `Specialized ${name.replace(/_/g, " ")} agent`,
          }))
          setAvailableAgents(agentList)
          console.log('✅ Agents set:', agentList)
        } else {
          console.log('❌ Invalid agents response format')
          setAvailableAgents([])
        }
      } catch (error) {
        console.error('❌ Error fetching agents:', error)
        setAvailableAgents([])
      }
    }

    fetchAgents()
  }, [sessionId])

  // Filter agents based on mention query
  useEffect(() => {
    if (mentionQuery.trim() === '') {
      setFilteredAgents(availableAgents)
    } else {
      const filtered = availableAgents.filter(agent =>
        agent.name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
      setFilteredAgents(filtered)
    }
    setSelectedMentionIndex(0)
  }, [mentionQuery, availableAgents])

  const showMentions = (position: { top: number; left: number }, query: string) => {
    setMentionPosition(position)
    setMentionQuery(query)
    setShowAgentMentions(true)
    setSelectedMentionIndex(0)
  }

  const hideMentions = () => {
    setShowAgentMentions(false)
    setMentionQuery('')
    setSelectedMentionIndex(0)
  }

  const selectAgent = (agent: AgentInfo) => {
    hideMentions()
    return agent
  }

  // Separate functions for document listener vs component
  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    // Handle arrow keys, enter, escape for mentions
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>, 
    message: string, 
    cursorPosition: number, 
    target: HTMLTextAreaElement
  ) => {
    handleDocumentKeyDown(event.nativeEvent)
  }

  // Fixed event listener
  useEffect(() => {
    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => document.removeEventListener('keydown', handleDocumentKeyDown)
  }, [showAgentMentions, filteredAgents, selectedMentionIndex])

  // Fixed function signatures to match ChatInput calls
  const handleInputChange = (value: string, cursorPosition: number, target: HTMLTextAreaElement) => {
    if (value[cursorPosition - 1] === '@') {
      const rect = target.getBoundingClientRect();
      const position = { top: rect.bottom, left: rect.left };
      showMentions(position, '');
    } else {
      hideMentions();
    }
  };

  const handleMentionSelect = (agent: AgentInfo) => {
    return selectAgent(agent);
  };

  return {
    availableAgents,
    showAgentMentions,
    mentionQuery,
    mentionPosition,
    filteredAgents,
    selectedMentionIndex,
    mentionRef,
    showMentions,
    hideMentions,
    selectAgent,
    handleInputChange,     // Fixed signature
    handleMentionSelect,
    handleKeyDown,         // Fixed signature
  }
}
