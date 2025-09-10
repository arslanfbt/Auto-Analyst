# Auto-Analyst Database Schema Documentation

## 📋 Overview

The Auto-Analyst backend uses a relational database schema designed for scalability and data integrity. The schema supports both **SQLite** (development) and **PostgreSQL** (production) databases through SQLAlchemy ORM.

### **Database Features**
- **User Management** - Authentication and user data
- **Chat System** - Conversation sessions and message history  
- **AI Model Tracking** - Usage analytics and cost monitoring
- **Code Execution** - Code generation and execution tracking
- **Agent Templates** - Customizable AI agent configurations
- **Deep Analysis** - Multi-step analysis reports and results
- **User Feedback** - Rating and feedback system

---

## 🗄️ Database Tables

### **1. Users Table (`users`)**

**Purpose**: Core user authentication and profile management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `user_id` | `INTEGER` | PRIMARY KEY, AUTO INCREMENT | Unique user identifier |
| `username` | `STRING` | UNIQUE, NOT NULL | User's display name |
| `email` | `STRING` | UNIQUE, NOT NULL | User's email address |
| `created_at` | `DATETIME` | DEFAULT: UTC NOW | Account creation timestamp |

**Relationships:**
- **One-to-Many**: `chats` (User → Chat sessions)
- **One-to-Many**: `usage_records` (User → Model usage tracking)
- **One-to-Many**: `deep_analysis_reports` (User → Analysis reports)
- **One-to-Many**: `template_preferences` (User → Agent preferences)

---

### **2. Chats Table (`chats`)**

**Purpose**: Conversation sessions and chat organization

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `chat_id` | `INTEGER` | PRIMARY KEY, AUTO INCREMENT | Unique chat session identifier |
| `user_id` | `INTEGER` | FOREIGN KEY → `users.user_id`, CASCADE DELETE | Chat owner (nullable for anonymous) |
| `title` | `STRING` | DEFAULT: 'New Chat' | Human-readable chat title |
| `created_at` | `DATETIME` | DEFAULT: UTC NOW | Chat creation timestamp |

**Relationships:**
- **Many-to-One**: `user` (Chat → User)
- **One-to-Many**: `messages` (Chat → Messages)
- **One-to-Many**: `usage_records` (Chat → Model usage)

---

### **3. Messages Table (`messages`)**

**Purpose**: Individual messages within chat conversations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `message_id` | `INTEGER` | PRIMARY KEY, AUTO INCREMENT | Unique message identifier |
| `chat_id` | `INTEGER` | FOREIGN KEY → `chats.chat_id`, CASCADE DELETE | Parent chat session |
| `sender` | `STRING` | NOT NULL | Message sender: 'user' or 'ai' |
| `content` | `TEXT` | NOT NULL | Message content (text/markdown) |
| `timestamp` | `DATETIME` | DEFAULT: UTC NOW | Message creation time |

**Relationships:**
- **Many-to-One**: `chat` (Message → Chat)
- **One-to-One**: `feedback` (Message → Feedback)

---

### **4. Model Usage Table (`model_usage`)**

**Purpose**: AI model usage tracking for analytics and billing

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `usage_id` | `INTEGER` | PRIMARY KEY | Unique usage record identifier |
| `user_id` | `INTEGER` | FOREIGN KEY → `users.user_id`, SET NULL | User who triggered the usage |
| `chat_id` | `INTEGER` | FOREIGN KEY → `chats.chat_id`, SET NULL | Associated chat session |
| `model_name` | `STRING(100)` | NOT NULL | AI model used (e.g., 'gpt-4o-mini') |
| `provider` | `STRING(50)` | NOT NULL | Model provider ('openai', 'anthropic', etc.) |
| `prompt_tokens` | `INTEGER` | DEFAULT: 0 | Input tokens consumed |
| `completion_tokens` | `INTEGER` | DEFAULT: 0 | Output tokens generated |
| `total_tokens` | `INTEGER` | DEFAULT: 0 | Total tokens (input + output) |
| `query_size` | `INTEGER` | DEFAULT: 0 | Query size in characters |
| `response_size` | `INTEGER` | DEFAULT: 0 | Response size in characters |
| `cost` | `FLOAT` | DEFAULT: 0.0 | Cost in USD for this usage |
| `timestamp` | `DATETIME` | DEFAULT: UTC NOW | Usage timestamp |
| `is_streaming` | `BOOLEAN` | DEFAULT: FALSE | Whether response was streamed |
| `request_time_ms` | `INTEGER` | DEFAULT: 0 | Request processing time (milliseconds) |

