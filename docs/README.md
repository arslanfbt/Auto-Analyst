# Auto-Analyst Documentation

Welcome to the Auto-Analyst project documentation. This directory contains comprehensive guides for understanding, developing, and deploying the entire Auto-Analyst platform.

## 🏗️ Project Overview

Auto-Analyst is an AI-powered analytics platform that enables users to analyze data through natural language conversations. The platform consists of a Next.js frontend and a Python FastAPI backend, integrated with various AI models and cloud services.

```
Auto-Analyst Platform Architecture
├── Frontend
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
    ├── Redis (Credits and Subscriptions Tracking)
    ├── Stripe (Payments & Subscriptions)
    └── AI Models (OpenAI, Anthropic, Google, etc.)
```

## 📁 Documentation Structure

### **📖 Main Documentation** (`/docs/`)
- **[Backend Documentation](./backend.md)** - Python FastAPI backend API overview and route categories
- **[Frontend Documentation](./frontend.md)** - Next.js frontend overview and component structure

### **🎨 Frontend Specific** (`/auto-analyst-frontend/docs/`)
- **[Frontend Documentation Hub](../auto-analyst-frontend/docs/README.md)** - Comprehensive frontend guides
- **[Development Environment Setup](../auto-analyst-frontend/docs/development/environment-setup.md)** - Complete environment configuration
- **[Default Agents System](../auto-analyst-frontend/docs/features/default-agents.md)** - AI agent setup and configuration
- **[Credit Configuration Guide](../auto-analyst-frontend/docs/billing/credit-configuration.md)** - Centralized credit and trial management
- **[Trial System Architecture](../auto-analyst-frontend/docs/billing/trial-system.md)** - 2-day trial implementation
- **[Model Registry](../auto-analyst-frontend/docs/system/model-registry.md)** - AI model management
- **[Middleware Guide](../auto-analyst-frontend/docs/system/middleware.md)** - Route protection and request handling

### **🔧 Backend Specific** (`/auto-analyst-backend/docs/`)
- **[Getting Started Guide](../auto-analyst-backend/docs/getting_started.md)** - Backend setup and deployment
- **[API Endpoints Reference](../auto-analyst-backend/docs/api/endpoints.md)** - Complete API documentation
- **[Architecture Overview](../auto-analyst-backend/docs/architecture/architecture.md)** - Backend system design
- **[Development Workflow](../auto-analyst-backend/docs/development/development_workflow.md)** - Backend development guide
- **[Database Schema](../auto-analyst-backend/docs/system/database-schema.md)** - Data models and relationships
- **[Shared DataFrame System](../auto-analyst-backend/docs/system/shared_dataframe.md)** - Session data management

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
   - Understand the [Database Schema](../auto-analyst-backend/docs/system/database-schema.md) for data structure

2. **Key Business Features**
   - **Credit System**: Usage-based billing with model tiers (1-20 credits per query)
   - **Trial System**: 2-day free trial with 500 credits (configurable)
   - **Subscription Management**: Stripe-powered recurring billing
   - **Multi-Agent AI**: Specialized agents for different data tasks

3. **Configuration Management**
   - **Credit Configuration**: Centralized in [credits-config.ts](../auto-analyst-frontend/docs/billing/credit-configuration.md)
   - **Trial Settings**: Adjustable duration and credit allocation
   - **Model Pricing**: Different AI models with varying credit costs

### **For DevOps Engineers**

1. **Deployment Options**
   - **Frontend**: Vercel, AWS Amplify, Docker
   - **Backend**: AWS ECS, Docker, HuggingFace Spaces
   - **Database**: PostgreSQL (production), SQLite (development)
   - **Caching**: Redis/Upstash

2. **Infrastructure Setup**
   - Configure monitoring and logging
   - Set up CI/CD pipelines
   - Environment variable management
   - Database migrations and backups

3. **Security Considerations**
   - API key rotation and management
   - Database security and access control
   - Rate limiting and DDoS protection
   - SSL/TLS certificate management

## 🎯 Key Features

