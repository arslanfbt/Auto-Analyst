import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CodeOutput {
  type: 'output' | 'error' | 'plotly' | 'success';
  content: string | any;
  messageIndex: number;
  codeId: string;
}

// Using a nested Record for storing outputs
// sessionId -> codeId -> outputs[]
interface CodeOutputStore {
  outputsBySession: Record<string, Record<string, CodeOutput[]>>;
  addOutput: (sessionId: string, output: CodeOutput) => void;
  removeOutput: (sessionId: string, codeId: string) => void;
  getOutputsForSession: (sessionId: string) => Record<string, CodeOutput[]>;
  clearSessionOutputs: (sessionId: string) => void;
  clearAllOutputs: () => void;
}

export const useCodeOutputStore = create<CodeOutputStore>()(
  persist(
    (set, get) => ({
      outputsBySession: {},
      
      addOutput: (sessionId: string, output: CodeOutput) => {
        set((state: CodeOutputStore) => {
          // Create a deep copy to avoid mutating state
          const updatedOutputs = { ...state.outputsBySession };
          
          // Initialize nested objects if they don't exist
          if (!updatedOutputs[sessionId]) {
            updatedOutputs[sessionId] = {};
          }
          
          // Remove existing outputs for the same codeId
          if (!updatedOutputs[sessionId][output.codeId]) {
            updatedOutputs[sessionId][output.codeId] = [];
          } else {
            // Filter out the outputs with the same codeId
            updatedOutputs[sessionId][output.codeId] = [];
          }
          
          // Add the new output
          updatedOutputs[sessionId][output.codeId].push(output);
          
          return { outputsBySession: updatedOutputs };
        });
      },
      
      removeOutput: (sessionId: string, codeId: string) => {
        set((state: CodeOutputStore) => {
          // Create a deep copy
          const updatedOutputs = { ...state.outputsBySession };
          
          // Remove the specific output if it exists
          if (updatedOutputs[sessionId] && updatedOutputs[sessionId][codeId]) {
            delete updatedOutputs[sessionId][codeId];
          }
          
          return { outputsBySession: updatedOutputs };
        });
      },
      
      getOutputsForSession: (sessionId: string) => {
        return get().outputsBySession[sessionId] || {};
      },
      
      clearSessionOutputs: (sessionId: string) => {
        set((state: CodeOutputStore) => {
          const updatedOutputs = { ...state.outputsBySession };
          delete updatedOutputs[sessionId];
          return { outputsBySession: updatedOutputs };
        });
      },
      
      clearAllOutputs: () => {
        set({ outputsBySession: {} });
      },
    }),
    {
      name: 'code-outputs-storage',
    }
  )
); 