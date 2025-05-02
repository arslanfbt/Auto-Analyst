"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { ChevronRight, Copy, Check, Play, Edit2, Save, X, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import MonacoEditor from '@monaco-editor/react'
import { useToast } from "@/components/ui/use-toast"
import { useSessionStore } from '@/lib/store/sessionStore'
import axios from "axios"
import API_URL from '@/config/api'

interface CodeEntry {
  id: string;
  language: string;
  code: string;
  timestamp: number;
  title?: string;
  isExecuting?: boolean;
  output?: string;
  hasError?: boolean;
}

interface CodeCanvasProps {
  isOpen: boolean;
  onToggle: () => void;
  codeEntries: CodeEntry[];
  onCodeExecute?: (entryId: string, result: any) => void;
}

const CodeCanvas: React.FC<CodeCanvasProps> = ({ 
  isOpen, 
  onToggle, 
  codeEntries,
  onCodeExecute
}) => {
  const { toast } = useToast()
  const { sessionId } = useSessionStore()
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
  const [editingMap, setEditingMap] = useState<Record<string, boolean>>({})
  const [editedCodeMap, setEditedCodeMap] = useState<Record<string, string>>({})
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({})
  const [isMaximized, setIsMaximized] = useState(false)

  // Set the most recent entry as active when entries change
  useEffect(() => {
    if (codeEntries.length > 0 && (!activeEntryId || !codeEntries.find(entry => entry.id === activeEntryId))) {
      setActiveEntryId(codeEntries[codeEntries.length - 1].id)
    }
  }, [codeEntries, activeEntryId])

  // Initialize edited code when switching to edit mode
  const startEditing = (entryId: string, code: string) => {
    setEditingMap(prev => ({ ...prev, [entryId]: true }))
    setEditedCodeMap(prev => ({ ...prev, [entryId]: code }))
  }

  const saveEdit = (entryId: string) => {
    const updatedCode = editedCodeMap[entryId]
    // Find the entry and update it in the parent component
    const entryIndex = codeEntries.findIndex(entry => entry.id === entryId)
    if (entryIndex !== -1) {
      const updatedEntries = [...codeEntries]
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        code: updatedCode
      }
      // Here you would typically update the parent state
      // onCodeUpdate(updatedEntries)
    }
    setEditingMap(prev => ({ ...prev, [entryId]: false }))
  }

  const cancelEdit = (entryId: string) => {
    setEditingMap(prev => ({ ...prev, [entryId]: false }))
  }

  const copyToClipboard = async (code: string, entryId: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast({
        title: "Copied to clipboard",
        variant: "default",
        duration: 2000, // 2 seconds
      })
      setCopiedMap(prev => ({ ...prev, [entryId]: true }))
      setTimeout(() => {
        setCopiedMap(prev => ({ ...prev, [entryId]: false }))
      }, 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
        duration: 3000, // 3 seconds
      })
    }
  }

  const executeCode = async (entryId: string, code: string, language: string) => {
    // Only execute Python code for now
    if (language !== "python") return
    
    // Find the entry and mark it as executing
    const entryIndex = codeEntries.findIndex(entry => entry.id === entryId)
    if (entryIndex === -1) return
    
    const updatedEntries = [...codeEntries]
    updatedEntries[entryIndex] = {
      ...updatedEntries[entryIndex],
      isExecuting: true
    }
    // Update parent state to show executing status
    // onCodeUpdate(updatedEntries)
    
    try {
      const response = await axios.post(`${API_URL}/code/execute`, {
        code: code,
        session_id: sessionId,
      }, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      })
      
      // Mark execution as complete
      const codeEntry = codeEntries[entryIndex];
      if (codeEntry) {
        // Only update the executing flag, not the output
        const updatedEntries = [...codeEntries];
        updatedEntries[entryIndex] = {
          ...updatedEntries[entryIndex],
          isExecuting: false
        };
        // Notify parent to update entries
        // onCodeUpdate(updatedEntries);
      }
      
      // Pass execution result to parent component
      if (onCodeExecute) {
        onCodeExecute(entryId, response.data);
      }
      
    } catch (error) {
      console.error("Error executing code:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to execute code";
      
      // Mark execution as complete
      const updatedEntries = [...codeEntries]
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        isExecuting: false
      }
      
      if (onCodeExecute) {
        onCodeExecute(entryId, { error: errorMessage });
      }
    }
  }

  const getActiveEntry = () => {
    return activeEntryId ? codeEntries.find(entry => entry.id === activeEntryId) : null;
  }

  if (!isOpen) {
    return null;
  }

  const activeEntry = getActiveEntry();

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 20 }}
        className={`fixed right-0 top-0 z-40 h-screen bg-white shadow-xl flex flex-col
                   ${isMaximized ? 'w-full' : 'w-1/2'}`}
      >
        <div className="flex items-center justify-between border-b p-3 bg-gray-50">
          <h2 className="text-base font-semibold">Code Canvas</h2>
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsMaximized(!isMaximized)}
                    aria-label={isMaximized ? "Minimize" : "Maximize"}
                  >
                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isMaximized ? "Minimize" : "Maximize"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onToggle}
              aria-label="Close code canvas"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Simplified sidebar */}
          {codeEntries.length > 1 && (
            <div className="w-48 border-r overflow-y-auto">
              {codeEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className={`p-2 border-b cursor-pointer hover:bg-gray-100 transition-colors
                             ${activeEntryId === entry.id ? 'bg-gray-100' : ''}`}
                  onClick={() => setActiveEntryId(entry.id)}
                >
                  <div className="font-medium truncate text-sm">
                    {entry.language}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Active code entry */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeEntry ? (
              <>
                <div className="p-2 border-b flex items-center justify-between bg-gray-50">
                  <div className="flex items-center">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-200 mr-2">
                      {activeEntry.language}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(activeEntry.code, activeEntry.id)}
                            aria-label="Copy code"
                          >
                            {copiedMap[activeEntry.id] ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy code</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {activeEntry.language === "python" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => executeCode(activeEntry.id, activeEntry.code, activeEntry.language)}
                              disabled={activeEntry.isExecuting}
                              aria-label="Execute code"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Execute code</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {editingMap[activeEntry.id] ? (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => saveEdit(activeEntry.id)}
                                aria-label="Save edits"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Save edits</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => cancelEdit(activeEntry.id)}
                                aria-label="Cancel edits"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cancel edits</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => startEditing(activeEntry.id, activeEntry.code)}
                              aria-label="Edit code"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit code</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  {editingMap[activeEntry.id] ? (
                    <MonacoEditor
                      height="100%"
                      language={activeEntry.language}
                      value={editedCodeMap[activeEntry.id]}
                      onChange={(value) => {
                        if (value !== undefined) {
                          setEditedCodeMap(prev => ({ ...prev, [activeEntry.id]: value }))
                        }
                      }}
                      options={{ 
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14
                      }}
                    />
                  ) : (
                    <SyntaxHighlighter
                      language={activeEntry.language}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        height: '100%',
                        overflow: 'auto',
                        fontSize: '14px'
                      }}
                    >
                      {activeEntry.code}
                    </SyntaxHighlighter>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No code selected
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CodeCanvas