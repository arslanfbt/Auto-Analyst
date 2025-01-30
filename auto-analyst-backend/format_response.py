import re
import json
import sys
import contextlib
from io import StringIO

@contextlib.contextmanager
def stdoutIO(stdout=None):
    old = sys.stdout
    if stdout is None:
        stdout = StringIO()
    sys.stdout = stdout
    yield stdout
    sys.stdout = old


def format_response_to_markdown(api_response):
    markdown = []
    
    # Helper function to clean and format code blocks
    def format_code_block(code_str):
        code_clean = re.sub(r'^```python\n?', '', code_str, flags=re.MULTILINE)
        code_clean = re.sub(r'\n```$', '', code_clean)
        return f'\n{code_clean}\n'

    def format_code_backticked_block(code_str):
        code_clean = re.sub(r'^```python\n?', '', code_str, flags=re.MULTILINE)
        code_clean = re.sub(r'\n```$', '', code_clean)
        return f'```python\n{code_clean}\n```'

    
# In format_response.py, modify the execute_code function:
def execute_code(code_str):
    import pandas as pd
    import plotly.express as px
    import plotly
    import plotly.graph_objects as go
    import matplotlib.pyplot as plt
    import seaborn as sns
    import numpy as np

    context = {
        'pd': pd,
        'px': px,
        'go': go,
        'plt': plt,
        'plotly': plotly,
        '__builtins__': __builtins__,
        '__import__': __import__,
        'sns': sns,
        'np': np,
        'plotly_data': [],  # Store Plotly data
        'plotly_layout': [],  # Store Plotly layout
        'json_output': []
    }

    output = []
    json_output = []

    # Replace fig.show() and fig.to_html() with graphJSON = plotly.io.to_json(fig, pretty=True)
    modified_code = re.sub(
        r'fig\.show\(\)',
        r'json_output = plotly.io.to_json(fig, pretty=True)',
        code_str
    )
    modified_code = re.sub(
        r'fig\.to_html\(.*?\)',
        r'json_output = plotly.io.to_json(fig, pretty=True)',
        modified_code
    )

    # add df = df.read_csv('Housing.csv') after the imports
    modified_code = re.sub(
        r'import pandas as pd',
        r'import pandas as pd\n\ndf = pd.read_csv("Housing.csv")',
        modified_code
    )

    print("Executing the following modified code:\n", modified_code)

    with stdoutIO() as s:
        exec(modified_code, context)  # Execute the modified code
    output = s.getvalue()
    json_output = context.get('json_output', None)
    return output, json_output
    

def format_code_backticked_block(code_str):
    code_clean = re.sub(r'^```python\n?', '', code_str, flags=re.MULTILINE)
    code_clean = re.sub(r'\n```$', '', code_clean)
    return f'```python\n{code_clean}\n```'

def format_code_block(code_str):
    code_clean = re.sub(r'^```python\n?', '', code_str, flags=re.MULTILINE)
    code_clean = re.sub(r'\n```$', '', code_clean)
    return f'\n{code_clean}\n'

def format_response_to_markdown(api_response):
    markdown = []
    
    # Process each agent's section
    for agent, content in api_response.items():
        markdown.append(f"\n## {agent.replace('_', ' ').title()}\n")
        
        if 'reasoning' in content:
            markdown.append(f"### Reasoning\n{content['reasoning']}\n")
            
        if 'code' in content:
            clean_code = format_code_backticked_block(content['code'])
            markdown.append(f"### Code Implementation\n{clean_code}\n")
            
        if 'commentary' in content:
            markdown.append(f"### Commentary\n{content['commentary']}\n")
            
        if 'refined_complete_code' in content:
            clean_code = format_code_block(content['refined_complete_code'])
            output, json_output = execute_code(clean_code)
            print(output)
            print(json_output)
            
            if output:
                markdown.append("### Execution Output\n")
                markdown.append(f"```\n{output}\n```\n")
            
            if json_output:
                markdown.append("### Plotly JSON Output\n")
                markdown.append(f"```plotly\n{json_output}\n```\n")
            
    return '\n'.join(markdown)

