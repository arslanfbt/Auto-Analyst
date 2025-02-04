"use client"

import React, { useEffect, useRef, useCallback, useState } from "react"
import { motion } from "framer-motion"
import LoadingIndicator from "@/components/chat/LoadingIndicator"
import MessageContent from "@/components/chat/MessageContent"
import PlotlyChart from "@/components/PlotlyChart"

interface PlotlyMessage {
  type: "plotly"
  data: any
  layout: any
}

interface Message {
  text: string | PlotlyMessage
  sender: "user" | "ai"
}

interface ChatWindowProps {
  messages: Message[]
  isLoading: boolean
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)

  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [scrollToBottom, localMessages])

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

  const renderMessage = (message: Message, index: number) => {
    if (typeof message.text === "object" && message.text.type === "plotly") {
      return (
        <motion.div key={index} className="flex justify-start mb-8">
          <div className="relative max-w-[95%] rounded-2xl p-6 bg-white shadow-md">
            <PlotlyChart data={message.text.data} layout={message.text.layout} />
          </div>
        </motion.div>
      )
    }

    const parts = message.text.toString().split(/(```plotly[\s\S]*?```)/)

    return parts.map((part, partIndex) => {
      if (part.startsWith("```plotly") && part.endsWith("```")) {
        const plotlyContent = part.slice(9, -3).trim()
        try {
          const plotlyData = JSON.parse(plotlyContent)
          if (plotlyData.data && plotlyData.data.length > 0) {
            return (
              <motion.div
                key={`${index}-${partIndex}-plotly`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start mb-8"
              >
                <div className="relative max-w-[95%] rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg bg-white text-gray-900 shadow-md shadow-gray-200/50">
                  <div className="w-full my-4 overflow-x-auto">
                    <PlotlyChart data={plotlyData.data} layout={plotlyData.layout} />
                  </div>
                </div>
              </motion.div>
            )
          }
        } catch (e) {
          console.error("Error parsing Plotly data:", e)
          return (
            <motion.div
              key={`${index}-${partIndex}-error`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex justify-start mb-8"
            >
              <div className="relative max-w-[95%] rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg bg-white text-gray-900 shadow-md shadow-gray-200/50">
                <div className="text-red-500">Error rendering Plotly chart</div>
              </div>
            </motion.div>
          )
        }
      } else if (part.trim()) {
        return (
          <motion.div
            key={`${index}-${partIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} mb-8`}
          >
            <div
              className={`relative max-w-[95%] rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg ${
                message.sender === "user"
                  ? "bg-[#FF7F7F] text-white shadow-pink-200/50"
                  : "bg-white text-gray-900 shadow-md shadow-gray-200/50"
              }`}
            >
              <MessageContent message={part} onCodeExecute={handleCodeExecute} />
            </div>
          </motion.div>
        )
      }
      return null
    })
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div
        ref={chatWindowRef}
        className="flex-1 px-4 py-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300"
      >
        <div className="max-w-5xl mx-auto w-full">
          {localMessages.flatMap((message, index) => renderMessage(message, index))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex justify-start mb-8"
            >
              <div className="relative max-w-[85%] rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg bg-white text-gray-900 shadow-md shadow-gray-200/50">
                <LoadingIndicator />
              </div>
            </motion.div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default React.memo(ChatWindow)

