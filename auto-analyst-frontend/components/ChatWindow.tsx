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

  const processContent = (content: string) => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content)
      if (parsed.response) {
        return parsed.response
      }
      // If it's a JSON object but doesn't have a response field,
      // stringify it nicely
      return JSON.stringify(parsed, null, 2)
    } catch (e) {
      // If it's not JSON, return as is
      return content
    }
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
        className="flex-1 px-4 md:px-8 lg:px-12 py-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300"
      >
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
                group
                inline-block
                min-w-[200px]
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
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "")
                    if (!showCode && !inline && match) {
                      return <div className="text-sm text-gray-500">[Code hidden]</div>
                    }
                    return !inline && match ? (
                      <div className="my-4 relative rounded-lg overflow-hidden">
                        <CopyButton text={String(children)} />
                        <SyntaxHighlighter
                          {...props}
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            padding: "1.25rem",
                            paddingTop: "2rem",
                            background: "#1a1a1a",
                          }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code {...props} className={`${className} px-1.5 py-0.5 rounded-md bg-opacity-10 bg-black`}>
                        {children}
                      </code>
                    )
                  },
                  h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
                  pre: ({ children }) => <pre className="my-4 overflow-auto rounded-lg">{children}</pre>,
                }}
              >
                {processContent(message.text)}
              </ReactMarkdown>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default ChatWindow

