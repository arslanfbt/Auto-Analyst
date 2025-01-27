export type MessageType = "text" | "code" | "markdown" | "graph"

export interface Message {
  content: string
  sender: "user" | "ai"
  type: MessageType
  language?: string // For code blocks
  graphData?: any // For Plotly graphs
}

