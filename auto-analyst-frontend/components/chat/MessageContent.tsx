"use client"

import React, { useCallback, useState } from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import { AlertTriangle, Copy, Check } from "lucide-react"
import CodeFixButton from "./CodeFixButton"
import { useSessionStore } from '@/lib/store/sessionStore'
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"

interface MessageContentProps {
  message: string
  onCodeExecute?: (result: any, updateCodeBlock: (code: string) => void) => void
  agentName?: string
  codeFixes?: Record<string, number>
  setCodeFixes?: React.Dispatch<React.SetStateAction<Record<string, number>>>
}

const MessageContent: React.FC<MessageContentProps> = ({ 
  message, 
  onCodeExecute, 
  agentName,
  codeFixes = {},
  setCodeFixes
}) => {
  const { sessionId } = useSessionStore()
  const { toast } = useToast()
  const [isFixingCode, setIsFixingCode] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Generate a unique code ID for each error block
  const generateCodeId = (content: string, index: number) => {
    return `error-${index}-${content.substring(0, 20).replace(/\s+/g, '-')}`
  }
  
  // Handle fix start
  const handleFixStart = useCallback((codeId: string) => {
    setIsFixingCode(prev => ({ ...prev, [codeId]: true }))
  }, [])

  // Handle insufficient credits
  const handleCreditCheck = useCallback((codeId: string, hasEnough: boolean) => {
    if (!hasEnough) {
      // You might want to show a credits modal here
      setIsFixingCode(prev => ({ ...prev, [codeId]: false }))
    }
  }, [])

  // Handle fix complete
  const handleFixComplete = useCallback((codeId: string, fixedCode: string) => {
    // Increment the fix count
    if (setCodeFixes) {
      setCodeFixes(prev => ({
        ...prev,
        [codeId]: (prev[codeId] || 0) + 1
      }))
    }

    // Show toast notification
    toast({
      title: "Code fixed",
      description: "The error has been fixed in code canvas. Please run the code to see if it works.",
      duration: 3000,
    })

    // Reset fixing state
    setIsFixingCode(prev => ({ ...prev, [codeId]: false }))
  }, [setCodeFixes, toast])

  // Copy to clipboard function
  const copyToClipboard = useCallback((content: string, format: string = "") => {
    let textToCopy = content;
    
    // Add markdown formatting if requested
    if (format) {
      textToCopy = "```" + format + "\n" + content + "\n```";
    }
    
    navigator.clipboard.writeText(textToCopy);
    
    toast({
      title: "Copied to clipboard",
      description: format ? `Content copied as ${format} markdown` : "Content copied",
      duration: 2000,
    });
  }, [toast]);

  const renderContent = useCallback(
    (content: string) => {
      // Remove plotly blocks as they'll be handled separately
      const parts = content.split(/(```plotly[\s\S]*?```)/)

      return parts.map((part, index) => {
        if (part.startsWith("```plotly") && part.endsWith("```")) {
          return null
        } else {
          return (
            <ReactMarkdown
              key={index}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "")
                  const isInline = (props as { inline?: boolean })?.inline ?? false
                  
                  // Convert children to string to check content
                  const codeContent = String(children).replace(/\n$/, "")
                  
                  // Check if this is an explicit error block
                  const isErrorBlock = match && match[1] === 'error'
                  
                  // Check if this looks like an error but isn't explicitly marked as one
                  const containsError = codeContent.toLowerCase().includes("error") || 
                                      codeContent.toLowerCase().includes("traceback") ||
                                      codeContent.toLowerCase().includes("exception") ||
                                      codeContent.toLowerCase().includes("failed") ||
                                      codeContent.toLowerCase().includes("syntax error") ||
                                      codeContent.toLowerCase().includes("name error") ||
                                      codeContent.toLowerCase().includes("type error") ||
                                      codeContent.toLowerCase().includes("value error") ||
                                      codeContent.toLowerCase().includes("index error")
                  
                  // Check if this is likely tabular data
                  const matches = codeContent.match(/\|\s*\w+\s*\|/g);
                  const isTabularData = !isInline && codeContent.includes('|') && 
                                       (codeContent.includes('DataFrame') || 
                                        codeContent.includes('Column Types') ||
                                        (matches !== null && matches.length > 1));
                  
                  // Check if this is a success output
                  const isSuccessOutput = match && match[1] === 'success';

                  if (!isInline && match) {
                    // Special handling for explicit error blocks
                    if (isErrorBlock) {
                      const codeId = generateCodeId(codeContent, index)
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 my-3 overflow-auto relative">
                          <div className="flex items-center justify-between text-red-600 font-medium mb-2">
                            <div className="flex items-center">
                              <AlertTriangle size={16} className="mr-2" />
                              <span>Error Output</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(codeContent, "error")}
                              className="h-6 w-6 p-0 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200"
                            >
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                          </div>
                          <CodeFixButton
                            codeId={codeId}
                            errorOutput={codeContent}
                            code="" // We don't have the code here, it will be used from CodeCanvas
                            isFixing={isFixingCode[codeId] || false}
                            codeFixes={codeFixes}
                            sessionId={sessionId || ''}
                            onFixStart={handleFixStart}
                            onFixComplete={handleFixComplete}
                            onCreditCheck={handleCreditCheck}
                            variant="inline"
                          />
                          <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap">
                            {codeContent}
                          </pre>
                        </div>
                      )
                    }
                    
                    // Handle success blocks
                    if (isSuccessOutput) {
                      return (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 my-3 overflow-auto relative">
                          <div className="flex items-center justify-between text-green-600 font-medium mb-2">
                            <div className="flex items-center">
                              <Check size={16} className="mr-2" />
                              <span>Success</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(codeContent, "success")}
                              className="h-6 w-6 p-0 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200"
                            >
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                          </div>
                          <pre className="text-xs text-green-700 font-mono whitespace-pre-wrap">
                            {codeContent}
                          </pre>
                        </div>
                      )
                    }
                    
                    // Handle code blocks that contain errors but aren't explicitly marked as errors
                    if (containsError && codeFixes !== undefined && setCodeFixes) {
                      const codeId = generateCodeId(codeContent, index)
                      return (
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 my-2 overflow-auto relative">
                          <div className="flex items-center justify-between text-gray-700 font-medium mb-2">
                            <span>Output</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(codeContent)}
                              className="h-6 w-6 p-0 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200"
                            >
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                          </div>
                          <CodeFixButton
                            codeId={codeId}
                            errorOutput={codeContent}
                            code="" // We don't have the code here, it will be used from CodeCanvas
                            isFixing={isFixingCode[codeId] || false}
                            codeFixes={codeFixes}
                            sessionId={sessionId || ''}
                            onFixStart={handleFixStart}
                            onFixComplete={handleFixComplete}
                            onCreditCheck={handleCreditCheck}
                            variant="inline"
                          />
                          <pre className="text-sm p-2 bg-gray-100 rounded font-mono whitespace-pre">
                            {codeContent}
                          </pre>
                        </div>
                      )
                    }
                    
                    // Special handling for tabular data
                    if (isTabularData) {
                      return (
                        <div className="overflow-x-auto max-w-full my-2">
                          <div className="flex items-center justify-between text-gray-700 font-medium mb-2">
                            <span>Data Table</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(codeContent)}
                              className="h-6 w-6 p-0 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200"
                            >
                              <Copy className="h-4 w-4 text-blue-500" />
                            </Button>
                          </div>
                          <pre className="text-sm p-2 bg-gray-100 rounded font-mono whitespace-pre min-w-max">
                            {codeContent}
                          </pre>
                        </div>
                      )
                    }
                    
                    // For regular code blocks
                    return (
                      <div className="overflow-x-auto my-2">
                        <div className="flex items-center justify-between text-gray-700 font-medium mb-2">
                          <span>{match && match[1] ? match[1] : "Code"}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(codeContent, match && match[1] ? match[1] : "")}
                            className="h-6 w-6 p-0 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200"
                          >
                            <Copy className="h-4 w-4 text-blue-500" />
                          </Button>
                        </div>
                        <code className={`text-sm p-1 bg-gray-100 rounded font-mono block ${className}`} {...props}>
                          {children}
                        </code>
                      </div>
                    )
                  }

                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                },
                pre({ children }) {
                  return (
                    <div className="overflow-x-auto max-w-full">
                      {children}
                    </div>
                  )
                },
                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-lg font-medium mt-4 mb-2" {...props} />,
                h4: ({ node, ...props }) => <h4 className="text-base font-medium mt-3 mb-2" {...props} />,
                h5: ({ node, ...props }) => <h5 className="text-sm font-medium mt-3 mb-1" {...props} />,
                h6: ({ node, ...props }) => <h6 className="text-sm font-medium mt-3 mb-1" {...props} />,
                p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                a: ({ node, ...props }) => (
                  <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto max-w-full my-4">
                    <table className="min-w-max border-collapse" {...props} />
                  </div>
                ),
              }}
            >
              {part}
            </ReactMarkdown>
          )
        }
      })
    },
    [codeFixes, handleCreditCheck, handleFixComplete, handleFixStart, isFixingCode, sessionId, setCodeFixes, toast],
  )

  return <>{renderContent(message)}</>
}

export default React.memo(MessageContent)

