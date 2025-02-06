"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Paperclip, X } from 'lucide-react'
import AgentHint from './chat/AgentHint'
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useCookieConsentStore } from "@/lib/store/cookieConsentStore"
import { AlertCircle } from "lucide-react"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onFileUpload: (file: File) => void
  disabled?: boolean
}

interface AgentSuggestion {
  name: string
  description: string
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onFileUpload, disabled }) => {
  const [message, setMessage] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [showHint, setShowHint] = useState(false)
  const [input, setInput] = useState('')
  const [agentSuggestions, setAgentSuggestions] = useState<AgentSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { hasConsented } = useCookieConsentStore()
  const [showCookieWarning, setShowCookieWarning] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasConsented) {
      setShowCookieWarning(true)
      return
    }
    if (message.trim()) {
      onSendMessage(message.trim())
      setMessage("")
      if (inputRef.current) {
        inputRef.current.style.height = "auto"
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      onFileUpload(file)
    }
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    // Simulated agent list - replace this with actual data from your backend
    const agents: AgentSuggestion[] = [
      { name: "data_viz_agent", description: "Specializes in data visualization" },
      { name: "sk_learn_agent", description: "Handles machine learning tasks" },
      { name: "statistical_analytics_agent", description: "Performs statistical analysis" },
      { name: "preprocessing_agent", description: "Handles data preprocessing tasks" },
    ]

    const atIndex = message.lastIndexOf('@', cursorPosition)
    if (atIndex !== -1 && atIndex < cursorPosition) {
      const query = message.slice(atIndex + 1, cursorPosition).toLowerCase()
      const filtered = agents.filter(agent => agent.name.toLowerCase().includes(query))
      setAgentSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }, [message, cursorPosition])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    setCursorPosition(e.target.selectionStart || 0)
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }

  const handleSuggestionClick = (agentName: string) => {
    const atIndex = message.lastIndexOf('@', cursorPosition)
    if (atIndex !== -1) {
      const newMessage = message.slice(0, atIndex + 1) + agentName + ' ' + message.slice(cursorPosition)
      setMessage(newMessage)
      setShowSuggestions(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="relative">
      {showCookieWarning && !hasConsented && (
        <div className="absolute bottom-full left-0 right-0 p-4 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-start gap-3 text-yellow-800">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Cookie Consent Required</p>
              <p className="text-sm">
                To use the free trial features, please accept cookies from the banner at the bottom of the page.
              </p>
            </div>
            <button 
              onClick={() => setShowCookieWarning(false)}
              className="ml-auto text-yellow-800 hover:text-yellow-900"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {showHint && (
        <div className="absolute bottom-full mb-2 w-full">
          <AgentHint />
        </div>
      )}
      <div className="bg-white border-t border-gray-200 p-4">
        {selectedFile && (
          <div className="max-w-3xl mx-auto mb-2">
            <div className="flex items-center space-x-2 bg-blue-50 p-2 rounded-md">
              <span className="text-sm text-blue-600 truncate">{selectedFile.name}</span>
              <button onClick={clearSelectedFile} className="text-blue-600 hover:text-blue-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                onClick={() => {
                  if (!hasConsented) {
                    setShowCookieWarning(true)
                  }
                }}
                disabled={disabled}
                placeholder={disabled ? "Free trial used. Please sign in to continue." : "Type your message here..."}
                className={`w-full bg-gray-100 text-gray-900 placeholder-gray-500 border-0 rounded-lg py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:bg-white transition-colors resize-non ${
                  disabled ? 'bg-gray-100 text-gray-500' : ''
                }`}
                rows={1}
              />
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 w-full max-h-40 overflow-y-auto bg-white rounded-lg shadow-lg"
                  >
                    {agentSuggestions.map((agent) => (
                      <div
                        key={agent.name}
                        onClick={() => handleSuggestionClick(agent.name)}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-gray-500">{agent.description}</div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" id="file-upload" />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer p-2 rounded-full hover:bg-gray-200 transition-colors inline-flex items-center justify-center"
                >
                  <Paperclip className="w-5 h-5 text-gray-500 hover:text-blue-600 transition-colors" />
                </label>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="bg-[#FF7F7F] text-white p-3 rounded-full hover:bg-[#FF6666] transition-colors"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatInput
