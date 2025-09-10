# Auto-Analyst Frontend Documentation

This directory contains comprehensive guides for understanding, developing, and contributing to the Auto-Analyst frontend.

## 📁 Frontend Documentation Structure

### **🏗️ Architecture** (`/architecture/`)
- **Component Structure** - Detailed component hierarchy and patterns
- **State Management** - Context providers and store implementations
- **Tech Stack** - Next.js, TypeScript, and styling framework details

### **🎨 Features** (`/features/`)
- **Chat System** - AI conversation interface implementation
- **Default Agents** - [Automated agent setup and configuration](./features/default-agents.md)
- **User Interface** - Component library and design patterns
- **Real-time Features** - WebSocket integration and live updates

### **🔗 Communication** (`/communication/`)
- **API Integration** - Backend communication patterns and endpoints
- **Authentication** - NextAuth.js setup and session management
- **Data Fetching** - API client libraries and data flow

### **⚙️ Development** (`/development/`)
- **Environment Setup** - [Complete environment variables guide](./development/environment-setup.md)
- **Development Workflow** - Local development and testing procedures

### **🔧 System** (`/system/`)
- **Authentication** - NextAuth.js setup and user management
- **Redis Schema** - Data storage and caching patterns
- **Webhooks** - Event processing and subscription management
- **Model Registry** - [AI model management and configuration](./system/model-registry.md)
- **Middleware** - [Route protection and request handling](./system/middleware.md)

### **💳 Billing** (`/billing/`)
- **Credit System** - Usage tracking and credit management
- **Trial System** - [Complete 2-day trial architecture with Stripe](./billing/trial-system.md)
- **Credit Configuration** - [Centralized credit and trial management](./billing/credit-configuration.md)
- **Stripe Integration** - Payment processing and subscriptions

### **🔄 User Flows** (`/user-flows/`)
- **Cancellation Flows** - Subscription cancellation processes
- **Onboarding** - User registration and trial activation
- **Payment Flows** - Checkout and billing workflows

### **📊 State Management** (`/state-management/`)
- **Stores** - Zustand store implementations and patterns
- **Context Providers** - React context for global state
- **Local State** - Component-level state management

## 🚀 Frontend Quick Start

### **Development Setup**

```bash
# Navigate to frontend directory
cd auto-analyst-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### **Required Environment Variables**

Essential variables for frontend development:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000    # Backend API URL
NEXTAUTH_URL=http://localhost:3000           # Frontend URL
NEXTAUTH_SECRET=your-secret-key              # Session encryption
GOOGLE_CLIENT_ID=your-google-client-id       # OAuth authentication
UPSTASH_REDIS_REST_URL=your-redis-url        # Redis connection
```

**📖 See [Environment Setup Guide](./development/environment-setup.md) for complete configuration.**

## 🎯 Frontend-Specific Features

### **🤖 Chat Interface**
- **Real-time Messaging** - WebSocket-powered chat with AI agents
- **Code Execution** - Live Python code execution with syntax highlighting
- **File Uploads** - CSV and Excel file processing for data analysis
- **Message History** - Persistent chat sessions with Redis storage

### **🔐 Authentication System**
- **Google OAuth** - Primary authentication via NextAuth.js
- **Session Management** - Secure session handling with Redis
- **Admin Access** - Temporary admin login for analytics dashboard
- **Guest Mode** - Limited trial access for non-authenticated users

### **💳 Credit Management**
- **Usage Tracking** - Real-time credit consumption monitoring
- **Tier System** - Different AI models with varying credit costs (1-20 credits)
- **Trial Management** - 2-day trial with 500 credits
- **Subscription Integration** - Stripe-powered billing interface

### **📊 Admin Dashboard**
- **Usage Analytics** - User activity and platform statistics
- **Cost Analysis** - Model usage and cost tracking
- **User Management** - User activity monitoring and management
- **Real-time Metrics** - Live platform performance data

## 🔧 Development Workflow

### **Available Scripts**

```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build optimized production bundle
npm run start        # Start production server
npm run lint         # Run ESLint for code quality
npm run type-check   # TypeScript type checking
```

### **Component Development**

```bash
# Component structure
components/
├── ui/              # Reusable UI components (shadcn/ui)
├── chat/            # Chat interface components
├── admin/           # Admin dashboard components
├── analytics/       # Analytics visualization components
└── [feature]/       # Feature-specific components
```

### **Styling Guidelines**

- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Pre-built component library
- **Responsive Design** - Mobile-first approach
- **Dark Mode** - Theme switching support

## 🏗️ Frontend Architecture

### **Tech Stack**
- **Next.js 13** - React framework with App Router
- **TypeScript** - Full type safety
- **Tailwind CSS** - Styling framework
- **NextAuth.js** - Authentication
- **Zustand** - State management
- **React Query** - Server state management

### **Key Patterns**
- **Component Composition** - Reusable, composable components
- **Custom Hooks** - Logic abstraction and reusability
- **Context Providers** - Global state management
- **API Client Libraries** - Centralized API communication

### **Performance Optimizations**
- **Code Splitting** - Automatic route-based splitting
- **Image Optimization** - Next.js Image component
- **Bundle Analysis** - Webpack bundle analyzer
- **Caching Strategies** - Redis and browser caching

## 🧪 Testing

### **Testing Strategy**
- **Unit Tests** - Component and utility function testing
- **Integration Tests** - API integration and user flow testing
- **E2E Tests** - Full application workflow testing

### **Testing Tools**
```bash
# Testing commands (to be implemented)
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:watch   # Watch mode for development
```

## 📱 Responsive Design

### **Breakpoints**
- **Mobile**: `< 640px`
- **Tablet**: `640px - 1024px`
- **Desktop**: `> 1024px`

### **Mobile-First Approach**
- Progressive enhancement from mobile to desktop
- Touch-friendly interfaces
- Optimized performance for mobile devices

## 🔒 Security Considerations

### **Frontend Security**
- **Environment Variables** - Proper secret management
- **API Security** - Request authentication and validation
- **XSS Protection** - Input sanitization and CSP headers
- **CSRF Protection** - Built-in NextAuth.js protection

### **Authentication Security**
- **Secure Sessions** - HttpOnly cookies with secure flags
- **Token Validation** - JWT token verification
- **Route Protection** - Middleware-based route guarding

## 📈 Performance Monitoring

### **Core Web Vitals**
- **LCP** - Largest Contentful Paint optimization
- **FID** - First Input Delay minimization
- **CLS** - Cumulative Layout Shift prevention

### **Monitoring Tools**
- **Vercel Analytics** - Performance metrics
- **Error Tracking** - Error monitoring and reporting
- **User Analytics** - User behavior tracking

## 🤝 Contributing to Frontend

### **Code Standards**
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write comprehensive component documentation
- Implement proper error handling

### **Component Guidelines**
- Create reusable, composable components
- Use TypeScript interfaces for props
- Implement proper accessibility (a11y)
- Follow naming conventions

### **Pull Request Process**
1. Create feature branch from `main`
2. Implement changes with tests
3. Update relevant documentation
4. Submit PR with clear description
5. Address review feedback

---

For project-wide documentation and backend information, see the [main project documentation](../../docs/README.md). 