**Relationships:**
- **Many-to-One**: `user` (Usage → User)
- **Many-to-One**: `chat` (Usage → Chat)

---

### **5. Code Executions Table (`code_executions`)**

**Purpose**: Track code generation and execution attempts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `execution_id` | `INTEGER` | PRIMARY KEY, AUTO INCREMENT | Unique execution identifier |
| `message_id` | `INTEGER` | FOREIGN KEY → `messages.message_id`, CASCADE DELETE | Associated message |
| `chat_id` | `INTEGER` | FOREIGN KEY → `chats.chat_id`, CASCADE DELETE | Parent chat session |
| `user_id` | `INTEGER` | FOREIGN KEY → `users.user_id`, SET NULL | User who triggered execution |
| `initial_code` | `TEXT` | NULLABLE | First version of generated code |
| `latest_code` | `TEXT` | NULLABLE | Most recent code version |
| `is_successful` | `BOOLEAN` | DEFAULT: FALSE | Whether execution succeeded |
| `output` | `TEXT` | NULLABLE | Execution output (including errors) |
| `model_provider` | `STRING(50)` | NULLABLE | AI model provider used |
| `model_name` | `STRING(100)` | NULLABLE | AI model name used |
| `failed_agents` | `TEXT` | NULLABLE | JSON list of failed agent names |
| `error_messages` | `TEXT` | NULLABLE | JSON map of error messages by agent |
| `created_at` | `DATETIME` | DEFAULT: UTC NOW | Execution creation time |
| `updated_at` | `DATETIME` | DEFAULT: UTC NOW, ON UPDATE | Last update timestamp |

---

### **6. Message Feedback Table (`message_feedback`)**

**Purpose**: User feedback and model settings for messages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `feedback_id` | `INTEGER` | PRIMARY KEY, AUTO INCREMENT | Unique feedback identifier |
| `message_id` | `INTEGER` | FOREIGN KEY → `messages.message_id`, CASCADE DELETE | Associated message |
| `rating` | `INTEGER` | NULLABLE | Star rating (1-5 scale) |
| `model_name` | `STRING(100)` | NULLABLE | Model used for this message |
| `model_provider` | `STRING(50)` | NULLABLE | Model provider used |
| `temperature` | `FLOAT` | NULLABLE | Temperature setting used |
| `max_tokens` | `INTEGER` | NULLABLE | Max tokens setting used |
| `created_at` | `DATETIME` | DEFAULT: UTC NOW | Feedback creation time |
| `updated_at` | `DATETIME` | DEFAULT: UTC NOW, ON UPDATE | Last update timestamp |

**Relationships:**
- **One-to-One**: `message` (Feedback ↔ Message)

---

### **7. Deep Analysis Reports Table (`deep_analysis_reports`)**

**Purpose**: Store comprehensive multi-agent analysis reports

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `report_id` | `INTEGER` | PRIMARY KEY, AUTO INCREMENT | Unique report identifier |
| `report_uuid` | `STRING(100)` | UNIQUE, NOT NULL | Frontend-generated UUID |
| `user_id` | `INTEGER` | FOREIGN KEY → `users.user_id`, CASCADE DELETE | Report owner |
| `goal` | `TEXT` | NOT NULL | Analysis objective/question |
| `status` | `STRING(20)` | NOT NULL, DEFAULT: 'pending' | Status: 'pending', 'running', 'completed', 'failed' |
| `start_time` | `DATETIME` | DEFAULT: UTC NOW | Analysis start time |
| `end_time` | `DATETIME` | NULLABLE | Analysis completion time |
| `duration_seconds` | `INTEGER` | NULLABLE | Total analysis duration |
| `deep_questions` | `TEXT` | NULLABLE | Generated analytical questions |
| `deep_plan` | `TEXT` | NULLABLE | Analysis execution plan |
| `summaries` | `JSON` | NULLABLE | Array of analysis summaries |
| `analysis_code` | `TEXT` | NULLABLE | Generated Python code |
| `plotly_figures` | `JSON` | NULLABLE | Array of Plotly figure data |
| `synthesis` | `JSON` | NULLABLE | Array of synthesis insights |
| `final_conclusion` | `TEXT` | NULLABLE | Final analysis conclusion |
| `html_report` | `TEXT` | NULLABLE | Complete HTML report |
| `progress_percentage` | `INTEGER` | DEFAULT: 0 | Progress percentage (0-100) |
| `total_tokens_used` | `INTEGER` | DEFAULT: 0 | Total tokens consumed |
| `estimated_cost` | `FLOAT` | DEFAULT: 0.0 | Estimated cost in USD |
| `credits_consumed` | `INTEGER` | DEFAULT: 0 | Credits deducted for analysis |
| `created_at` | `DATETIME` | DEFAULT: UTC NOW | Report creation time |
| `updated_at` | `DATETIME` | DEFAULT: UTC NOW, ON UPDATE | Last update timestamp |

