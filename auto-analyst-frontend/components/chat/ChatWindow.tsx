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
import axios from "axios"

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
  chatNameGenerated?: boolean
  sessionId?: string
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onSendMessage, showWelcome, chatNameGenerated = false, sessionId }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages)
  const [codeCanvasOpen, setCodeCanvasOpen] = useState(false)
  const [codeEntries, setCodeEntries] = useState<CodeEntry[]>([])
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number | null>(null)
  const [codeOutputs, setCodeOutputs] = useState<CodeOutput[]>([])
  const [chatCompleted, setChatCompleted] = useState(false)
  const [autoRunEnabled, setAutoRunEnabled] = useState(true)
  const [hiddenCanvas, setHiddenCanvas] = useState<boolean>(true)
  const [pendingCodeExecution, setPendingCodeExecution] = useState(false)
  
  // Set chatCompleted when chat name is generated
  useEffect(() => {
    if (chatNameGenerated && messages.length > 0) {
      setChatCompleted(true);
      
      // Reset chatCompleted after a delay to prepare for the next response
      const timer = setTimeout(() => {
        setChatCompleted(false);
      }, 10000); // Increase to 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [chatNameGenerated, messages.length]);
  
  // Scrolling helper
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
    }
  }, []);
  
  // Clear code entries for new chats or messages
  const clearCodeEntries = useCallback(() => {
    setCodeEntries([])
    setCodeOutputs([])
    // Don't close the canvas anymore, just hide it
    setHiddenCanvas(true)
  }, [])
  
  // Clear only code entries but keep outputs (for new AI messages)
  const clearCodeEntriesKeepOutput = useCallback(() => {
    setCodeEntries([])
    // Don't close the canvas, just make it hidden
    setHiddenCanvas(true)
  }, [])
  
  // Handle canvas toggle
  const handleCanvasToggle = useCallback(() => {
    // Toggle canvas visibility instead of existence
    setCodeCanvasOpen(!codeCanvasOpen)
    setHiddenCanvas(false) // Make sure it's not hidden when manually toggled
  }, [codeCanvasOpen])
  
  // Add a function to process all AI messages in the chat
  const processAllAiMessages = useCallback(() => {
    if (messages.length === 0) return;
    
    // Get all AI messages
    const aiMessages = messages.filter(m => m.sender === "ai");
    if (aiMessages.length === 0) return;
    
    // Set the latest AI message as active
    const lastAiMessageIndex = messages.lastIndexOf(aiMessages[aiMessages.length - 1]);
    setCurrentMessageIndex(lastAiMessageIndex);
    
    // Clear previous code entries but preserve outputs
    clearCodeEntriesKeepOutput();
    
    // Extract code from the latest AI message
    extractCodeFromMessages([messages[lastAiMessageIndex]], lastAiMessageIndex);
    
    // Trigger auto-run for the code will happen via the chatCompleted state
    
  }, [messages, clearCodeEntriesKeepOutput, extractCodeFromMessages]);
  
  // Detect when loading completes and trigger code execution
  useEffect(() => {
    if (pendingCodeExecution && !isLoading) {
      // The entire response is now complete (loading finished)
      console.log("Loading complete - triggering code execution for all messages");
      
      // Process all AI messages to find and execute code
      // This ensures we wait for the ENTIRE conversation/response to complete
      // before auto-running any code, rather than running code for each
      // individual message as it arrives
      processAllAiMessages();
      
      // Set chatCompleted to true to trigger auto-run
      setChatCompleted(true);
      
      // Reset flags
      setPendingCodeExecution(false);
      
      // Reset chatCompleted after a delay
      const timer = setTimeout(() => {
        setChatCompleted(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, pendingCodeExecution, processAllAiMessages]);
  
  // When loading starts, mark that we need to process code when loading ends
  useEffect(() => {
    if (isLoading) {
      setChatCompleted(false);
      setPendingCodeExecution(true);
    }
  }, [isLoading]);

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
          // Clear previous code entries but preserve outputs, and set the current message index
          clearCodeEntriesKeepOutput()
          setCurrentMessageIndex(newMessageIndex)
          
          // Extract code blocks from the new message but DON'T auto-run yet
          if (typeof messages[newMessageIndex].text === "string") {
            extractCodeFromMessages([messages[newMessageIndex]], newMessageIndex)
            
            // We'll wait for loading to complete before auto-running
            // so we've removed the setChatCompleted(true) calls here
          }
        }
      } else if (messages.length < localMessages.length || messages.length === 0) {
        // Chat was reset or cleared
        clearCodeEntries()
        setCurrentMessageIndex(null)
      }
    }
  }, [messages, localMessages.length, clearCodeEntries, clearCodeEntriesKeepOutput, extractCodeFromMessages])

  // Modify the useEffect for loading chat to process all messages
  useEffect(() => {
    if (!showWelcome && messages.length > 0) {
      setLocalMessages(messages);
      processAllAiMessages();
    }
  }, [showWelcome, messages, processAllAiMessages, setLocalMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [localMessages, isLoading, scrollToBottom])

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
    
    // If this is just a code update without execution (savedCode)
    if (result.savedCode) {
      // Update the code in our state without generating output
      setCodeEntries(prev => 
        prev.map(entry => 
          entry.id === entryId 
            ? { ...entry, code: result.savedCode } 
            : entry
        )
      );
      return;
    }
    
    // Remove previous output for this message (not just this code entry)
    // This ensures each message has only one output box
    setCodeOutputs(prev => prev.filter(output => output.messageIndex !== codeEntry.messageIndex));
    
    // Add/update outputs for this message
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
              : "bg-white text-gray-900 shadow-md shadow-gray-200/50 max-w-full md:max-w-[95%] overflow-hidden"
          }`}
        >
          <div className={message.sender === "ai" ? "overflow-x-auto" : ""}>
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
                        // When clicking on a code indicator, process the message and make the canvas visible
                        setCurrentMessageIndex(index);
                        clearCodeEntriesKeepOutput();
                        extractCodeFromMessages([message], index);
                        setCodeCanvasOpen(true);
                        setHiddenCanvas(false); // Make the canvas visible when clicked
                        
                        // Remove auto-run trigger when manually opening canvas
                        // setChatCompleted(true);
                        // setTimeout(() => {
                        //   setChatCompleted(false);
                        // }, 10000);
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
    
    // Group outputs by type for organized display
    const errorOutputs = relevantOutputs.filter(output => output.type === 'error');
    const textOutputs = relevantOutputs.filter(output => output.type === 'output');
    const plotlyOutputs = relevantOutputs.filter(output => output.type === 'plotly');
    
        return (
      <div className="mt-2 space-y-4">
        {/* Show error outputs first */}
        {errorOutputs.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 overflow-auto">
            <div className="flex items-center text-red-600 font-medium mb-2">
              <AlertTriangle size={16} className="mr-2" />
              Error Output
            </div>
            <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap">
              {errorOutputs[0].content}
            </pre>
          </div>
        )}
        
        {/* Show text outputs */}
        {textOutputs.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <div className="text-gray-700 font-medium mb-2">Output</div>
            {(() => {
              const content = textOutputs[0].content;
              // Check if the output looks like a DataFrame or tabular data
              const isTabularData = content.includes('|') && 
                                 (content.includes('DataFrame') || 
                                  content.includes('Column Types') ||
                                  (content.match(/\|\s*\w+\s*\|/g)?.length > 1));
              
              return isTabularData ? (
                <div className="overflow-x-auto max-w-full">
                  <pre className="text-xs text-gray-800 font-mono whitespace-pre min-w-max">{content}</pre>
                </div>
              ) : (
                <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap overflow-auto max-h-[400px]">{content}</pre>
              );
            })()}
          </div>
        )}
        
        {/* Show plotly visualizations */}
        {plotlyOutputs.map((output, idx) => (
          <div key={`plotly-${messageIndex}-${idx}`} className="bg-white border border-gray-200 rounded-md p-3 overflow-auto">
            <div className="text-gray-700 font-medium mb-2">Visualization</div>
            <div className="w-full">
              <PlotlyChart data={output.content.data} layout={output.content.layout} />
            </div>
          </div>
        ))}
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
        className={`flex-1 overflow-y-auto transition-all duration-300 ${codeCanvasOpen && !hiddenCanvas ? 'pr-[50%]' : ''}`}
      >
        {showWelcome ? (
          <WelcomeSection onSampleQueryClick={(query) => {
            clearCodeEntries(); // Clear ALL code canvas data for new chat
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
      
      {/* Code Canvas - always render it if we have code, but control visibility */}
      {currentMessageIndex !== null && codeEntries.length > 0 && (
        <CodeCanvas 
          isOpen={codeCanvasOpen}
          onToggle={handleCanvasToggle}
          codeEntries={codeEntries}
          onCodeExecute={handleCodeCanvasExecute}
          chatCompleted={chatCompleted}
          hiddenCanvas={hiddenCanvas}
        />
      )}
    </div>
  )
}

export default React.memo(ChatWindow)
