# Templates and Agent Loading Documentation

This document describes how the Auto-Analyst template system works, including agent loading, user preferences, and template management.

## Overview

The Auto-Analyst system uses a flexible template-based approach for managing AI agents. Templates define specialized agents with specific capabilities, and users can customize which agents are available for their analysis workflows.

## Template System Architecture

### Template Types

Templates come in different **variant types** that determine how they can be used:

- **`individual`**: Templates available for single-agent queries (e.g., `@preprocessing_agent`)
- **`planner`**: Templates available for multi-agent planning workflows
- **`both`**: Templates available in both individual and planner contexts

### Default Agents

The system includes four core default agents that are **enabled by default** for all users:

**For Individual Use:**
- `preprocessing_agent`: Data cleaning and preprocessing
- `statistical_analytics_agent`: Statistical analysis and insights  
- `sk_learn_agent`: Machine learning with scikit-learn
- `data_viz_agent`: Data visualization with Plotly

**For Planner Use:**
- `planner_preprocessing_agent`: Planning version of preprocessing agent
- `planner_statistical_analytics_agent`: Planning version of statistical agent
- `planner_sk_learn_agent`: Planning version of ML agent
- `planner_data_viz_agent`: Planning version of visualization agent

## Template Management Endpoints

### Get All Templates

**Endpoint:** `GET /templates/`

**Query Parameters:**
- `variant_type`: Filter by `"individual"`, `"planner"`, or `"all"` (default: `"all"`)

**Response:**
```json
[
  {
    "template_id": 1,
    "template_name": "preprocessing_agent",
    "display_name": "Data Preprocessing Agent",
    "description": "Handles data cleaning, missing values, and preprocessing tasks",
    "prompt_template": "You are a data preprocessing specialist...",
    "template_category": "Data Processing",
    "icon_url": "/icons/templates/preprocessing_agent.svg",
    "is_premium_only": false,
    "is_active": true,
    "usage_count": 12,
    "created_at": "2023-05-01T12:00:00Z",
    "updated_at": "2023-05-01T12:00:00Z"
  }
]
```

### Get Templates by Category

**Endpoint:** `GET /templates/categories`

**Query Parameters:**
- `variant_type`: Filter by `"individual"`, `"planner"`, or `"all"` (default: `"individual"`)

**Response:**
```json
[
  {
    "category": "Data Processing", 
    "templates": [
      {
        "agent_id": 1,
        "agent_name": "preprocessing_agent",
        "display_name": "Data Preprocessing Agent",
        "description": "Handles data cleaning and preprocessing",
        "icon_url": "/icons/templates/preprocessing_agent.svg",
        "usage_count": 1234
      }
    ]
  }
]
```

### Get Template by ID

**Endpoint:** `GET /templates/template/{template_id}`

**Response:**
```json
{
  "template_id": 1,
  "template_name": "preprocessing_agent",
  "display_name": "Data Preprocessing Agent",
  "description": "Handles data cleaning, missing values, and preprocessing tasks",
  "prompt_template": "You are a data preprocessing specialist...",
  "template_category": "Data Processing",
  "icon_url": "/icons/templates/preprocessing_agent.svg",
  "is_premium_only": false,
  "is_active": true,
  "usage_count": 1234,
  "created_at": "2023-05-01T12:00:00Z",
  "updated_at": "2023-05-01T12:00:00Z"
}
```

### Get Template Categories List

**Endpoint:** `GET /templates/categories/list`

**Response:**
```json
{
  "categories": [
    "Data Processing",
    "Machine Learning", 
    "Visualization",
    "Statistics"
  ]
}
```

### Get Templates by Specific Category

**Endpoint:** `GET /templates/category/{category}`

**Path Parameters:**
- `category`: Name of the category to filter by

**Response:**
```json
[
  {
    "template_id": 1,
    "template_name": "preprocessing_agent",
    "display_name": "Data Preprocessing Agent",
    "description": "Handles data cleaning and preprocessing",
    "template_category": "Data Processing",
    "icon_url": "/icons/templates/preprocessing_agent.svg",
    "usage_count": 1234
  }
]
```

## User Template Preferences

### How Agent Loading Works for Users

1. **Default Behavior**: New users automatically have the 4 core default agents enabled
2. **Custom Preferences**: Users can enable/disable additional templates through preferences
3. **Variant-Specific**: Individual and planner variants are managed separately
4. **Usage Tracking**: System tracks which templates users actually use

### Get User Template Preferences

**Endpoint:** `GET /templates/user/{user_id}`

**Query Parameters:**
- `variant_type`: Filter by `"individual"`, `"planner"`, or `"all"` (default: `"planner"`)

**Response:**
```json
[
  {
    "template_id": 1,
    "template_name": "preprocessing_agent", 
    "display_name": "Data Preprocessing Agent",
    "description": "Handles data cleaning and preprocessing",
    "template_category": "Data Processing",
    "icon_url": "/icons/templates/preprocessing_agent.svg",
    "is_premium_only": false,
    "is_active": true,
    "is_enabled": true,
    "usage_count": 15,
    "last_used_at": "2023-05-01T12:00:00Z",
    "created_at": "2023-04-01T12:00:00Z",
    "updated_at": "2023-05-01T12:00:00Z"
  }
]
```

