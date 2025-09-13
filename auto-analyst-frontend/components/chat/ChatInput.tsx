"use client"

import React, { forwardRef, useImperativeHandle } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, Zap, Paperclip, Send, Square } from 'lucide-react'
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { useChatInput } from '@/lib/hooks/useChatInput'
import { FileUploadSection } from './FileUploadSection'
import { ChatInputProps, ChatInputRef } from '@/types/chatInput.types'
import ExcelUploadDialog from './ExcelUploadDialog'
import DeepAnalysisSidebar from '../deep-analysis/DeepAnalysisSidebar'

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>((props, ref) => {
  const chatInput = useChatInput(props)
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handlePreviewDefaultDataset: chatInput.handlePreviewDefaultDataset,
    handleSilentDefaultDataset: chatInput.handleSilentDefaultDataset
  }))

  // Handle file selection from input
  const handleFileSelect = (file: File) => {
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      chatInput.handleExcelFileSelected(file)
    } else {
      chatInput.handleFileUpload(file)
    }
  }

  // Handle textarea auto-resize and input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    chatInput.setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!chatInput.disabled && !chatInput.isLoading && chatInput.message.trim()) {
        chatInput.handleSendMessage()
      }
    }
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto px-4">
      {/* Action buttons row - ChatGPT style above input */}
      <div className="flex items-center justify-center gap-2 mb-3">
        {/* Preview Default Dataset Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={chatInput.handlePreviewDefaultDataset}
          className="bg-white/90 border-gray-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 flex items-center gap-2 px-4 py-2 rounded-full shadow-sm"
          disabled={chatInput.disabled || chatInput.isLoading}
        >
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Preview Default Dataset</span>
        </Button>
        
        {/* Deep Analysis Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => chatInput.setShowDeepAnalysisSidebar(true)}
          className="bg-white/90 border-gray-200 text-gray-600 hover:text-pink-600 hover:bg-pink-50 hover:border-pink-300 transition-all duration-200 flex items-center gap-2 px-4 py-2 rounded-full shadow-sm relative"
          disabled={chatInput.disabled || chatInput.isLoading}
        >
          <Zap className="h-4 w-4" />
          <span className="text-sm font-medium">Deep Analysis</span>
          <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            Premium
          </span>
        </Button>
      </div>

      {/* Main input container - ChatGPT style but wider */}
      <div className="bg-white border border-gray-300 rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden w-full">
        
        {/* File Upload Section */}
        <AnimatePresence>
          {chatInput.fileUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-gray-200 bg-gray-50"
            >
              <FileUploadSection
                fileUpload={chatInput.fileUpload}
                fileInputRef={chatInput.fileInputRef}
                onFileSelect={handleFileSelect}
                onRemoveFile={chatInput.handleRemoveFile}
                disabled={chatInput.disabled}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Section - ChatGPT style but wider */}
        <div className="flex items-center gap-4 p-5">
          {/* File attachment button - better centered */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => chatInput.fileInputRef.current?.click()}
            disabled={chatInput.disabled || chatInput.isLoading}
            className="text-gray-500 hover:text-pink-600 hover:bg-pink-50 transition-colors duration-200 p-2.5 rounded-xl flex-shrink-0 self-center"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          {/* Message input - wider */}
          <div className="flex-1 relative min-w-0">
            <Textarea
              ref={chatInput.inputRef}
              value={chatInput.message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              disabled={chatInput.disabled}
              className="min-h-[52px] max-h-[200px] resize-none border-0 shadow-none focus:ring-0 focus-visible:ring-0 bg-transparent text-gray-900 placeholder-gray-500 text-base leading-6 pr-16 py-3 w-full"
              style={{ 
                fontSize: '16px',
                lineHeight: '24px',
              }}
            />
            
            {/* Send/Stop button - better positioned and Auto-Analyst colors */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {chatInput.isLoading ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={props.onStopGeneration}
                  className="h-9 w-9 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200 rounded-lg"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={chatInput.handleSendMessage}
                  disabled={chatInput.disabled || !chatInput.message.trim()}
                  className="h-9 w-9 p-0 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 rounded-lg shadow-sm"
                >
                  <Send className="h-4 w-4 text-white" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        {chatInput.uploadSuccess && (
          <div className="flex items-center justify-center gap-2 text-green-600 pb-3 px-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Dataset Ready</span>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={chatInput.fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
          className="hidden"
        />
      </div>

      {/* Deep Analysis Sidebar */}
      <DeepAnalysisSidebar
        isOpen={chatInput.showDeepAnalysisSidebar}
        onClose={() => chatInput.setShowDeepAnalysisSidebar(false)}
        sessionId={chatInput.sessionId}
        userId={props.userId}
      />

      {/* Excel Upload Dialog */}
      <ExcelUploadDialog
        isOpen={chatInput.showExcelDialog}
        onClose={() => chatInput.setShowExcelDialog(false)}
        sheets={chatInput.excelSheets}
        fileName={chatInput.excelFileName}
        onConfirm={chatInput.handleExcelConfirmUpload}
        isSubmitting={chatInput.isExcelSubmitting}
      />

      {/* File Preview Modal */}
      <AnimatePresence>
        {chatInput.showPreview && chatInput.filePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => chatInput.setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-6xl max-h-[80vh] overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Dataset Preview: {chatInput.filePreview.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => chatInput.setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    {chatInput.filePreview.description}
                  </p>
                </div>

                <div className="overflow-auto max-h-96 border rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {chatInput.filePreview.headers.map((header, index) => (
                          <th key={index} className="px-4 py-2 text-left font-medium text-gray-900 border-b">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chatInput.filePreview.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2 border-b border-gray-200">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

ChatInput.displayName = "ChatInput"

export default ChatInput