import type React from "react"
import { useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism"
import rehypeRaw from "rehype-raw"

const cleanJsonString = (content: string) => {
  return content
    .replace(/^```json/, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
}

const formatMessageContent = (content: string) => {
  try {
    const cleanedContent = cleanJsonString(content)
    const parsedContent = JSON.parse(cleanedContent)

    return Object.entries(parsedContent)
      .map(([key, value]) => formatValue(key, value))
      .join("\n\n")
  } catch (error) {
    console.error("Error parsing JSON:", error)
    return content
  }
}

const formatValue = (key: string, value: any): string => {
  if (typeof value === "object" && value !== null) {
    key = key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    return `### ${key}\n\n${Object.entries(value)
      .map(([subKey, subValue]) => formatSubValue(subKey, subValue))
      .join("\n")}`
  } else {
    return `### ${key}\n\n${formatSubValue("", value)}`
  }
}

const formatSubValue = (subKey: string, subValue: any): string => {
  if (typeof subValue === "string") {
    if (subValue.includes("```python")) {
      return `${subKey ? `**${subKey}:**\n\n` : ""}${subValue}`
    }
    if (subValue.startsWith("```")) {
      return `${subKey ? `**${subKey}:**\n\n` : ""}\`\`\`\n${subValue.replace(/```/g, "")}\n\`\`\``
    }
  }
  // make the subkey camelCase  
  const camelCaseSubKey = subKey.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  return camelCaseSubKey ? `**${camelCaseSubKey}:** ${subValue}` : `${subValue}`
}

const ChatWindow: React.FC<{ messages: { text: string; sender: "user" | "ai" }[] }> = ({ messages }) => {
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [scrollToBottom])

  return (
    <div
      ref={chatWindowRef}
      className="flex-1 px-4 md:px-8 lg:px-12 py-6 space-y-8 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300"
      style={{
        height: "100%",
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "thin",
      }}
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
              rehypePlugins={[rehypeRaw]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "")
                  return !inline && match ? (
                    <div className="my-6 first:mt-2 last:mb-2">
                      <div className="rounded-xl overflow-hidden shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                        <SyntaxHighlighter
                          {...props}
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            padding: "1.25rem",
                            background: "#1a1a1a",
                          }}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  ) : (
                    <code {...props} className={`${className} px-1.5 py-0.5 rounded-md bg-opacity-10 bg-black`}>
                      {children}
                    </code>
                  )
                },
                h3: ({ children }) => <h3 className="text-lg font-semibold mt-8 first:mt-2 mb-3">{children}</h3>,
                p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 last:mb-0 pl-4 space-y-2">{children}</ul>,
                li: ({ children }) => (
                  <li className="relative pl-4 before:absolute before:left-0 before:top-3 before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:opacity-40">
                    {children}
                  </li>
                ),
              }}
            >
              {formatMessageContent(message.text)}
            </ReactMarkdown>
          </div>
        </motion.div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default ChatWindow

