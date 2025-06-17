# Default Agents Setup Guide

This guide explains how to set up and use the default agents system in the Auto-Analyst backend.

## Overview

The system now includes 4 default agents that are stored in the database as templates:

1. **Data Preprocessing Agent** (`preprocessing_agent`) - Data cleaning and preparation
2. **Statistical Analytics Agent** (`statistical_analytics_agent`) - Statistical analysis using statsmodels
3. **Machine Learning Agent** (`sk_learn_agent`) - ML modeling using scikit-learn
4. **Data Visualization Agent** (`data_viz_agent`) - Interactive visualizations using Plotly

## Setup Instructions

### 1. Load Default Agents into Database

Run the setup script to populate the database with default agents:

```bash
cd Auto-Analyst-CS/auto-analyst-backend
python load_default_agents.py
```

**Or** use the API endpoint:

```bash
curl -X POST "http://localhost:8000/templates/load-default-agents" \
     -H "Content-Type: application/json" \
     -d '{"force_update": false}'
```

### 2. Agent Properties

All default agents are created with:
- `is_active = True` (available for use)
- `is_premium_only = False` (free to use)
- Proper categories (Data Manipulation, Statistical Analysis, Modelling, Visualization)

## User Preferences System

### Default Behavior
- **Default agents (preprocessing, statistical_analytics, sk_learn, data_viz) are ENABLED by default** for all users
- **Other templates are DISABLED by default** and must be explicitly enabled
- Templates can be used directly via `@template_name` regardless of preferences

### Managing User Preferences

#### Enable/Disable Templates
```bash
# Enable a template for a user
curl -X POST "http://localhost:8000/templates/user/1/template/1/toggle" \
     -H "Content-Type: application/json" \
     -d '{"is_enabled": true}'

# Disable a template for a user
curl -X POST "http://localhost:8000/templates/user/1/template/1/toggle" \
     -H "Content-Type: application/json" \
     -d '{"is_enabled": false}'
```

#### Bulk Enable/Disable
```bash
# Enable multiple templates at once
curl -X POST "http://localhost:8000/templates/user/1/bulk-toggle" \
     -H "Content-Type: application/json" \
     -d '{
       "template_preferences": {
         "1": true,
         "2": true,
         "3": false
       }
     }'
```

#### Get User's Template Preferences
```bash
# Get all templates with user's enabled/disabled status
curl "http://localhost:8000/templates/user/1"

# Get only enabled templates for user
curl "http://localhost:8000/templates/user/1/enabled"

# Get enabled templates for planner (max 10, ordered by usage)
curl "http://localhost:8000/templates/user/1/enabled/planner"
```

## Planner Integration

### How It Works
1. **Template Loading**: Only user-enabled templates are loaded into the planner
2. **No Agents Available**: If no templates are enabled, planner returns a helpful message
3. **Usage Tracking**: Template usage is tracked for prioritization

### Planner Response When No Agents Enabled
```json
{
  "complexity": "no_agents_available",
  "plan": "no_agents_available",
  "plan_instructions": {
    "message": "No agents are currently enabled for analysis. Please enable at least one agent (preprocessing, statistical analysis, machine learning, or visualization) in your template preferences to proceed with data analysis."
  }
}
```

## API Endpoints

### Template Management
- `GET /templates/` - Get all available templates
- `GET /templates/template/{template_id}` - Get specific template
- `POST /templates/load-default-agents` - Load default agents into database

### User Preferences
- `GET /templates/user/{user_id}` - Get user's template preferences
- `GET /templates/user/{user_id}/enabled` - Get user's enabled templates
- `GET /templates/user/{user_id}/enabled/planner` - Get templates for planner (max 10)
- `POST /templates/user/{user_id}/template/{template_id}/toggle` - Toggle template preference
- `POST /templates/user/{user_id}/bulk-toggle` - Bulk toggle preferences

### Categories
- `GET /templates/categories/list` - Get all categories
- `GET /templates/categories` - Get templates grouped by category
- `GET /templates/category/{category}` - Get templates in specific category

## Usage Examples

### Frontend Integration
```typescript
// Enable preprocessing and visualization agents for user
const enableAgents = async (userId: number) => {
  await fetch(`/templates/user/${userId}/bulk-toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_preferences: {
        "1": true,  // preprocessing_agent
        "4": true   // data_viz_agent
      }
    })
  });
};

// Get user's enabled templates
const getUserTemplates = async (userId: number) => {
  const response = await fetch(`/templates/user/${userId}/enabled`);
  return await response.json();
};
```

### Direct Agent Usage
Users can still use any agent directly regardless of preferences:
```
@preprocessing_agent clean this data
@data_viz_agent create a scatter plot of sales vs price
```

### Planner Usage
Only enabled agents will be available to the planner:
```
User: "Clean the data and create a visualization"
System: Uses only enabled agents to create the plan
```

## Database Schema

### AgentTemplate Table
```sql
CREATE TABLE agent_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR UNIQUE NOT NULL,
    display_name VARCHAR,
    description TEXT,
    prompt_template TEXT,
    category VARCHAR,
    is_premium_only BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### UserTemplatePreference Table
```sql
CREATE TABLE user_template_preferences (
    user_id INTEGER,
    template_id INTEGER,
    is_enabled BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (user_id, template_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (template_id) REFERENCES agent_templates(template_id)
);
```

## Troubleshooting

### Common Issues

1. **No agents available in planner**
   - Check if user has enabled any templates: `GET /templates/user/{user_id}/enabled`
   - Enable templates using the toggle endpoint

2. **Default agents not found**
   - Run the load script: `python load_default_agents.py`
   - Check if agents exist: `GET /templates/`

3. **Import errors in load script**
   - Ensure you're in the backend directory
   - Check that all dependencies are installed
   - Verify database connection

### Logs
Check the application logs for detailed error messages:
```bash
tail -f logs/templates_routes.log
tail -f logs/agents.log
```

## Migration from Old System

If migrating from the previous custom agents system:

1. **Data Migration**: Existing custom agents should be migrated to the new template system
2. **User Preferences**: Users will need to re-enable their preferred agents
3. **API Updates**: Update frontend code to use new template endpoints
4. **Testing**: Verify planner works with enabled templates only

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify database connections
3. Ensure proper API endpoint usage
4. Test with the load script first 