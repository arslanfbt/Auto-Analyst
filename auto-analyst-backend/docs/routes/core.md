
# **Auto-Analyst API Documentation**

The core application routes are designed to manage the data and AI analysis capabilities of the Auto-Analyst application.

## **1. Core Application Routes**
### **Data Management**
- **POST /upload_dataframe**  
  **Uploads a dataset for analysis.**  
  **Request:**  
  - `file`: CSV file  
  - `name`: Dataset name  
  - `description`: Dataset description  
  - `session_id`: Session ID  
  **Response:**  
  ```json
  { "message": "Dataframe uploaded successfully", "session_id": "abc123" }
  ```
  **Process Flow:**  
  - Read CSV file  
  - Create dataset description  
  - Update session with dataset  
  - Return success message  

- **GET /api/default-dataset**  
  **Gets the default dataset.**  
  **Query Parameters:** `session_id`  
  **Response:**  
  ```json
  {
    "headers": ["column1", "column2", ...],
    "rows": [[val1, val2, ...], ...],
    "name": "Housing Dataset",
    "description": "A comprehensive dataset containing housing information..."
  }
  ```
  **Process Flow:**  
  - Reset session to use default dataset  
  - Format dataset preview  
  - Return formatted data  

- **POST /reset-session**  
  **Resets session to default dataset.**  
  **Query Parameters:** `session_id`, `name` (optional), `description` (optional)  
  **Response:**  
  ```json
  {
    "message": "Session reset to default dataset",
    "session_id": "abc123",
    "dataset": "Housing.csv"
  }
  ```
  **Process Flow:**  
  - Reset session  
  - Update dataset description (if provided)  
  - Return success message  

---

### **2. AI Analysis**
- **POST /chat/{agent_name}**  
  **Processes a query using a specific AI agent.**  
  **Path Parameters:** `agent_name`  
  **Request Body:**  
  ```json
  { "query": "Analyze the relationship between price and size" }
  ```
  **Query Parameters:** `session_id`, `user_id` (optional), `chat_id` (optional)  
  **Response:**  
  ```json
  {
    "agent_name": "data_viz_agent",
    "query": "Analyze the relationship between price and size",
    "response": "# Analysis\n\nThere appears to be a strong positive correlation...",
    "session_id": "abc123"
  }
  ```
  **Process Flow:**  
  - Get session state  
  - Validate dataset and agent  
  - Execute agent query  
  - Format and return response  

- **POST /chat**  
  **Processes a query using multiple AI agents.**  
  **Request Body:**  
  ```json
  { "query": "Analyze the housing data" }
  ```
  **Response:** *Streaming JSON objects:*  
  ```json
  {"agent": "data_viz_agent", "content": "# Visualization\n\n...", "status": "success"}
  {"agent": "statistical_analytics_agent", "content": "# Statistical Analysis\n\n...", "status": "success"}
  ```
  **Process Flow:**  
  - Get session state  
  - Validate dataset  
  - Generate AI analysis plan  
  - Execute with multiple agents and stream responses  

- **POST /execute_code**  
  **Executes Python code and returns results.**  
  **Request Body:**  
  ```json
  { "code": "import pandas as pd\nimport matplotlib.pyplot as plt\n..." }
  ```
  **Response:**  
  ```json
  {
    "output": "Execution successful",
    "plotly_outputs": ["```plotly\n{\"data\": [...], \"layout\": {...}}\n```"]
  }
  ```
  **Process Flow:**  
  - Validate dataset  
  - Execute code  
  - Capture output and plots  
  - Return results  

---

### **3. Model Settings**
- **GET /api/model-settings**  
  **Fetches current model settings.**  
  **Response:**  
  ```json
  {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "hasCustomKey": true,
    "temperature": 1.0,
    "maxTokens": 6000
  }
  ```
- **POST /settings/model**  
  **Updates model settings.**  
  **Request Body:**  
  ```json
  {
    "provider": "openai",
    "model": "gpt-4",
    "api_key": "sk-...",
    "temperature": 0.7,
    "max_tokens": 8000
  }
  ```
  **Response:**  
  ```json
  { "message": "Model settings updated successfully" }
  ```
  **Process Flow:**  
  - Update model settings  
  - Test configuration  
  - Return success or error  

- **GET /agents**  
  **Lists available AI agents.**  
  **Response:**  
  ```json
  {
    "available_agents": ["data_viz_agent", "sk_learn_agent", "statistical_analytics_agent", "preprocessing_agent"],
    "description": "List of available specialized agents that can be called using @agent_name"
  }
  ```

---

### **4. Authentication & Session Management**
- **Session ID Sources:**  
  - Query parameter: `session_id`  
  - Header: `X-Session-ID`  
  - Auto-generated if not provided  
- **Session State Includes:**  
  - Current dataset  
  - AI system instance  
  - Model configuration  

#### **Admin Authentication**
- **API Key Sources:**  
  - Header: `X-Admin-API-Key`  
  - Query Parameter: `admin_api_key`  
- **Validation:**  
  - Checked against `ADMIN_API_KEY` environment variable  

---

### **5. AI Agents Integration**
- **Available Agents:**  
  - `data_viz_agent`: Creates data visualizations (Plotly)  
  - `sk_learn_agent`: ML analysis (Scikit-learn)  
  - `statistical_analytics_agent`: Statistical analysis (StatsModels)  
  - `preprocessing_agent`: Data transformation  

**Integration Flow:**  
- Agents are registered in `AVAILABLE_AGENTS`  
- Queries are dispatched based on content  
- Responses are streamed in Markdown  

---

### **6. Real-time Updates via WebSockets**
- **Endpoints:**  
  - `/analytics/dashboard/realtime`  
  - `/analytics/realtime`  
- **Connections stored in:**  
  - `active_dashboard_connections`  
  - `active_user_connections`  
- **Broadcast Function:**
  ```python
  async def broadcast_dashboard_update(update_data: Dict[str, Any]):
      for connection in active_dashboard_connections.copy():
          try:
              await connection.send_text(json.dumps(update_data))
          except Exception:
              active_dashboard_connections.remove(connection)
  ```

---

### **7. Error Handling**
- **Try-Except Blocks:**  
  ```python
  try:
      return result
  except ValueError as e:
      raise HTTPException(status_code=404, detail=str(e))
  except Exception as e:
      logger.error(f"Error: {str(e)}")
      raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
  ```
- **HTTP Exception Types:**  
  - `400`: Bad Request  
  - `401`: Unauthorized  
  - `403`: Forbidden  
  - `404`: Not Found  
  - `500`: Internal Server Error  

- **Logging Setup:**  
  ```python
  logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
  logger = logging.getLogger(__name__)
  ```
