"use client"

import React from "react"
import { ChatMessage } from "@/lib/store/chatHistoryStore"
import CodeOutputRenderer from "./CodeOutputRenderer"

interface CodeOutput {
  type: 'error' | 'output' | 'plotly' | 'matplotlib';
  content: any;
  messageIndex: number;
  codeId: string;
  vizIndex?: number;
}

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

interface MessageWithOutputsProps {
  message: ChatMessage;
  index: number;
  renderedMessage: React.ReactNode;
  codeOutputs: Record<string | number, CodeOutput[]>;
  codeEntries: CodeEntry[];
  processTableMarkersInErrorOutput: (content: string) => React.ReactNode;
  processTableMarkersInOutput: (content: string) => React.ReactNode;
  isVisualizationPinned: (content: any, code: string, idx: number) => boolean;
  togglePinVisualization: (content: any, code: string, type: string, idx: number) => void;
  setFullscreenViz: (viz: { type: string; content: any }) => void;
  codeFixState: {
    isFixing: boolean;
    codeBeingFixed: string | null;
  };
  codeFixes: any[];
  sessionId: string;
  storeSessionId: string;
  handleFixStart: (codeId: string) => void;
  handleFixComplete: (codeId: string, fixedCode: string) => void;
  handleCreditCheck: () => Promise<boolean>;
}

const MessageWithOutputs: React.FC<MessageWithOutputsProps> = ({
  message,
  index,
  renderedMessage,
  codeOutputs,
  codeEntries,
  processTableMarkersInErrorOutput,
  processTableMarkersInOutput,
  isVisualizationPinned,
  togglePinVisualization,
  setFullscreenViz,
  codeFixState,
  codeFixes,
  sessionId,
  storeSessionId,
  handleFixStart,
  handleFixComplete,
  handleCreditCheck,
}) => {
  // Get outputs for this specific message
  const outputsForThisMessage = codeOutputs[index] || [];

  console.log('🔍 MessageWithOutputs DEBUG:', {
    messageIndex: index,
    outputsCount: outputsForThisMessage.length,
    codeOutputsKeys: Object.keys(codeOutputs),
    outputs: outputsForThisMessage.map(o => ({ 
      type: o.type, 
      contentLength: typeof o.content === 'string' ? o.content.length : 'object' 
    }))
  });

  const codeOutputsComponent = outputsForThisMessage.length > 0 ? (
    <CodeOutputRenderer
      messageIndex={index}
      outputs={outputsForThisMessage}
      codeEntries={codeEntries}
      processTableMarkersInErrorOutput={processTableMarkersInErrorOutput}
      processTableMarkersInOutput={processTableMarkersInOutput}
      isVisualizationPinned={isVisualizationPinned}
      togglePinVisualization={togglePinVisualization}
      setFullscreenViz={setFullscreenViz}
      codeFixState={codeFixState}
      codeFixes={codeFixes}
      sessionId={sessionId}
      storeSessionId={storeSessionId}
      handleFixStart={handleFixStart}
      handleFixComplete={handleFixComplete}
      handleCreditCheck={handleCreditCheck}
    />
  ) : null;

  if (!codeOutputsComponent) {
    return <>{renderedMessage}</>;
  }

  // If we have both message and outputs, wrap them together
  return (
    <div key={`message-with-outputs-${index}`} className="mb-8">
      {renderedMessage}
      {codeOutputsComponent}
    </div>
  );
};

export default MessageWithOutputs;