### Get Only Enabled Templates

**Endpoint:** `GET /templates/user/{user_id}/enabled`

Returns only templates that are currently enabled for the user.

### Get Enabled Templates for Planner

**Endpoint:** `GET /templates/user/{user_id}/enabled/planner`

Returns enabled planner templates with the following restrictions:
- **Maximum 10 templates** for planner use
- **Sorted by usage** (most used first)
- **Only planner variants** (`planner` or `both` types)

## Template Preference Management

### Toggle Single Template

**Endpoint:** `POST /templates/user/{user_id}/template/{template_id}/toggle`

**Request Body:**
```json
{
  "is_enabled": true
}
```

**Restrictions:**
- Cannot disable all templates (at least 1 must remain enabled)
- Cannot enable more than 10 templates for planner use

### Bulk Toggle Templates

**Endpoint:** `POST /templates/user/{user_id}/bulk-toggle`

**Request Body:**
```json
{
  "preferences": [
    {
      "template_id": 1,
      "is_enabled": true
    },
    {
      "template_id": 2, 
      "is_enabled": false
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "template_id": 1,
      "success": true,
      "message": "Template enabled successfully",
      "is_enabled": true
    }
  ]
}
```

## Template Categories and Icons

### Available Categories

Templates are organized into categories such as:
- **Data Processing**: Preprocessing, cleaning, feature engineering
- **Machine Learning**: Various ML frameworks and algorithms  
- **Visualization**: Plotting and chart generation
- **Statistics**: Statistical analysis and modeling
- **Custom**: User or organization-specific templates

### Icon System

Templates include visual icons stored in `/public/icons/templates/`:

**Core Agent Icons:**
- `preprocessing_agent.svg`: Data preprocessing 
- `sk_learn_agent.svg`: Machine learning
- `matplotlib_agent.png`: Plotting with matplotlib
- `polars_agent.svg`: Data manipulation with Polars

**Library-Specific Icons:**
- `numpy.svg`, `scipy.png`: Scientific computing
- `plotly.svg`, `seaborn.svg`: Advanced visualization
- `lightgbm.png`, `xgboost.png`: Gradient boosting
- `pymc.png`, `statsmodel.svg`: Statistical modeling

**Special Purpose Icons:**
- `data-cleaning.png`: Data cleaning workflows
- `feature-engineering.png`: Feature engineering tasks

## Agent Loading Process

### For Individual Queries

When a user makes a query like `@preprocessing_agent analyze my data`:

1. **Check User Preferences**: System looks up user's enabled individual templates
2. **Apply Defaults**: If no preference exists, default agents are enabled
3. **Load Agent**: System loads the specific agent template and executes the query
4. **Track Usage**: Usage count is incremented for analytics

### For Planner Workflows  

When a user makes a general query that triggers the planner:

1. **Get Enabled Planner Templates**: System queries user's enabled planner variants
2. **Apply 10-Template Limit**: Maximum 10 templates for performance
3. **Sort by Usage**: Most-used templates get priority
4. **Create Plan**: Planner selects appropriate agents for the analysis
5. **Execute Workflow**: Selected agents execute in sequence
6. **Update Usage**: Usage statistics updated for selected agents

### Default Agent Behavior

```python
# Default agents enabled for new users
individual_defaults = [
    "preprocessing_agent",
    "statistical_analytics_agent", 
    "sk_learn_agent",
    "data_viz_agent"
]

planner_defaults = [
    "planner_preprocessing_agent",
    "planner_statistical_analytics_agent",
    "planner_sk_learn_agent", 
    "planner_data_viz_agent"
]
```

## Usage Analytics

### Global Usage Tracking

The system tracks global usage statistics across all users:
- **Total usage count** per template
- **User-specific usage** for personalization
- **Last used timestamps** for sorting

### Usage-Based Features

- **Template Recommendations**: Popular templates shown first
- **Personalized Ordering**: User's most-used templates prioritized
- **Analytics Dashboard**: Usage patterns for administrators

## Template Restrictions

### User Limitations

- **Minimum 1 Agent**: Cannot disable all templates
- **Maximum 10 for Planner**: Performance optimization
- **Premium Templates**: Some templates require premium access

### System Limitations

- **Active Templates Only**: Inactive templates not available
- **Variant Compatibility**: Individual/planner variants managed separately
- **Category Organization**: Templates must belong to valid categories

## Integration with Deep Analysis

The deep analysis system uses the template preference system:

1. **Load User Preferences**: Gets enabled planner templates for user
2. **Create Agent Pool**: Instantiates agents from enabled templates  
3. **Execute Analysis**: Uses available agents for comprehensive analysis
4. **Fallback Behavior**: Uses default agents if no preferences found

This ensures users get personalized deep analysis based on their template preferences while maintaining system performance through the 10-template limit. 