import React, { useCallback } from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"

interface MessageContentProps {
  message: string
  onCodeExecute?: (result: any, updateCodeBlock: (code: string) => void) => void
  agentName?: string
}

const MessageContent: React.FC<MessageContentProps> = ({ message, onCodeExecute, agentName }) => {
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
                  
                  // Check if this is likely tabular data
                  const matches = codeContent.match(/\|\s*\w+\s*\|/g);
                  const isTabularData = !isInline && codeContent.includes('|') && 
                                       (codeContent.includes('DataFrame') || 
                                        codeContent.includes('Column Types') ||
                                        (matches !== null && matches.length > 1));

                  if (!isInline && match) {
                    // Special handling for tabular data
                    if (isTabularData) {
                      return (
                        <div className="overflow-x-auto max-w-full my-2">
                          <pre className="text-sm p-2 bg-gray-100 rounded font-mono whitespace-pre min-w-max">
                            {codeContent}
                          </pre>
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
    [onCodeExecute, agentName],
  )

  return <>{renderContent(message)}</>
}

export default React.memo(MessageContent)

