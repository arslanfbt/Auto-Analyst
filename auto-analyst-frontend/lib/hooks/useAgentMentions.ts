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
        console.log('🔍 Fetching agents from:', `${API_URL}/agents`)
        const response = await axios.get(`${API_URL}/agents`)
        console.log('🔍 Agents response:', response.data)
        
        if (response.data && response.data.available_agents) {
          const agentList: AgentInfo[] = response.data.available_agents.map((name: string) => ({
            name,
            description: `Specialized ${name.replace(/_/g, " ")} agent`,
          }))
          setAvailableAgents(agentList)
          console.log('✅ Agents set:', agentList)
        } else {
          console.log('❌ No available_agents in response')
        }
      } catch (error) {
        console.error("❌ Error fetching agents:", error)
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
    console.log('🔍 Input change detected:', { value, cursorPosition, availableAgents })
    
    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)
    
    console.log(' Mention match:', mentionMatch)
    
    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase()
      setMentionQuery(query)
      
      console.log(' Query:', query)
      
      // Filter agents based on query
      const filtered = availableAgents.filter(agent => 
        agent.name.toLowerCase().includes(query)
      )
      
      console.log('🔍 Filtered agents:', filtered)
      
      if (filtered.length > 0) {
        // Calculate position for mention dropdown - position above the chat input
        const rect = textareaElement.getBoundingClientRect()
        
        setMentionPosition({
          top: rect.top - 200, // Position above the input (200px above)
          left: rect.left + 20
        })
        setShowAgentMentions(true)
        setSelectedMentionIndex(0)
        
        console.log('✅ Showing agent mentions:', filtered.length)
      } else {
        setShowAgentMentions(false)
        console.log('❌ No agents found for query')
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
