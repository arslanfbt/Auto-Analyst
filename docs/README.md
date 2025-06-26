# Auto-Analyst Documentation

Welcome to the Auto-Analyst project documentation. This directory contains comprehensive guides for understanding, developing, and deploying the entire Auto-Analyst platform.

## 🏗️ Project Overview

Auto-Analyst is an AI-powered analytics platform that enables users to analyze data through natural language conversations. The platform consists of a Next.js frontend and a Python FastAPI backend, integrated with various AI models and cloud services.

```
Auto-Analyst Platform Architecture
├── Frontend (Next.js 14)
│   ├── Chat Interface with AI Agents
│   ├── Credit Management System
│   ├── User Authentication & Authorization
│   ├── Admin Dashboard & Analytics
│   └── Stripe Payment Integration
├── Backend (Python FastAPI)
│   ├── AI Agent Management
│   ├── Code Execution Engine
│   ├── Data Processing Pipeline
│   ├── Database Integration (PostgreSQL/SQLite)
│   └── Analytics & Usage Tracking
└── Infrastructure
    ├── Redis (Caching & Sessions)
    ├── Stripe (Payments & Subscriptions)
    ├── Cloud Storage (AWS S3/Vercel Blob)
    └── AI Models (OpenAI, Anthropic, Google, etc.)
```

## 📁 Documentation Structure

### **📖 Project Documentation** (`/docs/`)
- **[Backend Documentation](./backend.md)** - Python FastAPI backend architecture and API reference
- **[Frontend Documentation](./frontend.md)** - Next.js frontend overview and component structure
- **[Database Schema](./db_schema.md)** - Database structure and relationships
- **[Redis Setup](./redis-setup.md)** - Redis configuration and usage patterns

### **🎨 Frontend Specific** (`/auto-analyst-frontend/docs/`)
- **[Frontend README](../auto-analyst-frontend/docs/README.md)** - Frontend-specific documentation
- **Architecture & Components** - Detailed frontend implementation guides
- **Development Setup** - Frontend development environment setup
- **API Integration** - Frontend-backend communication patterns

### **🔧 Backend Specific** (`/auto-analyst-backend/docs/`)
- **[API Endpoints](../auto-analyst-backend/docs/endpoints.md)** - Complete API reference
- **[Architecture](../auto-analyst-backend/docs/architecture.md)** - Backend system design
- **Agent System** - AI agent configuration and management
- **Database Integration** - Data models and migrations

## 🚀 Quick Start Guide

### **For New Developers**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/Auto-Analyst.git
   cd Auto-Analyst-CS
   ```

2. **Backend Setup**
   ```bash
   cd auto-analyst-backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd auto-analyst-frontend
   npm install
   ```

4. **Environment Configuration**
   - Copy `.env.example` to `.env.local` in both directories
   - Configure API keys, database URLs, and service credentials
   - See [Frontend Environment Setup](../auto-analyst-frontend/docs/development/environment-setup.md)

5. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd auto-analyst-backend && uvicorn app:app --reload
   
   # Terminal 2 - Frontend  
   cd auto-analyst-frontend && npm run dev
   ```

### **For Product Managers**

1. **Understanding the Platform**
   - Review [Frontend Documentation](./frontend.md) for user-facing features
   - Check [Backend Documentation](./backend.md) for API capabilities
   - Understand the [Database Schema](./db_schema.md) for data structure

2. **Key Business Features**
   - **Credit System**: Usage-based billing with model tiers (1-20 credits per query)
   - **Trial System**: 2-day free trial with 500 credits
   - **Subscription Management**: Stripe-powered recurring billing
   - **Multi-Agent AI**: Specialized agents for different data tasks

3. **Analytics & Monitoring**
   - User engagement tracking
   - Model usage and cost analysis
   - Real-time platform statistics

### **For DevOps Engineers**

1. **Deployment Options**
   - **Frontend**: Vercel, AWS Amplify, Docker
   - **Backend**: AWS ECS, Docker, HuggingFace Spaces
   - **Database**: PostgreSQL (production), SQLite (development)
   - **Caching**: Redis/Upstash

2. **Infrastructure Setup**
   - Review [Redis Setup Guide](./redis-setup.md)
   - Configure monitoring and logging
   - Set up CI/CD pipelines

3. **Security Considerations**
   - Environment variable management
   - API key rotation
   - Database security
   - Rate limiting and DDoS protection

