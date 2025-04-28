"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Code2, ChevronDown, ChevronUp, Copy, Check, Play, Edit2, Save, X, Wand2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import PlotlyChart from "@/components/chat/PlotlyChart"
import axios from "axios"
import { useSessionStore } from '@/lib/store/sessionStore'
import API_URL from '@/config/api'
import MonacoEditor from '@monaco-editor/react'
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

interface CodeBlockProps {
  language: string
  value: string
  onExecute: (result: any, updateCodeBlock: (code: string) => void) => void
  agentName?: string
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value, onExecute, agentName }) => {
  const { toast } = useToast()
  const { sessionId } = useSessionStore()
  const [isVisible, setIsVisible] = useState(language === "output")
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCode, setEditedCode] = useState(value)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionOutput, setExecutionOutput] = useState<string | null>(null)
  const [plotlyOutputs, setPlotlyOutputs] = useState<any[]>([])
  const [showAIEditField, setShowAIEditField] = useState(false)
  const [aiEditPrompt, setAIEditPrompt] = useState("")
  const [isAIEditing, setIsAIEditing] = useState(false)

  useEffect(() => {
    if (language === "python" && agentName === "code_combiner_agent") {
      handleExecuteAndUpdate()
    }
  }, [value, agentName])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editedCode)
      toast({
        title: "Copied to clipboard",
        variant: "default",
        duration: 2000, // 2 seconds
      })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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

  const handleExecuteAndUpdate = async () => {
    if (language !== "python") return

    setIsExecuting(true)
    setPlotlyOutputs([])

    try {
      const BASE_URL = API_URL
      const response = await axios.post(`${BASE_URL}/code/execute`, {
        code: editedCode,
        session_id: sessionId,
      }, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      })

      // Handle different types of responses
      if (response.data.error) {
        setExecutionOutput(response.data.error)
      } else {
        // Set text output if available
        if (response.data.output) {
          setExecutionOutput(response.data.output)
        }

        // Handle Plotly data if available
        if (response.data.plotly_outputs && response.data.plotly_outputs.length > 0) {
          const parsedOutputs = response.data.plotly_outputs
            .map((output: string) => {
              try {
                const plotlyContent = output.replace(/```plotly\n|\n```/g, "")
                return JSON.parse(plotlyContent)
              } catch (e) {
                console.error("Error parsing Plotly data:", e)
                return null
              }
            })
            .filter(Boolean)
          setPlotlyOutputs(parsedOutputs)
        }
      }

      // Notify parent of execution
      onExecute(response.data, () => {})
    } catch (error) {
      console.error("Error executing code:", error)
      setExecutionOutput(error instanceof Error ? error.message : "Failed to execute code")
      onExecute(
        {
          error: error instanceof Error ? error.message : "Failed to execute code",
        },
        () => {},
      )
    } finally {
      setIsExecuting(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setIsVisible(true)
  }

  const handleSave = () => {
    setIsEditing(false)
    onExecute({ savedCode: editedCode }, () => {})
  }

  const handleCancel = () => {
    setEditedCode(value)
    setIsEditing(false)
  }

  const handleAIEditRequest = async () => {
    if (!aiEditPrompt.trim()) return
    
    setIsAIEditing(true)
    try {
      const BASE_URL = API_URL
      const response = await axios.post(`${BASE_URL}/code/edit`, {
        original_code: editedCode,
        user_prompt: aiEditPrompt
      }, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId }),
        },
      })

      if (response.data && response.data.edited_code) {
        setEditedCode(response.data.edited_code)
        onExecute({ savedCode: response.data.edited_code }, () => {})
        
        // Show success message with auto-dismiss
        toast({
          title: "Code updated",
          description: "AI successfully modified your code.",
          variant: "default",
          duration: 3000, // 3 seconds
        })
      }
      
      // Handle error message from backend
      if (response.data && response.data.error) {
        toast({
          title: "Error modifying code",
          description: response.data.error,
          variant: "destructive",
          duration: 5000, // 5 seconds
        })
      }
    } catch (error) {
      console.error("Error editing code with AI:", error)
      toast({
        title: "Error",
        description: "Failed to modify code. Please try again.",
        variant: "destructive",
        duration: 5000, // 5 seconds
      })
    } finally {
      setIsAIEditing(false)
      setShowAIEditField(false)
      setAIEditPrompt("")
    }
  }

  return (
    <div className="relative rounded-lg overflow-hidden my-4 bg-[#1E1E1E] hover:ring-1 hover:ring-gray-600 w-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 w-full">
        <div className="flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">{language}</span>
        </div>
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            {language === "python" && !isEditing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAIEditField(!showAIEditField)} 
                    className="text-[#FF7F7F] hover:bg-[#FF7F7F]/20"
                  >
                    <Wand2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-1 rounded shadow-lg">
                  <p className="text-sm">edit with AI</p>
                </TooltipContent>
              </Tooltip>
            )}
            {language === "python" && !isEditing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleEdit} className="text-gray-400 hover:bg-gray-600/30">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-1 rounded shadow-lg">
                  <p className="text-sm">edit</p>
                </TooltipContent>
              </Tooltip>
            )}
            {language === "python" && !isEditing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExecuteAndUpdate}
                    disabled={isExecuting}
                    className="text-gray-400 hover:bg-gray-600/30"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-1 rounded shadow-lg">
                  <p className="text-sm">run</p>
                </TooltipContent>
              </Tooltip>
            )}
            {isEditing ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      className="text-gray-400 hover:bg-gray-600/30"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-1 rounded shadow-lg">
                    <p className="text-sm">save</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      className="text-gray-400 hover:bg-gray-600/30"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-1 rounded shadow-lg">
                    <p className="text-sm">cancel</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              language !== "output" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsVisible(!isVisible)}
                      className="text-gray-400 hover:bg-gray-600/30"
                    >
                      {isVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-1 rounded shadow-lg hover:bg-gray-700">
                    <p className="text-sm">{isVisible ? "collapse" : "expand"}</p>
                  </TooltipContent>
                </Tooltip>
              )
            )}
          </TooltipProvider>
        </div>
      </div>
      
      {/* Inline AI Edit Input */}
      {showAIEditField && (
        <div className="flex flex-col px-4 py-2 bg-[#252525] border-b border-gray-700">
          <Textarea
            placeholder="Describe how to modify the code (e.g., Add error handling, optimize the loop, etc.)"
            value={aiEditPrompt}
            onChange={(e) => setAIEditPrompt(e.target.value)}
            className="bg-[#303030] border-gray-700 text-white h-20 mb-2 resize-none"
            disabled={isAIEditing}
          />
          <div className="flex justify-end space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAIEditField(false)}
              className="border-gray-700 text-gray-400 hover:bg-gray-700/30 h-9"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAIEditRequest}
              disabled={isAIEditing || !aiEditPrompt.trim()}
              className="bg-[#FF7F7F] text-white hover:bg-[#FF7F7F]/80 shadow-md h-9"
            >
              {isAIEditing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2"/>
                  Apply
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      <AnimatePresence initial={false}>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full"
          >
            {!isEditing && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 text-gray-400 hover:bg-gray-600/30 z-10"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-1 rounded shadow-lg">
                    <p className="text-sm">{copied ? "Copied!" : "copy"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="w-full">
              {isEditing ? (
                <MonacoEditor
                  height="400px"
                  language={language === "output" ? "plaintext" : language}
                  theme="vs-dark"
                  value={editedCode}
                  onChange={(value: string | undefined) => setEditedCode(value || "")}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: "off",
                    folding: false,
                    automaticLayout: true
                  }}
                  className="min-h-[400px] w-full"
                />
              ) : (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={language === "output" ? "plaintext" : language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: "1.25rem",
                    background: "#1E1E1E",
                    minHeight: "400px",
                    maxHeight: "60vh",
                    overflowY: "auto",
                    width: "100%"
                  }}
                  wrapLongLines={true}
                >
                  {editedCode}
                </SyntaxHighlighter>
              )}

              {/* Execution Output Section */}
              {(executionOutput || plotlyOutputs.length > 0) && (
                <div className="border-t border-gray-700 w-full">
                  <div className="px-4 py-2 text-sm font-medium text-gray-300">output</div>
                  {executionOutput && (
                    <div className="px-5 py-4 text-gray-300 font-mono text-sm bg-[#1E1E1E] overflow-x-auto max-h-[400px] overflow-y-auto">{executionOutput}</div>
                  )}
                  {plotlyOutputs.map((plotlyOutput, index) => (
                    <div key={index} className="px-5 py-4 bg-white overflow-x-auto w-full">
                      <PlotlyChart data={plotlyOutput.data} layout={plotlyOutput.layout} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Empty div to maintain full width when collapsed */}
      {!isVisible && <div className="w-full h-0 min-w-full"></div>}
    </div>
  )
}

export default React.memo(CodeBlock)
