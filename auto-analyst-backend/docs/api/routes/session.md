# **Auto-Analyst API Documentation**

The core application routes are designed to manage the data and AI analysis capabilities of the Auto-Analyst application.

## **1. Core Application Routes**
### **Data Management**

#### **POST /upload_dataframe**  
Uploads a CSV dataset for analysis.  
**Request:**  
- `file`: CSV file  
- `name`: Dataset name  
- `description`: Dataset description  
**Headers:**
- `X-Force-Refresh`: "true" (optional) - Forces session reset before upload
**Response:**  
```json
{ "message": "Dataframe uploaded successfully", "session_id": "abc123" }
```

#### **POST /upload_excel**  
Uploads an Excel file with a specific sheet for analysis.  
**Request:**  
- `file`: Excel file  
- `name`: Dataset name  
- `description`: Dataset description  
- `sheet_name`: Name of the Excel sheet to use
**Headers:**
- `X-Force-Refresh`: "true" (optional) - Forces session reset before upload
**Response:**  
```json
{ "message": "Excel file processed successfully", "session_id": "abc123", "sheet": "Sheet1" }
```

#### **POST /api/excel-sheets**  
Gets the list of sheet names from an Excel file.  
**Request:**  
- `file`: Excel file  
**Response:**  
```json
{ "sheets": ["Sheet1", "Sheet2", "Data"] }
```

#### **GET /api/default-dataset**  
Gets the default dataset.  
**Response:**  
```json
{
  "headers": ["column1", "column2", ...],
  "rows": [[val1, val2, ...], ...],
  "name": "Housing Dataset",
  "description": "A comprehensive dataset containing housing information..."
}
```

#### **POST /reset-session**  
Resets session to default dataset.  
**Request Body:**  
```json
{
  "name": "optional name",
  "description": "optional description",
  "preserveModelSettings": false
}
```
**Response:**  
```json
{
  "message": "Session reset to default dataset",
  "session_id": "abc123",
  "dataset": "Housing.csv"
}
```

#### **GET /api/preview-csv** / **POST /api/preview-csv**  
Preview the current dataset in the session.
**Response:**  
```json
{
  "headers": ["column1", "column2", ...],
  "rows": [[val1, val2, ...], ...],
  "name": "Dataset Name",
  "description": "Dataset description..."
}
```

---

### **2. AI Analysis**

#### **POST /chat/{agent_name}**  
Processes a query using a specific AI agent.  
**Path Parameters:** `agent_name`  
**Request Body:**  
```json
{ "query": "Analyze the relationship between price and size" }
```
**Query Parameters:** `user_id` (optional), `chat_id` (optional)  
**Response:**  
```json
{
  "agent_name": "data_viz_agent",
  "query": "Analyze the relationship between price and size",
  "response": "# Analysis\n\nThere appears to be a strong positive correlation...",
  "session_id": "abc123"
}
```

#### **POST /chat**  
Processes a query using multiple AI agents with streaming responses.  
**Request Body:**  
```json
{ "query": "Analyze the housing data" }
```
**Query Parameters:** `user_id` (optional), `chat_id` (optional)  
**Response:** *Streaming JSON objects:*  
```json
{"agent": "data_viz_agent", "content": "# Visualization\n\n...", "status": "success"}
{"agent": "statistical_analytics_agent", "content": "# Statistical Analysis\n\n...", "status": "success"}
```

#### **POST /chat_history_name**  
Generates a name for a chat based on the query.  
**Request Body:**  
```json
{ "query": "Analyze sales data for Q4" }
```
**Response:**  
```json
{ "name": "Chat about sales data analysis" }
```

#### **GET /agents**  
Lists available AI agents.  
**Response:**  
```json
{
  "available_agents": ["data_viz_agent", "sk_learn_agent", "statistical_analytics_agent", "preprocessing_agent"],
  "standard_agents": ["preprocessing_agent", "statistical_analytics_agent", "sk_learn_agent", "data_viz_agent"],
  "template_agents": ["custom_template_1", "custom_template_2"],
  "custom_agents": []
}
```

---

### **3. Deep Analysis**

#### **POST /deep_analysis_streaming**  
Performs comprehensive deep analysis with real-time streaming updates.  
**Request Body:**  
```json
{ "goal": "Perform comprehensive analysis of the sales data" }
```
**Query Parameters:** `user_id` (optional), `chat_id` (optional)  
**Response:** *Streaming JSON objects with progress updates*

#### **POST /deep_analysis/download_report**  
Downloads an HTML report from deep analysis results.  
**Request Body:**  
```json
{
  "analysis_data": { ... },
  "report_uuid": "optional-uuid"
}
```
**Response:** HTML file download

---

### **4. Model Settings**

#### **GET /api/model-settings**  
Fetches current model settings.  
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

#### **POST /settings/model**  
Updates model settings.  
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

---

### **5. Session Management**

#### **GET /api/session-info**  
Gets information about the current session.  
**Response:**  
```json
{
  "session_id": "abc123",
  "dataset_name": "Housing Dataset",
  "dataset_description": "...",
  "model_config": { ... }
}
```

#### **POST /set-message-info**  
Associates message tracking information with the session.  
**Request Body:**  
```json
{
  "chat_id": 123,
  "message_id": 456,
  "user_id": 789
}
```

#### **POST /create-dataset-description**  
Creates an AI-generated description for a dataset.  
**Request Body:**  
```json
{
  "df_preview": "column1,column2\nvalue1,value2\n...",
  "name": "Dataset Name"
}
```

---

### **6. System Endpoints**

#### **GET /**  
Returns API welcome information and feature list.

#### **GET /health**  
Health check endpoint.  
**Response:**  
```json
{ "message": "API is healthy and running" }
```

---

### **7. Debug Endpoints**

#### **GET /debug/deep_analysis_agents**  
Debug information about deep analysis agents for a session.

#### **POST /debug/clear_deep_analyzer**  
Clears the deep analyzer cache for a session.

---

### **8. Authentication & Session Management**
- **Session ID Sources:**  
  - Query parameter: `session_id`  
  - Header: `X-Session-ID`  
  - Auto-generated if not provided  
- **Session State Includes:**  
  - Current dataset  
  - AI system instance  
  - Model configuration  
  - User and chat associations

### **9. Error Handling**
- Comprehensive error handling with appropriate HTTP status codes
- Detailed error messages for debugging
- Fallback encoding support for CSV files (UTF-8, unicode_escape, ISO-8859-1)
- Session state preservation during errors
