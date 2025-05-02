"use client"

import React, { useEffect, useRef, useCallback, useState } from "react"
import { motion } from "framer-motion"
import LoadingIndicator from "@/components/chat/LoadingIndicator"
import MessageContent from "@/components/chat/MessageContent"
import PlotlyChart from "@/components/chat/PlotlyChart"
import { ChatMessage } from "@/lib/store/chatHistoryStore"
import WelcomeSection from "./WelcomeSection"
import CodeCanvas from "./CodeCanvas"
import CodeIndicator from "./CodeIndicator"
import { v4 as uuidv4 } from 'uuid'
import { Code, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PlotlyMessage {
  type: "plotly"
  data: any
  layout: any
}

interface Message {
  text: string | PlotlyMessage
  sender: "user" | "ai"
}

interface CodeEntry {
  id: string;
  language: string;
  code: string;
  timestamp: number;
  title?: string;
  isExecuting?: boolean;
  output?: string;
  hasError?: boolean;
  messageIndex: number; // Track which message this code belongs to
}

interface CodeOutput {
  type: 'output' | 'error' | 'plotly';
  content: string | any;
  messageIndex: number;
  codeId: string;
}

interface ChatWindowProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  showWelcome: boolean
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onSendMessage, showWelcome }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages)
  const [codeCanvasOpen, setCodeCanvasOpen] = useState(false)
  const [codeEntries, setCodeEntries] = useState<CodeEntry[]>([])
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number | null>(null)
  const [codeOutputs, setCodeOutputs] = useState<CodeOutput[]>([])
  
  // Clear code entries for new chats or messages
  const clearCodeEntries = useCallback(() => {
    setCodeEntries([])
    setCodeOutputs([])
    setCodeCanvasOpen(false)
  }, [])
  
  // Handle canvas toggle
  const handleCanvasToggle = useCallback(() => {
    // Toggle canvas without clearing outputs
    setCodeCanvasOpen(!codeCanvasOpen)
  }, [codeCanvasOpen])
  
  // Update local messages when prop messages change
  useEffect(() => {
    setLocalMessages(messages)
    
    // Check if this is a new message set (chat reset or new response)
    if (messages.length !== localMessages.length) {
      // If a new AI message was added
      if (messages.length > localMessages.length && messages.length > 0) {
        const newMessageIndex = messages.length - 1
        
        // Only if it's an AI message
        if (messages[newMessageIndex].sender === "ai") {
          // Clear previous code entries and set the current message index
          clearCodeEntries()
          setCurrentMessageIndex(newMessageIndex)
          
          // Extract code blocks from the new message
          if (typeof messages[newMessageIndex].text === "string") {
            extractCodeFromMessages([messages[newMessageIndex]], newMessageIndex)
          }
        }
      } else if (messages.length < localMessages.length || messages.length === 0) {
        // Chat was reset or cleared
        clearCodeEntries()
        setCurrentMessageIndex(null)
      }
    }
  }, [messages, localMessages.length, clearCodeEntries])

  // Force immediate update when transitioning from welcome to chat view
  useEffect(() => {
    if (!showWelcome && messages.length > 0) {
      setLocalMessages(messages)
      
      // Set current message index to the latest AI message
      const lastAiMessageIndex = messages.findIndex(m => m.sender === "ai")
      if (lastAiMessageIndex !== -1) {
        setCurrentMessageIndex(lastAiMessageIndex)
        clearCodeEntries()
        extractCodeFromMessages([messages[lastAiMessageIndex]], lastAiMessageIndex)
      }
    }
  }, [showWelcome, messages, clearCodeEntries])

  useEffect(() => {
    scrollToBottom()
  }, [localMessages, isLoading])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])
  
  // Extract code blocks from messages
  const extractCodeFromMessages = useCallback((messagesToExtract: ChatMessage[], messageIndex: number) => {
    // Use a map to group code blocks by language
    const codeByLanguage: Record<string, { code: string, blocks: string[] }> = {};
    
    messagesToExtract.forEach((message) => {
      if (message.sender === "ai" && typeof message.text === "string") {
        const codeBlockRegex = /```([a-zA-Z0-9_]+)?\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(message.text)) !== null) {
          const language = match[1] || 'text';
          const code = match[2].trim();
          
          // Skip plotly code blocks as they're handled separately
          if (language === 'plotly') continue;
          
          // Initialize entry for this language if it doesn't exist
          if (!codeByLanguage[language]) {
            codeByLanguage[language] = {
              code: '',
              blocks: []
            };
          }
          
          // Add this code block to the appropriate language group
          codeByLanguage[language].blocks.push(code);
        }
      }
    });
    
    // Combine code blocks for each language and create entries
    const newEntries: CodeEntry[] = [];
    
    for (const [language, { blocks }] of Object.entries(codeByLanguage)) {
      if (blocks.length > 0) {
        // Combine all code blocks with the same language
        const combinedCode = blocks.join('\n\n# Next code block\n\n');
        
        newEntries.push({
          id: uuidv4(),
          language,
          code: combinedCode,
          timestamp: Date.now(),
          title: `${language} snippet from AI`,
          messageIndex
        });
      }
    }
    
    if (newEntries.length > 0) {
      setCodeEntries(newEntries);
      setCodeCanvasOpen(true);
    }
  }, []);

  // Process a message to replace code blocks with indicators
  const processMessageWithCodeIndicators = useCallback((message: ChatMessage, index: number) => {
    if (typeof message.text !== "string") return message.text;
    
    const parts: (string | { type: 'code'; language: string; })[] = [];
    let lastIndex = 0;
    const codeBlockRegex = /```([a-zA-Z0-9_]+)?\n([\s\S]*?)```/g;
    let match;
    
    // Find all code blocks and split the text
    while ((match = codeBlockRegex.exec(message.text)) !== null) {
      // Add text before the code block
      if (match.index > lastIndex) {
        parts.push(message.text.substring(lastIndex, match.index));
      }
      
      // Add a placeholder for the code block
      const language = match[1] || 'text';
      // Skip plotly code blocks as they're handled separately
      if (language !== 'plotly') {
        parts.push({ type: 'code', language });
      } else {
        // Keep plotly blocks as is
        parts.push(match[0]);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after the last code block
    if (lastIndex < message.text.length) {
      parts.push(message.text.substring(lastIndex));
    }
    
    return parts;
  }, []);

  const handleCodeExecute = useCallback((result: any, updateCodeBlock: (code: string) => void) => {
    if (result.savedCode) {
      // Just update the code block without adding a message
      updateCodeBlock(result.savedCode)
    } else {
      // Add execution output as a separate message
      let executionResult = ""

      if (result.error) {
        executionResult = `\`\`\`error\n${result.error}\n\`\`\``
      } else {
        if (result.output) {
          executionResult = `\`\`\`output\n${result.output}\n\`\`\``
        }
        if (result.plotly_outputs && result.plotly_outputs.length > 0) {
          executionResult += "\nPlotly charts generated:\n"
          result.plotly_outputs.forEach((plotlyOutput: string, index: number) => {
            executionResult += `\`\`\`plotly\n${plotlyOutput}\n\`\`\`\n\n`
          })
        }
      }

      // if (executionResult) {
      //   setLocalMessages((prev) => [
      //     ...prev,
      //     {
      //       text: executionResult,
      //       sender: "ai",
      //     },
      //   ])
      // }
    }
  }, [])
  
  // Handle code execution from CodeCanvas
  const handleCodeCanvasExecute = useCallback((entryId: string, result: any) => {
    // Find the code entry
    const codeEntry = codeEntries.find(entry => entry.id === entryId);
    if (!codeEntry) return;
    
    // Clear previous outputs for this code
    setCodeOutputs(prev => prev.filter(output => output.codeId !== entryId))
    
    // Add outputs to the chat
    if (result.error) {
      // Add error output
      setCodeOutputs(prev => [
        ...prev,
        {
          type: 'error',
          content: result.error,
          messageIndex: codeEntry.messageIndex,
          codeId: entryId
        }
      ]);
    } else if (result.output) {
      // Add text output
      setCodeOutputs(prev => [
        ...prev,
        {
          type: 'output',
          content: result.output,
          messageIndex: codeEntry.messageIndex,
          codeId: entryId
        }
      ]);
    }
    
    // Add plotly outputs if any
    if (result.plotly_outputs && result.plotly_outputs.length > 0) {
      result.plotly_outputs.forEach((plotlyOutput: string) => {
        try {
          const plotlyData = JSON.parse(plotlyOutput.replace(/```plotly\n|\n```/g, ""));
          setCodeOutputs(prev => [
            ...prev,
            {
              type: 'plotly',
              content: plotlyData,
              messageIndex: codeEntry.messageIndex,
              codeId: entryId
            }
          ]);
        } catch (e) {
          console.error("Error parsing Plotly data:", e);
        }
      });
    }
  }, [codeEntries]);

  const renderMessage = (message: ChatMessage, index: number) => {
    if (typeof message.text === "object" && message.text.type === "plotly") {
      return (
        <motion.div key={index} className="flex justify-start mb-8">
          <div className="relative max-w-[95%] rounded-2xl p-6 bg-white shadow-md">
            <PlotlyChart data={message.text.data} layout={message.text.layout} />
          </div>
        </motion.div>
      )
    }
    
    // Process message to replace code blocks with indicators
    const messageContent = typeof message.text === 'string' 
      ? processMessageWithCodeIndicators(message, index) 
      : JSON.stringify(message.text);
    
    // Render the entire message
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} mb-8`}
      >
        <div
          className={`relative rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg ${
            message.sender === "user"
              ? "bg-[#FF7F7F] text-white shadow-pink-200/50 max-w-[95%]"
              : "bg-white text-gray-900 shadow-md shadow-gray-200/50 max-w-[95%]"
          }`}
        >
          {Array.isArray(messageContent) ? (
            // Render message with code indicators
            messageContent.map((part, partIndex) => {
              if (typeof part === 'string') {
                // Handle plotly blocks embedded in the string
                if (part.includes('```plotly')) {
                  const plotlyParts = part.split(/(```plotly[\s\S]*?```)/);
                  return plotlyParts.map((plotlyPart, plotlyIndex) => {
                    if (plotlyPart.startsWith('```plotly') && plotlyPart.endsWith('```')) {
                      return renderPlotlyBlock(plotlyPart, `${index}-${partIndex}-${plotlyIndex}`);
                    } else if (plotlyPart.trim()) {
                      return <MessageContent key={`${index}-${partIndex}-${plotlyIndex}`} message={plotlyPart} onCodeExecute={handleCodeExecute} />;
                    }
                    return null;
                  });
                }
                // Regular text part
                return <MessageContent key={`${index}-${partIndex}`} message={part} onCodeExecute={handleCodeExecute} />;
              } else if (part.type === 'code') {
                // Code indicator
                return (
                  <CodeIndicator
                    key={`${index}-${partIndex}-code`}
                    language={part.language}
                    onClick={() => {
                      setCurrentMessageIndex(index);
                      clearCodeEntries();
                      extractCodeFromMessages([message], index);
                      setCodeCanvasOpen(true);
                    }}
                  />
                );
              }
              return null;
            })
          ) : (
            // Fallback for non-array content
            <MessageContent message={typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent)} onCodeExecute={handleCodeExecute} />
          )}
        </div>
      </motion.div>
    );
  };

  // Helper function to render Plotly blocks
  const renderPlotlyBlock = (plotlyPart: string, key: string) => {
    const plotlyContent = plotlyPart.slice(9, -3).trim();
    try {
      const plotlyData = JSON.parse(plotlyContent);
      if (plotlyData.data && plotlyData.data.length > 0) {
        return (
          <div key={key} className="w-full my-4 overflow-x-auto">
            <PlotlyChart data={plotlyData.data} layout={plotlyData.layout} />
          </div>
        );
      }
    } catch (e) {
      console.error("Error parsing Plotly data:", e);
      return (
        <div key={key} className="text-red-500 my-2">
          Error rendering Plotly chart
        </div>
      );
    }
    return null;
  };

  // Render code outputs after their associated messages
  const renderCodeOutputs = (messageIndex: number) => {
    const relevantOutputs = codeOutputs.filter(output => output.messageIndex === messageIndex);
    
    if (relevantOutputs.length === 0) return null;
    
    return (
      <div className="mt-2 space-y-4">
        {relevantOutputs.map((output, idx) => {
          if (output.type === 'error') {
            return (
              <div key={`output-${messageIndex}-${idx}`} className="bg-red-50 border border-red-200 rounded-md p-3 overflow-auto">
                <div className="flex items-center text-red-600 font-medium mb-2">
                  <AlertTriangle size={16} className="mr-2" />
                  Error Output
                </div>
                <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap">{output.content}</pre>
              </div>
            );
          } else if (output.type === 'output') {
            return (
              <div key={`output-${messageIndex}-${idx}`} className="bg-gray-50 border border-gray-200 rounded-md p-3 overflow-auto">
                <div className="text-gray-700 font-medium mb-2">Output</div>
                <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">{output.content}</pre>
              </div>
            );
          } else if (output.type === 'plotly') {
            return (
              <div key={`output-${messageIndex}-${idx}`} className="bg-white border border-gray-200 rounded-md p-3 overflow-auto">
                <div className="text-gray-700 font-medium mb-2">Visualization</div>
                <div className="w-full">
                  <PlotlyChart data={output.content.data} layout={output.content.layout} />
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  // Modified render message function to include code outputs
  const renderMessageWithOutputs = (message: ChatMessage, index: number) => {
    const renderedMessage = renderMessage(message, index);
    const codeOutputsComponent = renderCodeOutputs(index);
    
    if (!codeOutputsComponent) {
      return renderedMessage;
    }
    
    // If we have both message and outputs, wrap them together
    return (
      <div key={`message-with-outputs-${index}`} className="mb-8">
        {renderedMessage}
        {codeOutputsComponent}
      </div>
    );
  };

  return (
    <div className="h-full overflow-hidden flex flex-col relative">
      <div 
        ref={chatWindowRef}
        className={`flex-1 overflow-y-auto transition-all duration-300 ${codeCanvasOpen ? 'pr-[50%]' : ''}`}
      >
        {showWelcome ? (
          <WelcomeSection onSampleQueryClick={(query) => {
            clearCodeEntries(); // Clear code canvas when starting a new query
            onSendMessage(query);
          }} />
        ) : (
          <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="space-y-8">
              {messages.length > 0 ? (
                messages.map((message, index) => renderMessageWithOutputs(message, index))
              ) : (
                <div className="text-center text-gray-500">No messages yet</div>
              )}
            </div>
          </div>
        )}
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex justify-start mb-8 max-w-4xl mx-auto px-4"
          >
            <div className="relative max-w-[85%] rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg bg-white text-gray-900 shadow-md shadow-gray-200/50">
              <LoadingIndicator />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Code Canvas */}
      {currentMessageIndex !== null && codeEntries.length > 0 && (
        <CodeCanvas 
          isOpen={codeCanvasOpen}
          onToggle={handleCanvasToggle}
          codeEntries={codeEntries}
          onCodeExecute={handleCodeCanvasExecute}
        />
      )}
    </div>
  )
}

export default React.memo(ChatWindow)
