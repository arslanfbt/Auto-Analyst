# Auto-Analyst Backend Documentation

This directory contains comprehensive documentation for the Auto-Analyst backend - a sophisticated multi-agent AI platform for data analysis built with FastAPI, DSPy, and modern Python technologies.

## 📁 Documentation Structure

### **🏗️ Architecture** (`/architecture/`)
- **[System Architecture](./architecture/architecture.md)** - Comprehensive overview of backend system design, components, and data flow patterns

### **🚀 Development** (`/development/`)
- **[Development Workflow](./development/development_workflow.md)** - Complete development guide with patterns, best practices, and code organization principles

### **🔧 System** (`/system/`)
- **[Database Schema](./system/database-schema.md)** - Complete database schema with all tables, relationships, and performance optimization
- **[Shared DataFrame System](./system/shared_dataframe.md)** - Inter-agent data sharing and session management

### **🌐 API** (`/api/`)
- **[API Endpoints Overview](./api/README.md)** - Main API reference hub
- **[Route Documentation](./api/routes/)** - Detailed endpoint documentation:
  - **[Core Routes](./api/routes/session.md)** - File uploads, sessions, authentication
  - **[Chat Routes](./api/routes/chats.md)** - Chat and messaging endpoints
  - **[Code Routes](./api/routes/code.md)** - Code execution and processing
  - **[Analytics Routes](./api/routes/analytics.md)** - Usage analytics and monitoring
  - **[Deep Analysis Routes](./api/routes/deep_analysis.md)** - Multi-agent analysis system
  - **[Template Routes](./api/routes/templates.md)** - Agent template management
  - **[Feedback Routes](./api/routes/feedback.md)** - User feedback and rating system

### **🐛 Troubleshooting** (`/troubleshooting/`)
- **[Troubleshooting Guide](./troubleshooting/troubleshooting.md)** - Common issues, debugging tools, and solutions

## 🎯 Backend Overview

### **Tech Stack**
- **FastAPI** - Modern async Python web framework
- **DSPy** - AI agent orchestration and LLM integration
- **SQLAlchemy** - Database ORM with PostgreSQL/SQLite support
- **Plotly** - Interactive data visualizations
- **Pandas/NumPy** - Data manipulation and analysis
- **Scikit-learn** - Machine learning models
- **Statsmodels** - Statistical analysis

### **Core Features**
- **Multi-Agent System** - 4+ specialized AI agents for different analysis tasks
- **Template System** - User-customizable agent configurations
- **Deep Analysis** - Multi-step analytical workflows with streaming progress
- **Session Management** - Stateful user sessions with shared data context
- **Code Execution** - Safe Python code execution environment
- **Real-time Streaming** - WebSocket support for live analysis updates

### **Agent Types**
1. **Data Preprocessing Agent** - Data cleaning and preparation
2. **Statistical Analytics Agent** - Statistical analysis using statsmodels
3. **Machine Learning Agent** - ML modeling with scikit-learn
4. **Data Visualization Agent** - Interactive charts with Plotly
5. **Feature Engineering Agent** (Premium) - Advanced feature creation
6. **Polars Agent** (Premium) - High-performance data processing

## 🚀 Quick Start Guide

### **1. Environment Setup**

```bash
# Navigate to backend directory
cd Auto-Analyst-CS/auto-analyst-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

### **2. Environment Configuration**

Create `.env` file with required variables:

```env
# Database Configuration
DATABASE_URL=sqlite:///./chat_database.db

# AI Model Configuration
OPENAI_API_KEY=your-openai-api-key
MODEL_PROVIDER=openai  # openai, anthropic, groq, gemini
MODEL_NAME=gpt-4o-mini
TEMPERATURE=0.7
MAX_TOKENS=6000

# Optional: Additional AI Providers
ANTHROPIC_API_KEY=your-anthropic-key
GROQ_API_KEY=your-groq-key
GEMINI_API_KEY=your-gemini-key

# Security
ADMIN_API_KEY=your-admin-key

