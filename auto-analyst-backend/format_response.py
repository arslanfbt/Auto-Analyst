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

def format_code_block(code_str):
    code_clean = re.sub(r'^```python\n?', '', code_str, flags=re.MULTILINE)
    code_clean = re.sub(r'\n```$', '', code_clean)
    return f'\n{code_clean}\n'

def format_code_backticked_block(code_str):
    code_clean = re.sub(r'^```python\n?', '', code_str, flags=re.MULTILINE)
    code_clean = re.sub(r'\n```$', '', code_clean)
    return f'```python\n{code_clean}\n```'

    
# In format_response.py, modify the execute_code function:
def execute_code_from_markdown(code_str, dataframe=None):
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
        'json_outputs': []  # List to store multiple Plotly JSON outputs
    }

    # If a dataframe is provided, add it to the context
    if dataframe is not None:
        context['df'] = dataframe

    # Modify code to store multiple JSON outputs
    modified_code = re.sub(
        r'(\w*_?)fig(\w*)\.show\(\)',
        r'json_outputs.append(plotly.io.to_json(\1fig\2, pretty=True))',
        code_str
    )

    modified_code = re.sub(
        r'(\w*_?)fig(\w*)\.to_html\(.*?\)',
        r'json_outputs.append(plotly.io.to_json(\1fig\2, pretty=True))',
        modified_code
    )

    # Only add df = pd.read_csv() if no dataframe was provided and the code contains pd.read_csv
    if dataframe is None and 'pd.read_csv' not in modified_code:
        modified_code = re.sub(
            r'import pandas as pd',
            r'import pandas as pd\n\n# Read Housing.csv\ndf = pd.read_csv("Housing.csv")',
            modified_code
        )
    
    # remove plt.show()
    modified_code = re.sub(
        r'plt\.show\(\)',
        '',
        modified_code
    )

    # print("modified_code: ", modified_code)

    try:
        with stdoutIO() as s:
            exec(modified_code, context)  # Execute the modified code
        output = s.getvalue()
        # print("output: ", output)
        json_outputs = context.get('json_outputs', [])

        return output, json_outputs
    except Exception as e:
        return "Error executing code: " + str(e), []


def format_response_to_markdown(api_response, agent_name = None, dataframe=None):
    try:
        markdown = []
                        
        if "response" in api_response and isinstance(api_response['response'], str) and ("auth" in api_response['response'].lower() or "api" in api_response['response'].lower() or "LM" in api_response['response']):
            return "**Error**: Authentication failed. Please check your API key in settings and try again."
        
        if "response" in api_response and isinstance(api_response['response'], str) and "model" in api_response['response'].lower():
            return "**Error**: Model configuration error. Please verify your model selection in settings."

        for agent, content in api_response.items():
            if "memory" in agent:
                continue
            # print("agent: ", agent)
            markdown.append(f"\n## {agent.replace('_', ' ').title()}\n")
            
            if agent == "analytical_planner":
                if 'rationale' in content:
                    markdown.append(f"### Reasoning\n{content['rationale']}\n")
            
            if "reasoning" in content:
                markdown.append(f"### Reasoning\n{content['reasoning']}\n")

            if 'code' in content:
                markdown.append(f"### Code Implementation\n{format_code_backticked_block(content['code'])}\n")
                if agent_name is not None:
                    # execute the code
                    clean_code = format_code_block(content['code'])
                    # print("clean_code: ", clean_code)
                    output, json_outputs = execute_code_from_markdown(clean_code, dataframe)
                    if output:
                        markdown.append("### Execution Output\n")
                        markdown.append(f"```output\n{output}\n```\n")

                    if json_outputs:
                        markdown.append("### Plotly JSON Outputs\n")
                        for idx, json_output in enumerate(json_outputs):
                            markdown.append(f"```plotly\n{json_output}\n```\n")
                        # print("Length of json_outputs: ", len(json_outputs))

            if 'commentary' in content:
                markdown.append(f"### Commentary\n{content['commentary']}\n")

            if 'refined_complete_code' in content:
                clean_code = format_code_block(content['refined_complete_code']) 
                output, json_outputs = execute_code_from_markdown(clean_code, dataframe)
                
                markdown.append(f"### Refined Complete Code\n{format_code_backticked_block(content['refined_complete_code'])}\n")

                if output:
                    markdown.append("### Execution Output\n")
                    markdown.append(f"```output\n{output}\n```\n")
                    # print("output2: ", output)
                    
                if json_outputs:
                    markdown.append("### Plotly JSON Outputs\n")
                    for idx, json_output in enumerate(json_outputs):
                        markdown.append(f"```plotly\n{json_output}\n```\n")
                # print("Length of json_outputs: ", len(json_outputs))

            # if agent_name is not None:  
            #     if f"memory_{agent_name}" in api_response:
            #         markdown.append(f"### Memory\n{api_response[f'memory_{agent_name}']}\n")

    except Exception as e:
        if "auth" in str(e).lower():
            return "**Error**: Authentication failed. Please check your API key in settings and try again."
        elif "model" in str(e).lower():
            return "**Error**: Model configuration error. Please verify your model selection in settings."
        else:
            return f"**Error**: An unexpected error occurred: {str(e)}"
    
    # for i, line in enumerate(markdown):
    #     print(f"Line {i+1}: {line[:100]}")
    if len(markdown) < 2 or len(markdown[-1]) < 15:
        return "No plan can be formulated without a defined goal. Please provide a specific goal for the analysis."
    return '\n'.join(markdown)


# Example usage with dummy data
if __name__ == "__main__":
    sample_response = {
        "code_combiner_agent": {
            "reasoning": "Sample reasoning for multiple charts.",
            "refined_complete_code": """
```python
import plotly.express as px
import pandas as pd

# Sample Data
df = pd.DataFrame({'Category': ['A', 'B', 'C'], 'Values': [10, 20, 30]})

# First Chart
fig = px.bar(df, x='Category', y='Values', title='Bar Chart')
fig.show()

# Second Chart
fig2 = px.pie(df, values='Values', names='Category', title='Pie Chart')
fig2.show()
```
"""
        }
    }

    formatted_md = format_response_to_markdown(sample_response)
    # print(formatted_md)

