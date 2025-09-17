"use client"

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import API_URL from '@/config/api'
import { useSessionStore } from '@/lib/store/sessionStore'

// Define AgentInfo interface here instead of importing from deleted component
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

  // Fetch available agents on mount and when session ID changes
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        // Use sessionStore instead of localStorage
        const { sessionId: storeSessionId } = useSessionStore.getState()
        const currentSessionId = sessionId || storeSessionId
        
        if (!currentSessionId) {
          console.warn('No sessionId available for fetching agents')
          setAvailableAgents([])
          return
        }

        console.log('🔍 Fetching agents with sessionId:', currentSessionId)
        
        const response = await axios.get(`${API_URL}/agents`, {
          headers: { 'X-Session-ID': currentSessionId }
        })
        
        console.log('🔍 Agents response:', response.data)
        
        if (response.data && Array.isArray(response.data)) {
          const agentList: AgentInfo[] = response.data.map((agent: any) => ({
            name: agent.name || agent,
            description: agent.description || `Specialized ${agent.name?.replace(/_/g, " ") || agent} agent`,
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

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!showAgentMentions || filteredAgents.length === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedMentionIndex(prev => 
          prev < filteredAgents.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredAgents.length - 1
        )
        break
      case 'Enter':
        event.preventDefault()
        if (filteredAgents[selectedMentionIndex]) {
          selectAgent(filteredAgents[selectedMentionIndex])
        }
        break
      case 'Escape':
        event.preventDefault()
        hideMentions()
        break
    }
  }

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showAgentMentions, filteredAgents, selectedMentionIndex])

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
  }
}
