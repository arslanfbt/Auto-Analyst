# Auto-Analyst Backend System Architecture

## Overview

Auto-Analyst is a sophisticated multi-agent AI platform designed for comprehensive data analysis. The backend system orchestrates specialized AI agents, manages user sessions, and provides a robust API for data processing and analysis workflows.

## 🏗️ High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │     Backend      │    │    Database     │
│   (Next.js)     │◄──►│    (FastAPI)     │◄──►│ (PostgreSQL/    │
│                 │    │                  │    │  SQLite)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   AI Models      │
                       │   (DSPy/LLMs)    │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ Agent System     │
                       │ [Processing]     │
                       │ [Analytics]      │
                       │ [Visualization]  │
                       └──────────────────┘
```

## 🎯 Core Components

### 1. Application Layer (`app.py`)

**FastAPI Application Server**
- **Role**: Main HTTP server and request router
- **Responsibilities**:
  - Request/response handling
  - Session-based authentication
  - Route registration and middleware
  - Error handling and logging
  - Static file serving
  - CORS configuration

**Key Features**:
- Async/await support for high concurrency
- Automatic API documentation generation
- Request validation with Pydantic
- Session management for user tracking

### 2. Agent System (`src/agents/`)

**Multi-Agent Orchestra**
- **Core Agents**: Specialized AI agents for different analysis tasks
- **Deep Analysis**: Advanced multi-agent coordination system
- **Template System**: User-customizable agent configurations

#### Agent Types

1. **Individual Agents** (`agents.py`):
   ```python
   - preprocessing_agent         # Data cleaning and preparation
   - statistical_analytics_agent # Statistical analysis
   - sk_learn_agent             # Machine learning with scikit-learn
   - data_viz_agent             # Data visualization
   - basic_qa_agent             # General Q&A
   ```

2. **Planner Agents** (Multi-agent coordination):
   ```python
   - planner_preprocessing_agent
   - planner_statistical_analytics_agent
   - planner_sk_learn_agent
   - planner_data_viz_agent
   ```

3. **Deep Analysis System** (`deep_agents.py`):
   ```python
   - deep_questions         # Question generation
   - deep_planner          # Execution planning
   - deep_code_synthesizer # Code combination
   - deep_synthesizer      # Result synthesis
   - final_conclusion      # Report generation
   ```

#### Agent Architecture Pattern

```python
class AgentSignature(dspy.Signature):
    """Agent description and purpose"""
    goal = dspy.InputField(desc="Analysis objective")
    dataset = dspy.InputField(desc="Dataset information")
    plan_instructions = dspy.InputField(desc="Execution plan")
    
    summary = dspy.OutputField(desc="Analysis summary")
    code = dspy.OutputField(desc="Generated code")
```

### 3. Database Layer (`src/db/`)

**Data Persistence and Management**

#### Database Models (`schemas/models.py`):

```python
# Core Models
User              # User accounts and authentication
Chat              # Conversation sessions
Message           # Individual messages in chats
ModelUsage        # AI model usage tracking

# Template System
AgentTemplate     # Agent definitions and configurations
UserTemplatePreference  # User's enabled/disabled agents

# Deep Analysis
DeepAnalysisReport     # Analysis reports and results

# Analytics
CodeExecution     # Code execution tracking
UserAnalytics     # User behavior analytics
```

#### Database Architecture:

```
Users (1) ──────── (Many) Chats
  │                        │
  │                        ▼
  └─── (Many) ModelUsage ──┘
  │
  └─── (Many) UserTemplatePreference
               │
               ▼
         AgentTemplate
```

### 4. Route Handlers (`src/routes/`)

**RESTful API Endpoints**

| Module | Purpose | Key Endpoints |
|--------|---------|---------------|
| `core_routes.py` | Core functionality | `/upload_excel`, `/session_info`, `/health` |
| `chat_routes.py` | Chat management | `/chats`, `/messages`, `/delete_chat` |
| `code_routes.py` | Code operations | `/execute_code`, `/get_latest_code` |
| `templates_routes.py` | Agent templates | `/templates`, `/user/{id}/enabled` |
| `deep_analysis_routes.py` | Deep analysis | `/reports`, `/download_from_db` |
| `analytics_routes.py` | System analytics | `/usage`, `/feedback`, `/costs` |
| `feedback_routes.py` | User feedback | `/feedback`, `/message/{id}/feedback` |

### 5. Business Logic Layer (`src/managers/`)

**Service Layer for Complex Operations**

#### Manager Components:

1. **`chat_manager.py`**:
   ```python
   - Session management
   - Message handling
   - Context preservation
   - Agent orchestration
   ```

2. **`ai_manager.py`**:
   ```python
   - Model selection and routing
   - Token tracking and cost calculation
   - Error handling and retries
   - Response formatting
   ```

3. **`session_manager.py`**:
   ```python
   - Session lifecycle management
   - Data sharing between agents
   - Memory management
   - Cleanup operations
   ```

### 6. Utility Layer (`src/utils/`)

**Shared Services and Helpers**

- **`logger.py`**: Centralized logging system
- **`generate_report.py`**: HTML report generation
- **`model_registry.py`**: AI model configuration

## 🔄 Data Flow Architecture

### 1. Request Processing Flow

```
HTTP Request → FastAPI Router → Route Handler → Manager/Business Logic → 
Database/Agent System → AI Model → Response Processing → JSON Response
```

### 2. Agent Execution Flow

```
User Query → Session Creation → Template Selection → Agent Loading → 
Code Generation → Code Execution → Result Processing → Response Formatting
```

### 3. Deep Analysis Flow

```
Analysis Goal → Question Generation → Planning Phase → Agent Coordination → 
Code Synthesis → Execution → Result Synthesis → Final Report Generation
```

### 4. Template System Flow

```
User Preferences → Template Loading → Agent Registration → 
Capability Mapping → Execution Routing → Usage Tracking
```

## 🎨 Design Patterns

### 1. **Module Pattern**
- Clear separation of concerns
- Each module has specific responsibilities
- Minimal dependencies between modules

### 2. **Repository Pattern**
- Database access abstracted through SQLAlchemy
- Session management centralized
- Clean separation of data and business logic

### 3. **Strategy Pattern**
- Multiple AI models supported through unified interface
- Agent selection based on user preferences
- Dynamic template loading

### 4. **Observer Pattern**
- Usage tracking and analytics
- Event-driven model updates
- Real-time progress notifications

### 5. **Factory Pattern**
- Agent creation based on template configurations
- Session factory for database connections
- Dynamic model instantiation

## 🔧 Configuration Management

### Environment Configuration

```python
# Database
DATABASE_URL: str           # Database connection string
POSTGRES_PASSWORD: str      # PostgreSQL password (optional)

