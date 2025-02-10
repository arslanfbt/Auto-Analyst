"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Paperclip, X, Square, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import AgentHint from './chat/AgentHint'
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useCookieConsentStore } from "@/lib/store/cookieConsentStore"
import { AlertCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import axios from "axios"

interface FileStatus {
  file: File
  status: 'loading' | 'success' | 'error'
  errorMessage?: string
}

interface AgentSuggestion {
  name: string
  description: string
}

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onFileUpload: (file: File) => void
  disabled?: boolean
  isLoading?: boolean
  onStopGeneration?: () => void
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onFileUpload, disabled, isLoading, onStopGeneration }) => {
  const [message, setMessage] = useState("")
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [showHint, setShowHint] = useState(false)
  const [input, setInput] = useState('')
  const [agentSuggestions, setAgentSuggestions] = useState<AgentSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { data: session } = useSession()
  const { hasConsented, setConsent } = useCookieConsentStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message.trim())
      setMessage("")
      if (inputRef.current) {
        inputRef.current.style.height = "auto"
      }
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files)
      const newFileStatuses = newFiles.map(file => ({ file, status: 'loading' as const }))
      
      setFileStatuses(prev => [...prev, ...newFileStatuses])

      newFiles.forEach(async (file) => {
        try {
          await onFileUpload(file)
          setFileStatuses(prev => prev.map(status => 
            status.file === file ? { ...status, status: 'success' } : status
          ))
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          setFileStatuses(prev => prev.map(status => 
            status.file === file ? { 
              ...status, 
              status: 'error',
              errorMessage 
            } : status
          ))
          setTimeout(() => {
            setFileStatuses(prev => prev.filter(status => status.file !== file))
          }, 5000)
        }
      })
    }
  }

  const getErrorMessage = (error: any): string => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 413) return "File too large"
      if (error.response?.status === 415) return "Invalid file type"
      if (error.response?.data?.message) return error.response.data.message
    }
    if (error instanceof Error) return error.message
    return "Upload failed"
  }

  const removeFile = (fileToRemove: File) => {
    setFileStatuses(prev => prev.filter(status => status.file !== fileToRemove))
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

  const getPlaceholderText = () => {
    if (isLoading) return "Please wait..."
    if (disabled) return "Free trial used. Please sign in to continue."
    return "Type your message here..."
  }

  const handleAcceptCookies = () => {
    setConsent(true)
    handleSubmit(new Event('submit') as any)
  }

  const shouldShowCookieConsent = () => {
    if (session) return false // Skip cookie consent for signed in users
    return !hasConsented // Show consent only for non-signed in users who haven't consented
  }

  const getStatusIcon = (status: FileStatus['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-green-600" />
      case 'error':
        return <XCircle className="w-3 h-3 text-red-600" />
    }
  }

  return (
    <div className="relative">
      <div className="bg-white border-t border-gray-200 p-4">
        {shouldShowCookieConsent() ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Cookie Consent Required
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                To chat with Auto-Analyst, we need your consent to use cookies for storing chat history and preferences.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleAcceptCookies}
                  className="text-sm bg-[#FF7F7F] text-white px-4 py-2 rounded-md hover:bg-[#FF6666] transition-colors"
                >
                  Accept & Continue
                </button>
                <button
                  onClick={() => setConsent(false)}
                  className="text-sm bg-gray-100 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {fileStatuses.length > 0 && (
              <div className="max-w-3xl mx-auto mb-2">
                <div className="flex flex-wrap gap-2">
                  {fileStatuses.map((fileStatus) => (
                    <div 
                      key={fileStatus.file.name}
                      className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs max-w-[200px] ${
                        fileStatus.status === 'error' ? 'bg-red-50' : 'bg-blue-50'
                      }`}
                    >
                      {getStatusIcon(fileStatus.status)}
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-blue-600">
                          {fileStatus.file.name}
                        </div>
                        {fileStatus.status === 'error' && fileStatus.errorMessage && (
                          <div className="text-red-600 truncate">
                            {fileStatus.errorMessage}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => removeFile(fileStatus.file)}
                        className="text-blue-600 hover:text-blue-800 p-1 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
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
                        setConsent(true)
                      }
                    }}
                    disabled={disabled || isLoading}
                    placeholder={getPlaceholderText()}
                    className={`w-full bg-gray-100 text-gray-900 placeholder-gray-500 border-0 rounded-lg py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:bg-white transition-colors resize-none ${
                      (disabled || isLoading) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
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
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      className="hidden" 
                      id="file-upload"
                      multiple
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer p-2 rounded-full hover:bg-gray-200 transition-colors inline-flex items-center justify-center"
                    >
                      <Paperclip className="w-5 h-5 text-gray-500 hover:text-blue-600 transition-colors" />
                    </label>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: isLoading ? 1 : 1.05 }}
                  whileTap={{ scale: isLoading ? 1 : 0.95 }}
                  type={isLoading ? 'button' : 'submit'}
                  onClick={() => {
                    if (isLoading && onStopGeneration) {
                      onStopGeneration()
                    }
                  }}
                  className={`${
                    isLoading 
                      ? 'bg-red-500 hover:bg-red-600 cursor-pointer' 
                      : disabled || !message.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-[#FF7F7F] hover:bg-[#FF6666]'
                  } text-white p-3 rounded-full transition-colors`}
                >
                  {isLoading ? (
                    <Square className="w-5 h-5" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default ChatInput
