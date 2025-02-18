"use client"

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Paperclip, X, Square, Loader2, CheckCircle2, XCircle, Eye } from 'lucide-react'
import AgentHint from './chat/AgentHint'
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { useCookieConsentStore } from "@/lib/store/cookieConsentStore"
import { AlertCircle } from "lucide-react"
import { useSession } from "next-auth/react"
import axios from "axios"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSessionStore } from '@/lib/store/sessionStore'

const PREVIEW_API_URL = 'http://localhost:8000';
// const PREVIEW_API_URL = 'https://ashad001-auto-analyst-backend.hf.space';

interface FileUpload {
  file: File
  status: 'loading' | 'success' | 'error'
  errorMessage?: string
}

interface AgentSuggestion {
  name: string
  description: string
}

interface FilePreview {
  headers: string[];
  rows: string[][];
}

interface DatasetDescription {
  name: string;
  description: string;
}

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onFileUpload: (file: File) => void
  disabled?: boolean
  isLoading?: boolean
  onStopGeneration?: () => void
}

const ChatInput = forwardRef<
  { handlePreviewDefaultDataset: () => void },
  ChatInputProps
>(({ onSendMessage, onFileUpload, disabled, isLoading, onStopGeneration }, ref) => {
  const [message, setMessage] = useState("")
  const [fileUpload, setFileUpload] = useState<FileUpload | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [showHint, setShowHint] = useState(false)
  const [input, setInput] = useState('')
  const [agentSuggestions, setAgentSuggestions] = useState<AgentSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { data: session } = useSession()
  const { hasConsented, setConsent } = useCookieConsentStore()
  const [showPreview, setShowPreview] = useState(false)
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null)
  const [datasetDescription, setDatasetDescription] = useState<DatasetDescription>({
    name: '',
    description: '',
  });
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { sessionId, setSessionId } = useSessionStore()

  // Expose handlePreviewDefaultDataset to parent
  useImperativeHandle(ref, () => ({
    handlePreviewDefaultDataset
  }));

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
    const file = e.target.files?.[0]
    if (file) {
      // Check file type before proceeding
      const isCSVByExtension = file.name.toLowerCase().endsWith('.csv');
      const isCSVByType = file.type === 'text/csv' || file.type === 'application/csv';
      
      if (!isCSVByExtension || !isCSVByType) {
        setFileUpload({ 
          file, 
          status: 'error', 
          errorMessage: 'Please upload a CSV file only' 
        });
        
        setTimeout(() => {
          setFileUpload(null);
        }, 3000);
        return;
      }
      
      setFileUpload({ file, status: 'loading' })
      
      try {
        // First preview the file
        await handleFilePreview(file);
        setFileUpload(prev => prev ? { ...prev, status: 'success' } : null)
        // Set default name from filename (without .csv extension)
        setDatasetDescription(prev => ({
          ...prev,
          name: file.name.replace('.csv', '')
        }));
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        setFileUpload(prev => prev ? { ...prev, status: 'error', errorMessage } : null)
        
        setTimeout(() => {
          setFileUpload(null);
        }, 3000)
      }
    }
  }

  const handleFilePreview = async (file: File) => {
    if (file.type === 'text/csv') {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('Sending preview request...');
        const response = await axios.post(`${PREVIEW_API_URL}/api/preview-csv`, formData);
        console.log('Preview response:', response.data);
        
        const { headers, rows } = response.data;
        setFilePreview({ headers, rows });
        setShowPreview(true);
        console.log('Dialog should be visible now', { showPreview: true, headers, rows });
      } catch (error) {
        console.error('Failed to preview file:', error);
      }
    } else {
      console.log('Not a CSV file');
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

  const clearFile = () => {
    setFileUpload(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  useEffect(() => {
    const agents: AgentSuggestion[] = [
      { name: "data_viz_agent", description: "Specializes in data visualization" },
      { name: "sk_learn_agent", description: "Handles machine learning tasks" },
      { name: "statistical_analytics_agent", description: "Performs statistical analysis" },
      { name: "preprocessing_agent", description: "Handles data preprocessing tasks" },
    ]

    // Find the closest @ before cursor
    const beforeCursor = message.slice(0, cursorPosition)
    const atIndex = beforeCursor.lastIndexOf('@')
    
    if (atIndex !== -1) {
      // Check if we're still typing the agent name
      const afterAt = message.slice(atIndex + 1)
      const spaceAfterAt = afterAt.indexOf(' ')
      const isTypingAgent = spaceAfterAt === -1 || spaceAfterAt >= cursorPosition - atIndex - 1

      if (isTypingAgent) {
        const query = message.slice(atIndex + 1, cursorPosition).toLowerCase()
        const filtered = agents.filter(agent => agent.name.toLowerCase().includes(query))
        setAgentSuggestions(filtered)
        setShowSuggestions(filtered.length > 0)
        return
      }
    }
    
    setShowSuggestions(false)
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
    const beforeCursor = message.slice(0, cursorPosition)
    const atIndex = beforeCursor.lastIndexOf('@')
    
    if (atIndex !== -1) {
      // Replace just the agent mention part
      const newMessage = 
        message.slice(0, atIndex + 1) + 
        agentName + 
        message.slice(cursorPosition)
      
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

  const getStatusIcon = (status: FileUpload['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-green-600" />
      case 'error':
        return <XCircle className="w-3 h-3 text-red-600" />
    }
  }

  const handlePreviewDefaultDataset = async () => {
    try {
      // This will now also ensure we're using the default dataset
      const response = await axios.get(`${PREVIEW_API_URL}/api/default-dataset`, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      });
      
      setFilePreview({
        headers: response.data.headers,
        rows: response.data.rows
      });
      
      // Pre-fill the name and description for default dataset
      setDatasetDescription({
        name: response.data.name || 'Housing Dataset',
        description: response.data.description || 'Please provide a description for this dataset'
      });
      
      setShowPreview(true);
      setFileUpload(null); // Clear any previously uploaded file
    } catch (error) {
      console.error('Failed to fetch default dataset:', error);
    }
  };

  const handleUploadWithDescription = async () => {
    if (!datasetDescription.name || !datasetDescription.description) {
      alert('Please provide both a name and description for the dataset');
      return;
    }

    try {
      let formData = new FormData();
      
      if (fileUpload?.file) {
        formData.append('file', fileUpload.file);
      } else {
        formData.append('file', 'Housing.csv');
      }
      
      formData.append('name', datasetDescription.name);
      formData.append('description', datasetDescription.description);

      const response = await axios.post(`${PREVIEW_API_URL}/upload_dataframe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      });

      if (response.status === 200) {
        // Store the session ID received from the server
        if (response.data.session_id) {
          setSessionId(response.data.session_id);
        }
        
        setShowPreview(false);
        setUploadSuccess(true);
        if (fileUpload) {
          setFileUpload(prev => prev ? { ...prev, status: 'success' } : null);
        }
        setDatasetDescription({ name: '', description: '' });
        
        // // Add success message
        // onSendMessage(`Dataset "${datasetDescription.name}" has been loaded. You can now ask questions about your data.`);
        
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file. Please try again.');
    }
  }

  return (
    <>
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
              {uploadSuccess && (
                <div className="max-w-3xl mx-auto mb-2">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 text-sm">Dataset uploaded successfully!</span>
                  </div>
                </div>
              )}

              {fileUpload && (
                <div className="max-w-3xl mx-auto mb-2">
                  <div 
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                      fileUpload.status === 'error' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    {getStatusIcon(fileUpload.status)}
                    <span className="text-blue-700 font-medium">
                      {fileUpload.file.name}
                    </span>
                    {fileUpload.status === 'error' && fileUpload.errorMessage && (
                      <span className="text-red-600">
                        • {fileUpload.errorMessage}
                      </span>
                    )}
                    {fileUpload.status === 'success' && (
                      <button 
                        onClick={() => handleFilePreview(fileUpload.file)}
                        className="hover:bg-white/50 p-1 rounded-full transition-colors text-blue-500 hover:text-blue-700"
                        title="Preview data"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!fileUpload && (
                <div className="max-w-3xl mx-auto mb-2">
                  <button
                    onClick={handlePreviewDefaultDataset}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Default Dataset
                  </button>
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
      <AnimatePresence>
        {showPreview && (
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="w-[90vw] max-w-4xl h-[90vh] overflow-hidden bg-gray-50 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <DialogHeader className="border-b pb-4 bg-gray-50 z-10">
                <DialogTitle className="text-xl text-gray-800">
                  Dataset Details
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-6 p-4 overflow-y-auto h-[calc(90vh-8rem)]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Dataset Name
                    </label>
                    <input
                      type="text"
                      value={datasetDescription.name}
                      onChange={(e) => setDatasetDescription(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent text-gray-800"
                      placeholder="Enter dataset name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Description
                    </label>
                    <textarea
                      value={datasetDescription.description}
                      onChange={(e) => setDatasetDescription(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent text-gray-800"
                      rows={3}
                      placeholder="Describe what this dataset contains and its purpose"
                    />
                  </div>
                </div>

                <div className="border rounded-lg bg-white">
                  <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-medium text-gray-700">
                      {fileUpload ? 'Data Preview' : 'Default Dataset Preview'}
                    </h3>
                    <button
                      onClick={handleUploadWithDescription}
                      disabled={!datasetDescription.name || !datasetDescription.description}
                      className={`px-3 py-1.5 text-xs font-medium text-white rounded-md flex items-center gap-2 ${
                        !datasetDescription.name || !datasetDescription.description
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#FF7F7F] hover:bg-[#FF6666]'
                      }`}
                    >
                      {fileUpload ? 'Upload Dataset' : 'Use Default Dataset'}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    {filePreview && (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            {filePreview.headers.map((header, i) => (
                              <TableHead 
                                key={i} 
                                className="font-semibold text-gray-700 px-4 py-3 text-left whitespace-nowrap"
                              >
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filePreview.rows.map((row, i) => (
                            <TableRow 
                              key={i}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              {row.map((cell, j) => (
                                <TableCell 
                                  key={j} 
                                  className="px-4 py-3 border-b border-gray-100 text-gray-700 whitespace-nowrap"
                                >
                                  {cell === null ? '-' : cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] focus:border-transparent transition-colors hover:border-[#FF7F7F]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
})

export default ChatInput
