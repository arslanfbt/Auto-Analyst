# Auto-Analyst Backend - Getting Started Guide

## 🎯 Overview

This guide will help you set up and understand the Auto-Analyst backend system. Auto-Analyst is a multi-agent AI platform that orchestrates specialized agents for comprehensive data analysis.

## 🏗️ Core Concepts

### 1. **Multi-Agent System**
The platform uses specialized AI agents:
- **Preprocessing Agent**: Data cleaning and preparation
- **Statistical Analytics Agent**: Statistical analysis and insights
- **Machine Learning Agent**: Scikit-learn based modeling
- **Data Visualization Agent**: Chart and plot generation

### 2. **Template System**
- **Individual Agents**: Single-purpose agents for specific tasks
- **Planner Agents**: Multi-agent coordination for complex workflows
- **User Templates**: Customizable agent preferences
- **Default vs Premium**: Core agents available to all users

### 3. **Session Management**
- Session-based user tracking
- Shared DataFrame context between agents
- Conversation history and code execution tracking

### 4. **Deep Analysis System**
- Multi-step analysis workflow (questions → planning → execution → synthesis)
- Streaming progress updates
- HTML report generation

## 🚀 Quick Start

### 1. Installation

```bash
# Clone and navigate to backend
cd Auto-Analyst-CS/auto-analyst-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env` file with:

```env
# Database
DATABASE_URL=sqlite:///./auto_analyst.db  # For development
# DATABASE_URL=postgresql://user:pass@host:port/db  # For production

# AI Models
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Authentication (optional)
ADMIN_API_KEY=your_admin_key_here
```

### 3. Database Initialization

```bash
# Initialize database and default agents
python -c "
from src.db.init_db import init_database
from src.db.init_default_agents import initialize_default_agents
init_database()
initialize_default_agents()
print('✅ Database initialized successfully')
"
```

### 4. Start the Server

```bash
# Development server
python app.py

# Or with uvicorn
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### 5. Verify Setup

Visit: `http://localhost:8000/docs` for interactive API documentation

## 📚 Key Files to Understand

### Core Application Files

1. **`app.py`** - Main FastAPI application and core endpoints
2. **`src/agents/agents.py`** - Agent definitions and orchestration
3. **`src/agents/deep_agents.py`** - Deep analysis system
4. **`src/db/schemas/models.py`** - Database models
5. **`src/managers/chat_manager.py`** - Chat and session management

### Route Files (API Endpoints)

- **`src/routes/core_routes.py`** - File uploads, sessions, authentication
- **`src/routes/chat_routes.py`** - Chat and messaging
- **`src/routes/code_routes.py`** - Code execution and processing
- **`src/routes/templates_routes.py`** - Agent template management
- **`src/routes/deep_analysis_routes.py`** - Deep analysis reports
- **`src/routes/analytics_routes.py`** - Usage analytics and monitoring

### Configuration Files

- **`agents_config.json`** - Agent and template definitions
- **`requirements.txt`** - Python dependencies
- **`alembic.ini`** - Database migration configuration

## 🔧 Development Workflow

### 1. Adding New Agents

```python
# 1. Define agent signature in src/agents/agents.py
class new_agent(dspy.Signature):
    """Agent description"""
    goal = dspy.InputField(desc="Analysis goal")
    dataset = dspy.InputField(desc="Dataset info")
    result = dspy.OutputField(desc="Analysis result")

# 2. Add to agents_config.json
{
  "template_name": "new_agent",
  "description": "Agent description",
  "variant_type": "both",
  "is_premium": false,
  "usage_count": 0
}

# 3. Register in agent loading system
```

### 2. Adding New Endpoints

```python
# 1. Create route in src/routes/feature_routes.py
from fastapi import APIRouter
router = APIRouter(prefix="/feature", tags=["feature"])

@router.get("/endpoint")
async def new_endpoint():
    return {"message": "Hello"}

# 2. Register in app.py
from src.routes.feature_routes import router as feature_router
app.include_router(feature_router)
```

### 3. Database Changes

```bash
# 1. Modify models in src/db/schemas/models.py
# 2. Create migration
alembic revision --autogenerate -m "description"
# 3. Apply migration
alembic upgrade head
```

## 🧪 Testing Your Changes

### 1. Test API Endpoints

```bash
# Use the interactive docs
open http://localhost:8000/docs

# Or use curl
curl -X GET "http://localhost:8000/health"
```

### 2. Test Agent System

```python
# Test individual agent
python -c "
from src.agents.agents import preprocessing_agent
import dspy
dspy.LM('anthropic/claude-sonnet-4-20250514')
agent = dspy.ChainOfThought(preprocessing_agent)
result = agent(goal='clean data', dataset='test data')
print(result)
"
```

### 3. Test Database Operations

```python
# Test database
python -c "
from src.db.init_db import session_factory
from src.db.schemas.models import AgentTemplate
session = session_factory()
templates = session.query(AgentTemplate).all()
print(f'Found {len(templates)} templates')
session.close()
"
```

## 🔍 Common Development Tasks

### Adding a New Feature

1. **Plan the Feature**: Define requirements and API design
2. **Database Changes**: Add new models if needed
3. **Create Routes**: Add API endpoints in `src/routes/`
4. **Business Logic**: Add managers in `src/managers/` if complex
5. **Documentation**: Update relevant `.md` files
6. **Testing**: Test endpoints and integration

### Debugging Issues

1. **Check Logs**: Application logs show detailed error information
2. **Database State**: Verify data with database queries
3. **API Testing**: Use `/docs` interface for endpoint testing
4. **Agent Behavior**: Test individual agents separately

### Performance Optimization

1. **Database Queries**: Use SQLAlchemy query optimization
2. **Agent Execution**: Implement async patterns for agent orchestration
3. **Resource Management**: Monitor memory usage for large datasets

## 📊 System Architecture Overview

```mermaid
graph TD
    A[Frontend Request] --> B[FastAPI Router]
    B --> C[Route Handler]
    C --> D[Manager Layer]
    D --> E[Database Layer]
    D --> F[Agent System]
    F --> G[AI Models]
    G --> H[Code Generation]
    H --> I[Execution Environment]
    I --> J[Results Processing]
    J --> K[Response]
    
    subgraph "Agent Orchestration"
        F1[Individual Agents]
        F2[Planner Module]
        F3[Deep Analysis]
        F1 --> F2
        F2 --> F3
    end
    
    F --> F1
```

## 📈 Template Integration

The system uses **active user templates** for agent selection:

### Default Agents (Always Available)
- `preprocessing_agent` (individual & planner variants)
- `statistical_analytics_agent` (individual & planner variants)  
- `sk_learn_agent` (individual & planner variants)
- `data_viz_agent` (individual & planner variants)

### Template Loading Logic
1. **Individual Agent Execution** (`@agent_name`): Loads ALL available templates
2. **Planner Execution**: Loads user's enabled templates (max 10 for performance)
3. **Deep Analysis**: Uses user's active template preferences
4. **Fallback**: Uses 4 core agents if no user preferences found

This architecture ensures users can leverage their preferred agents while maintaining system performance and reliability. 