## 🎯 Key Features

### **🤖 AI-Powered Analytics**
- **Multi-Agent System**: Specialized AI agents for different data analysis tasks
- **Natural Language Interface**: Chat-based interaction with data
- **Code Generation**: Automatic Python code generation for analysis
- **Real-time Execution**: Live code execution with results visualization

### **💳 Business Model**
- **Credit-Based Pricing**: Pay-per-query model with different AI model tiers
- **Subscription Plans**: Monthly/yearly plans with credit allocations
- **Free Trial**: 2-day trial with 500 credits
- **Enterprise Features**: Custom solutions and dedicated support

### **🔐 Authentication & Security**
- **Google OAuth**: Primary authentication method
- **Session Management**: Redis-based session storage
- **Admin Dashboard**: Analytics and user management
- **API Security**: Rate limiting and authentication tokens

### **📊 Analytics & Monitoring**
- **Usage Tracking**: Detailed analytics on user behavior
- **Cost Analysis**: Real-time cost tracking per model and user
- **Performance Metrics**: Response times and success rates
- **Business Intelligence**: Revenue and subscription analytics

## 🔧 Development Workflow

### **Frontend Development**
```bash
cd auto-analyst-frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
```

### **Backend Development**
```bash
cd auto-analyst-backend
uvicorn app:app --reload        # Start with hot reload
python -m pytest               # Run tests
python scripts/init_db.py      # Initialize database
```

### **Full Stack Development**
```bash
# Use Docker Compose for full environment
docker-compose up -d

# Or run both servers simultaneously
npm run dev:all    # If configured in root package.json
```

## 🏗️ Architecture Decisions

### **Frontend Architecture**
- **Next.js 14**: App Router for modern React patterns
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling with custom components
- **Zustand**: Lightweight state management
- **NextAuth.js**: Authentication framework

### **Backend Architecture**
- **FastAPI**: Modern Python web framework with automatic OpenAPI
- **SQLAlchemy**: Database ORM with migration support
- **DSPy**: AI agent framework for model interactions
- **Pydantic**: Data validation and serialization
- **Async/Await**: Non-blocking I/O for better performance

### **Data Architecture**
- **PostgreSQL**: Primary database for production
- **Redis**: Caching and session storage
- **S3/Blob Storage**: File uploads and static assets
- **Real-time Updates**: WebSocket connections for live data

## 🔗 Integration Points

### **AI Model Providers**
- **OpenAI**: GPT-4, GPT-4o-mini models
- **Anthropic**: Claude Sonnet, Claude Haiku
- **Google**: Gemini models
- **Groq**: High-speed inference

### **Payment Processing**
- **Stripe**: Subscription management and payments
- **Webhooks**: Real-time payment event processing
- **Credit System**: Usage tracking and billing

### **Third-Party Services**
- **Vercel**: Frontend hosting and edge functions
- **Upstash**: Managed Redis service
- **HuggingFace**: AI model hosting and deployment
- **AWS**: Cloud infrastructure and storage

## 📈 Monitoring & Analytics

### **Application Monitoring**
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time monitoring
- **Usage Analytics**: User behavior tracking
- **Cost Tracking**: Real-time cost analysis per feature

### **Business Metrics**
- **User Acquisition**: Registration and trial conversion
- **Revenue Tracking**: Subscription and usage revenue
- **Feature Usage**: Most popular AI agents and features
- **Support Metrics**: User satisfaction and support tickets

## 🤝 Contributing

### **Code Standards**
- Follow TypeScript/Python best practices
- Use consistent naming conventions
- Write comprehensive tests
- Document new features and APIs

### **Documentation Standards**
- Keep documentation up-to-date with code changes
- Use clear, concise language with examples
- Organize documentation logically
- Link related concepts and features

### **Development Process**
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Update relevant documentation
5. Submit a pull request with clear description

## 📞 Support & Resources

### **Internal Resources**
- **Development Team**: Technical implementation questions
- **Product Team**: Feature requirements and business logic
- **DevOps Team**: Infrastructure and deployment issues

### **External Documentation**
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Redis Documentation](https://redis.io/docs)

### **Community**
- GitHub Issues for bug reports and feature requests
- Internal Slack channels for development discussions
- Code review process for quality assurance

---

This documentation serves as the central hub for understanding and working with the Auto-Analyst platform. For specific implementation details, refer to the frontend and backend documentation in their respective directories. 