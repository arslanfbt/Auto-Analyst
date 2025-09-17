"use client"

import React, { useCallback } from "react"
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

interface CodeOutput {
  type: 'error' | 'output' | 'plotly' | 'matplotlib';
  content: any;
  messageIndex: number;
  codeId: string;
  vizIndex?: number;
}

interface CodeCanvasHandlerProps {
  codeEntries: CodeEntry[];
  sessionId: string;
  storeSessionId: string;
  setCodeOutputs: React.Dispatch<React.SetStateAction<Record<string | number, CodeOutput[]>>>;
  codeOutputs: Record<string | number, CodeOutput[]>;
  messages: any[];
}

export const useCodeCanvasHandler = ({
  codeEntries,
  sessionId,
  storeSessionId,
  setCodeOutputs,
  codeOutputs,
  messages
}: CodeCanvasHandlerProps) => {
  const { toast } = useToast();

  // Handle code execution from CodeCanvas
  const handleCodeCanvasExecute = useCallback((entryId: string, result: any) => {
    // Find the code entry
    const codeEntry = codeEntries.find(entry => entry.id === entryId);
    if (!codeEntry) {
      console.error("Could not find code entry with ID:", entryId);
      return;
    }
    
    // BULLETPROOF SOLUTION: Always use the last message index for outputs
    const arrayIndex = Math.max(0, messages.length - 1);
    
    console.log('🔍 SIMPLE SOLUTION:', {
      entryId,
      originalMessageIndex: codeEntry.messageIndex,
      usingArrayIndex: arrayIndex,
      messagesCount: messages.length,
      resultKeys: Object.keys(result),
      hasOutput: !!result.output,
      hasPlotly: !!(result.plotly_outputs && result.plotly_outputs.length > 0),
      hasMatplotlib: !!(result.matplotlib_outputs && result.matplotlib_outputs.length > 0)
    });
    
    // If this is just a code update without execution (savedCode)
    if (result.savedCode) {
      // This will be handled by the parent component
      return { type: 'code_update', savedCode: result.savedCode };
    }
    
    // Use arrayIndex as the storage key
    const newOutputs: Record<string | number, CodeOutput[]> = { ...codeOutputs };
    newOutputs[arrayIndex] = []; // Reset outputs for this array index
    
    // Add error output (highest priority)
    if (result.error) {
      console.log('🔍 Adding error output to arrayIndex:', arrayIndex);
      newOutputs[arrayIndex].push({
        type: 'error',
        content: result.error,
        messageIndex: arrayIndex,
        codeId: entryId  // This should be set correctly
      });
    }
    
    // Add text output
    if (result.output) {
      console.log('🔍 Adding text output to arrayIndex:', arrayIndex);
      newOutputs[arrayIndex].push({
        type: 'output',
        content: result.output,
        messageIndex: arrayIndex,
        codeId: entryId
      });
    }

    // Handle plotly outputs
    if (result.plotly_outputs && result.plotly_outputs.length > 0) {
      console.log('🔍 Processing', result.plotly_outputs.length, 'plotly outputs for arrayIndex:', arrayIndex);
      
      result.plotly_outputs.forEach((plotlyOutput: string, vizIndex: number) => {
        try {
          // Strip the markdown code block wrapper
          let plotlyJsonString = plotlyOutput;
          if (plotlyOutput.startsWith('```plotly\n')) {
            plotlyJsonString = plotlyOutput.replace(/^```plotly\n/, '').replace(/\n```\n?$/, '');
          }
          
          const plotlyData = JSON.parse(plotlyJsonString);
          
          newOutputs[arrayIndex].push({
            type: 'plotly',
            content: plotlyData,
            messageIndex: arrayIndex,
            codeId: entryId,
            vizIndex: vizIndex
          });
        } catch (e) {
          console.error("Error parsing plotly output:", e);
          console.error("Raw plotly output:", plotlyOutput.substring(0, 200) + '...');
        }
      });
    }

    // Handle matplotlib outputs
    if (result.matplotlib_outputs && result.matplotlib_outputs.length > 0) {
      console.log('🔍 Processing', result.matplotlib_outputs.length, 'matplotlib outputs for arrayIndex:', arrayIndex);
      
      result.matplotlib_outputs.forEach((matplotlibOutput: string, chartIndex: number) => {
        try {
          // Strip the markdown code block wrapper
          let matplotlibContent = matplotlibOutput;
          if (matplotlibOutput.startsWith('```matplotlib\n')) {
            matplotlibContent = matplotlibOutput.replace(/^```matplotlib\n/, '').replace(/\n```\n?$/, '');
          }
          
          newOutputs[arrayIndex].push({
            type: 'matplotlib',
            content: matplotlibContent,
            messageIndex: arrayIndex,
            codeId: entryId
          });
        } catch (e) {
          console.error("Error processing matplotlib output:", e);
        }
      });
    }
    
    console.log('🔍 STORING outputs at arrayIndex:', arrayIndex, 'with', newOutputs[arrayIndex].length, 'items');
    console.log('�� codeOutputs will have keys:', Object.keys({...codeOutputs, [arrayIndex]: newOutputs[arrayIndex]}));
    
    // Update state with all the outputs
    setCodeOutputs(newOutputs);
    
    return { type: 'execution_result', success: true };
  }, [codeEntries, codeOutputs, messages, setCodeOutputs]);

  // Execute code from chat window
  const executeCodeFromChatWindow = useCallback(async (entryId: string) => {
    try {
      const codeEntry = codeEntries.find(entry => entry.id === entryId);
      if (!codeEntry) {
        throw new Error("Code entry not found");
      }

      const response = await axios.post(`${API_URL}/code/execute`, {
        code: codeEntry.code,
        session_id: sessionId || storeSessionId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || storeSessionId
        }
      });

      console.log('🔍 Auto-execution response:', response.data);
      
      // Pass execution result to handleCodeCanvasExecute
      handleCodeCanvasExecute(entryId, response.data);
      
    } catch (error) {
      console.error("Error executing code:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to execute code";
      
      // Pass error to handleCodeCanvasExecute
      handleCodeCanvasExecute(entryId, { error: errorMessage });
    }
  }, [codeEntries, sessionId, storeSessionId, handleCodeCanvasExecute]);

  return {
    handleCodeCanvasExecute,
    executeCodeFromChatWindow
  };
};
