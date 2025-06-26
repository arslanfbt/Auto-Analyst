# **Auto-Analyst Backend API Overview**  

The **Auto-Analyst** backend provides a comprehensive API for data analysis, AI-powered insights, and real-time analytics. The API is organized into specialized route categories, each documented separately for better modularity:  

1. **[Core Application Routes](auto-analyst-backend/docs/api/routes/session.md)** – Data management, session control, model configurations, and basic AI analysis.  
2. **[Chat Management Routes](auto-analyst-backend/docs/api/routes/chats.md)** – Chat sessions, message handling, and user management.  
3. **[Code Execution Routes](auto-analyst-backend/docs/api/routes/code.md)** – Python code execution, editing, fixing, and cleaning operations.  
4. **[Deep Analysis Routes](auto-analyst-backend/docs/api/routes/deep_analysis.md)** – Advanced multi-agent analysis and comprehensive reporting.  
5. **[Analytics & Monitoring Routes](auto-analyst-backend/docs/api/routes/analytics.md)** – Real-time dashboards, usage tracking, and system monitoring.  

---

## **1. Core Application Routes**

**Purpose**: Foundation for data management and basic AI analysis  
**Documentation**: [auto-analyst-backend/docs/api/routes/session.md](auto-analyst-backend/docs/api/routes/session.md)

**Key Features**:
- **Data Management**: Upload CSV/Excel files, preview datasets, reset sessions
- **AI Analysis**: Query processing with specialized agents (data_viz, sk_learn, statistical_analytics, preprocessing)
- **Model Settings**: Configure AI providers, models, temperature, and token limits
- **Session Management**: Track user interactions and maintain analysis context

**Available AI Agents**:
- `data_viz_agent`: Creates visualizations using Plotly
- `sk_learn_agent`: Performs machine learning analysis with Scikit-learn
- `statistical_analytics_agent`: Conducts statistical analysis using StatsModels
- `preprocessing_agent`: Handles data preprocessing and transformation

---

## **2. Chat Management Routes**

**Purpose**: Handle chat sessions, messages, and user interactions  
**Documentation**: [auto-analyst-backend/docs/api/routes/chats.md](auto-analyst-backend/docs/api/routes/chats.md)

**Key Features**:
- **Chat Sessions**: Create, retrieve, update, and delete chat conversations
- **Message Management**: Add messages to chats with timestamp tracking
- **User Management**: Create and manage user accounts with email-based identification
- **Cleanup Operations**: Remove empty chats while preserving model usage records

---

## **3. Code Execution Routes**

**Purpose**: Execute, edit, and manage Python code for data analysis  
**Documentation**: [auto-analyst-backend/docs/api/routes/code.md](auto-analyst-backend/docs/api/routes/code.md)

**Key Features**:
- **Code Execution**: Run Python code against session datasets with safety measures
- **AI-Powered Editing**: Modify code based on user instructions using AI
- **Error Fixing**: Automatically fix code errors using DSPy refinement
- **Code Cleaning**: Format and organize imports with proper structure
- **Safety Features**: Remove blocking calls, handle isolated namespaces

---

## **4. Deep Analysis Routes**

**Purpose**: Advanced multi-agent analysis with comprehensive reporting  
**Documentation**: [auto-analyst-backend/docs/api/routes/deep_analysis.md](auto-analyst-backend/docs/api/routes/deep_analysis.md)

**Key Features**:
- **Multi-Agent Orchestration**: Coordinates multiple AI agents for comprehensive analysis
- **Template Integration**: Uses user's active templates and agent preferences
- **Streaming Progress**: Real-time updates during analysis execution
- **Report Generation**: Creates detailed HTML reports with visualizations
- **Credit Tracking**: Monitors token usage, costs, and credits consumed

**Analysis Flow**:
1. Question Generation (20%) → Planning (40%) → Agent Execution (60%)
2. Code Synthesis (80%) → Code Execution (85%) → Synthesis (90%) → Conclusion (100%)

---

## **5. Analytics & Monitoring Routes**

**Purpose**: Real-time monitoring, usage tracking, and system analytics  
**Documentation**: [auto-analyst-backend/docs/api/routes/analytics.md](auto-analyst-backend/docs/api/routes/analytics.md)

**Key Features**:
- **Dashboard Analytics**: Comprehensive usage statistics and performance metrics
- **User Analytics**: Activity tracking, session management, and user behavior
- **Model Analytics**: Performance metrics, success rates, and cost analysis
- **Real-Time Updates**: WebSocket endpoints for live dashboard updates
- **Admin Authentication**: Secure access to analytics data with API key validation

**WebSocket Endpoints**:
- `/analytics/dashboard/realtime` - Live dashboard updates
- `/analytics/realtime` - Real-time user analytics

---

## **Authentication & Security**

- **Session Management**: Sessions track user interactions via `session_id`
- **Admin Access**: Analytics routes require API key authentication (`X-Admin-API-Key`)
- **User Context**: Optional `user_id` parameters for access control and tracking
- **Error Handling**: Standardized HTTP responses (400, 401, 403, 404, 500)

---

## **Common Request Patterns**

- **Query Parameters**: `session_id`, `user_id`, `chat_id` for context management
- **Headers**: `X-Admin-API-Key` for admin routes, `X-Force-Refresh` for data uploads
- **Streaming Responses**: Real-time updates for chat and deep analysis operations
- **File Uploads**: Support for CSV and Excel files with metadata

---

## **Integration Flow**

1. **Data Upload** → Upload CSV/Excel via Core Routes
2. **Chat Creation** → Initialize conversation via Chat Routes  
3. **AI Analysis** → Query agents via Core Routes or trigger Deep Analysis
4. **Code Execution** → Run/edit/fix code via Code Routes
5. **Monitoring** → Track usage and performance via Analytics Routes

For detailed endpoint specifications, request/response examples, and implementation details, refer to the individual route documentation files.
