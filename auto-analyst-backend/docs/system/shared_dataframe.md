# Shared Dataframe Between Agents

This document explains how to use the shared dataframe functionality that allows one agent to create a processed dataframe (`df_processed`) that other agents can access and use.

## Overview

The Auto-Analyst system now supports sharing a processed dataframe between agents. This is useful when:

1. One agent performs data preprocessing, cleaning, or feature engineering
2. Subsequent agents need to use this processed data for analysis, visualization, or other tasks

The first agent (typically Agent1) creates a dataframe called `df_processed`, and all subsequent agents can access this same dataframe without needing to reprocess the data.

## How It Works

1. Automatic variable sharing is handled through the `SHARED_CONTEXT` global dictionary in `format_response.py`
2. When an agent executes Python code that creates a variable named `df_processed`, this variable is automatically stored in the shared context
3. Subsequent agent code executions will have access to this `df_processed` variable

## Implementation for Agent Developers

### Agent1 (Data Processor)

Agent1 should define a processed dataframe that will be used by subsequent agents:

```python
import pandas as pd
import numpy as np

# Do some data processing
df_processed = df.copy()  # Start with a copy of the original dataframe
df_processed = df_processed.dropna()  # Remove missing values
df_processed['new_feature'] = df_processed['column_a'] / df_processed['column_b']
print("Data processing complete. Created df_processed for other agents to use.")
```

### Agent2 (Data Consumer)

Agent2 can access the `df_processed` dataframe created by Agent1:

```python
import matplotlib.pyplot as plt
import seaborn as sns

# Access the shared df_processed dataframe
print(f"Using shared df_processed with shape: {df_processed.shape}")

# Create visualization using the processed data
plt.figure(figsize=(10, 6))
sns.scatterplot(data=df_processed, x='column_a', y='new_feature')
plt.title('Analysis of Processed Data')
plt.show()
```

## Technical Details

The shared dataframe functionality is implemented through:

1. A global `SHARED_CONTEXT` dictionary in `format_response.py`
2. Modified `execute_code_from_markdown` function that checks for `df_processed` in the execution context
3. Updated app.py to process agents in the correct order from the plan_list

## Best Practices

1. Name the shared dataframe consistently as `df_processed`
2. Document what processing was done to create the shared dataframe
3. Agent1 should print a message confirming that `df_processed` was created
4. Agent2 should verify the structure of `df_processed` before using it (e.g., print its shape or columns)
5. Keep processing in Agent1, analysis in Agent2 for clean separation of concerns

## Example

```python
# Agent1 code
import pandas as pd

# Load and process data
df_processed = df.copy()
df_processed = df_processed[df_processed['price'] > 0]  # Remove invalid prices
df_processed['price_per_sqft'] = df_processed['price'] / df_processed['sqft']
print(f"Created df_processed with {len(df_processed)} rows after processing")

# Agent2 code
import plotly.express as px

# Use the processed dataframe
print(f"Using df_processed with {len(df_processed)} rows")
fig = px.scatter(df_processed, x='sqft', y='price', color='price_per_sqft',
                title='Price vs. Square Footage (Colored by Price per SqFt)')
fig.show()
``` 