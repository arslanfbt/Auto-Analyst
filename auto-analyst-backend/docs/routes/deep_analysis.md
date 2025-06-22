# Deep Analysis API Documentation

## Overview

The Deep Analysis system provides advanced multi-agent analytical capabilities that automatically generate comprehensive reports based on user goals. The system uses DSPy (Declarative Self-improving Language Programs) to orchestrate multiple AI agents and create detailed analytical insights.

## Key Features

- **Multi-Agent Analysis**: Orchestrates multiple specialized agents (preprocessing, statistical analysis, machine learning, visualization)
- **Template Integration**: Uses the user's active templates/agents for analysis
- **Streaming Progress**: Real-time progress updates during analysis execution
- **Report Persistence**: Stores complete analysis reports in database with metadata
- **HTML Export**: Generates downloadable HTML reports with visualizations
- **Credit Tracking**: Monitors token usage, costs, and credits consumed

## Template Integration

The deep analysis system integrates with the user's active templates through the agent system:

1. **Agent Selection**: Uses agents from the user's active template preferences (configured via `/templates` endpoints)
2. **Default Agents**: Falls back to system default agents if user hasn't configured preferences:
   - `preprocessing` (both individual and planner variants)
   - `statistical_analytics` (both individual and planner variants) 
   - `sk_learn` (both individual and planner variants)
   - `data_viz` (both individual and planner variants)
3. **Template Limits**: Respects the 10-template limit for planner performance optimization
4. **Dynamic Planning**: The planner automatically selects the most appropriate agents based on the analysis goal and available templates

## Analysis Flow

The deep analysis process follows these steps:

1. **Question Generation** (20% progress): Generates 5 targeted analytical questions based on the user's goal
2. **Planning** (40% progress): Creates an optimized execution plan using available agents
3. **Agent Execution** (60% progress): Executes analysis using user's active templates
4. **Code Synthesis** (80% progress): Combines and optimizes code from all agents
5. **Code Execution** (85% progress): Runs the synthesized analysis code
6. **Synthesis** (90% progress): Synthesizes results into coherent insights
7. **Conclusion** (100% progress): Generates final conclusions and recommendations

---

## API Endpoints

### Create Deep Analysis Report

**POST** `/deep_analysis/reports`

Creates a new deep analysis report in the database.

**Request Body:**
```json
{
  "report_uuid": "string",
  "user_id": 123,
  "goal": "Analyze customer churn patterns",
  "status": "completed",
  "deep_questions": "1. What factors...\n2. How does...",
  "deep_plan": "{\n  \"@preprocessing\": {\n    \"create\": [...],\n    \"use\": [...],\n    \"instruction\": \"...\"\n  }\n}",
  "summaries": ["Agent summary 1", "Agent summary 2"],
  "analysis_code": "import pandas as pd\n# Analysis code...",
  "plotly_figures": [{"data": [...], "layout": {...}}],
  "synthesis": ["Synthesis result 1"],
  "final_conclusion": "## Conclusion\nThe analysis reveals...",
  "html_report": "<html>...</html>",
  "report_summary": "Brief summary of findings",
  "progress_percentage": 100,
  "duration_seconds": 120,
  "credits_consumed": 5,
  "error_message": null,
  "model_provider": "anthropic",
  "model_name": "claude-sonnet-4-20250514",
  "total_tokens_used": 15000,
  "estimated_cost": 0.25,
  "steps_completed": ["questions", "planning", "execution", "synthesis", "conclusion"]
}
```

**Response:**
```json
{
  "report_id": 1,
  "report_uuid": "uuid-string",
  "user_id": 123,
  "goal": "Analyze customer churn patterns",
  "status": "completed",
  "start_time": "2024-01-01T12:00:00Z",
  "end_time": "2024-01-01T12:02:00Z",
  "duration_seconds": 120,
  "report_summary": "Brief summary of findings",
  "created_at": "2024-01-01T12:02:00Z",
  "updated_at": "2024-01-01T12:02:00Z"
}
```

