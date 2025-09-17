"use client"

import React, { useEffect, useRef, useCallback, useState } from "react"
import { motion } from "framer-motion"
import LoadingIndicator from "@/components/chat/LoadingIndicator"
import MessageContent from "@/components/chat/MessageContent"
import { ChatMessage } from "@/lib/store/chatHistoryStore"
import WelcomeSection from "./WelcomeSection"
import CodeCanvas from "./CodeCanvas"
import CodeIndicator from "./CodeIndicator"
import MessageWithOutputs from "./MessageWithOutputs"
import { useCodeCanvasHandler } from "./CodeCanvasHandler"
import { useMessageProcessor } from "./MessageProcessor"
import { useVisualizationManager } from "./VisualizationManager"
import { useCodeFixIntegration } from "./CodeFixIntegration"
import { processTableMarkersInErrorOutput, processTableMarkersInOutput } from "./TableProcessor"
import { v4 as uuidv4 } from 'uuid'
import { Code, AlertTriangle, Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSessionStore } from '@/lib/store/sessionStore'
import logger from '@/lib/utils/logger'
import { useToast } from "@/components/ui/use-toast"
import { useUserSubscription, useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { PremiumFeatureButton } from '@/components/features/FeatureGate'

interface CodeEntry {
  id: string;
  language: string;
  code: string;
  timestamp: number;
  title?: string;
  isExecuting?: boolean;
  output?: string;
  hasError?: boolean;
  messageIndex: number;
}

interface CodeOutput {
  type: 'error' | 'output' | 'plotly' | 'matplotlib';
  content: any;
  messageIndex: number;
  codeId: string;
  vizIndex?: number;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  sessionId?: string;
  storeSessionId?: string;
}

const ChatWindowSimplified: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onSendMessage,
  sessionId,
  storeSessionId
}) => {
  const [codeEntries, setCodeEntries] = useState<CodeEntry[]>([]);
  const [codeOutputs, setCodeOutputs] = useState<Record<string | number, CodeOutput[]>>({});
  const [codeCanvasOpen, setCodeCanvasOpen] = useState(false);
  const [hiddenCanvas, setHiddenCanvas] = useState(false);
  const [chatCompleted, setChatCompleted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [codeFixes, setCodeFixes] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Custom hooks for different functionalities
  const { processMessageWithCodeIndicators, processAllAiMessages } = useMessageProcessor({ messages });
  const { isVisualizationPinned, togglePinVisualization, setFullscreenViz, fullscreenViz } = useVisualizationManager({ codeEntries });
  
  const { handleCodeCanvasExecute, executeCodeFromChatWindow } = useCodeCanvasHandler({
    codeEntries,
    sessionId: sessionId || '',
    storeSessionId: storeSessionId || '',
    setCodeOutputs,
    codeOutputs,
    messages
  });

  const { 
    codeFixState, 
    handleFixStart, 
    handleFixComplete, 
    handleCreditCheck, 
    handleOpenCanvasForFix 
  } = useCodeFixIntegration({
    codeEntries,
    setCodeEntries,
    sessionId: sessionId || '',
    storeSessionId: storeSessionId || '',
    codeCanvasOpen,
    setCodeCanvasOpen,
    handleCodeCanvasExecute,
    executeCodeFromChatWindow,
    messages,
    setCodeOutputs
  });

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Process messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      processAllAiMessages(codeEntries, setCodeEntries);
      setShowWelcome(false);
    }
  }, [messages, processAllAiMessages, codeEntries]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Render individual message
  const renderMessage = useCallback((message: ChatMessage, index: number) => {
    // For now, let's just render the message text directly
    // We can enhance this later to handle processed content
    const messageText = typeof message.text === 'string' ? message.text : JSON.stringify(message.text);
    
    return (
      <div key={index} className={`mb-6 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block max-w-[80%] rounded-lg p-4 ${
          message.sender === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          <MessageContent 
            message={messageText}
            isAIMessage={message.sender === 'ai'}
            messageId={message.message_id}
            onCodeExecute={(result, updateCodeBlock) => {
              // Handle code execution
              console.log('Code execution result:', result);
            }}
            onOpenCanvas={handleOpenCanvasForFix}
            codeFixes={codeFixes}
            setCodeFixes={setCodeFixes}
          />
        </div>
      </div>
    );
  }, [handleOpenCanvasForFix, codeFixes, setCodeFixes]);

  // Render message with outputs
  const renderMessageWithOutputs = useCallback((message: ChatMessage, index: number) => {
    const renderedMessage = renderMessage(message, index);
    
    return (
      <MessageWithOutputs
        key={`message-${index}`}
        message={message}
        index={index}
        renderedMessage={renderedMessage}
        codeOutputs={codeOutputs}
        codeEntries={codeEntries}
        processTableMarkersInErrorOutput={processTableMarkersInErrorOutput}
        processTableMarkersInOutput={processTableMarkersInOutput}
        isVisualizationPinned={isVisualizationPinned}
        togglePinVisualization={togglePinVisualization}
        setFullscreenViz={setFullscreenViz}
        codeFixState={codeFixState}
        codeFixes={codeFixes}
        sessionId={sessionId || ''}
        storeSessionId={storeSessionId || ''}
        handleFixStart={handleFixStart}
        handleFixComplete={handleFixComplete}
        handleCreditCheck={handleCreditCheck}
      />
    );
  }, [
    renderMessage,
    codeOutputs,
    codeEntries,
    isVisualizationPinned,
    togglePinVisualization,
    setFullscreenViz,
    codeFixState,
    codeFixes,
    sessionId,
    storeSessionId,
    handleFixStart,
    handleFixComplete,
    handleCreditCheck
  ]);

  return (
    <div className="flex flex-col h-full">
      {/* Main chat area */}
      <div className="flex-1 overflow-y-auto">
        {showWelcome ? (
          <WelcomeSection onSendMessage={onSendMessage} />
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
            className="flex justify-center py-4"
          >
            <LoadingIndicator />
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Code Canvas */}
      <CodeCanvas
        isOpen={codeCanvasOpen}
        onToggle={() => setCodeCanvasOpen(!codeCanvasOpen)}
        onCodeExecute={handleCodeCanvasExecute}
        codeEntries={codeEntries}
        chatCompleted={chatCompleted}
        hiddenCanvas={hiddenCanvas}
        codeFixes={codeFixes}
        setCodeFixes={setCodeFixes}
      />
    </div>
  );
};

export default ChatWindowSimplified;