# AI Models
ANTHROPIC_API_KEY: str      # Claude API key
OPENAI_API_KEY: str         # OpenAI API key

# Authentication
ADMIN_API_KEY: str          # Admin operations key (optional)

# Deployment
PORT: int = 8000            # Server port
DEBUG: bool = False         # Debug mode
```

### Agent Configuration (`agents_config.json`)

```json
{
  "default_agents": [
    {
      "template_name": "preprocessing_agent",
      "description": "Data cleaning and preparation",
      "variant_type": "both",
      "is_premium": false,
      "usage_count": 0,
      "icon_url": "preprocessing.svg"
    }
  ],
  "premium_templates": [...],
  "remove": [...]
}
```

## 🔒 Security Architecture

### Authentication & Authorization

1. **Session-based Authentication**:
   - Session IDs for user identification
   - Optional API key authentication for admin endpoints

2. **Input Validation**:
   - Pydantic models for request validation
   - SQL injection prevention through SQLAlchemy
   - File upload restrictions and validation

3. **Resource Protection**:
   - User-specific data isolation
   - Usage tracking and monitoring
   - Rate limiting considerations

### Data Security

1. **Database Security**:
   - Encrypted connections for PostgreSQL
   - Parameterized queries
   - Regular backup procedures

2. **Code Execution Security**:
   - Sandboxed code execution environment
   - Limited library imports
   - Timeout protection

## 📊 Performance Architecture

### Scalability Features

1. **Async Architecture**:
   - Non-blocking I/O operations
   - Concurrent agent execution
   - Streaming responses for long operations

2. **Database Optimization**:
   - Connection pooling
   - Query optimization
   - Indexed frequently accessed columns

3. **Caching Strategy**:
   - In-memory caching for templates
   - Result caching for expensive operations
   - Session data management

### Performance Monitoring

1. **Usage Analytics**:
   - Request/response time tracking
   - Token usage monitoring
   - Error rate analysis

2. **Resource Monitoring**:
   - Database query performance
   - Memory usage tracking
   - Agent execution time analysis

## 🚀 Deployment Architecture

### Development Environment

```
Local Development → SQLite Database → File-based Logging → 
Direct Model API Calls → Hot Reloading
```

### Production Environment

```
Load Balancer → Multiple FastAPI Instances → PostgreSQL Database → 
Centralized Logging → Monitoring & Alerting
```

### Container Architecture

```dockerfile
# Multi-stage build for optimization
FROM python:3.11-slim as base
# Dependencies and application setup
# Health checks and graceful shutdown
# Environment-specific configurations
```

## 🔄 Integration Patterns

### External Service Integration

1. **AI Model Providers**:
   - Anthropic (Claude)
   - OpenAI (GPT models)
   - Unified interface through DSPy

2. **Database Systems**:
   - PostgreSQL (production)
   - SQLite (development)
   - Migration support through Alembic

### Frontend Integration

1. **REST API**:
   - Standard HTTP endpoints
   - JSON request/response format
   - Session-based communication

2. **Data Exchange**:
   - File upload capabilities
   - Real-time analysis results
   - Report generation and download

### Third-Party Integration

1. **Python Data Science Stack**:
   - Pandas for data manipulation
   - NumPy for numerical computing
   - Scikit-learn for machine learning
   - Plotly for visualization
   - Statsmodels for statistical analysis

2. **Development Tools**:
   - Alembic for database migrations
   - SQLAlchemy for ORM
   - FastAPI for web framework
   - Pydantic for data validation

## 📝 Documentation Architecture

### API Documentation

1. **Auto-generated Docs**: Available at `/docs` endpoint
2. **Schema Definitions**: Pydantic models with descriptions
3. **Endpoint Documentation**: Detailed parameter and response docs

### Code Documentation

1. **Inline Documentation**: Comprehensive docstrings
2. **Architecture Guides**: High-level system design documentation
3. **Getting Started**: Developer onboarding documentation
4. **Troubleshooting**: Common issues and solutions

This architecture provides a robust, scalable foundation for multi-agent AI analysis while maintaining clean separation of concerns and supporting both development and production deployment scenarios. 