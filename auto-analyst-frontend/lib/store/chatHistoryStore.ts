import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  text: string | {
    type: "plotly"
    data: any
    layout: any
  }
  sender: "user" | "ai"
}

interface ChatHistoryStore {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
}

export const useChatHistoryStore = create<ChatHistoryStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) => 
        set((state) => ({ 
          messages: [...state.messages, message] 
        })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-history-storage',
    }
  )
) 