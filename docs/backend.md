## **Auto-Analyst API Overview**  

The **Auto-Analyst** application provides a structured API for data analysis, AI-powered insights, and real-time analytics. The API is categorized into three main sections, each documented separately for better modularity:  

1. **[Core Application Routes](/auto-analyst-backend/docs/routes/core.md)** – Handles data management, session control, and model configurations.  
2. **[Chat & AI Analysis Routes](/auto-analyst-backend/docs/routes/chats.md)** – Provides AI-driven data insights and supports interaction with multiple specialized AI agents.  
3. **[Analytics & WebSocket Routes](/auto-analyst-backend/docs/routes/analytics.md)** – Manages real-time updates, tracking, and logging of AI model usage.  

---

### **1. Core Application Routes ([auto-analyst-backend/docs/routes/core.md](/auto-analyst-backend/docs/routes/core.md))**  

These routes handle **data management, session handling, and model settings**.  

- **Data Management**  
  - `POST /upload_dataframe`: Uploads a CSV dataset for analysis.  
  - `GET /api/default-dataset`: Retrieves the default dataset for the session.  
  - `POST /reset-session`: Resets the session to use the default dataset.  

- **Model Settings**  
  - `GET /api/model-settings`: Retrieves the current AI model settings.  
  - `POST /settings/model`: Updates model configurations, including provider, temperature, and token limits.  

- **Session Management**  
  - Sessions track user interactions, datasets, and configurations.  
  - Managed using `session_id` (via query parameters or headers).  
  - Admin authentication requires an API key (`X-Admin-API-Key`).  

---

### **2. Chat & AI Analysis Routes ([auto-analyst-backend/docs/routes/chats.md](/auto-analyst-backend/docs/routes/chats.md))**  

These routes provide **AI-powered insights and query handling** using specialized agents.  

- **AI Analysis**  
  - `POST /chat/{agent_name}`: Processes a query using a specified AI agent.  
  - `POST /chat`: Executes a query across multiple AI agents and streams responses.  
  - `POST /execute_code`: Executes Python code for advanced data analysis and visualization.  

- **Available AI Agents**  
  - `data_viz_agent`: Creates visualizations using Plotly.  
  - `sk_learn_agent`: Performs machine learning analysis with Scikit-learn.  
  - `statistical_analytics_agent`: Conducts statistical analysis using StatsModels.  
  - `preprocessing_agent`: Handles data preprocessing and transformation.  

- **Agent Integration Flow**  
  - Queries are dispatched based on intent.  
  - Responses are formatted in Markdown and streamed.  
  - Usage metrics are tracked for model optimization.  

---

### **3. Analytics & WebSocket Routes ([auto-analyst-backend/docs/routes/analytics.md](/auto-analyst-backend/docs/routes/analytics.md))**  

These routes handle **real-time updates, logging, and error tracking**.  

- **Real-Time Updates**  
  - WebSocket endpoints:  
    - `/analytics/dashboard/realtime` (for dashboard updates).  
    - `/analytics/realtime` (for live user updates).  
  - Active connections are managed and updated when new data is available.  

- **Event Handling & Broadcasting**  
  - `broadcast_dashboard_update()`: Sends model usage stats to connected clients.  
  - `broadcast_user_update()`: Updates users on live data analysis.  

- **Error Handling & Logging**  
  - **Try-Except blocks** ensure robust error management.  
  - HTTP error responses (400, 401, 403, 404, 500) are standardized.  
  - Logging tracks system events and AI interactions.  
