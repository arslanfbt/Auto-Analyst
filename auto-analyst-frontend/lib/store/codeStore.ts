import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CodeBlock {
  id: string;
  language: string;
  code: string;
  originalCode: string; // Keep original for comparison
  imports: string[]; // Extracted imports
  body: string; // Code without imports
  hash: string; // Merkle tree hash
  timestamp: number;
  messageIndex: number;
}

interface MessageCodeIndex {
  messageId: string;
  messageIndex: number;
  codeBlocks: Map<string, CodeBlock>; // codeId -> CodeBlock
  merkleRoot: string; // Root hash of all code blocks
  lastUpdated: number;
}

interface CodeStore {
  messageIndices: Map<number, MessageCodeIndex>; // messageIndex -> MessageCodeIndex
  codeBlocks: Map<string, CodeBlock>; // codeId -> CodeBlock (global lookup)
  
  // Actions
  addCodeBlock: (messageIndex: number, codeId: string, language: string, code: string) => void;
  updateCodeBlock: (codeId: string, newCode: string) => boolean; // Returns true if changed
  getCodeBlocksForMessage: (messageIndex: number) => CodeBlock[];
  getCodeBlock: (codeId: string) => CodeBlock | undefined;
  removeCodeBlock: (codeId: string) => void;
  clearMessageCode: (messageIndex: number) => void;
  
  // Merkle tree operations
  calculateMerkleHash: (code: string) => string;
  updateMerkleRoot: (messageIndex: number) => void;
  hasCodeChanged: (codeId: string, newCode: string) => boolean;
}

// Utility functions
const extractImports = (code: string, language: string): { imports: string[], body: string } => {
  if (language !== 'python') {
    return { imports: [], body: code };
  }
  
  const lines = code.split('\n');
  const imports: string[] = [];
  const bodyLines: string[] = [];
  
  let inImports = true;
  let blankLinesAfterImports = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (inImports) {
      if (trimmed === '') {
        blankLinesAfterImports++;
        continue;
      }
      
      // Check if it's an import statement
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        imports.push(line);
        blankLinesAfterImports = 0;
        continue;
      }
      
      // If we hit a non-import, non-blank line, we're done with imports
      if (blankLinesAfterImports > 0) {
        inImports = false;
        bodyLines.push(line);
      } else {
        // First non-import line, we're done with imports
        inImports = false;
        bodyLines.push(line);
      }
    } else {
      bodyLines.push(line);
    }
  }
  
  return {
    imports,
    body: bodyLines.join('\n')
  };
};

const organizeCode = (imports: string[], body: string): string => {
  const organizedImports = imports
    .filter(imp => imp.trim())
    .sort((a, b) => {
      // Sort standard library imports first, then third-party
      const aIsStd = !a.includes('from ') || a.includes('from ') && !a.includes('.');
      const bIsStd = !b.includes('from ') || b.includes('from ') && !b.includes('.');
      
      if (aIsStd && !bIsStd) return -1;
      if (!aIsStd && bIsStd) return 1;
      
      return a.localeCompare(b);
    });
  
  const uniqueImports = [...new Set(organizedImports)];
  
  return [
    ...uniqueImports,
    '', // Blank line after imports
    body.trim()
  ].join('\n');
};

const calculateHash = (str: string): string => {
  // Simple hash function - in production, use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
};

