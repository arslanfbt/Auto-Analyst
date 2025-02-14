"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Code2, ChevronDown, ChevronUp, Copy, Check, Play, Edit2, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import PlotlyChart from "@/components/PlotlyChart"
import axios from "axios"

interface CodeBlockProps {
  language: string
  value: string
  onExecute: (result: any, updateCodeBlock: (code: string) => void) => void
  agentName?: string
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value, onExecute, agentName }) => {
  const [isVisible, setIsVisible] = useState(language === "output")
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCode, setEditedCode] = useState(value)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionOutput, setExecutionOutput] = useState<string | null>(null)
  const [plotlyOutputs, setPlotlyOutputs] = useState<any[]>([])

  useEffect(() => {
    if (language === "python" && agentName === "code_combiner_agent") {
      handleExecuteAndUpdate()
    }
  }, [value, agentName])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const handleExecuteAndUpdate = async () => {
    if (language !== "python") return

    setIsExecuting(true)
    setPlotlyOutputs([])

    try {
      // const response = await axios.post("http://localhost:8000/execute_code", {
      const response = await axios.post("https://ashad001-auto-analyst-backend.hf.space/execute_code", {
        code: editedCode,

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

  return (
    <div className="relative rounded-lg overflow-hidden my-4 bg-[#1E1E1E]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">{language}</span>
        </div>
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            {language === "python" && !isEditing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleEdit} className="text-gray-400 hover:text-gray-200">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-800 text-white px-3 py-1 rounded shadow-lg">
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
                    className="text-gray-400 hover:text-gray-200"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-800 text-white px-3 py-1 rounded shadow-lg">
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
                      className="text-gray-400 hover:text-gray-200"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-800 text-white px-3 py-1 rounded shadow-lg">
                    <p className="text-sm">save</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      className="text-gray-400 hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-800 text-white px-3 py-1 rounded shadow-lg">
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
                      className="text-gray-400 hover:text-gray-200"
                    >
                      {isVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-800 text-white px-3 py-1 rounded shadow-lg">
                    <p className="text-sm">{isVisible ? "collapse" : "expandddd"}</p>
                  </TooltipContent>
                </Tooltip>
              )
            )}
          </TooltipProvider>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            {!isEditing && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 z-10"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-800 text-white px-3 py-1 rounded shadow-lg">
                    <p className="text-sm">{copied ? "Copied!" : "copy"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div>
              {isEditing ? (
                <textarea
                  value={editedCode}
                  onChange={(e) => setEditedCode(e.target.value)}
                  className="w-full bg-[#1E1E1E] text-gray-300 font-mono text-sm p-4 focus:outline-none resize-none"
                  style={{ minHeight: "200px" }}
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
                  }}
                >
                  {editedCode}
                </SyntaxHighlighter>
              )}

              {/* Execution Output Section */}
              {(executionOutput || plotlyOutputs.length > 0) && (
                <div className="border-t border-gray-700">
                  <div className="px-4 py-2 text-sm font-medium text-gray-300">output</div>
                  {executionOutput && (
                    <div className="px-5 py-4 text-gray-300 font-mono text-sm bg-[#1E1E1E]">{executionOutput}</div>
                  )}
                  {plotlyOutputs.map((plotlyOutput, index) => (
                    <div key={index} className="px-5 py-4 bg-white">
                      <PlotlyChart data={plotlyOutput.data} layout={plotlyOutput.layout} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default React.memo(CodeBlock)

