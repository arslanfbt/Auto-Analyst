# Analytics Routes Documentation

These routes provide comprehensive analytics functionality for the Auto-Analyst backend, including dashboard summaries, user analytics, model performance metrics, cost analysis, and system monitoring.

## Authentication

All analytics endpoints require admin authentication via API key:

```python
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "default-admin-key-change-me")
```

The API key can be provided via:
- **Header:** `X-Admin-API-Key`
- **Query parameter:** `admin_api_key`

---

## Dashboard Endpoints

### **GET /analytics/dashboard**
Returns comprehensive dashboard data combining usage statistics, model performance, and user activity.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "total_tokens": 123456,
  "total_cost": 25.50,
  "total_requests": 1000,
  "total_users": 50,
  "daily_usage": [
    {
      "date": "2023-05-01",
      "tokens": 5000,
      "cost": 1.25,
      "requests": 100
    }
  ],
  "model_usage": [
    {
      "model_name": "claude-3-sonnet-20241022",
      "tokens": 10000,
      "cost": 10.00,
      "requests": 200
    }
  ],
  "top_users": [
    {
      "user_id": "123",
      "tokens": 5000,
      "cost": 5.00,
      "requests": 50
    }
  ],
  "start_date": "2023-04-01",
  "end_date": "2023-05-01"
}
```

### **WebSocket /analytics/dashboard/realtime**
WebSocket endpoint for real-time dashboard updates. Accepts connections and maintains them for broadcasting live data updates.

---

## User Analytics Endpoints

### **GET /analytics/users**
Returns user list with usage statistics from the past 7 days.

**Query Parameters:**
- `limit` (optional): Maximum users to return (default: `100`)
- `offset` (optional): Pagination offset (default: `0`)

**Response:**
```json
{
  "users": [
    {
      "user_id": "123",
      "tokens": 5000,
      "cost": 5.00,
      "requests": 50,
      "first_seen": "2023-04-01T12:00:00Z",
      "last_seen": "2023-05-01T12:00:00Z"
    }
  ],
  "total": 200,
  "limit": 100,
  "offset": 0
}
```

### **GET /analytics/users/activity**
Returns daily user activity metrics with new user tracking.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "user_activity": [
    {
      "date": "2023-05-01",
      "activeUsers": 20,
      "newUsers": 5,
      "sessions": 30
    }
  ]
}
```

### **GET /analytics/users/sessions/stats**
Returns session statistics including total users, active users today, average queries per session, and average session time.

**Response:**
```json
{
  "totalUsers": 500,
  "activeToday": 25,
  "avgQueriesPerSession": 3.2,
  "avgSessionTime": 300
}
```

### **WebSocket /analytics/realtime**
WebSocket endpoint for real-time user analytics updates.

---

## Model Analytics Endpoints

### **GET /analytics/usage/models**
Returns model usage breakdown with performance metrics.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "model_usage": [
    {
      "model_name": "claude-3-sonnet-20241022",
      "tokens": 10000,
      "cost": 10.00,
      "requests": 200,
      "avg_response_time": 1.5
    }
  ]
}
```

### **GET /analytics/models/history**
Returns daily model usage history with trend data.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "model_history": [
    {
      "date": "2023-05-01",
      "models": [
        {
          "name": "claude-3-sonnet-20241022",
          "tokens": 5000,
          "requests": 100
        }
      ]
    }
  ]
}
```

### **GET /analytics/models/metrics**
Returns model performance metrics including success rates and response times.

**Response:**
```json
{
  "model_metrics": [
    {
      "name": "claude-3-sonnet-20241022",
      "avg_tokens": 250.5,
      "avg_response_time": 1.2,
      "success_rate": 0.95
    }
  ]
}
```

---

## Cost Analytics Endpoints

### **GET /analytics/costs/summary**
Returns cost summary with averages and totals.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "totalCost": 25.50,
  "totalTokens": 100000,
  "totalRequests": 1000,
  "avgDailyCost": 0.85,
  "costPerThousandTokens": 0.255,
  "daysInPeriod": 30,
  "startDate": "2023-04-01",
  "endDate": "2023-05-01"
}
```

### **GET /analytics/costs/daily**
Returns daily cost breakdown with filled gaps for missing dates.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "daily_costs": [
    {
      "date": "2023-05-01",
      "cost": 1.25,
      "tokens": 5000
    }
  ]
}
```

### **GET /analytics/costs/models**
Returns cost breakdown by model.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "model_costs": [
    {
      "model_name": "claude-3-sonnet-20241022",
      "cost": 15.50,
      "tokens": 50000,
      "requests": 500
    }
  ]
}
```

### **GET /analytics/costs/projections**
Returns cost projections based on last 30 days usage.

**Response:**
```json
{
  "nextMonth": 75.00,
  "next3Months": 225.00,
  "nextYear": 900.00,
  "tokensNextMonth": 300000,
  "dailyCost": 2.50,
  "dailyTokens": 10000,
  "baselineDays": 30
}
```

### **GET /analytics/costs/today**
Returns today's cost data.

**Response:**
```json
{
  "date": "2023-05-01",
  "cost": 2.50,
  "tokens": 10000,
  "requests": 100
}
```

---

## Tier Analytics Endpoints

### **GET /analytics/tiers/usage**
Returns usage data categorized by model tiers with aggregated statistics.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "tier_data": {
    "tier_1": {
      "name": "Basic",
      "credits": 1,
      "total_tokens": 50000,
      "total_requests": 500,
      "total_cost": 5.00,
      "avg_tokens_per_query": 100,
      "cost_per_1k_tokens": 0.10,
      "total_credit_cost": 500,
      "cost_per_credit": 0.01,
      "models": [...]
    }
  },
  "period": "30d",
  "start_date": "2023-04-01",
  "end_date": "2023-05-01"
}
```

