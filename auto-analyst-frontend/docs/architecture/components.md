# Component Architecture

The Auto-Analyst frontend uses a hierarchical component structure with clear separation of concerns and reusable patterns.

## 🏛️ Component Hierarchy

```
App
├── Layout (app/layout.tsx)
│   └── ClientLayout
│       ├── SessionProvider
│       ├── ThemeProvider
│       ├── CreditProvider
│       └── Page Components
└── API Routes (app/api/*)
```

## 📁 Component Organization

### **Feature-Based Structure**
```
components/
├── chat/              # Chat-specific components
├── analytics/         # Analytics dashboard components
├── admin/            # Admin panel components
├── ui/               # Reusable UI components
├── landing/          # Landing page components
└── features/         # Feature-specific components (Conditionally renders content based on feature access)
```

### **Component Categories**

#### **1. Layout Components**
- `ClientLayout.tsx` - Main app wrapper with providers
- `ResponsiveLayout.tsx` - Responsive container
- `AuthProvider.tsx` - Authentication wrapper

#### **2. Feature Components**
- `ChatInterface.tsx` - Main chat container (1,682 lines)
- `ChatInput.tsx` - Message input handling (2,457 lines)
- `ChatWindow.tsx` - Message display area
- `AnalyticsLayout.tsx` - Analytics dashboard layout

#### **3. UI Components (shadcn/ui)**
- `Button`, `Input`, `Dialog` - Basic form elements
- `Card`, `Table`, `Tabs` - Layout components
- `Alert`, `Toast` - Notification components

## 🎯 Component Patterns

### **1. Container/Presentation Pattern**

```typescript
// Container Component (Smart)
const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const { remainingCredits } = useCredits()
  
  return (
    <ChatContainer>
      <ChatWindow messages={messages} />
      <ChatInput onSend={handleSend} disabled={!remainingCredits} />
    </ChatContainer>
  )
}

// Presentation Component (Dumb)
interface ChatWindowProps {
  messages: Message[]
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => (
  <div className="chat-window">
    {messages.map(message => (
      <MessageContent key={message.id} message={message} />
    ))}
  </div>
)
```

### **2. Context Provider Pattern**

```typescript
// Provider Component
const CreditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [remainingCredits, setRemainingCredits] = useState(0)
  
  const checkCredits = async () => {
    // Credit checking logic
  }
  
  return (
    <CreditContext.Provider value={{ remainingCredits, checkCredits }}>
      {children}
    </CreditContext.Provider>
  )
}

// Consumer Hook
const useCredits = () => {
  const context = useContext(CreditContext)
  if (!context) throw new Error('useCredits must be used within CreditProvider')
  return context
}
```

### **3. Compound Component Pattern**

```typescript
// Main Component
const ChatInterface = {
  Container: ChatContainer,
  Window: ChatWindow,
  Input: ChatInput,
  Sidebar: ChatSidebar
}

// Usage
<ChatInterface.Container>
  <ChatInterface.Sidebar />
  <ChatInterface.Window />
  <ChatInterface.Input />
</ChatInterface.Container>
```

## 🔄 Component Lifecycle

### **1. Mount Sequence**
1. Layout providers initialize
2. Authentication state loads
3. User data (credits, subscription) fetches
4. Feature components render
5. Real-time connections establish

### **2. Update Patterns**
- **Optimistic Updates**: UI updates immediately, syncs with server
- **Progressive Enhancement**: Base functionality works, enhanced features load
- **Error Boundaries**: Graceful error handling per feature

## 🧩 Key Component Deep Dive

### **ChatInterface.tsx** (Main Chat Container)

**Responsibilities:**
- Chat message orchestration
- Agent selection and routing
- Credit validation before actions
- File upload handling
- Real-time message streaming

**Key Features:**
```typescript
interface ChatInterfaceState {
  messages: ChatMessage[]
  isLoading: boolean
  activeChatId: number | null
  selectedAgent: string
  remainingCredits: number
}
```

### **ChatInput.tsx** (User Input Handler)

**Responsibilities:**
- Message composition and validation
- File attachment handling
- Command suggestions
- Credit cost preview
- Code execution triggers

**Key Features:**
- Auto-resize textarea
- Drag & drop file upload
- Agent command shortcuts
- Real-time cost calculation

### **MessageContent.tsx** (Message Rendering)

**Responsibilities:**
- Markdown rendering
- Code syntax highlighting
- Plotly chart display
- Interactive code blocks
- Message actions (copy, edit, delete)

## 🎨 Styling Patterns

### **1. Tailwind CSS Classes**
```typescript
const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent",
}
```

### **2. CSS Modules for Complex Components**
```typescript
// For components with complex animations or layouts
import styles from './ChatInterface.module.css'

const ChatInterface = () => (
  <div className={styles.container}>
    <div className={styles.messageArea}>
      {/* Content */}
    </div>
  </div>
)
```

### **3. Dynamic Class Names**
```typescript
import { cn } from '@/lib/utils'

const Button = ({ variant, className, ...props }) => (
  <button
    className={cn(buttonVariants[variant], className)}
    {...props}
  />
)
```

## 🔧 Component Best Practices

### **1. TypeScript Props**
```typescript
interface ComponentProps {
  // Required props
  title: string
  onAction: (data: ActionData) => void
  
  // Optional props with defaults
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  
  // Children
  children?: React.ReactNode
}
```

### **2. Error Boundaries**
```typescript
const FeatureErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong with this feature</div>}
      onError={(error) => console.error('Feature error:', error)}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### **3. Loading States**
```typescript
const DataComponent = () => {
  const { data, isLoading, error } = useSWR('/api/data')
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!data) return <EmptyState />
  
  return <DataDisplay data={data} />
}
```

### **4. Accessibility**
```typescript
const AccessibleButton = ({ children, ...props }) => (
  <button
    role="button"
    aria-label="Action button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && props.onClick?.()}
    {...props}
  >
    {children}
  </button>
)
```

## 📊 Component Metrics

### **Large Components** (Consider refactoring)
- `ChatInterface.tsx`: 1,682 lines
- `ChatInput.tsx`: 2,457 lines
- `ChatWindow.tsx`: 1,698 lines

### **Reusable UI Components**
- 27 components in `/components/ui/`
- Used across 50+ other components
- Consistent design system

### **Feature Components**
- 24 chat-related components
- 8 analytics components
- 5 admin components 