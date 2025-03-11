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
  message_id?: number
  chat_id?: number
  timestamp?: string
}

interface ChatHistoryStore {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => string
  updateMessage: (id: string, updatedMessage: Partial<ChatMessage>) => void
  clearMessages: () => void
}

export const useChatHistoryStore = create<ChatHistoryStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) => {
        const id = Math.random().toString(36).substring(7)
        set((state: ChatHistoryStore) => ({
          messages: [...state.messages, { ...message, id }],
        }))
        return id
      },
      updateMessage: (id, updatedMessage) => {
        set((state: ChatHistoryStore) => ({
          messages: state.messages.map((message) =>
            message.id === id ? { ...message, ...updatedMessage } : message
          ),
        }))
      },
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-history',
    }
  )
) 