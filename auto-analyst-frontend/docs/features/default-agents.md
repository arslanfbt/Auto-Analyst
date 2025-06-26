# Default Agents Setup Guide

## Overview

The system includes 4 default agents automatically loaded on app startup:

1. **Data Preprocessing Agent** - Data cleaning and preparation
2. **Statistical Analytics Agent** - Statistical analysis using statsmodels  
3. **Machine Learning Agent** - ML modeling using scikit-learn
4. **Data Visualization Agent** - Interactive visualizations using Plotly

## Automatic Setup

Default agents are automatically initialized when the application starts. You'll see:

```
Initializing default agents on startup...
✅ Default agents initialized successfully
```

## User Template Preferences

- **Default agents (preprocessing, statistical_analytics, sk_learn, data_viz) are ENABLED by default** for all users
- **Other templates are DISABLED by default** and must be explicitly enabled
- Only enabled templates appear in the planner

## Key Features

- Agents load automatically on startup
- No manual setup required
- Default agents are active by default for better user experience
- Users can still disable default agents if desired
- Planner shows helpful messages when no agents enabled
- Full API support for template management

## API Endpoints

- `GET /templates/user/{user_id}` - Get user preferences
- `POST /templates/user/{user_id}/template/{template_id}/toggle` - Enable/disable templates
- `GET /templates/user/{user_id}/enabled` - Get enabled templates only

## Manual Script (Optional)

For manual updates:
```bash
python load_default_agents.py
``` 