### Get Deep Analysis Reports

**GET** `/deep_analysis/reports`

Retrieves a list of deep analysis reports with optional filtering.

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `limit` (optional): Number of reports to return (1-100, default: 10)
- `offset` (optional): Number of reports to skip (default: 0)
- `status` (optional): Filter by status ("pending", "running", "completed", "failed")

**Response:**
```json
[
  {
    "report_id": 1,
    "report_uuid": "uuid-string",
    "user_id": 123,
    "goal": "Analyze customer churn patterns",
    "status": "completed",
    "start_time": "2024-01-01T12:00:00Z",
    "end_time": "2024-01-01T12:02:00Z",
    "duration_seconds": 120,
    "report_summary": "Brief summary of findings",
    "created_at": "2024-01-01T12:02:00Z",
    "updated_at": "2024-01-01T12:02:00Z"
  }
]
```

### Get User Historical Reports

**GET** `/deep_analysis/reports/user_historical`

Retrieves all historical deep analysis reports for a specific user.

**Query Parameters:**
- `user_id`: User ID (required)
- `limit` (optional): Number of reports to return (1-100, default: 50)

### Get Report by ID

**GET** `/deep_analysis/reports/{report_id}`

Retrieves a complete deep analysis report by ID.

**Query Parameters:**
- `user_id` (optional): Ensures report belongs to specified user

**Response:**
```json
{
  "report_id": 1,
  "report_uuid": "uuid-string",
  "user_id": 123,
  "goal": "Analyze customer churn patterns",
  "status": "completed",
  "start_time": "2024-01-01T12:00:00Z",
  "end_time": "2024-01-01T12:02:00Z",
  "duration_seconds": 120,
  "deep_questions": "1. What factors contribute to churn?\n2. How does churn vary by segment?",
  "deep_plan": "{\n  \"@preprocessing\": {...},\n  \"@statistical_analytics\": {...}\n}",
  "summaries": ["Agent performed data cleaning...", "Statistical analysis revealed..."],
  "analysis_code": "import pandas as pd\n# Complete analysis code",
  "plotly_figures": [{"data": [...], "layout": {...}}],
  "synthesis": ["The analysis shows clear patterns..."],
  "final_conclusion": "## Conclusion\nCustomer churn is primarily driven by...",
  "html_report": "<html>...</html>",
  "report_summary": "Analysis of customer churn patterns reveals...",
  "progress_percentage": 100,
  "credits_consumed": 5,
  "error_message": null,
  "model_provider": "anthropic",
  "model_name": "claude-sonnet-4-20250514",
  "total_tokens_used": 15000,
  "estimated_cost": 0.25,
  "steps_completed": ["questions", "planning", "execution", "synthesis", "conclusion"],
  "created_at": "2024-01-01T12:02:00Z",
  "updated_at": "2024-01-01T12:02:00Z"
}
```

### Get Report by UUID

**GET** `/deep_analysis/reports/uuid/{report_uuid}`

Retrieves a complete deep analysis report by UUID. Same response format as get by ID.

### Delete Report

**DELETE** `/deep_analysis/reports/{report_id}`

Deletes a deep analysis report.

**Query Parameters:**
- `user_id` (optional): Ensures report belongs to specified user

**Response:**
```json
{
  "message": "Report 1 deleted successfully"
}
```

### Update Report Status

**PUT** `/deep_analysis/reports/{report_id}/status`

Updates the status of a deep analysis report.

**Request Body:**
```json
{
  "status": "completed"
}
```

**Valid Status Values:**
- `pending`: Analysis queued but not started
- `running`: Analysis in progress
- `completed`: Analysis finished successfully
- `failed`: Analysis encountered errors

### Get HTML Report

**GET** `/deep_analysis/reports/uuid/{report_uuid}/html`

Retrieves only the HTML report content for a specific analysis.

**Query Parameters:**
- `user_id` (optional): Ensures report belongs to specified user

