# Chat System Documentation

The Auto-Analyst chat system is the core feature of the application, enabling AI-powered data analysis conversations.

## 🎯 Overview

The chat system consists of several interconnected components that handle:
- Multi-agent AI conversations
- Real-time message streaming
- Code execution and visualization
- File upload and dataset processing
- Credit management integration

## 🏗️ Component Architecture

### **Core Components**

```
ChatInterface (Main Container)
├── Sidebar (Chat History & Agent Selection)
├── ChatWindow (Message Display)
│   ├── MessageContent (Individual Messages)
│   ├── CodeCanvas (Code Execution)
│   └── PlotlyChart (Data Visualization)
├── ChatInput (User Input)
│   ├── FileUpload
│   ├── AgentSuggestions
│   └── CommandSuggestions
└── Various Modals & Overlays
```

## 🧩 Key Components

### **1. ChatInterface.tsx** (1,682 lines)

The main orchestrator component that manages the entire chat experience.

**Key Responsibilities:**
- Message flow coordination
- Agent selection and routing
- Credit validation
- File upload handling
- Real-time streaming management

**State Management:**
```typescript
interface ChatInterfaceState {
  messages: ChatMessage[]
  isLoading: boolean
  isSidebarOpen: boolean
  agents: AgentInfo[]
  activeChatId: number | null
  abortController: AbortController | null
  userId: number | null
  isAdmin: boolean
}
```

**Credit Integration:**
```typescript
const { remainingCredits, checkCredits, hasEnoughCredits } = useCredits()

const handleMessageSend = async (message: string) => {
  const creditCost = getModelCreditCost(modelSettings.model)
  
  if (!await hasEnoughCredits(creditCost)) {
    setInsufficientCreditsModalOpen(true)
    return
  }
  
  // Process message...
}
```

### **2. ChatInput.tsx** (2,457 lines)

Handles all user input including text, files, and commands.

**Key Features:**
- **Auto-resize textarea** - Grows with content
- **File drag & drop** - Multiple file upload support
- **Agent shortcuts** - Quick agent selection via @mentions
- **Command suggestions** - Auto-complete for common operations
- **Credit cost preview** - Shows cost before sending

**File Upload Integration:**
```typescript
const handleFileUpload = async (files: FileList) => {
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_id', sessionId)
    
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    })
    
    const result = await response.json()
    addMessage({
      text: `File uploaded: ${file.name}`,
      sender: 'ai',
      timestamp: new Date().toISOString()
    })
  }
}
```

### **3. ChatWindow.tsx** (1,698 lines)

Displays the conversation history and manages message rendering.

**Features:**
- **Message streaming** - Real-time content updates
- **Syntax highlighting** - Code block rendering
- **Copy functionality** - Easy message copying
- **Message actions** - Edit, delete, regenerate
- **Auto-scroll** - Follows conversation flow

**Message Types:**
```typescript
interface ChatMessage {
  text: string | PlotlyMessage
  sender: "user" | "ai"
  agent?: string
  message_id?: number
  chat_id?: number | null
  timestamp?: string
}

interface PlotlyMessage {
  type: "plotly"
  data: any
  layout: any
}
```

### **4. MessageContent.tsx** (720 lines)

Renders individual messages with rich content support.

**Supported Content:**
- **Markdown** - Full markdown support
- **Code blocks** - Syntax highlighted code
- **Interactive plots** - Plotly.js integration
- **Tables** - Data table rendering
- **LaTeX** - Mathematical expressions