### **🤖 AI-Powered Analytics**
- **Multi-Agent System**: Specialized AI agents for different data analysis tasks
- **Natural Language Interface**: Chat-based interaction with data
- **Code Generation**: Automatic Python code generation for analysis
- **Real-time Execution**: Live code execution with results visualization
- **Deep Analysis**: Comprehensive multi-agent analysis with detailed reporting

### **💳 Business Model**
- **Credit-Based Pricing**: Pay-per-query model with different AI model tiers
- **Subscription Plans**: Monthly/yearly plans with credit allocations
- **Free Trial**: 2-day trial with 500 credits (configurable)
- **Enterprise Features**: Custom solutions and dedicated support

### **🔐 Authentication & Security**
- **Google OAuth**: Primary authentication method via NextAuth.js
- **Session Management**: Redis-based session storage
- **Admin Dashboard**: Analytics and user management interface
- **API Security**: Rate limiting and authentication tokens

### **📊 Analytics & Monitoring**
- **Usage Tracking**: Detailed analytics on user behavior and feature usage
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
```

### **Backend Development**
```bash
cd auto-analyst-backend
python -m app              # Start with hot reload
python -m src.db.init_db   # Initialize database
python -m scripts.populate_agent_templates #  Fill DB with custom + default agents
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
- **Next.js 13**: App Router for modern React patterns
- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Utility-first styling with custom components
- **Zustand**: Lightweight state management for complex UI state
- **NextAuth.js**: Authentication framework with Google OAuth

### **Backend Architecture**
- **FastAPI**: Modern Python web framework with automatic OpenAPI
- **SQLAlchemy**: Database ORM with migration support
- **DSPy**: AI agent framework for model interactions and orchestration
- **Pydantic**: Data validation and serialization
- **Async/Await**: Non-blocking I/O for better performance

### **Data Architecture**
- **PostgreSQL**: Primary database for production
- **Redis**: Caching, session storage, and real-time data
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
- **Credit System**: Usage tracking and billing automation

### **Third-Party Services**
- **Vercel**: Frontend hosting and edge functions
- **Upstash**: Managed Redis service
- **HuggingFace**: AI model hosting and deployment
- **AWS**: Cloud infrastructure and storage (AWS RDS)

## 📈 Monitoring & Analytics

### **Application Monitoring**
- **Error Tracking**: Comprehensive error logging and reporting
- **Performance Metrics**: Response time monitoring and optimization
- **Usage Analytics**: User behavior tracking and feature usage
- **Cost Tracking**: Real-time cost analysis per feature and user

### **Business Metrics**
- **User Acquisition**: Registration and trial conversion tracking
- **Revenue Tracking**: Subscription and usage revenue analytics
- **Feature Usage**: Most popular AI agents and features
- **Support Metrics**: User satisfaction and support ticket analytics

## 🤝 Contributing

### **Code Standards**
- Follow TypeScript/Python best practices
- Use consistent naming conventions
- Write comprehensive tests for new features
- Document new features and APIs thoroughly

### **Documentation Standards**
- Keep documentation up-to-date with code changes
- Use clear, concise language with practical examples
- Organize documentation logically with proper linking
- Include configuration examples and troubleshooting guides

### **Development Process**
1. Fork the repository and create a feature branch
2. Make changes with appropriate tests
3. Update relevant documentation
4. Submit a pull request with clear description
5. Address code review feedback promptly

## 📞 Support & Resources

### **Internal Resources**
- **Development Team**: Technical implementation questions and code reviews
- **Product Team**: Feature requirements and business logic discussions
- **DevOps Team**: Infrastructure and deployment issues

### **External Documentation**
- [Next.js Documentation](https://nextjs.org/docs) - Frontend framework
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Backend framework
- [Stripe API Reference](https://stripe.com/docs/api) - Payment processing
- [Redis Documentation](https://redis.io/docs) - Caching and sessions

### **Community**
- GitHub Issues for bug reports and feature requests
- Internal Slack channels for development discussions
- Code review process for quality assurance
- Documentation updates and improvements

---

This documentation serves as the central hub for understanding and working with the Auto-Analyst. For specific implementation details, refer to the frontend and backend documentation in their respective directories. 