**Response:**
```json
{
  "html_report": "<html>...</html>",
  "filename": "deep_analysis_report_20240101_120200.html"
}
```

### Download HTML Report

**POST** `/deep_analysis/download_from_db/{report_uuid}`

Downloads the HTML report as a file attachment.

**Query Parameters:**
- `user_id` (optional): Ensures report belongs to specified user

**Response:**
- Content-Type: `text/html; charset=utf-8`
- Content-Disposition: `attachment; filename="deep_analysis_report_TIMESTAMP.html"`

---

## Deep Analysis Module Architecture

### DSPy Signatures

The system uses several DSPy signatures for different analysis phases:

#### 1. `deep_questions`
Generates 5 targeted analytical questions based on the user's goal and dataset structure.

#### 2. `deep_planner` 
Creates an optimized execution plan using the user's active templates/agents. The planner:
- Verifies feasibility using available datasets and agent descriptions
- Batches similar questions per agent call for efficiency
- Reuses outputs across questions to minimize agent calls
- Defines clear variable flow and dependencies between agents

#### 3. `deep_code_synthesizer`
Combines and optimizes code from multiple agents:
- Fixes errors and inconsistencies between agent outputs
- Ensures proper data flow and type handling
- Converts all visualizations to Plotly format
- Adds comprehensive error handling and validation

#### 4. `deep_synthesizer`
Synthesizes analysis results into coherent insights and findings.

#### 5. `final_conclusion`
Generates final conclusions and strategic recommendations based on all analysis results.

### Streaming Analysis

The `execute_deep_analysis_streaming` method provides real-time progress updates:

```python
async for update in deep_analysis.execute_deep_analysis_streaming(goal, dataset_info, session_df):
    if update["step"] == "questions":
        # Handle questions generation progress
    elif update["step"] == "planning":
        # Handle planning progress
    elif update["step"] == "agent_execution":
        # Handle agent execution progress
    # ... handle other steps
```

### Integration with User Templates

The deep analysis system integrates with user templates in several ways:

1. **Agent Discovery**: Retrieves user's active template preferences from the database
2. **Dynamic Planning**: The planner uses available agents to create optimal execution plans
3. **Template Validation**: Ensures all referenced agents exist in the user's active templates
4. **Fallback Handling**: Uses default agents if user preferences are incomplete
5. **Performance Optimization**: Respects template limits for efficient execution

### Error Handling

The system includes comprehensive error handling:

- **Code Execution Errors**: Automatically attempts to fix and retry failed code
- **Template Missing**: Falls back to default agents if user templates are unavailable
- **Timeout Protection**: Includes timeouts for long-running operations
- **Memory Management**: Handles large datasets and visualization efficiently
- **Unicode Handling**: Cleans problematic characters that might cause encoding issues

### Visualization Integration

All visualizations are standardized to Plotly format:
- Consistent styling and color schemes
- Interactive features (zoom, pan, hover)
- Accessibility compliance (colorblind-friendly palettes)
- Export capabilities for reports
- Responsive design for different screen sizes

---

## Frontend Integration

The deep analysis system includes React components for:

- **DeepAnalysisSidebar**: Main interface for starting and managing analyses
- **NewAnalysisForm**: Form for initiating new deep analyses
- **CurrentAnalysisView**: Real-time progress tracking during analysis
- **HistoryView**: Browse and access historical analysis reports
- **AnalysisStep**: Individual step progress visualization

The frontend integrates with the streaming API to provide real-time feedback and uses the user's active template configuration for personalized analysis capabilities.

## Credit and Cost Tracking

The system tracks detailed usage metrics:
- **Credits Consumed**: Number of credits deducted from user account
- **Token Usage**: Total tokens used across all model calls
- **Estimated Cost**: Dollar cost estimate based on model pricing
- **Model Information**: Provider and model name used for analysis
- **Execution Time**: Duration of analysis for performance monitoring

This information helps users understand resource consumption and optimize their analysis strategies. 