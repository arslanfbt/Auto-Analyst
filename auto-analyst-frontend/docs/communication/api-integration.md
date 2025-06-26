# API Integration & Backend Communication

This document explains how the Auto-Analyst frontend communicates with the backend services.

## 🌐 Communication Architecture

```
Frontend (Next.js) ←→ Next.js API Routes ←→ Python FastAPI Backend
                                ↓
                           Redis Cache
```

## 🔧 Configuration

### **API Base URL**
```typescript
// config/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export default API_URL;
```

### **Environment Variables**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000    # Backend API URL
UPSTASH_REDIS_REST_URL=redis://...           # Redis connection
UPSTASH_REDIS_REST_TOKEN=...                 # Redis auth token
```

## 🛣️ Communication Patterns

### **1. Direct Backend API Calls**

Used for real-time chat interactions and immediate responses.

```typescript
// lib/api/auth.ts
export async function loginUser(username: string, email: string, sessionId?: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      email,
      session_id: sessionId || localStorage.getItem('sessionId') || undefined
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  localStorage.setItem('sessionId', data.session_id);
  localStorage.setItem('userId', String(data.user_id));
  return data;
}
```

### **2. Next.js API Route Middleware**

Used for authentication, data processing, and Redis operations.

```typescript
// app/api/user/credits/route.ts
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Redis data access
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(token.sub));
    
    // Data processing
    const creditsTotal = parseInt(creditsHash.total as string);
    const creditsUsed = parseInt(creditsHash.used as string || '0');
    
    return NextResponse.json({
      used: creditsUsed,
      total: creditsTotal,
      resetDate: creditsHash.resetDate,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
  }
}
```

### **3. Real-time Communication**

Used for chat streaming and live updates.

```typescript
// Chat streaming example
const processMessage = async (message: string) => {
  const response = await fetch(`${API_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      agent: selectedAgent,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        updateMessageContent(data);
      }
    }
  }
};
```

## 📊 Analytics API Integration

### **Admin Analytics**
```typescript
// lib/api/analytics.ts
export async function fetchUsageSummary(
  adminKey: string,
  startDate?: string,
  endDate?: string
) {
  let url = `${API_BASE_URL}/analytics/usage/summary`;
  
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-API-Key': adminKey,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Error fetching usage summary: ${response.statusText}`);
  }
  
  return response.json();
}
```

### **User Analytics**
```typescript
// User-specific data access
export async function fetchUserData(userId: string) {
  const response = await fetch('/api/user/data', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
}
```

## 🔐 Authentication Integration

### **NextAuth Configuration**
```typescript
// app/api/auth/[...nextauth]/route.ts
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Temporary Login",
      credentials: {
        password: { label: "Temporary Code", type: "password" },
      },
      async authorize(credentials) {
        if (credentials?.password === process.env.NEXT_PUBLIC_ANALYTICS_ADMIN_PASSWORD) {
          return {
            id: "admin",
            name: "Administrator",
            email: "admin@example.com",
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Save user profile to Redis
      if (user && user.email) {
        await profileUtils.saveUserProfile(user.id || user.email, {
          email: user.email,
          name: user.name || '',
          image: user.image || '',
          joinedDate: new Date().toISOString().split('T')[0],
          role: 'Free'
        });
      }
      return true;
    },
  },
});
```

### **Session Management**
```typescript
// Session access in components
const { data: session, status } = useSession();

// Session access in API routes
const token = await getToken({ req: request });
const userId = token?.sub;
```

## 📡 Data Fetching Patterns


### **React Query Alternative**
```typescript
import { useQuery } from '@tanstack/react-query';

function useUserCredits() {
  return useQuery({
    queryKey: ['userCredits'],
    queryFn: () => fetch('/api/user/credits').then(res => res.json()),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
```

## 🚀 WebSocket Integration

### **Real-time Chat Updates**
```typescript
class ChatWebSocket {
  private ws: WebSocket | null = null;
  
  connect(sessionId: string) {
    this.ws = new WebSocket(`ws://localhost:8000/ws/${sessionId}`);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onclose = () => {
      // Reconnection logic
      setTimeout(() => this.connect(sessionId), 5000);
    };
  }
  
  sendMessage(message: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ message }));
    }
  }
  
  private handleMessage(data: any) {
    // Update UI with new message
    updateChatInterface(data);
  }
}
```

## 🔄 Error Handling

### **Global Error Handler**
```typescript
// lib/api/error-handler.ts
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

export async function handleAPIResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.message || 'Request failed',
      response.status,
      errorData.code
    );
  }
  return response.json();
}
```

### **Component Error Boundaries**
```typescript
function APIErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div className="error-container">
          <h2>API Error</h2>
          <p>{error.message}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## 📈 Performance Optimization

### **Request Caching**
```typescript
// Cache API responses
const cache = new Map();

async function cachedFetch(url: string, options?: RequestInit) {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  cache.set(cacheKey, data);
  return data;
}
```

### **Request Debouncing**
```typescript
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query: string) => {
  const results = await fetch(`/api/search?q=${query}`);
  return results.json();
}, 300);
```

## 🔍 Monitoring & Logging

### **API Request Logging**
```typescript
// lib/utils/logger.ts
export const logger = {
  log: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] ${message}`, data);
  },
  
  error: (message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error);
  },
  
  api: (method: string, url: string, status: number, duration: number) => {
    console.log(`[API] ${method} ${url} - ${status} (${duration}ms)`);
  }
};
```

### **Request Interceptors**
```typescript
// Add request/response interceptors
axios.interceptors.request.use((config) => {
  const startTime = Date.now();
  config.metadata = { startTime };
  return config;
});

axios.interceptors.response.use(
  (response) => {
    const duration = Date.now() - response.config.metadata.startTime;
    logger.api(
      response.config.method?.toUpperCase() || 'GET',
      response.config.url || '',
      response.status,
      duration
    );
    return response;
  },
  (error) => {
    logger.error('API Request Failed', error);
    return Promise.reject(error);
  }
);
``` 