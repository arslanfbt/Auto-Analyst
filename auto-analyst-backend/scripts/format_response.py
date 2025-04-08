import re
import json
import sys
import contextlib
from io import StringIO
import time
import logging
from src.utils.logger import Logger

logger = Logger(__name__, level="INFO", see_time=False, console_log=False)

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
    # Remove reading the csv file if it's already in the context
    code_clean = re.sub(r"df\s*=\s*pd\.read_csv\([\"\'].*?[\"\']\).*?(\n|$)", '', code_clean)
    
    # Remove the df = pd.DataFrame() if it's already in the context
    code_clean = re.sub(r"df\s*=\s*pd\.DataFrame\(\s*\).*?(\n|$)", '', code_clean)
    
    # Remove any data = ... statements including sample data creation
    code_clean = re.sub(r"data\s*=\s*.*?(\n|$)", '', code_clean)
    
    # Remove any dictionary/list assignments that look like sample data
    code_clean = re.sub(r"data\s*=\s*\{.*?\}.*?(\n|$)", '', code_clean)
    code_clean = re.sub(r"data\s*=\s*\[.*?\].*?(\n|$)", '', code_clean)
    
    # Remove dictionary key-value pairs with array data (like 'Date': [...], 'Price': [...])
    code_clean = re.sub(r"[\'\"][\w\s\&\%\$]+[\'\"]\s*:\s*\[.*?\],?", '', code_clean, flags=re.DOTALL)
    
    # Remove sample DataFrame creation blocks that include braces
    code_clean = re.sub(r"\{\s*[\'\"][\w\s\&\%\$]+[\'\"]\s*:\s*\[.*?\],?(\s*[\'\"][\w\s\&\%\$]+[\'\"]\s*:\s*\[.*?\],?)*\s*\}", '', code_clean, flags=re.DOTALL)
    
    # Remove plt.show() statements
    code_clean = re.sub(r"plt\.show\(\).*?(\n|$)", '', code_clean)
    
    # Remove df = pd.DataFrame(data) statements based on the image
    code_clean = re.sub(r"df\s*=\s*pd\.DataFrame\(data\).*?(\n|$)", '', code_clean)
    code_clean = re.sub(r"df\s*=\s*pd\.DataFrame\(\{.*?\}\).*?(\n|$)", '', code_clean, flags=re.DOTALL)
    
    # Remove sample dataframe lines with multiple array values
    code_clean = re.sub(r"# Sample DataFrames?.*?(\n|$)", '', code_clean, flags=re.MULTILINE)
    
    # Remove standalone curly braces (often leftover from data structure removal)
    code_clean = re.sub(r"^\s*}\s*$", '', code_clean, flags=re.MULTILINE)
    
    # Remove any lines that contain just whitespace and single characters (likely leftover from removals)
    code_clean = re.sub(r"^\s*[{}]\s*$", '', code_clean, flags=re.MULTILINE)
    
    # Remove empty lines that might have been created after cleaning
    code_clean = re.sub(r"\n\s*\n+", "\n\n", code_clean)
    
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
    
    # Remove reading the csv file if it's already in the context
    modified_code = re.sub(r"df\s*=\s*pd\.read_csv\([\"\'].*?[\"\']\).*?(\n|$)", '', modified_code)
    
    # Remove the df = pd.DataFrame() if it's already in the context
    modified_code = re.sub(r"df\s*=\s*pd\.DataFrame\(\s*\).*?(\n|$)", '', modified_code)
    
    # Remove any data = ... statements including sample data creation
    modified_code = re.sub(r"data\s*=\s*.*?(\n|$)", '', modified_code)
    
    # Remove any dictionary/list assignments that look like sample data
    modified_code = re.sub(r"data\s*=\s*\{.*?\}.*?(\n|$)", '', modified_code)
    modified_code = re.sub(r"data\s*=\s*\[.*?\].*?(\n|$)", '', modified_code)
    
    # Remove dictionary key-value pairs with array data (like 'Date': [...], 'Price': [...])
    modified_code = re.sub(r"[\'\"][\w\s\&\%\$]+[\'\"]\s*:\s*\[.*?\],?", '', modified_code, flags=re.DOTALL)
    
    # Remove sample DataFrame creation blocks that include braces
    modified_code = re.sub(r"\{\s*[\'\"][\w\s\&\%\$]+[\'\"]\s*:\s*\[.*?\],?(\s*[\'\"][\w\s\&\%\$]+[\'\"]\s*:\s*\[.*?\],?)*\s*\}", '', modified_code, flags=re.DOTALL)
    
    # Remove df = pd.DataFrame(data) statements based on the image
    modified_code = re.sub(r"df\s*=\s*pd\.DataFrame\(data\).*?(\n|$)", '', modified_code)
    modified_code = re.sub(r"df\s*=\s*pd\.DataFrame\(\{.*?\}\).*?(\n|$)", '', modified_code, flags=re.DOTALL)
    
    # Remove sample dataframe lines with multiple array values
    modified_code = re.sub(r"# Sample DataFrames?.*?(\n|$)", '', modified_code, flags=re.MULTILINE)
    
    # Remove standalone curly braces (often leftover from data structure removal)
    modified_code = re.sub(r"^\s*}\s*$", '', modified_code, flags=re.MULTILINE)
    
    # Remove any lines that contain just whitespace and single characters (likely leftover from removals)
    modified_code = re.sub(r"^\s*[{}]\s*$", '', modified_code, flags=re.MULTILINE)
    
    # Remove empty lines that might have been created after cleaning
    modified_code = re.sub(r"\n\s*\n+", "\n\n", modified_code)
    
    # Remove plt.show() statements
    modified_code = re.sub(r"plt\.show\(\).*?(\n|$)", '', modified_code)

    # Only add df = pd.read_csv() if no dataframe was provided and the code contains pd.read_csv
    if dataframe is None and 'pd.read_csv' not in modified_code:
        modified_code = re.sub(
            r'import pandas as pd',
            r'import pandas as pd\n\n# Read Housing.csv\ndf = pd.read_csv("Housing.csv")',
            modified_code
        )


    try:
        with stdoutIO() as s:
            exec(modified_code, context)  # Execute the modified code
        output = s.getvalue()
        json_outputs = context.get('json_outputs', [])

        return output, json_outputs
    except Exception as e:
        return "Error executing code: " + str(e), []


