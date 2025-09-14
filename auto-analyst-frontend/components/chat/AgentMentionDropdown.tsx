"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"

export interface AgentInfo {
  name: string
  description: string
}

interface AgentMentionDropdownProps {
  show: boolean
  agents: AgentInfo[]
  selectedIndex: number
  position: { top: number; left: number }
  onSelect: (agent: AgentInfo) => void
}

export default function AgentMentionDropdown({
  show,
  agents,
  selectedIndex,
  position,
  onSelect
}: AgentMentionDropdownProps) {
  return (
    <AnimatePresence>
      {show && agents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            minWidth: '200px',
            maxWidth: '300px'
          }}
        >
          {agents.map((agent, index) => (
            <div
              key={agent.name}
              className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex 
                  ? 'bg-[#FF7F7F]/10 text-[#FF7F7F]' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelect(agent)}
            >
              <div className="font-medium text-sm">@{agent.name}</div>
              <div className="text-xs text-gray-500">{agent.description}</div>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