# Application Settings
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000/
```

### **3. Database Initialization**

```bash
# Initialize database and default agents
python -c "
from src.db.init_db import init_db
init_db()
print('✅ Database and agents initialized successfully')
"
```

### **4. Start Development Server**

```bash
# Start the FastAPI server
python -m app

# Or with uvicorn for more control
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### **5. Verify Installation**

- **API Documentation**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

## 🔧 Development Workflow

### **Adding New Agents**

1. **Define Agent Signature** in `src/agents/agents.py`
2. **Add Configuration** to `agents_config.json`
3. **Register Agent** in loading system
4. **Test Integration** with multi-agent pipeline

### **Adding New API Endpoints**

1. **Create Route File** in `src/routes/`
2. **Define Pydantic Models** for request/response
3. **Implement Endpoints** with proper error handling
4. **Register Router** in `app.py`
5. **Update Documentation**

### **Database Changes**

1. **Modify Models** in `src/db/schemas/models.py`
2. **Create Migration**: `alembic revision --autogenerate -m "description"`
3. **Apply Migration**: `alembic upgrade head`
4. **Update Documentation**

## 📊 System Architecture

### **Request Processing Flow**
```
HTTP Request → FastAPI Router → Route Handler → Business Logic → 
Database/Agent System → AI Model → Response Processing → JSON Response
```

### **Agent Execution Flow**
```
User Query → Session Manager → Agent Selection → Context Preparation → 
DSPy Chain → AI Model → Code Generation → Execution → Response Formatting
```

### **Deep Analysis Workflow**
```
Goal Input → Question Generation → Planning → Multi-Agent Execution → 
Code Synthesis → Result Compilation → HTML Report Generation
```

## 🧪 Testing & Validation

### **API Testing**
```bash
# Interactive documentation
open http://localhost:8000/docs

# cURL examples
curl -X GET "http://localhost:8000/health"
curl -X POST "http://localhost:8000/chat/preprocessing_agent" \
  -H "Content-Type: application/json" \
  -d '{"query": "Clean this dataset", "session_id": "test"}'
```

### **Agent Testing**
```python
# Test individual agents
from src.agents.agents import preprocessing_agent
import dspy

# Configure DSPy
lm = dspy.LM('openai/gpt-4o-mini', api_key='your-key')
dspy.configure(lm=lm)

# Test agent
agent = dspy.ChainOfThought(preprocessing_agent)
result = agent(goal='clean data', dataset='test dataset')
print(result)
```

## 🔒 Security & Production

### **Security Features**
- **Session-based authentication** with secure session management
- **API key protection** for admin endpoints
- **Input validation** using Pydantic models
- **Error handling** with proper HTTP status codes
- **CORS configuration** for frontend integration

### **Production Considerations**
- **PostgreSQL database** for production deployment
- **Environment variable management** for secrets
- **Logging configuration** for monitoring
- **Rate limiting** for API protection
- **Performance optimization** for large datasets

## 📈 Monitoring & Analytics

The backend includes comprehensive analytics for:
- **Usage tracking** - API endpoint usage and performance
- **Model usage** - AI model consumption and costs
- **User analytics** - User behavior and engagement
- **Error monitoring** - System health and error tracking
- **Performance metrics** - Response times and throughput

## 🤝 Contributing

1. **Follow coding standards** defined in development workflow
2. **Add comprehensive tests** for new features
3. **Update documentation** for all changes
4. **Use proper error handling** patterns
5. **Submit detailed pull requests** with clear descriptions

---

## 📖 Detailed Documentation

For specific implementation details, refer to the organized documentation in each subdirectory:

- **[Getting Started Guide](./getting_started.md)** - Complete setup walkthrough
- **[Architecture Documentation](./architecture/)** - System design and components
- **[Development Guides](./development/)** - Workflow and best practices
- **[API Reference](./api/)** - Complete endpoint documentation
- **[System Documentation](./system/)** - Database and core systems
- **[Troubleshooting](./troubleshooting/)** - Debugging and solutions

---

**Need help?** Check the troubleshooting guide or refer to the comprehensive documentation in each section. 