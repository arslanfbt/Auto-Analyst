# Auto-Analyst Frontend Overview

## 1. Frontend Architecture
The Auto-Analyst frontend is built using **Next.js 13** with the **App Router** pattern. The application follows a component-based architecture with clear separation of concerns between UI, business logic, and data management.

### Tech Stack
- **Framework**: Next.js 13 with App Router
- **Language**: TypeScript for full type safety
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: NextAuth.js with Google OAuth
- **State Management**: Zustand stores + React Context
- **Data Fetching**: React Query + custom API clients
- **Payment Integration**: Stripe for subscriptions and billing

---

## 2. Key Frontend Features

### 🤖 AI Chat Interface
- **Real-time messaging** with AI agents via WebSocket
- **Code execution** with syntax highlighting and live results
- **File upload** support for CSV/Excel data analysis
- **Message persistence** with Redis-backed chat history
- **Multi-agent** conversations with specialized AI assistants

### 🔐 Authentication & Security
- **Google OAuth** primary authentication
- **Session management** with NextAuth.js and Redis
- **Admin dashboard** access with temporary login
- **Route protection** via Next.js middleware
- **Guest mode** with limited trial access

### 💳 Credit & Billing System
- **Real-time credit tracking** with usage monitoring
- **Tier-based pricing** (1-20 credits per AI model)
- **2-day trial** with 500 credits for new users
- **Stripe integration** for subscription management
- **Usage analytics** and cost breakdown

### 📊 Admin Dashboard
- **User analytics** and platform statistics
- **Cost analysis** per model and user
- **Real-time metrics** and performance monitoring
- **User management** and activity tracking

---

## 3. Component Architecture

### Core Components
```
components/
├── ui/                 # shadcn/ui base components
├── chat/               # Chat interface components
│   ├── ChatInterface.tsx    # Main chat container
│   ├── ChatInput.tsx        # User input handling
│   ├── ChatWindow.tsx       # Message display
│   └── MessageContent.tsx   # Message rendering
├── admin/              # Admin dashboard components
├── analytics/          # Analytics visualization
└── landing/            # Landing page sections
```

### Page Structure (App Router)
```
app/
├── page.tsx            # Landing page
├── chat/page.tsx       # Main chat interface
├── admin/page.tsx      # Admin dashboard
├── analytics/          # Analytics pages
├── login/page.tsx      # Authentication
├── api/                # API routes (Next.js)
└── layout.tsx          # Root layout
```

---

## 4. State Management

### Global State
- **Credit Context**: Real-time credit tracking and billing state
- **Deep Analysis Context**: Long-running analysis progress
- **Session Store**: User authentication and preferences
- **Chat History Store**: Message persistence and retrieval

### Local State
- Component-level state with React hooks
- Form state management with controlled components
- UI state (modals, dropdowns, loading states)

---

## 5. API Integration

### Communication Patterns
1. **Direct Backend Calls**: Real-time chat and data operations
2. **Next.js API Routes**: Authentication, payments, and Redis operations
3. **WebSocket**: Live chat streaming and real-time updates

### API Client Structure
```
lib/api/
├── auth.ts            # Authentication API calls
├── analytics.ts       # Admin analytics data
└── chat.ts            # Chat and AI interactions
```

---

## 6. Environment Configuration

### Required Variables
```bash
# Core Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Redis & Caching
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Stripe Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 7. Development Workflow

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # ESLint code checking
npm run type-check   # TypeScript validation
```

### Development Environment
1. **Frontend Server**: `http://localhost:3000`
2. **Backend API**: `http://localhost:8000`
3. **Hot Reload**: Automatic code reloading
4. **Error Overlay**: Development error reporting

---

## 8. Performance & Optimization

### Next.js Features
- **Automatic code splitting** by route
- **Image optimization** with Next.js Image component
- **Bundle analysis** for size optimization
- **Edge runtime** support for API routes

### Caching Strategy
- **Redis caching** for user sessions and data
- **Browser caching** for static assets

---

## 9. Security Implementation

### Frontend Security
- **Environment variable** protection (NEXT_PUBLIC_ prefix for client-side)
- **API route protection** with authentication middleware
- **XSS protection** via input sanitization
- **CSRF protection** built into NextAuth.js

### Authentication Flow
```
User Login → Google OAuth → NextAuth.js → Session Creation → Redis Storage
↓
Route Protection → Middleware Check → API Authentication → Backend Access
```

---

## 10. Deployment Options

### Vercel (Recommended)
- **Automatic deployments** from GitHub
- **Environment variables** configuration
- **Preview deployments** for pull requests
- **Edge functions** for global performance

### Alternative Platforms
- **AWS Amplify** with Terraform configuration
- **Docker containers** for custom hosting
- **Static export** for CDN deployment

---

## 📖 Detailed Documentation

For comprehensive frontend documentation, see:

### **[Frontend Documentation Hub](../auto-analyst-frontend/docs/README.md)**

**Architecture & Development**
- [Environment Setup Guide](../auto-analyst-frontend/docs/development/environment-setup.md)
- [Component Architecture](../auto-analyst-frontend/docs/architecture/)
- [API Integration](../auto-analyst-frontend/docs/communication/)

**System Configuration**
- [Authentication System](../auto-analyst-frontend/docs/system/authentication.md)
- [Middleware Configuration](../auto-analyst-frontend/docs/system/middleware.md)
- [Model Registry](../auto-analyst-frontend/docs/system/model-registry.md)

**Business Logic**
- [Credit Configuration](../auto-analyst-frontend/docs/billing/credit-configuration.md)
- [Trial System](../auto-analyst-frontend/docs/billing/trial-system.md)
- [Stripe Integration](../auto-analyst-frontend/docs/billing/stripe-integration.md)

---

## 🔧 Quick Start

```bash
# Clone and setup
git clone <repository>
cd Auto-Analyst-CS/auto-analyst-frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

This overview provides the essential information about the Auto-Analyst frontend. For detailed implementation guides, component documentation, and development workflows, refer to the [comprehensive frontend documentation](../auto-analyst-frontend/docs/README.md).