def format_response_to_markdown(api_response, agent_name = None, dataframe=None):
    try:
        markdown = []
        
        # Handle error responses
        if isinstance(api_response, dict) and "error" in api_response:
            return f"**Error**: {api_response['error']}"
                        
        if "response" in api_response and isinstance(api_response['response'], str):
            if any(err in api_response['response'].lower() for err in ["auth", "api", "lm"]):
                return "**Error**: Authentication failed. Please check your API key in settings and try again."
            if "model" in api_response['response'].lower():
                return "**Error**: Model configuration error. Please verify your model selection in settings."

        for agent, content in api_response.items():
            if "memory" in agent or not content:
                continue
                
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
                    output, json_outputs = execute_code_from_markdown(clean_code, dataframe)
                    if output:
                        markdown.append("### Execution Output\n")
                        markdown.append(f"```output\n{output}\n```\n")

                    if json_outputs:
                        markdown.append("### Plotly JSON Outputs\n")
                        for idx, json_output in enumerate(json_outputs):
                            if len(json_output) > 1000000:  # If JSON is larger than 1MB
                                logger.warning(f"Large JSON output detected: {len(json_output)} bytes")
                            markdown.append(f"```plotly\n{json_output}\n```\n")

            if 'summary' in content:
                # make the summary a bullet-point list
                summary_lines = content['summary'].split('\n')
                markdown.append("### Summary\n")
                for line in summary_lines:
                    markdown.append(f"• {line.strip().replace('•', '').replace('-', '')}\n")

            if 'refined_complete_code' in content:
                try:
                    clean_code = format_code_block(content['refined_complete_code']) 
                    output, json_outputs = execute_code_from_markdown(clean_code, dataframe)
                except Exception as e:
                    logger.error(f"Error in execute_code_from_markdown: {str(e)}")
                    markdown.append(f"**Error**: {str(e)}")
                    # continue
                
                markdown.append(f"### Refined Complete Code\n{format_code_backticked_block(content['refined_complete_code'])}\n")

                if output:
                    markdown.append("### Execution Output\n")
                    markdown.append(f"```output\n{output}\n```\n")
                    
                if json_outputs:
                    markdown.append("### Plotly JSON Outputs\n")
                    for idx, json_output in enumerate(json_outputs):
                        markdown.append(f"```plotly\n{json_output}\n```\n")

            # if agent_name is not None:  
            #     if f"memory_{agent_name}" in api_response:
            #         markdown.append(f"### Memory\n{api_response[f'memory_{agent_name}']}\n")

    except Exception as e:
        logger.error(f"Error in format_response_to_markdown: {str(e)}")
        return f"{str(e)}"
    
    logger.log_message(f"Generated markdown content for agent '{agent_name}' at {time.strftime('%Y-%m-%d %H:%M:%S')}: {markdown}, length: {len(markdown)}", level=logging.INFO)
    
    if not markdown or len(markdown) <= 1:
        return "Please provide a valid query..."
        
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

