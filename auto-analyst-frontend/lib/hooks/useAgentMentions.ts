"use client"

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import API_URL from '@/config/api'
import { AgentInfo } from '@/components/chat/AgentMentionDropdown'

export function useAgentMentions() {
  const [availableAgents, setAvailableAgents] = useState<AgentInfo[]>([])
  const [showAgentMentions, setShowAgentMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [filteredAgents, setFilteredAgents] = useState<AgentInfo[]>([])
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const mentionRef = useRef<HTMLDivElement>(null)

  // Fetch available agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axios.get(`${API_URL}/agents`)
        if (response.data && response.data.available_agents) {
          const agentList: AgentInfo[] = response.data.available_agents.map((name: string) => ({
            name,
            description: `Specialized ${name.replace(/_/g, " ")} agent`,
          }))
          setAvailableAgents(agentList)
        }
      } catch (error) {
        console.error("Error fetching agents:", error)
      }
    }

    fetchAgents()
  }, [])

  // Handle input changes for @ mentions
  const handleInputChange = (
    value: string, 
    cursorPosition: number,
    textareaElement: HTMLTextAreaElement
  ) => {
    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase()
      setMentionQuery(query)
      
      // Filter agents based on query
      const filtered = availableAgents.filter(agent => 
        agent.name.toLowerCase().includes(query)
      )
      setFilteredAgents(filtered)
      
      if (filtered.length > 0) {
        // Calculate position for mention dropdown
        const rect = textareaElement.getBoundingClientRect()
        const lineHeight = 24 // Approximate line height
        const lines = textBeforeCursor.split('\n').length
        const linePosition = (lines - 1) * lineHeight
        
        setMentionPosition({
          top: rect.top + linePosition - 10,
          left: rect.left + 20
        })
        setShowAgentMentions(true)
        setSelectedMentionIndex(0)
      } else {
        setShowAgentMentions(false)
      }
    } else {
      setShowAgentMentions(false)
    }
  }

  // Handle agent mention selection
  const handleMentionSelect = (
    agent: AgentInfo, 
    currentValue: string,
    cursorPosition: number,
    setValue: (value: string) => void,
    inputRef: React.RefObject<HTMLTextAreaElement>
  ) => {
    const textBeforeCursor = currentValue.substring(0, cursorPosition)
    const textAfterCursor = currentValue.substring(cursorPosition)
    
    // Replace the @query with @agent_name
    const newValue = textBeforeCursor.replace(/@\w*$/, `@${agent.name} `) + textAfterCursor
    
    setValue(newValue)
    setShowAgentMentions(false)
    
    // Focus back on textarea
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent,
    currentValue: string,
    cursorPosition: number,
    setValue: (value: string) => void,
    inputRef: React.RefObject<HTMLTextAreaElement>,
    onEnter?: () => void
  ) => {
    if (showAgentMentions && filteredAgents.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex(prev => 
          prev < filteredAgents.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredAgents.length - 1
        )
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleMentionSelect(
          filteredAgents[selectedMentionIndex],
          currentValue,
          cursorPosition,
          setValue,
          inputRef
        )
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowAgentMentions(false)
      }
    } else {
      // Normal Enter key behavior
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onEnter?.()
      }
    }
  }

  return {
    availableAgents,
    showAgentMentions,
    mentionQuery,
    mentionPosition,
    filteredAgents,
    selectedMentionIndex,
    mentionRef,
    handleInputChange,
    handleMentionSelect,
    handleKeyDown
  }
}