**Relationships:**
- **Many-to-One**: `user` (Report → User)

---

### **8. Agent Templates Table (`agent_templates`)**

**Purpose**: Store predefined AI agent configurations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `template_id` | `INTEGER` | PRIMARY KEY, AUTO INCREMENT | Unique template identifier |
| `template_name` | `STRING(100)` | UNIQUE, NOT NULL | Internal template name |
| `display_name` | `STRING(200)` | NULLABLE | User-friendly display name |
| `description` | `TEXT` | NOT NULL | Template description |
| `prompt_template` | `TEXT` | NOT NULL | Agent behavior instructions |
| `icon_url` | `STRING(500)` | NULLABLE | Template icon URL |
| `category` | `STRING(50)` | NULLABLE | Template category |
| `is_premium_only` | `BOOLEAN` | DEFAULT: FALSE | Requires premium subscription |
| `variant_type` | `STRING(20)` | DEFAULT: 'individual' | 'planner', 'individual', or 'both' |
| `is_active` | `BOOLEAN` | DEFAULT: TRUE | Template is active/available |
| `created_at` | `DATETIME` | DEFAULT: UTC NOW | Template creation time |

**Relationships:**
- **One-to-Many**: `user_preferences` (Template → User preferences)

---

### **9. User Template Preferences Table (`user_template_preferences`)**

**Purpose**: Track user preferences and usage for agent templates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `preference_id` | `INTEGER` | PRIMARY KEY, AUTO INCREMENT | Unique preference identifier |
| `user_id` | `INTEGER` | FOREIGN KEY → `users.user_id`, CASCADE DELETE | User who owns preference |
| `template_id` | `INTEGER` | FOREIGN KEY → `agent_templates.template_id`, CASCADE DELETE | Associated template |
| `is_enabled` | `BOOLEAN` | DEFAULT: TRUE | Whether user has template enabled |
| `usage_count` | `INTEGER` | DEFAULT: 0 | Number of times user used template |
| `last_used_at` | `DATETIME` | NULLABLE | Last time user used template |
| `created_at` | `DATETIME` | DEFAULT: UTC NOW | Preference creation time |

**Relationships:**
- **Many-to-One**: `user` (Preference → User)
- **Many-to-One**: `template` (Preference → Template)

**Constraints:**
- **Unique**: `(user_id, template_id)` - One preference per user per template

---

## 🔗 Entity Relationship Diagram

```
Users (1) ──────────── (Many) Chats
  │                           │
  │                           ├── (Many) Messages
  │                           │      │
  │                           │      └── (1) MessageFeedback
  │                           │
  │                           └── (Many) CodeExecutions
  │
  ├── (Many) ModelUsage
  │
  ├── (Many) DeepAnalysisReports
  │
  └── (Many) UserTemplatePreferences
               │
               └── (Many) AgentTemplates
```

---

## 📊 Database Performance

### **Optimized Indexes**

```sql
-- High-performance queries
CREATE INDEX idx_messages_chat_timestamp ON messages(chat_id, timestamp DESC);
CREATE INDEX idx_model_usage_user_time ON model_usage(user_id, timestamp DESC);
CREATE INDEX idx_model_usage_model_time ON model_usage(model_name, timestamp DESC);
CREATE INDEX idx_reports_user_time ON deep_analysis_reports(user_id, created_at DESC);
```

### **Cascade Deletion Rules**

| Parent → Child | Rule | Description |
|----------------|------|-------------|
| `users` → `chats` | CASCADE | Delete all user chats when user deleted |
| `chats` → `messages` | CASCADE | Delete all chat messages when chat deleted |
| `messages` → `feedback` | CASCADE | Delete feedback when message deleted |
| `users` → `model_usage` | SET NULL | Keep usage records for analytics |

---

## 🛡️ Security & Maintenance

### **Data Protection**
- User data isolated by `user_id`
- Sensitive fields require encryption in production
- Automatic cleanup of anonymous data after 90 days

### **Regular Maintenance**
```sql
-- Clean old anonymous chats
DELETE FROM chats WHERE user_id IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Update statistics for query optimization
ANALYZE users, chats, messages, model_usage;
```

---

This schema supports the full Auto-Analyst application with optimized performance, data integrity, and scalability for both development and production environments. 