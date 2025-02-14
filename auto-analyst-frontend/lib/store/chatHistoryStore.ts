import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  text: string | {
    type: "plotly"
    data: any
    layout: any
  }
  sender: "user" | "ai"
  agent?: string
  id?: string
}

interface ChatHistoryStore {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => string
  updateMessage: (id: string, message: ChatMessage) => void
  clearMessages: () => void
}

export const useChatHistoryStore = create<ChatHistoryStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) => {
        const id = Date.now().toString()
        set((state) => ({
          messages: [...state.messages, { ...message, id }]
        }))
        return id
      },
      updateMessage: (id, message) => {
        set((state) => ({
          messages: state.messages.map((msg) => 
            msg.id === id ? { ...message, id } : msg
          )
        }))
      },
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-history-storage',
    }
  )
) 