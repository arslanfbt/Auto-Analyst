import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Code2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"

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

export default React.memo(CodeBlock)
