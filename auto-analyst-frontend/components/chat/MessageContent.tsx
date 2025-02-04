import React, { useCallback } from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import CodeBlock from "./CodeBlocker"

interface MessageContentProps {
  message: string
  onCodeExecute?: (result: any, updateCodeBlock: (code: string) => void) => void
}

const MessageContent: React.FC<MessageContentProps> = ({ message, onCodeExecute }) => {
  const renderContent = useCallback(
    (content: string) => {
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

                  if (!isInline && match) {
                    return (
                      <CodeBlock
                        language={match[1]}
                        value={String(children).replace(/\n$/, "")}
                        onExecute={(result: any, updateCodeBlock: (code: string) => void) => onCodeExecute && onCodeExecute(result, updateCodeBlock)}
                      />

                    )

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
    },
    [onCodeExecute],
  )

  return <>{renderContent(message)}</>
}

export default React.memo(MessageContent)