# Example usage with dummy data
if __name__ == "__main__":
    sample_response = {
    "code_combiner_agent": {
      "reasoning": "The provided code snippets from the agents include a machine learning model for predicting housing prices and a visualization of the price distribution using Plotly. The dataset contains various features related to housing, including both numerical and categorical data types. The first code snippet correctly preprocesses the data and fits a RandomForestRegressor model, while the second snippet visualizes the price distribution in a pie chart. \n\nTo combine these functionalities, I will ensure that the DataFrame is copied correctly, and I will integrate the visualization code after the model evaluation. Additionally, I will ensure that the code adheres to the data types specified in the dataset, particularly for categorical features. The final code will include both the model training and the visualization, ensuring that the Plotly chart is displayed at the end.",
      "refined_complete_code": "```python\nimport pandas as pd\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import OneHotEncoder\nfrom sklearn.compose import ColumnTransformer\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.ensemble import RandomForestRegressor\nfrom sklearn.metrics import mean_squared_error\nimport plotly.express as px\n\n# Assuming df is the DataFrame containing the housing data\ndf = df.copy()\n\n# Define features and target variable\nX = df.drop('price', axis=1)\ny = df['price']\n\n# Preprocessing for categorical data\ncategorical_features = ['mainroad', 'guestroom', 'basement', 'hotwaterheating', 'airconditioning', 'prefarea', 'furnishingstatus']\nnumerical_features = ['area', 'bedrooms', 'bathrooms', 'stories']\n\n# Create a column transformer\npreprocessor = ColumnTransformer(\n    transformers=[\n        ('num', 'passthrough', numerical_features),\n        ('cat', OneHotEncoder(), categorical_features)\n    ])\n\n# Create a pipeline that first transforms the data and then fits the model\nmodel = Pipeline(steps=[\n    ('preprocessor', preprocessor),\n    ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))\n])\n\n# Split the data into training and testing sets\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n\n# Fit the model\nmodel.fit(X_train, y_train)\n\n# Make predictions\ny_pred = model.predict(X_test)\n\n# Evaluate the model\nmse = mean_squared_error(y_test, y_pred)\nprint(f'Mean Squared Error: {mse}')\n\n# Sample the dataset if it exceeds 50000 rows\nif len(df) > 50000:\n    df = df.sample(n=50000, random_state=1)\n\n# Create price categories\nprice_bins = [0, 3000000, 6000000, 9000000, 12000000, 15000000]\nprice_labels = ['0-3M', '3M-6M', '6M-9M', '9M-12M', '12M+']\ndf['price_category'] = pd.cut(df['price'], bins=price_bins, labels=price_labels)\n\n# Count the occurrences of each price category\nprice_distribution = df['price_category'].value_counts().reset_index()\nprice_distribution.columns = ['price_category', 'count']\n\n# Create a pie chart\nfig = px.pie(price_distribution, values='count', names='price_category', title='Housing Price Distribution', \n             template='plotly_white', \n             color_discrete_sequence=px.colors.sequential.RdBu)\n\n# Update layout for styling\nfig.update_traces(textinfo='percent+label', pull=[0.1]*len(price_distribution))\nfig.update_layout(height=1200, width=1000, \n                  xaxis_title='<b>Price Category</b>', \n                  yaxis_title='<b>Count</b>', \n                  xaxis=dict(showline=True, linewidth=0.2), \n                  yaxis=dict(showline=True, linewidth=0.2), \n                  xaxis_gridwidth=1, \n                  yaxis_gridwidth=1)\n\nfig.show()\n```"
    }
  }
    
    formatted_md = format_response_to_markdown(sample_response)
    # print(formatted_md)