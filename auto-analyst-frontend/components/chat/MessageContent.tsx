"use client"

import React, { useCallback, useState } from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import { AlertTriangle, WrenchIcon, Copy, Download, Check } from "lucide-react"
import CodeFixButton from "./CodeFixButton"
import MessageFeedback from "./MessageFeedback"
import { useSessionStore } from '@/lib/store/sessionStore'
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createDownloadHandler } from "@/lib/utils/exportUtils"

// Define the CodeOutput interface locally to match the one in exportUtils
interface CodeOutput {
  type: 'output' | 'error' | 'plotly';
  content: string | any;
  messageIndex: number;
  codeId: string;
}

interface MessageContentProps {
  message: string
  fullMessage?: string  // The complete message for copying/downloading
  onCodeExecute?: (result: any, updateCodeBlock: (code: string) => void) => void
  agentName?: string
  codeFixes?: Record<string, number>
  setCodeFixes?: React.Dispatch<React.SetStateAction<Record<string, number>>>
  onOpenCanvas?: (errorMessage: string, codeId: string) => void
  isFixingError?: boolean
  isAIMessage?: boolean
  messageId?: number
  chatId?: number
  isLastPart?: boolean
  outputs?: CodeOutput[]  // Add outputs prop to include code execution results and plots
}

