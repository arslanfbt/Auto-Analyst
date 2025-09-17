"use client"

import React, { useCallback } from "react"
import { v4 as uuidv4 } from 'uuid'
import { ChatMessage } from "@/lib/store/chatHistoryStore"

interface MessageProcessorProps {
  messages: ChatMessage[];
}

export const useMessageProcessor = ({ messages }: MessageProcessorProps) => {
  // Process a message to replace code blocks with indicators
  const processMessageWithCodeIndicators = useCallback((message: ChatMessage, index: number) => {
    if (typeof message.text !== "string") return message.text;
    
    const parts: (string | { type: 'code'; language: string; })[] = [];
    let lastIndex = 0;
    const codeBlockRegex = /```([a-zA-Z0-9_]+)?\n([\s\S]*?)```/g;
    let match;
    
    // Find all code blocks and split the text
    while ((match = codeBlockRegex.exec(message.text)) !== null) {
      // Add text before the code block
      if (match.index > lastIndex) {
        parts.push(message.text.substring(lastIndex, match.index));
      }
      
      // Add a placeholder for the code block
      const language = match[1] || 'text';
      // Skip plotly code blocks as they're handled separately
      if (language.toLowerCase() !== 'plotly' && language.toLowerCase() !== 'matplotlib') {
        parts.push({
          type: 'code',
          language: language
        });
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after the last code block
    if (lastIndex < message.text.length) {
      parts.push(message.text.substring(lastIndex));
    }
    
    // If no code blocks were found, return the original text
    if (parts.length === 1 && typeof parts[0] === 'string') {
      return parts[0];
    }
    
    return parts;
  }, []);

  // Process AI messages to extract and store code blocks
  const processAllAiMessages = useCallback((codeEntries: any[], setCodeEntries: React.Dispatch<React.SetStateAction<any[]>>) => {
    const newCodeEntries: any[] = [];
    
    messages.forEach((message, messageIndex) => {
      if (message.sender === "ai" && typeof message.text === "string") {
        const codeBlockRegex = /```([a-zA-Z0-9_]+)?\n([\s\S]*?)```/g;
        let match;
        
        while ((match = codeBlockRegex.exec(message.text)) !== null) {
          const language = match[1] || 'text';
          const code = match[2];
          
          // Skip plotly and matplotlib code blocks as they're handled separately
          if (language.toLowerCase() !== 'plotly' && language.toLowerCase() !== 'matplotlib') {
            const entryId = uuidv4();
            
            newCodeEntries.push({
              id: entryId,
              language: language,
              code: code,
              timestamp: Date.now(),
              title: `${language} code block`,
              isExecuting: false,
              messageIndex: messageIndex // Store the message index
            });
          }
        }
      }
    });
    
    if (newCodeEntries.length > 0) {
      setCodeEntries(prev => {
        // Merge with existing entries, avoiding duplicates
        const existingIds = new Set(prev.map(entry => entry.id));
        const uniqueNewEntries = newCodeEntries.filter(entry => !existingIds.has(entry.id));
        return [...prev, ...uniqueNewEntries];
      });
    }
  }, [messages]);

  return {
    processMessageWithCodeIndicators,
    processAllAiMessages
  };
};