### **GET /analytics/tiers/projections**
Returns tier-based cost and usage projections.

**Response:**
```json
{
  "daily_usage": {...},
  "projections": {
    "monthly": {...},
    "quarterly": {...},
    "yearly": {...}
  },
  "tier_definitions": {...}
}
```

### **GET /analytics/tiers/efficiency**
Returns efficiency metrics by tier including cost per credit and tokens per credit.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "efficiency_data": {...},
  "most_efficient_tier": "tier_2",
  "best_value_tier": "tier_1",
  "period": "30d",
  "start_date": "2023-04-01",
  "end_date": "2023-05-01"
}
```

---

## Code Execution Analytics Endpoints

### **GET /analytics/code-executions/summary**
Returns code execution statistics including success rates and model performance.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "period": "30d",
  "start_date": "2023-04-01",
  "end_date": "2023-05-01",
  "overall_stats": {
    "total_executions": 1000,
    "successful_executions": 950,
    "failed_executions": 50,
    "success_rate": 0.95,
    "total_users": 100,
    "total_chats": 200
  },
  "model_performance": [...],
  "failed_agents": [...]
}
```

### **GET /analytics/code-executions/detailed**
Returns detailed code execution records with filtering options.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)
- `success_filter` (optional): Filter by success status (boolean)
- `user_id` (optional): Filter by user ID
- `model_name` (optional): Filter by model name
- `limit` (optional): Maximum results (default: `100`)

**Response:**
```json
{
  "period": "30d",
  "start_date": "2023-04-01", 
  "end_date": "2023-05-01",
  "count": 50,
  "executions": [...]
}
```

### **GET /analytics/code-executions/users**
Returns code execution statistics grouped by user.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)
- `limit` (optional): Maximum users (default: `50`)

**Response:**
```json
{
  "period": "30d",
  "start_date": "2023-04-01",
  "end_date": "2023-05-01", 
  "users": [...]
}
```

### **GET /analytics/code-executions/error-analysis**
Returns error analysis with categorized error types and agent failure patterns.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "period": "30d",
  "start_date": "2023-04-01",
  "end_date": "2023-05-01",
  "total_failed_executions": 50,
  "error_types": [...],
  "error_by_agent": [...]
}
```

---

## Feedback Analytics Endpoints

### **GET /analytics/feedback/summary**
Returns feedback summary statistics including rating distributions and trends.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "period": "30d",
  "start_date": "2023-04-01",
  "end_date": "2023-05-01",
  "total_feedback": 500,
  "avg_rating": 4.2,
  "chats_with_feedback": 200,
  "ratings_distribution": [
    {"rating": 1, "count": 10},
    {"rating": 2, "count": 20},
    {"rating": 3, "count": 50},
    {"rating": 4, "count": 200},
    {"rating": 5, "count": 220}
  ],
  "models_data": [...],
  "feedback_trend": [...]
}
```

### **GET /analytics/feedback/detailed**
Returns detailed feedback records with filtering and pagination.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)
- `min_rating` (optional): Minimum rating filter
- `max_rating` (optional): Maximum rating filter  
- `model_name` (optional): Filter by model name
- `limit` (optional): Maximum results (default: `100`)
- `offset` (optional): Pagination offset (default: `0`)

**Response:**
```json
{
  "period": "30d",
  "start_date": "2023-04-01",
  "end_date": "2023-05-01", 
  "total": 500,
  "count": 100,
  "offset": 0,
  "limit": 100,
  "feedback": [...]
}
```

---

## Public Endpoints

### **GET /analytics/public/ticker**
Returns public ticker data for landing page statistics. **No authentication required.**

**Response:**
```json
{
  "total_signups": 1000,
  "total_tokens": 5000000,
  "total_requests": 50000,
  "last_updated": "2023-05-01T12:00:00Z"
}
```

---

## Utility Endpoints

### **GET /analytics/usage/summary**
Returns overall usage summary (legacy endpoint, calls dashboard with 30d period).

### **GET /analytics/debug/model_usage**
Debug endpoint for testing admin API key validation.

**Response:**
```json
{
  "status": "success",
  "message": "Admin API key validated successfully"
}
```

---

## Error Categorization

The system automatically categorizes code execution errors into the following types:

- **NameError**: Variable or function name not found
- **SyntaxError**: Invalid Python syntax
- **TypeError**: Type-related errors
- **AttributeError**: Attribute access errors
- **IndexError/KeyError**: Index or key access errors
- **ImportError**: Module import errors
- **ValueError**: Invalid values passed to functions
- **OperationError**: Unsupported operations
- **IndentationError**: Python indentation errors
- **PermissionError**: File/system permission errors
- **FileNotFoundError**: File access errors
- **MemoryError**: Memory allocation errors
- **TimeoutError**: Operation timeout errors
- **OtherError**: Uncategorized errors

## Real-time Updates

The analytics system supports real-time updates through WebSocket connections:

- **Dashboard updates**: Broadcasted when new model usage is recorded
- **User activity updates**: Broadcasted for user activity changes
- **Model performance updates**: Broadcasted for model-specific metrics

All real-time updates are sent as JSON messages with `type` field indicating the update category and `metrics` containing the delta or new values.
