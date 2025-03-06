
## Analytics Routes Overview

These routes provide comprehensive analytics functionality for the Auto-Analyst application, including dashboard summaries, user and model analytics, and cost breakdowns.

### Authentication

All analytics endpoints require admin authentication via an API key:

```python
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "default-admin-key-change-me")
```

The API key can be provided via:
- **Header:** `X-Admin-API-Key`
- **Query parameter:** `admin_api_key`

---

### Dashboard Endpoints

#### **GET /analytics/dashboard**
Returns a comprehensive summary of usage data for the dashboard.

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
      "model_name": "gpt-4",
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

**Process Flow:**
1. Parse date range from the `period` parameter.
2. Query total statistics (tokens, cost, requests, users).
3. Query daily usage broken down by date.
4. Query model usage statistics.
5. Query top users by token usage.
6. Return combined data.

---

### WebSocket **/analytics/dashboard/realtime**

WebSocket endpoint for real-time updates to dashboard data.

**Data Flow:**
1. Client connects to WebSocket.
2. Server adds the connection to the active connections set.
3. Server broadcasts updates to all connected clients when new data arrives.
4. Connection is removed when the client disconnects.

---

## User Analytics Endpoints

### **GET /analytics/users**
Returns a list of users with their usage statistics.

**Query Parameters:**
- `limit` (optional): Maximum number of users to return (default: `100`)
- `offset` (optional): Offset for pagination (default: `0`)

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

**Process Flow:**
1. Query user data with aggregated metrics.
2. Calculate total users for pagination.
3. Format and return data.

---

### **GET /analytics/users/activity**
Returns user activity metrics over time.

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

**Process Flow:**
1. Parse date range from `period` parameter.
2. Get first date each user was seen (for new users count).
3. Get daily activity metrics.
4. Fill in any missing dates with zeros.
5. Return formatted data.

---

## Model Analytics Endpoints

### **GET /analytics/usage/models**
Returns model usage breakdown.

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, default: `30d`)

**Response:**
```json
{
  "model_usage": [
    {
      "model_name": "gpt-4",
      "tokens": 10000,
      "cost": 10.00,
      "requests": 200,
      "avg_response_time": 1.5
    }
  ]
}
```

**Process Flow:**
1. Parse date range from `period` parameter.
2. Query model usage with aggregated metrics.
3. Format and return data.

---

## Cost Analytics Endpoints

### **GET /analytics/costs/summary**
Returns a summary of costs.

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
