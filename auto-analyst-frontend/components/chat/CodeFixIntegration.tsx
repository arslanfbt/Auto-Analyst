"use client"

import React, { useCallback, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import axios from "axios"
import API_URL from '@/config/api'

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

interface CodeFixIntegrationProps {
  codeEntries: CodeEntry[];
  setCodeEntries: React.Dispatch<React.SetStateAction<CodeEntry[]>>;
  sessionId: string;
  storeSessionId: string;
  codeCanvasOpen: boolean;
  setCodeCanvasOpen: (open: boolean) => void;
  handleCodeCanvasExecute: (entryId: string, result: any) => void;
  executeCodeFromChatWindow: (entryId: string) => Promise<void>;
  messages: any[];
  setCodeOutputs: React.Dispatch<React.SetStateAction<Record<string | number, any[]>>>;
}

export const useCodeFixIntegration = ({
  codeEntries,
  setCodeEntries,
  sessionId,
  storeSessionId,
  codeCanvasOpen,
  setCodeCanvasOpen,
  handleCodeCanvasExecute,
  executeCodeFromChatWindow,
  messages,
  setCodeOutputs
}: CodeFixIntegrationProps) => {
  const { toast } = useToast();
  const [codeFixState, setCodeFixState] = useState({
    isFixing: false,
    codeBeingFixed: null as string | null
  });
  const [codeFixes, setCodeFixes] = useState<any[]>([]);

  // Handle fix start
  const handleFixStart = useCallback((codeId: string) => {
    setCodeFixState({
      isFixing: true,
      codeBeingFixed: codeId
    });
  }, []);

  // Handle fix complete
  const handleFixComplete = useCallback((codeId: string, fixedCode: string) => {
    // Increment the fix count
    setCodeFixes(prev => {
      const existingFix = prev.find(fix => fix.codeId === codeId);
      if (existingFix) {
        return prev.map(fix => 
          fix.codeId === codeId 
            ? { ...fix, count: fix.count + 1 }
            : fix
        );
      } else {
        return [...prev, { codeId, count: 1 }];
      }
    });

    // Find the code entry
    const codeEntry = codeEntries.find(entry => entry.id === codeId);
    if (!codeEntry) {
      console.error("Could not find code entry with ID:", codeId);
      return;
    }

    // Update the code entry with the fixed code
    setCodeEntries(prev => 
      prev.map(entry => 
        entry.id === codeId 
          ? { ...entry, code: fixedCode }
          : entry
      )
    );

    // Notify parent about the code change
    handleCodeCanvasExecute(codeId, { savedCode: fixedCode });

    // Clear error output - need to adjust for the new structure
    setCodeOutputs(prev => {
      // Find the messageIndex associated with this code ID
      const messageId = codeEntry.messageIndex;
      const foundIndex = messages.findIndex(msg => msg.message_id === messageId);
      const arrayIndex = foundIndex !== -1 ? foundIndex : Math.max(0, messages.length - 1);
      
      if (prev[arrayIndex]) {
        const newOutputs = { ...prev };
        newOutputs[arrayIndex] = prev[arrayIndex].filter((output: any) => 
          !(output.type === 'error' && output.codeId === codeId)
        );
        return newOutputs;
      }
      return prev;
    });

    // Reset fixing state
    setCodeFixState({
      isFixing: false,
      codeBeingFixed: null
    });

    // Show success message
    toast({
      title: "Code Fixed Successfully",
      description: "The code has been automatically fixed and is ready to run.",
      duration: 3000,
    });
  }, [codeEntries, setCodeEntries, handleCodeCanvasExecute, messages, setCodeOutputs, toast]);

  // Handle credit check
  const handleCreditCheck = useCallback(async (): Promise<boolean> => {
    try {
      // Add credit check logic here if needed
      return true;
    } catch (error) {
      console.error("Credit check failed:", error);
      return false;
    }
  }, []);

  // Handle opening canvas for fix
  const handleOpenCanvasForFix = useCallback((errorMessage: string, codeId: string) => {
    // Check if user has access to the code fix feature
    // if (!codeFixAccess.hasAccess) {
    //   toast({
    //     title: "Premium Feature",
    //     description: "Code fixing is a premium feature. Please upgrade to access this functionality.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // Open the code canvas
    setCodeCanvasOpen(true);

    // You might want to pass the error message to the canvas
    // This would require modifying CodeCanvas to accept error context
  }, [setCodeCanvasOpen, toast]);

  return {
    codeFixState,
    codeFixes,
    setCodeFixes,
    handleFixStart,
    handleFixComplete,
    handleCreditCheck,
    handleOpenCanvasForFix
  };
};