const MessageContent: React.FC<MessageContentProps> = ({ 
  message, 
  fullMessage,
  onCodeExecute, 
  agentName,
  codeFixes = {},
  setCodeFixes,
  onOpenCanvas,
  isFixingError = false,
  isAIMessage = false,
  messageId,
  chatId,
  isLastPart = true,
  outputs = []
}) => {
  const { sessionId } = useSessionStore()
  const { toast } = useToast()
  const [isFixingCode, setIsFixingCode] = useState<Record<string, boolean>>({})
  const [hovered, setHovered] = useState<Record<string, boolean>>({})
  const [isCopied, setIsCopied] = useState(false)
  
  // Use fullMessage for copying/downloading if provided, otherwise fall back to message
  const contentToCopy = fullMessage || message
  
  // Generate a unique code ID for each error block
  const generateCodeId = (content: string, index: number) => {
    return `error-${index}-${content.substring(0, 20).replace(/\s+/g, '-')}`
  }
  
  // Handle opening canvas for fixing
  const handleOpenCanvasForFixing = useCallback((errorMessage: string, codeId: string) => {
    if (onOpenCanvas) {
      onOpenCanvas(errorMessage, codeId)
      
      toast({
        title: "Opening code canvas",
        description: "Opening code canvas to fix the error.",
        duration: 3000,
      })
    } else {
      toast({
        title: "Cannot fix code",
        description: "This error cannot be fixed automatically.",
        variant: "destructive",
        duration: 3000,
      })
    }
  }, [onOpenCanvas, toast])
  
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

  // Copy message content to clipboard
  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(contentToCopy).then(() => {
      setIsCopied(true)
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied to your clipboard.",
        duration: 2000,
      })
      setTimeout(() => setIsCopied(false), 2000)
    }).catch(err => {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    })
  }, [contentToCopy, toast])

  // Use the new download handler from exportUtils
  const handleDownload = useCallback(createDownloadHandler(contentToCopy, outputs), [contentToCopy, outputs])

  // Custom fix button component for inline use
  const InlineFixButton = useCallback(({ codeId, errorContent }: { codeId: string, errorContent: string }) => {
    return (
      <div className="inline-flex items-center absolute top-3 right-3"
          onMouseEnter={() => setHovered(prev => ({ ...prev, [codeId]: true }))}
          onMouseLeave={() => setHovered(prev => ({ ...prev, [codeId]: false }))}>
        <motion.div
          initial={{ width: "auto" }}
          animate={{ 
            width: hovered[codeId] ? "auto" : "auto",
            backgroundColor: hovered[codeId] ? "rgba(254, 226, 226, 0.5)" : "transparent"
          }}
          transition={{ duration: 0.2 }}
          className="rounded-md overflow-hidden flex items-center justify-end px-1 cursor-pointer"
          onClick={() => handleOpenCanvasForFixing(errorContent, codeId)}
        >
          <motion.span 
            initial={{ opacity: 0, width: 0 }}
            animate={{ 
              opacity: hovered[codeId] ? 1 : 0,
              width: hovered[codeId] ? "auto" : 0,
              marginRight: hovered[codeId] ? "4px" : 0
            }}
            transition={{ duration: 0.2 }}
            className="text-xs font-medium whitespace-nowrap text-red-500 overflow-hidden"
          >
            {codeFixes[codeId] && codeFixes[codeId] >= 3 
              ? "Fix error with AI (1 credit)" 
              : `Fix error with AI (${3 - (codeFixes[codeId] || 0)} free left)`}
          </motion.span>
          
          <div className="flex items-center">
            <div className="h-6 w-6 p-0 flex items-center justify-center rounded-full bg-red-50 border border-red-200">
              {isFixingCode[codeId] ? (
                <svg className="animate-spin h-3 w-3 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <WrenchIcon className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }, [codeFixes, hovered, isFixingCode, handleOpenCanvasForFixing]);

  // Helper function to render table content with better formatting
  const renderTableContent = useCallback((content: string) => {
    const lines = content.split('\n');
    
    // Check if this is a pipe-delimited table (new format)
    const isPipeDelimited = lines.some(line => line.includes('|'));
    
    if (isPipeDelimited) {
      // Check if this looks like a correlation matrix
      const isCorrelationMatrix = content.toLowerCase().includes('corr') || 
                                 (lines[0].includes('price') && lines.some(line => line.includes('0.')));
      
      // Create a proper HTML table from pipe-delimited content
      return (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            {lines.length > 0 && (
              <tr>
                {lines[0].split('|').map((header, i) => (
                  <th 
                    key={i}
                    scope="col" 
                    className="px-3 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    {header.trim()}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lines.slice(1).map((line, rowIdx) => (
              line.trim() ? (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {line.split('|').map((cell, cellIdx) => {
                    const cellContent = cell.trim();
                    
                    // Special handling for negative numbers
                    // Match both standard negative numbers (-0.123) and truncated values with a hyphen at the end (0.123 -)
                    const isNegative = cellContent.startsWith('-') || cellContent.endsWith('-');
                    
                    let displayValue = cellContent;
                    if (isNegative && cellContent.endsWith('-')) {
                      // Convert "0.123 -" to "-0.123"
                      displayValue = `-${cellContent.slice(0, -1).trim()}`;
                    }
                    
                    // Check if it's a numeric value (including negative numbers)
                    const numericValue = displayValue.replace(/^-/, ''); // Remove leading minus for number check
                    const isNumeric = !isNaN(Number(numericValue)) && numericValue !== '';
                    
                    // Special formatting for correlation values (between -1 and 1)
                    let formattedValue = displayValue;
                    if (isNumeric) {
                      const numValue = parseFloat(displayValue);
                      
                      // If this is a correlation matrix, format the numbers nicely
                      if (isCorrelationMatrix && Math.abs(numValue) <= 1) {
                        // Format with 3 decimal places for correlation values
                        formattedValue = numValue.toFixed(3);
                      } else if (Math.abs(numValue) < 0.01) {
                        // Scientific notation for very small numbers
                        formattedValue = numValue.toExponential(2);
                      } else if (Math.abs(numValue) < 1) {
                        // 3 decimal places for small numbers
                        formattedValue = numValue.toFixed(3);
                      } else if (Math.abs(numValue) < 10) {
                        // 2 decimal places for medium numbers
                        formattedValue = numValue.toFixed(2);
        } else {
                        // No decimal places for large numbers
                        formattedValue = Math.round(numValue).toLocaleString();
                      }
                    }
                    
                    return (
                      <td 
                        key={cellIdx} 
                        className={`px-3 py-2 whitespace-nowrap text-xs font-mono ${
                          isNumeric ? 'text-right' : 'text-left'
                        }`}
                      >
                        {isNumeric && isNegative 
                          ? <span className="text-red-600">{formattedValue}</span>
                          : formattedValue
                        }
                      </td>
                    );
                  })}
                </tr>
              ) : null
            ))}
          </tbody>
        </table>
      );
    }
    
    // Fallback to old rendering for non-pipe-delimited tables
    return (
      <div className="font-mono text-sm leading-relaxed">
        {lines.map((line, idx) => {
          // Detect header lines (first meaningful line or lines with column names)
          const isHeader = idx < 3 && line.trim() && 
            (line.includes('price') || line.includes('area') || 
             line.includes('count') || line.includes('mean') ||
             /^[a-zA-Z\s_]+(\s+[a-zA-Z\s_]+)*$/.test(line.trim()));
          
          return (
            <div key={idx} className={isHeader ? "font-bold text-gray-800" : "text-gray-700"}>
              {line || '\u00A0'} {/* Use non-breaking space for empty lines */}
            </div>
          );
        })}
      </div>
    );
  }, []);

  // Create stable markdownComponents reference with useCallback
  const markdownComponents = useCallback(() => ({
    code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "")
                  const isInline = (props as { inline?: boolean })?.inline ?? false
                  
                  // Convert children to string to check content
                  const codeContent = String(children).replace(/\n$/, "")
                  
                  // Check if this is an explicit error block
                  const isErrorBlock = match && match[1] === 'error'
                  
                  // Check if this looks like an error but isn't explicitly marked as one
                  const containsError = codeContent.toLowerCase().includes("error") || 
                                      codeContent.toLowerCase().includes("traceback") ||
                                      codeContent.toLowerCase().includes("exception")
                  
      // Check if this is likely tabular data (fallback for non-enhanced tables)
                  const matches = codeContent.match(/\|\s*\w+\s*\|/g);
      const isTabularData = !isInline && (
        // Original table detection
        (codeContent.includes('|') && 
                                       (codeContent.includes('DataFrame') || 
                                        codeContent.includes('Column Types') ||
          (matches !== null && matches.length > 1))) ||
        // Enhanced detection for statistical outputs (fallback)
        (codeContent.includes('count') && codeContent.includes('mean') && codeContent.includes('std')) ||
        // Detection for correlation matrices (fallback)
        (codeContent.includes('price') && codeContent.includes('area') && (codeContent.match(/\d+\.\d+/g)?.length || 0) > 5) ||
        // Detection for general tabular structure
        (codeContent.split('\n').length > 3 && 
         codeContent.split('\n').some(line => 
           line.match(/^\s*\w+\s+[\d\.\-\+e]+(\s+[\d\.\-\+e]+)*\s*$/)))
      );

                  if (!isInline && match) {
                    // Special handling for explicit error blocks
                    if (isErrorBlock) {
          const codeId = generateCodeId(codeContent, Math.random())
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 my-3 overflow-auto relative">
                          <div className="flex items-center text-red-600 font-medium mb-2">
                            <AlertTriangle size={16} className="mr-2" />
                            Error Output
                          </div>
                          {onOpenCanvas && (
                            <InlineFixButton codeId={codeId} errorContent={codeContent} />
                          )}
                          <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap">
                            {codeContent}
                          </pre>
                        </div>
                      )
                    }
                    
                    // Handle code blocks that contain errors but aren't explicitly marked as errors
                    if (containsError && onOpenCanvas) {
          const codeId = generateCodeId(codeContent, Math.random())
                      return (
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 my-2 overflow-auto relative">
                          <div className="flex items-center text-gray-700 font-medium mb-2">
                            <span>Output</span>
                          </div>
                          <InlineFixButton codeId={codeId} errorContent={codeContent} />
                          <pre className="text-sm p-2 bg-gray-100 rounded font-mono whitespace-pre">
                            {codeContent}
                          </pre>
                        </div>
                      )
                    }
                    
        // Special handling for tabular data (fallback for non-enhanced tables)
                    if (isTabularData) {
          // Detect the type of table for better styling
          let tableType = "Data Table"
          let bgColor = "bg-gray-50"
          let borderColor = "border-gray-200"
          let titleColor = "text-gray-700"
          let icon = "📋"
          
          if (codeContent.includes('Summary Statistics') || 
              (codeContent.includes('count') && codeContent.includes('mean'))) {
            tableType = "Summary Statistics"
            bgColor = "bg-green-50"
            borderColor = "border-green-200"
            titleColor = "text-green-700"
            icon = "📈"
          } else if (codeContent.includes('Correlations') || 
                    (codeContent.includes('price') && (codeContent.match(/\d+\.\d+/g)?.length || 0) > 5)) {
            tableType = "Correlation Matrix"
            bgColor = "bg-purple-50"
            borderColor = "border-purple-200"
            titleColor = "text-purple-700"
            icon = "🔗"
          } else if (codeContent.includes('[') && codeContent.includes('rows x') && codeContent.includes('columns]')) {
            tableType = "DataFrame Info"
            bgColor = "bg-blue-50"
            borderColor = "border-blue-200"
            titleColor = "text-blue-700"
            icon = "🗂️"
          }
          
                      return (
            <div className={`${bgColor} border ${borderColor} rounded-md p-4 my-4`}>
              <div className={`flex items-center ${titleColor} font-semibold mb-3`}>
                <span className="mr-2">{icon}</span>
                {tableType}
              </div>
              <div className="overflow-x-auto max-w-full bg-white p-3 rounded border">
                {renderTableContent(codeContent)}
              </div>
                        </div>
                      )
                    }
                    
                    // For regular code blocks
                    return (
                      <div className="overflow-x-auto my-2">
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
    pre({ children }: any) {
                  return (
                    <div className="overflow-x-auto max-w-full">
                      {children}
                    </div>
                  )
                },
    h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
    h2: ({ node, ...props }: any) => <h2 className="text-xl font-semibold mt-5 mb-3" {...props} />,
    h3: ({ node, ...props }: any) => <h3 className="text-lg font-medium mt-4 mb-2" {...props} />,
    h4: ({ node, ...props }: any) => <h4 className="text-base font-medium mt-3 mb-2" {...props} />,
    h5: ({ node, ...props }: any) => <h5 className="text-sm font-medium mt-3 mb-1" {...props} />,
    h6: ({ node, ...props }: any) => <h6 className="text-sm font-medium mt-3 mb-1" {...props} />,
    p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 mb-4" {...props} />,
    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-6 mb-4" {...props} />,
    li: ({ node, ...props }: any) => <li className="mb-1" {...props} />,
    a: ({ node, ...props }: any) => (
                  <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                ),
    blockquote: ({ node, ...props }: any) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4" {...props} />
                ),
    table: ({ node, ...props }: any) => (
                  <div className="overflow-x-auto max-w-full my-4">
                    <table className="min-w-max border-collapse" {...props} />
                  </div>
                ),
  }), [onOpenCanvas, renderTableContent, InlineFixButton]);

  const renderContent = useCallback(
    (content: string) => {
      // First, handle TABLE_START/TABLE_END markers before markdown processing
      const tableRegex = /<TABLE_START>\n?([\s\S]*?)\n?<TABLE_END>/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      let partIndex = 0;
      
      // Get the stable markdown components
      const components = markdownComponents();
      
      // Process all table markers
      while ((match = tableRegex.exec(content)) !== null) {
        // Add content before the table if any
        if (match.index > lastIndex) {
          const beforeContent = content.substring(lastIndex, match.index);
          if (beforeContent.trim()) {
            // Remove plotly blocks from the before content as they'll be handled separately
            const plotlyParts = beforeContent.split(/(```plotly[\s\S]*?```)/);
            plotlyParts.forEach((plotlyPart, plotlyIndex) => {
              if (plotlyPart.startsWith("```plotly") && plotlyPart.endsWith("```")) {
                // Skip plotly blocks
                return;
              } else if (plotlyPart.trim()) {
                parts.push(
                  <ReactMarkdown
                    key={`before-${partIndex}-${plotlyIndex}`}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={components}
                  >
                    {plotlyPart}
                  </ReactMarkdown>
                );
              }
            });
          }
        }
        
        // Process the table content
        const tableContent = match[1];
        
        // Detect table type for styling
        let tableType = "Statistical Output";
        let bgColor = "bg-blue-50";
        let borderColor = "border-blue-200";
        let titleColor = "text-blue-700";
        let icon = "📊";
        
        if (tableContent.includes('count') && tableContent.includes('mean') && tableContent.includes('std')) {
          tableType = "Summary Statistics";
          bgColor = "bg-green-50";
          borderColor = "border-green-200";
          titleColor = "text-green-700";
          icon = "📈";
        } else if (tableContent.toLowerCase().includes('correlations') || 
                  (tableContent.includes('price') && (tableContent.match(/\d+\.\d+/g)?.length || 0) > 5)) {
          tableType = "Correlation Matrix";
          bgColor = "bg-purple-50";
          borderColor = "border-purple-200";
          titleColor = "text-purple-700";
          icon = "🔗";
        } else if (tableContent.includes('[') && tableContent.includes('rows x') && tableContent.includes('columns]')) {
          tableType = "DataFrame Info";
          bgColor = "bg-blue-50";
          borderColor = "border-blue-200";
          titleColor = "text-blue-700";
          icon = "🗂️";
        }
        
        // Add the formatted table
        parts.push(
          <div key={`table-${partIndex}`} className={`${bgColor} border ${borderColor} rounded-md p-4 my-4`}>
            <div className={`flex items-center ${titleColor} font-semibold mb-3`}>
              <span className="mr-2">{icon}</span>
              {tableType}
            </div>
            <div className="overflow-x-auto max-w-full bg-white p-3 rounded border">
              {renderTableContent(tableContent)}
            </div>
          </div>
        );
        
        lastIndex = match.index + match[0].length;
        partIndex++;
      }
      
      // Add remaining content after the last table
      if (lastIndex < content.length) {
        const remainingContent = content.substring(lastIndex);
        if (remainingContent.trim()) {
          // Remove plotly blocks as they'll be handled separately
          const plotlyParts = remainingContent.split(/(```plotly[\s\S]*?```)/);
          plotlyParts.forEach((plotlyPart, plotlyIndex) => {
            if (plotlyPart.startsWith("```plotly") && plotlyPart.endsWith("```")) {
              // Skip plotly blocks
              return;
            } else if (plotlyPart.trim()) {
              parts.push(
                <ReactMarkdown
                  key={`after-${partIndex}-${plotlyIndex}`}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={components}
                >
                  {plotlyPart}
                </ReactMarkdown>
              );
            }
          });
        }
      }
      
      // If no tables were found, process the entire content with ReactMarkdown
      if (parts.length === 0) {
        // Remove plotly blocks as they'll be handled separately
        const plotlyParts = content.split(/(```plotly[\s\S]*?```)/);
        return plotlyParts.map((part, index) => {
          if (part.startsWith("```plotly") && part.endsWith("```")) {
            return null;
          } else if (part.trim()) {
            return (
              <ReactMarkdown
                key={index}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={components}
            >
              {part}
            </ReactMarkdown>
            );
          }
          return null;
        });
        }
      
      return parts;
    },
    [markdownComponents, renderTableContent],
  )

  // Render action buttons only if this is an AI message and it's the last part
  const showActionButtons = isAIMessage && isLastPart;

  // Render feedback only if this is an AI message and it's the last part of the message
  // and we have necessary IDs for the API calls
  const showFeedback = isAIMessage && isLastPart;

  return (
    <div>
      {renderContent(message)}
      
      {showFeedback && (
        <div className="mt-4 pt-2 border-t border-gray-100">
          <div className="bg-gray-50 p-2 rounded-md flex justify-between items-center">
            <MessageFeedback messageId={messageId || 0} chatId={chatId || 0} />
            
            {showActionButtons && (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCopyToClipboard} 
                  className="text-gray-500 hover:text-gray-700"
                  title="Copy to clipboard"
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-500 hover:text-gray-700"
                      title="Download content"
                    >
                      <Download size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload('md')}>
                      Download as Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('html')}>
                      Download as HTML
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Show buttons outside of feedback section if no feedback is shown */}
      {showActionButtons && !showFeedback && (
        <div className="mt-4 pt-2 border-t border-gray-100">
          <div className="bg-gray-50 p-2 rounded-md flex justify-end items-center">
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCopyToClipboard} 
                className="text-gray-500 hover:text-gray-700"
                title="Copy to clipboard"
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500 hover:text-gray-700"
                    title="Download content"
                  >
                    <Download size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload('md')}>
                    Download as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('html')}>
                    Download as HTML
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(MessageContent)


