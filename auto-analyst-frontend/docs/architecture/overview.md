# Frontend Architecture Overview

The Auto-Analyst frontend is built with **Next.js 13** using the App Router pattern, providing a modern, scalable architecture for an AI-powered analytics platform.

## 🏗️ Tech Stack

### **Core Framework**
- **Next.js 13** - React framework with App Router
- **React 18** - UI library with concurrent features
- **TypeScript** - Type safety and developer experience

### **Styling & UI**
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Pre-built accessible components
- **Framer Motion** - Animation library
- **next-themes** - Theme management

### **State Management**
- **React Context** - Global state for auth, credits
- **Zustand** - Client-side state store

### **Authentication**
- **NextAuth.js** - Authentication framework
- **Google OAuth** - Social login integration
- **JWT Tokens** - Session management

### **Backend Communication**
- **Axios** - HTTP client for API calls
- **Redis** - Session and cache storage
- **WebSockets/SSE** - Real-time communication

## 🎯 Key Features

### **1. AI Chat Interface**
- Multi-agent conversation system
- Real-time code execution
- File upload and dataset processing
- Interactive data visualization

### **2. Credit System**
- Usage-based billing
- Model tier management
- Real-time credit tracking
- Subscription integration

### **3. Analytics Dashboard**
- Usage analytics
- Performance monitoring
- User management
- Revenue tracking

### **4. Admin Panel**
- User management
- System monitoring
- Configuration management
- Analytics reporting

## 🏛️ Architecture Patterns

### **1. Provider Pattern**
```typescript
<SessionProvider>
  <ThemeProvider>
    <CreditProvider>
      <DeepAnalysisProvider>
        {children}
      </DeepAnalysisProvider>
    </CreditProvider>
  </ThemeProvider>
</SessionProvider>
```

### **2. API Route Middleware**
```
Frontend → Next.js API Routes → Backend API
                ↓
              Redis Cache
```

### **3. Component Composition**
- Feature-based folder structure
- Reusable UI components
- Container/Presentation pattern
- Compound components

## 🔄 Data Flow

### **Authentication Flow**
```
User Login → NextAuth → Session → Redis → Context → Components
```

### **Chat Message Flow**
```
User Input → Credit Check → Backend API → Response Stream → UI Update
```

### **State Management Flow**
```
Component → Hook → Context/Store → API → Backend → Redis
```

## 📁 Project Structure

```
auto-analyst-frontend/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (middleware)
│   ├── chat/              # Chat pages
│   ├── analytics/         # Analytics dashboard
│   └── admin/             # Admin panel
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── chat/             # Chat components
│   ├── analytics/        # Analytics components
│   └── admin/            # Admin components
├── lib/                   # Utilities and configurations
│   ├── api/              # API client functions
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── store/            # Zustand stores
│   └── utils/            # Helper functions
├── config/               # Configuration files
└── types/                # TypeScript definitions
```

## 🔌 Backend Integration

### **API Configuration**
```typescript
// config/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

### **Communication Patterns**

#### **1. Direct API Calls**
```typescript
// Direct calls to Python FastAPI backend
const response = await axios.post(`${API_URL}/chat`, {
  message: userMessage,
  agent: selectedAgent
});
```

#### **2. Next.js API Middleware**
```typescript
// app/api/user/credits/route.ts
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  const creditsData = await redis.hgetall(KEYS.USER_CREDITS(token.sub));
  return NextResponse.json(creditsData);
}
```

#### **3. Real-time Communication**
```typescript
// WebSocket/SSE for chat streaming
const eventSource = new EventSource(`${API_URL}/chat/stream`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateMessageContent(data);
};
```

## 🎨 Design System

### **Color Scheme**
- **Primary**: Blue (#3B82F6)
- **Secondary**: Purple (#8B5CF6)
- **Success**: Green (#10B981)
- **Warning**: Orange (#F59E0B)
- **Danger**: Red (#EF4444)

### **Typography**
- **Font**: Inter (Google Fonts)
- **Headings**: Font weights 600-700
- **Body**: Font weight 400
- **Code**: JetBrains Mono

### **Spacing**
- **Base**: 4px (0.25rem)
- **Scale**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
- **Consistent**: Using Tailwind spacing scale

## 🔒 Security Considerations

### **Authentication**
- JWT token validation
- Secure session storage
- CSRF protection
- Rate limiting

### **Data Protection**
- Input sanitization
- XSS prevention
- HTTPS enforcement
- Secure headers

### **API Security**
- Authentication middleware
- Request validation
- Error handling
- Audit logging

## 📊 Performance Optimizations

### **Code Splitting**
- Route-based code splitting
- Dynamic imports for heavy components
- Tree shaking for unused code

### **Caching**
- Redis for session data
- Browser caching for static assets

### **Bundle Optimization**
- Next.js built-in optimizations
- Image optimization
- CSS purging
- Compression

## 🧪 Testing Strategy

### **Unit Testing**
- Jest for utility functions
- React Testing Library for components
- Mock API responses

### **Integration Testing**
- End-to-end flows
- API integration tests
- Authentication flows

### **Performance Testing**
- Lighthouse audits
- Bundle analysis
- Core Web Vitals monitoring

## 🚀 Deployment

### **Build Process**
```bash
npm run build     # Next.js production build
npm run start     # Production server
```

### **Environment Variables**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `UPSTASH_REDIS_REST_URL` - Redis connection

### **Hosting**
- **Vercel** - Recommended for Next.js
- **AWS/Azure** - Alternative cloud providers
- **Docker** - Containerized deployment 