export const useCodeStore = create<CodeStore>()(
  persist(
    (set, get) => ({
      messageIndices: new Map(),
      codeBlocks: new Map(),
      
      addCodeBlock: (messageIndex: number, codeId: string, language: string, code: string) => {
        const { imports, body } = extractImports(code, language);
        const organizedCode = organizeCode(imports, body);
        const hash = calculateHash(organizedCode);
        
        const codeBlock: CodeBlock = {
          id: codeId,
          language,
          code: organizedCode,
          originalCode: code,
          imports,
          body,
          hash,
          timestamp: Date.now(),
          messageIndex
        };
        
        set(state => {
          const newCodeBlocks = new Map(state.codeBlocks);
          newCodeBlocks.set(codeId, codeBlock);
          
          const newMessageIndices = new Map(state.messageIndices);
          let messageIndex_data = newMessageIndices.get(messageIndex);
          
          if (!messageIndex_data) {
            messageIndex_data = {
              messageId: `msg_${messageIndex}`,
              messageIndex,
              codeBlocks: new Map(),
              merkleRoot: '',
              lastUpdated: Date.now()
            };
          }
          
          messageIndex_data.codeBlocks.set(codeId, codeBlock);
          messageIndex_data.lastUpdated = Date.now();
          newMessageIndices.set(messageIndex, messageIndex_data);
          
          return {
            codeBlocks: newCodeBlocks,
            messageIndices: newMessageIndices
          };
        });
        
        // Update Merkle root for this message
        get().updateMerkleRoot(messageIndex);
      },
      
      updateCodeBlock: (codeId: string, newCode: string) => {
        const codeBlock = get().codeBlocks.get(codeId);
        if (!codeBlock) return false;
        
        const { imports, body } = extractImports(newCode, codeBlock.language);
        const organizedCode = organizeCode(imports, body);
        const newHash = calculateHash(organizedCode);
        
        // Only update if code actually changed
        if (newHash === codeBlock.hash) {
          return false; // No change
        }
        
        const updatedCodeBlock: CodeBlock = {
          ...codeBlock,
          code: organizedCode,
          originalCode: newCode,
          imports,
          body,
          hash: newHash,
          timestamp: Date.now()
        };
        
        set(state => {
          const newCodeBlocks = new Map(state.codeBlocks);
          newCodeBlocks.set(codeId, updatedCodeBlock);
          
          const newMessageIndices = new Map(state.messageIndices);
          const messageIndex_data = newMessageIndices.get(codeBlock.messageIndex);
          
          if (messageIndex_data) {
            messageIndex_data.codeBlocks.set(codeId, updatedCodeBlock);
            messageIndex_data.lastUpdated = Date.now();
            newMessageIndices.set(codeBlock.messageIndex, messageIndex_data);
          }
          
          return {
            codeBlocks: newCodeBlocks,
            messageIndices: newMessageIndices
          };
        });
        
        // Update Merkle root
        get().updateMerkleRoot(codeBlock.messageIndex);
        return true; // Code changed
      },
      
      getCodeBlocksForMessage: (messageIndex: number) => {
        const messageIndex_data = get().messageIndices.get(messageIndex);
        return messageIndex_data ? Array.from(messageIndex_data.codeBlocks.values()) : [];
      },
      
      getCodeBlock: (codeId: string) => {
        return get().codeBlocks.get(codeId);
      },
      
      removeCodeBlock: (codeId: string) => {
        const codeBlock = get().codeBlocks.get(codeId);
        if (!codeBlock) return;
        
        set(state => {
          const newCodeBlocks = new Map(state.codeBlocks);
          newCodeBlocks.delete(codeId);
          
          const newMessageIndices = new Map(state.messageIndices);
          const messageIndex_data = newMessageIndices.get(codeBlock.messageIndex);
          
          if (messageIndex_data) {
            messageIndex_data.codeBlocks.delete(codeId);
            messageIndex_data.lastUpdated = Date.now();
            newMessageIndices.set(codeBlock.messageIndex, messageIndex_data);
          }
          
          return {
            codeBlocks: newCodeBlocks,
            messageIndices: newMessageIndices
          };
        });
        
        get().updateMerkleRoot(codeBlock.messageIndex);
      },
      
      clearMessageCode: (messageIndex: number) => {
        const messageIndex_data = get().messageIndices.get(messageIndex);
        if (!messageIndex_data) return;
        
        set(state => {
          const newCodeBlocks = new Map(state.codeBlocks);
          const newMessageIndices = new Map(state.messageIndices);
          
          // Remove all code blocks for this message
          for (const codeId of messageIndex_data.codeBlocks.keys()) {
            newCodeBlocks.delete(codeId);
          }
          
          newMessageIndices.delete(messageIndex);
          
          return {
            codeBlocks: newCodeBlocks,
            messageIndices: newMessageIndices
          };
        });
      },
      
      calculateMerkleHash: (code: string) => {
        return calculateHash(code);
      },
      
      updateMerkleRoot: (messageIndex: number) => {
        const messageIndex_data = get().messageIndices.get(messageIndex);
        if (!messageIndex_data) return;
        
        const codeHashes = Array.from(messageIndex_data.codeBlocks.values())
          .map(block => block.hash)
          .sort();
        
        const merkleRoot = calculateHash(codeHashes.join(''));
        
        set(state => {
          const newMessageIndices = new Map(state.messageIndices);
          const updatedMessageIndex_data = {
            ...messageIndex_data,
            merkleRoot,
            lastUpdated: Date.now()
          };
          newMessageIndices.set(messageIndex, updatedMessageIndex_data);
          
          return { messageIndices: newMessageIndices };
        });
      },
      
      hasCodeChanged: (codeId: string, newCode: string) => {
        const codeBlock = get().codeBlocks.get(codeId);
        if (!codeBlock) return true;
        
        const newHash = calculateHash(newCode);
        return newHash !== codeBlock.hash;
      }
    }),
    {
      name: 'code-store',
      partialize: (state) => ({
        messageIndices: Array.from(state.messageIndices.entries()),
        codeBlocks: Array.from(state.codeBlocks.entries())
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert arrays back to Maps
          state.messageIndices = new Map(state.messageIndices as any);
          state.codeBlocks = new Map(state.codeBlocks as any);
        }
      }
    }
  )
);
