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
        'json_outputs': []  # List to store multiple Plotly JSON outputs
    }

    # Modify code to store multiple JSON outputs
    # modify regex to match fig*.show()
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

    # read Housing.csv after the imports
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

    print(modified_code)

    try:
        with stdoutIO() as s:
            exec(modified_code, context)  # Execute the modified code
        output = s.getvalue()
        print("output: ", output)
        json_outputs = context.get('json_outputs', [])
        with open("json_outputs.json", "w") as f:
            json.dump(json_outputs, f, indent=4)
        return output, json_outputs
    except Exception as e:
        return "Error executing code: " + str(e), []


def format_response_to_markdown(api_response):
    markdown = []
    
    for agent, content in api_response.items():
        markdown.append(f"\n## {agent.replace('_', ' ').title()}\n")
        
        if 'reasoning' in content:
            markdown.append(f"### Reasoning\n{content['reasoning']}\n")
            
        if 'code' in content:
            markdown.append(f"### Code Implementation\n{format_code_backticked_block(content['code'])}\n")

        if 'commentary' in content:
            markdown.append(f"### Commentary\n{content['commentary']}\n")
            
        if 'refined_complete_code' in content:
            clean_code = format_code_block(content['refined_complete_code'])
            output, json_outputs = execute_code(clean_code)
            
            if output:
                markdown.append("### Execution Output\n")
                markdown.append(f"```output\n{output}\n```\n")
                print("output2: ", output)
                
            if json_outputs:
                markdown.append("### Plotly JSON Outputs\n")
                for idx, json_output in enumerate(json_outputs):
                    markdown.append(f"```plotly\n{json_output}\n```\n")
            print("Length of json_outputs: ", len(json_outputs))

    if len(markdown[0]) < 20:
        return "No plan can be formulated without a defined goal. Please provide a specific goal for the analysis."
    # print("Length of markdown: ", len(markdown), "markdown: ", markdown)
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

