"use client"

import type React from "react"
import { useEffect, useRef, useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import { Code2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import { Button } from "./ui/button"
import PlotlyChart from "./PlotlyChart"

interface Message {
  text: string | PlotlyMessage
  sender: "user" | "ai"
}

interface PlotlyMessage {
  type: "plotly"
  data: any
  layout: any
}

interface ChatWindowProps {
  messages: Message[]
}

interface CodeBlockProps {
  language: string
  value: string
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <div className="relative rounded-lg overflow-hidden my-4 bg-[#1E1E1E]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">{language}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="text-gray-400 hover:text-gray-200"
        >
          {isVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-200"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: "1.25rem",
                background: "#1E1E1E",
              }}
            >
              {value}
            </SyntaxHighlighter>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [scrollToBottom])

  const renderPlotly = (plotlyContent: string) => {
    try {
      const plotlyData = JSON.parse(plotlyContent)
      return <PlotlyChart data={plotlyData.data} layout={plotlyData.layout} />
    } catch (e) {
      console.error("Error parsing Plotly data:", e)
      return <div className="text-red-500">Error rendering Plotly chart</div>
    }
  }

  const renderContent = (text: string) => {
    const parts = text.split(/(```plotly[\s\S]*?```)/)

    return parts.map((part, index) => {
      if (part.startsWith("```plotly") && part.endsWith("```")) {
        const plotlyContent = part.slice(9, -3).trim()
        return (
          <div key={index} className="w-full my-4">
            {renderPlotly(plotlyContent)}
          </div>
        )
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

                if (!isInline && match) {
                  return <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
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
            }}
          >
            {part}
          </ReactMarkdown>
        )
      }
    })
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div
        ref={chatWindowRef}
        className="flex-1 px-4 py-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300"
      >
        <div className="max-w-5xl mx-auto w-full">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} mb-8`}
            >
              <div
                className={`relative max-w-[85%] rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg ${
                  message.sender === "user"
                    ? "bg-[#FF7F7F] text-white shadow-pink-200/50"
                    : "bg-white text-gray-900 shadow-md shadow-gray-200/50"
                }`}
              >
                {renderContent(message.text.toString())}
              </div>
            </motion.div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default ChatWindow

