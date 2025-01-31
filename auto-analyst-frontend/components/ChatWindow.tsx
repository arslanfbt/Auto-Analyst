"use client"

import type React from "react"
import { useEffect, useRef, useCallback, useState } from "react"
import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import { Code2, CodeIcon as CodeOff } from "lucide-react"
import { Button } from "./ui/button"
import CopyButton from "./ui/CopyButton"
import PlotlyChart from "./PlotlyChart"

interface Message {
  text: string
  sender: "user" | "ai"
}

const ChatWindow: React.FC<{ messages: Message[] }> = ({ messages }) => {
  const [showCode, setShowCode] = useState(true)
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
          <div key={index} className="w-full my-2">
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
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "")
                if (!showCode && !inline && match) {
                  return <div className="text-sm text-gray-500">[Code hidden]</div>
                }
                return !inline && match ? (
                  <div className="relative rounded-lg bg-[#1a1a1a] overflow-hidden my-4">
                    <CopyButton text={String(children)} />
                    <div className="overflow-x-auto">
                      <SyntaxHighlighter
                        {...props}
                        style={tomorrow}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          padding: "1.25rem",
                          paddingTop: "2rem",
                          background: "transparent",
                        }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                ) : (
                  <code {...props} className={`${className} px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-800`}>
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
              pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-lg">{children}</pre>,
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full divide-y divide-gray-300">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
              tbody: ({ children }) => <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>,
              tr: ({ children }) => <tr>{children}</tr>,
              th: ({ children }) => (
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{children}</th>
              ),
              td: ({ children }) => <td className="px-3 py-4 text-sm text-gray-500">{children}</td>,
            }}
          >
            {part}
          </ReactMarkdown>
        )
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end px-4 py-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCode(!showCode)}
          className="text-gray-500 hover:text-gray-900"
        >
          {showCode ? (
            <>
              <CodeOff className="w-4 h-4 mr-2" />
              Hide Code
            </>
          ) : (
            <>
              <Code2 className="w-4 h-4 mr-2" />
              Show Code
            </>
          )}
        </Button>
      </div>
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
                className={`
                  relative
                  max-w-[85%]
                  rounded-2xl 
                  p-6
                  transition-shadow
                  duration-200
                  hover:shadow-lg
                  ${
                    message.sender === "user"
                      ? "bg-[#FF7F7F] text-white shadow-pink-200/50"
                      : "bg-white text-gray-900 shadow-md shadow-gray-200/50"
                  }
                `}
              >
                {renderContent(message.text)}
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