**Code Execution:**
```typescript
const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [output, setOutput] = useState<string>('')
  const [isExecuting, setIsExecuting] = useState(false)

  const executeCode = async () => {
    setIsExecuting(true)
    
    try {
      const response = await fetch(`${API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          session_id: sessionId
        })
      })
      
      const result = await response.json()
      setOutput(result.output)
    } catch (error) {
      setOutput(`Error: ${error.message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="code-block">
      <SyntaxHighlighter language={language}>
        {code}
      </SyntaxHighlighter>
      <button onClick={executeCode} disabled={isExecuting}>
        {isExecuting ? 'Executing...' : 'Run Code'}
      </button>
      {output && <pre className="output">{output}</pre>}
    </div>
  )
}
```

## 🤖 Agent System

### **Agent Types**
The system supports multiple specialized agents:

```typescript
interface AgentInfo {
  name: string
  description: string
}

// Available agents fetched from backend
const agents = [
  { name: "data_analyst", description: "Data analysis specialist" },
  { name: "python_developer", description: "Python programming expert" },
  { name: "visualization_expert", description: "Data visualization specialist" },
  { name: "ml_engineer", description: "Machine learning expert" }
]
```

### **Agent Selection**
```typescript
const AgentSuggestions = ({ onAgentSelect }: { onAgentSelect: (agent: string) => void }) => {
  return (
    <div className="agent-suggestions">
      {agents.map(agent => (
        <button
          key={agent.name}
          onClick={() => onAgentSelect(agent.name)}
          className="agent-button"
        >
          <div className="agent-name">{agent.name}</div>
          <div className="agent-description">{agent.description}</div>
        </button>
      ))}
    </div>
  )
}
```

## 📡 Real-time Communication

### **Message Streaming**
```typescript
const processRegularMessage = async (message: string, controller: AbortController) => {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      user_id: userId,
      agent: selectedAgent,
      model: modelSettings.model
    }),
    signal: controller.signal
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let aiMessageContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          
          if (data.content) {
            aiMessageContent += data.content
            updateMessage(messageId, { text: aiMessageContent })
          }
          
          if (data.finished) {
            setIsLoading(false)
            await saveMessage(aiMessageContent)
          }
        } catch (error) {
          console.error('Error parsing streaming data:', error)
        }
      }
    }
  }
}
```

### **WebSocket Alternative**
```typescript
class ChatWebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(sessionId: string) {
    this.ws = new WebSocket(`ws://localhost:8000/ws/chat/${sessionId}`)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.handleMessage(data)
    }
    
    this.ws.onclose = () => {
      this.handleReconnect(sessionId)
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  sendMessage(message: ChatMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private handleReconnect(sessionId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++
        this.connect(sessionId)
      }, Math.pow(2, this.reconnectAttempts) * 1000)
    }
  }
}
```

## 📊 Data Visualization

### **Plotly Integration**
```typescript
const PlotlyChart = ({ data, layout }: { data: any; layout: any }) => {
  const plotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (plotRef.current && data && layout) {
      Plotly.newPlot(plotRef.current, data, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d']
      })
    }
  }, [data, layout])

  return <div ref={plotRef} className="plotly-chart" />
}
```

### **Chart Types Supported**
- **Line charts** - Time series data
- **Bar charts** - Categorical data
- **Scatter plots** - Correlation analysis
- **Heatmaps** - Matrix visualization
- **Box plots** - Statistical distributions
- **Histograms** - Data distribution
- **3D plots** - Multi-dimensional data

## 💾 State Management

### **Chat History Store (Zustand)**
```typescript
interface ChatHistoryStore {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => string
  updateMessage: (id: string, updatedMessage: Partial<ChatMessage>) => void
  clearMessages: () => void
}

const useChatHistoryStore = create<ChatHistoryStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) => {
        const id = Math.random().toString(36).substring(7)
        set((state) => ({
          messages: [...state.messages, { ...message, id }],
        }))
        return id
      },
      updateMessage: (id, updatedMessage) => {
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === id ? { ...message, ...updatedMessage } : message
          ),
        }))
      },
      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'chat-history' }
  )
)
```

### **Session Management**
```typescript
const useSessionStore = create<SessionStore>((set) => ({
  sessionId: '',
  setSessionId: (id: string) => set({ sessionId: id }),
  generateNewSession: () => {
    const newId = uuidv4()
    set({ sessionId: newId })
    return newId
  },
}))
```

## 🎨 UI Features

### **Message Actions**
```typescript
const MessageActions = ({ message }: { message: ChatMessage }) => {
  const [showActions, setShowActions] = useState(false)

  return (
    <div 
      className="message-container"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="message-content">
        {message.text}
      </div>
      
      {showActions && (
        <div className="message-actions">
          <button onClick={() => copyToClipboard(message.text)}>
            Copy
          </button>
          <button onClick={() => regenerateMessage(message.id)}>
            Regenerate
          </button>
          <button onClick={() => editMessage(message.id)}>
            Edit
          </button>
        </div>
      )}
    </div>
  )
}
```

### **Typing Indicators**
```typescript
const TypingIndicator = () => (
  <div className="typing-indicator">
    <div className="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <span>AI is thinking...</span>
  </div>
)
```

### **Auto-scroll Behavior**
```typescript
const useChatScroll = (messages: ChatMessage[]) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  const scrollToBottom = useCallback(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [shouldAutoScroll])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleScroll = useCallback((e: React.UIEvent) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100
    setShouldAutoScroll(isAtBottom)
  }, [])

  return { messagesEndRef, handleScroll }
}
```
