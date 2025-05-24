import re
import json
import sys
import contextlib
from io import StringIO
import time
import logging
from src.utils.logger import Logger
import textwrap

logger = Logger(__name__, level="INFO", see_time=False, console_log=False)

@contextlib.contextmanager
def stdoutIO(stdout=None):
    old = sys.stdout
    if stdout is None:
        stdout = StringIO()
    sys.stdout = stdout
    yield stdout
    sys.stdout = old
    
# Precompile regex patterns for better performance
SENSITIVE_MODULES = re.compile(r"(os|sys|subprocess|dotenv|requests|http|socket|smtplib|ftplib|telnetlib|paramiko)")
IMPORT_PATTERN = re.compile(r"^\s*import\s+(" + SENSITIVE_MODULES.pattern + r").*?(\n|$)", re.MULTILINE)
FROM_IMPORT_PATTERN = re.compile(r"^\s*from\s+(" + SENSITIVE_MODULES.pattern + r").*?(\n|$)", re.MULTILINE)
DYNAMIC_IMPORT_PATTERN = re.compile(r"__import__\s*\(\s*['\"](" + SENSITIVE_MODULES.pattern + r")['\"].*?\)")
ENV_ACCESS_PATTERN = re.compile(r"(os\.getenv|os\.environ|load_dotenv|\.__import__\s*\(\s*['\"]os['\"].*?\.environ)")
FILE_ACCESS_PATTERN = re.compile(r"(open\(|read\(|write\(|file\(|with\s+open)")

# Enhanced API key detection patterns
API_KEY_PATTERNS = [
    # Direct key assignments
    re.compile(r"(?i)(api_?key|access_?token|secret_?key|auth_?token|password|credential|secret)s?\s*=\s*[\"\'][\w\-\+\/\=]{8,}[\"\']"),
    # Function calls with keys
    re.compile(r"(?i)\.set_api_key\(\s*[\"\'][\w\-\+\/\=]{8,}[\"\']"),
    # Dictionary assignments
    re.compile(r"(?i)['\"](?:api_?key|access_?token|secret_?key|auth_?token|password|credential|secret)['\"](?:\s*:\s*)[\"\'][\w\-\+\/\=]{8,}[\"\']"),
    # Common key formats (base64-like, hex)
    re.compile(r"[\"\'](?:[A-Za-z0-9\+\/\=]{32,}|[0-9a-fA-F]{32,})[\"\']"),
    # Bearer token pattern
    re.compile(r"[\"\'](Bearer\s+[\w\-\+\/\=]{8,})[\"\']"),
    # Inline URL with auth
    re.compile(r"https?:\/\/[\w\-\+\/\=]{8,}@")
]

# Network request patterns
NETWORK_REQUEST_PATTERNS = re.compile(r"(requests\.|urllib\.|http\.|\.post\(|\.get\(|\.connect\()")

def check_security_concerns(code_str):
    """Check code for security concerns and return info about what was found"""
    security_concerns = {
        "has_concern": False,
        "messages": [],
        "blocked_imports": False,
        "blocked_dynamic_imports": False,
        "blocked_env_access": False,
        "blocked_file_access": False,
        "blocked_api_keys": False,
        "blocked_network": False
    }
    
    # Check for sensitive imports
    if IMPORT_PATTERN.search(code_str) or FROM_IMPORT_PATTERN.search(code_str):
        security_concerns["has_concern"] = True
        security_concerns["blocked_imports"] = True
        security_concerns["messages"].append("Sensitive module imports blocked")
    
    # Check for __import__ bypass technique
    if DYNAMIC_IMPORT_PATTERN.search(code_str):
        security_concerns["has_concern"] = True
        security_concerns["blocked_dynamic_imports"] = True
        security_concerns["messages"].append("Dynamic import of sensitive modules blocked")
    
    # Check for environment variables access
    if ENV_ACCESS_PATTERN.search(code_str):
        security_concerns["has_concern"] = True
        security_concerns["blocked_env_access"] = True
        security_concerns["messages"].append("Environment variables access blocked")
    
    # Check for file operations
    if FILE_ACCESS_PATTERN.search(code_str):
        security_concerns["has_concern"] = True
        security_concerns["blocked_file_access"] = True
        security_concerns["messages"].append("File operations blocked")
    
    # Check for API key patterns
    for pattern in API_KEY_PATTERNS:
        if pattern.search(code_str):
            security_concerns["has_concern"] = True
            security_concerns["blocked_api_keys"] = True
            security_concerns["messages"].append("API key/token usage blocked")
            break
    
    # Check for network requests
    if NETWORK_REQUEST_PATTERNS.search(code_str):
        security_concerns["has_concern"] = True
        security_concerns["blocked_network"] = True
        security_concerns["messages"].append("Network requests blocked")
    
    return security_concerns

def clean_code_for_security(code_str, security_concerns):
    """Apply security modifications to the code based on detected concerns"""
    modified_code = code_str
    
    # Block sensitive imports if needed
    if security_concerns["blocked_imports"]:
        modified_code = IMPORT_PATTERN.sub(r'# BLOCKED: import \1\n', modified_code)
        modified_code = FROM_IMPORT_PATTERN.sub(r'# BLOCKED: from \1\n', modified_code)
    
    # Block dynamic imports if needed
    if security_concerns["blocked_dynamic_imports"]:
        modified_code = DYNAMIC_IMPORT_PATTERN.sub(r'"BLOCKED_DYNAMIC_IMPORT"', modified_code)
    
    # Block environment access if needed
    if security_concerns["blocked_env_access"]:
        modified_code = ENV_ACCESS_PATTERN.sub(r'"BLOCKED_ENV_ACCESS"', modified_code)
    
    # Block file operations if needed
    if security_concerns["blocked_file_access"]:
        modified_code = FILE_ACCESS_PATTERN.sub(r'"BLOCKED_FILE_ACCESS"', modified_code)
    
    # Block API keys if needed
    if security_concerns["blocked_api_keys"]:
        for pattern in API_KEY_PATTERNS:
            modified_code = pattern.sub(r'"BLOCKED_API_KEY"', modified_code)
    
    # Block network requests if needed
    if security_concerns["blocked_network"]:
        modified_code = NETWORK_REQUEST_PATTERNS.sub(r'"BLOCKED_NETWORK_REQUEST"', modified_code)
    
    # Add warning banner if needed
    if security_concerns["has_concern"]:
        security_message = "⚠️ SECURITY WARNING: " + ". ".join(security_concerns["messages"]) + "."
        modified_code = f"print('{security_message}')\n\n" + modified_code
    
    return modified_code
    
def clean_print_statements(code_block):
    """
    This function cleans up any `print()` statements that might contain unwanted `\n` characters.
    It ensures print statements are properly formatted without unnecessary newlines.
    """
    # This regex targets print statements, even if they have newlines inside
    return re.sub(r'print\((.*?)(\\n.*?)(.*?)\)', r'print(\1\3)', code_block, flags=re.DOTALL)

def remove_code_block_from_summary(summary):
    # use regex to remove code block from summary list
    summary = re.sub(r'```python\n(.*?)\n```', '', summary)
    return summary.split("\n")

def remove_main_block(code):
    # Match the __main__ block
    pattern = r'(?m)^if\s+__name__\s*==\s*["\']__main__["\']\s*:\s*\n((?:\s+.*\n?)*)'
    
    match = re.search(pattern, code)
    if match:
        main_block = match.group(1)
        
        # Dedent the code block inside __main__
        dedented_block = textwrap.dedent(main_block)
        
        # Remove \n from any print statements in the block (also handling multiline print cases)
        dedented_block = clean_print_statements(dedented_block)
        # Replace the block in the code
        cleaned_code = re.sub(pattern, dedented_block, code)
        
        # Optional: Remove leading newlines if any
        cleaned_code = cleaned_code.strip()
        
        return cleaned_code
    return code


def format_code_block(code_str):
    code_clean = re.sub(r'^```python\n?', '', code_str, flags=re.MULTILINE)
    code_clean = re.sub(r'\n```$', '', code_clean)
    return f'\n{code_clean}\n'

def format_code_backticked_block(code_str):
    code_clean = re.sub(r'^```python\n?', '', code_str, flags=re.MULTILINE)
    code_clean = re.sub(r'\n```$', '', code_clean)
    # Only match assignments at top level (not indented)
    # 1. Remove 'df = pd.DataFrame()' if it's at the top level
  
  
    # Remove reading the csv file if it's already in the context
    modified_code = re.sub(r"df\s*=\s*pd\.read_csv\([\"\'].*?[\"\']\).*?(\n|$)", '', code_clean)
    
    # Only match assignments at top level (not indented)
    # 1. Remove 'df = pd.DataFrame()' if it's at the top level
    modified_code = re.sub(
        r"^df\s*=\s*pd\.DataFrame\(\s*\)\s*(#.*)?$",
        '',
        modified_code,
        flags=re.MULTILINE
    )

    # # Remove sample dataframe lines with multiple array values
    modified_code = re.sub(r"^# Sample DataFrames?.*?(\n|$)", '', modified_code, flags=re.MULTILINE | re.IGNORECASE)
    
    # # Remove plt.show() statements
    modified_code = re.sub(r"plt\.show\(\).*?(\n|$)", '', modified_code)
    
    
    # remove main
    code_clean = remove_main_block(modified_code)
    
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
    import re
    import traceback
    import sys
    from io import StringIO

    # Check for security concerns in the code
    security_concerns = check_security_concerns(code_str)
    
    # Apply security modifications to the code
    modified_code = clean_code_for_security(code_str, security_concerns)
    
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
    modified_code = re.sub(
        r'(\w*_?)fig(\w*)\.show\(\)',
        r'json_outputs.append(plotly.io.to_json(\1fig\2, pretty=True))',
        modified_code
    )

    modified_code = re.sub(
        r'(\w*_?)fig(\w*)\.to_html\(.*?\)',
        r'json_outputs.append(plotly.io.to_json(\1fig\2, pretty=True))',
        modified_code
    )
    
    # Remove reading the csv file if it's already in the context
    modified_code = re.sub(r"df\s*=\s*pd\.read_csv\([\"\'].*?[\"\']\).*?(\n|$)", '', modified_code)
    
    # Only match assignments at top level (not indented)
    # 1. Remove 'df = pd.DataFrame()' if it's at the top level
    modified_code = re.sub(
        r"^df\s*=\s*pd\.DataFrame\(\s*\)\s*(#.*)?$",
        '',
        modified_code,
        flags=re.MULTILINE
    )

    # If a dataframe is provided, add it to the context
    if dataframe is not None:
        context['df'] = dataframe

    # remove pd.read_csv() if it's already in the context
    modified_code = re.sub(r"pd\.read_csv\(\s*[\"\'].*?[\"\']\s*\)", '', modified_code)

    # Remove sample dataframe lines with multiple array values
    modified_code = re.sub(r"^# Sample DataFrames?.*?(\n|$)", '', modified_code, flags=re.MULTILINE | re.IGNORECASE)
        
    # Remove plt.show() statements
    modified_code = re.sub(r"plt\.show\(\).*?(\n|$)", '', modified_code)
    
    # Only add df = pd.read_csv() if no dataframe was provided and the code contains pd.read_csv
    if dataframe is None and 'pd.read_csv' not in modified_code:
        modified_code = re.sub(
            r'import pandas as pd',
            r'import pandas as pd\n\n# Read Housing.csv\ndf = pd.read_csv("Housing.csv")',
            modified_code
        )

    # Identify code blocks by comments
    code_blocks = []
    current_block = []
    current_block_name = "unknown"
    
    for line in modified_code.splitlines():
        # Check if line contains a block identifier comment
        block_match = re.match(r'^# ([a-zA-Z_]+)_agent code start', line)
        if block_match:
            # If we had a previous block, save it
            if current_block:
                code_blocks.append((current_block_name, '\n'.join(current_block)))
            # Start a new block
            current_block_name = block_match.group(1)
            current_block = []
        else:
            current_block.append(line)
    
    # Add the last block if it exists
    if current_block:
        code_blocks.append((current_block_name, '\n'.join(current_block)))
    
    # Execute each code block separately
    all_outputs = []
    for block_name, block_code in code_blocks:
        try:
            with stdoutIO() as s:
                exec(block_code, context)  # Execute the block
            output = s.getvalue()
            all_outputs.append((block_name, output, None))  # None means no error
        except Exception as e:
            error_traceback = traceback.format_exc()
            
            # Extract error message and error type
            error_message = str(e)
            error_type = type(e).__name__
            error_lines = error_traceback.splitlines()
            
            # Format error with context of the actual code
            formatted_error = f"Error in {block_name}_agent: {error_message}\n"
            
            # Add first few lines of traceback
            first_lines = error_lines[:3]
            formatted_error += "\n".join(first_lines) + "\n"
            
            # Parse problem variables/values from the error message
            problem_vars = []
            
            # Look for common error patterns
            if "not in index" in error_message:
                # Extract column names for 'not in index' errors
                column_match = re.search(r"\['([^']+)'(?:, '([^']+)')*\] not in index", error_message)
                if column_match:
                    problem_vars = [g for g in column_match.groups() if g is not None]
                    
                    # Look for DataFrame accessing operations and list/variable definitions
                    potential_lines = []
                    code_lines = block_code.splitlines()
                    
                    # First, find all DataFrame column access patterns
                    df_access_patterns = []
                    for i, line in enumerate(code_lines):
                        # Find DataFrame variables from patterns like "df_name[...]" or "df_name.loc[...]"
                        df_matches = re.findall(r'(\w+)(?:\[|\.)(?:loc|iloc|columns|at|iat|\.select)', line)
                        for df_var in df_matches:
                            df_access_patterns.append((i, df_var))
                        
                        # Find variables that might contain column lists
                        for var in problem_vars:
                            if re.search(r'\b(numeric_columns|categorical_columns|columns|features|cols)\b', line):
                                potential_lines.append(i)
                    
                    # Identify the most likely problematic lines
                    if df_access_patterns:
                        for i, df_var in df_access_patterns:
                            if any(re.search(rf'{df_var}\[.*?\]', line) for line in code_lines):
                                potential_lines.append(i)
                    
                    # If no specific lines found yet, look for any DataFrame operations
                    if not potential_lines:
                        for i, line in enumerate(code_lines):
                            if re.search(r'(?:corr|drop|groupby|pivot|merge|join|concat|apply|map|filter|loc|iloc)\(', line):
                                potential_lines.append(i)
                    
                    # Sort and deduplicate
                    potential_lines = sorted(set(potential_lines))
            elif "name" in error_message and "is not defined" in error_message:
                # Extract variable name for NameError
                var_match = re.search(r"name '([^']+)' is not defined", error_message)
                if var_match:
                    problem_vars = [var_match.group(1)]
            elif "object has no attribute" in error_message:
                # Extract attribute name for AttributeError
                attr_match = re.search(r"'([^']+)' object has no attribute '([^']+)'", error_message)
                if attr_match:
                    problem_vars = [f"{attr_match.group(1)}.{attr_match.group(2)}"]
            
            # Scan code for lines containing the problem variables
            if problem_vars:
                formatted_error += "\nProblem likely in these lines:\n"
                code_lines = block_code.splitlines()
                problem_lines = []
                
                # First try direct variable references
                direct_matches = False
                for i, line in enumerate(code_lines):
                    if any(var in line for var in problem_vars):
                        direct_matches = True
                        # Get line and its context (1 line before and after)
                        start_idx = max(0, i-1)
                        end_idx = min(len(code_lines), i+2)
                        
                        for j in range(start_idx, end_idx):
                            line_prefix = f"{j+1}: "
                            if j == i:  # The line with the problem variable
                                problem_lines.append(f"{line_prefix}>>> {code_lines[j]} <<<")
                            else:
                                problem_lines.append(f"{line_prefix}{code_lines[j]}")
                        
                        problem_lines.append("") # Empty line between sections
                
                # If no direct matches found but we identified potential problematic lines for DataFrame issues
                if not direct_matches and "not in index" in error_message and 'potential_lines' in locals():
                    for i in potential_lines:
                        start_idx = max(0, i-1)
                        end_idx = min(len(code_lines), i+2)
                        
                        for j in range(start_idx, end_idx):
                            line_prefix = f"{j+1}: "
                            if j == i:
                                problem_lines.append(f"{line_prefix}>>> {code_lines[j]} <<<")
                            else:
                                problem_lines.append(f"{line_prefix}{code_lines[j]}")
                        
                        problem_lines.append("") # Empty line between sections
                
                if problem_lines:
                    formatted_error += "\n".join(problem_lines)
                else:
                    # Special message for column errors when we can't find the exact reference
                    if "not in index" in error_message:
                        formatted_error += (f"Unable to locate direct reference to columns: {', '.join(problem_vars)}\n"
                                           f"Check for variables that might contain these column names (like numeric_columns, "
                                           f"categorical_columns, etc.)\n")
                    else:
                        formatted_error += f"Unable to locate lines containing: {', '.join(problem_vars)}\n"
            else:
                # If we couldn't identify specific variables, check for line numbers in traceback
                for line in reversed(error_lines):  # Search from the end of traceback
                    # Look for user code references in the traceback
                    if ', line ' in line and '<module>' in line:
                        try:
                            line_num = int(re.search(r', line (\d+)', line).group(1))
                            code_lines = block_code.splitlines()
                            if 0 < line_num <= len(code_lines):
                                line_idx = line_num - 1
                                start_idx = max(0, line_idx-2)
                                end_idx = min(len(code_lines), line_idx+3)
                                
                                formatted_error += "\nProblem at this location:\n"
                                for i in range(start_idx, end_idx):
                                    line_prefix = f"{i+1}: "
                                    if i == line_idx:
                                        formatted_error += f"{line_prefix}>>> {code_lines[i]} <<<\n"
                                    else:
                                        formatted_error += f"{line_prefix}{code_lines[i]}\n"
                                break
                        except (ValueError, AttributeError, IndexError):
                            pass
            
            # Add the last few lines of the traceback
            formatted_error += "\nFull error details:\n"
            last_lines = error_lines[-3:]
            formatted_error += "\n".join(last_lines)
            
            all_outputs.append((block_name, None, formatted_error))
    
    # Compile all outputs and errors
    output_text = ""
    json_outputs = context.get('json_outputs', [])
    error_found = False
    
    for block_name, output, error in all_outputs:
        if error:
            output_text += f"\n\n=== ERROR IN {block_name.upper()}_AGENT ===\n{error}\n"
            error_found = True
        elif output:
            output_text += f"\n\n=== OUTPUT FROM {block_name.upper()}_AGENT ===\n{output}\n"
    
    if error_found:
        return output_text, []
    else:
        return output_text, json_outputs
    
    
def format_plan_instructions(plan_instructions):
    """
    Format any plan instructions (JSON string or dict) into markdown sections per agent.
    """
    # Parse input into a dict

    if "basic_qa_agent" in str(plan_instructions):
        return "**Non-Data Request**: Please ask a data related query, don't waste credits!"

    try:
        if isinstance(plan_instructions, str):
            try:
                instructions = json.loads(plan_instructions)
            except json.JSONDecodeError as e:
                # Try to clean the string if it's not valid JSON
                cleaned_str = plan_instructions.strip()
                if cleaned_str.startswith("'") and cleaned_str.endswith("'"):
                    cleaned_str = cleaned_str[1:-1]
                try:
                    instructions = json.loads(cleaned_str)
                except json.JSONDecodeError:
                    # raise ValueError(f"Invalid JSON format in plan instructions: {str(e)}")
                    instructions = plan_instructions
        elif isinstance(plan_instructions, dict):
            instructions = plan_instructions
        else:
            raise TypeError(f"Unsupported plan instructions type: {type(plan_instructions)}")
    except Exception as e:
        raise ValueError(f"Error processing plan instructions: {str(e)}")
    # logger.log_message(f"Plan instructions: {instructions}", level=logging.INFO)



    markdown_lines = []
    for agent, content in instructions.items():
        if agent != 'basic_qa_agent':
            agent_title = agent.replace('_', ' ').title()
            markdown_lines.append(f"#### {agent_title}")
            if isinstance(content, dict):
                # Handle 'create' key
                create_vals = content.get('create', [])
                if create_vals:
                    markdown_lines.append(f"- **Create**:")
                    for item in create_vals:
                        markdown_lines.append(f"  - {item}")
                else:
                    markdown_lines.append(f"- **Create**: None")
    
                # Handle 'use' key
                use_vals = content.get('use', [])
                if use_vals:
                    markdown_lines.append(f"- **Use**:")
                    for item in use_vals:
                        markdown_lines.append(f"  - {item}")
                else:
                    markdown_lines.append(f"- **Use**: None")
    
                # Handle 'instruction' key
                instr = content.get('instruction')
                if isinstance(instr, str) and instr:
                    markdown_lines.append(f"- **Instruction**: {instr}")
                else:
                    markdown_lines.append(f"- **Instruction**: None")
            else:
                # Fallback for non-dict content
                markdown_lines.append(f"- {content}")
            markdown_lines.append("")  # blank line between agents
        else:
            markdown_lines.append(f"**Non-Data Request**: {content.get('instruction')}")

    return "\n".join(markdown_lines).strip()

def format_complexity(instructions):
    markdown_lines = []
    # Extract complexity from various possible locations in the structure
    if isinstance(instructions, dict):
        # Case 1: Direct complexity field
        if 'complexity' in instructions:
            complexity = instructions['complexity']
        # Case 2: Complexity in 'plan' object
        elif 'plan' in instructions and isinstance(instructions['plan'], dict):
            if 'complexity' in instructions['plan']:
                complexity = instructions['plan']['complexity']
        else:
            complexity = "unrelated"
    
    if 'plan' in instructions and isinstance(instructions['plan'], str) and "basic_qa_agent" in instructions['plan']:
        complexity = "unrelated"
    
    if complexity:
        # Pink color scheme variations
        color_map = {
            "unrelated": "#FFB6B6",  # Light pink
            "basic": "#FF9E9E",      # Medium pink
            "intermediate": "#FF7F7F", # Main pink
            "advanced": "#FF5F5F"    # Dark pink
        }
        
        indicator_map = {
            "unrelated": "○",
            "basic": "●",
            "intermediate": "●●",
            "advanced": "●●●"
        }
        
        color = color_map.get(complexity.lower(), "#FFB6B6")  # Default to light pink
        indicator = indicator_map.get(complexity.lower(), "○")
        
        # Slightly larger display with pink styling
        markdown_lines.append(f"<div style='color: {color}; border: 2px solid {color}; padding: 2px 8px; border-radius: 12px; display: inline-block; font-size: 14.4px;'>{indicator} {complexity}</div>\n")

        return "\n".join(markdown_lines).strip()    

def format_response_to_markdown(api_response, agent_name = None, dataframe=None):
    try:
        markdown = []
        # logger.log_message(f"API response for {agent_name} at {time.strftime('%Y-%m-%d %H:%M:%S')}: {api_response}", level=logging.INFO)

        if isinstance(api_response, dict):
            for key in api_response:
                if "error" in api_response[key] and "litellm.RateLimitError" in api_response[key]['error'].lower():
                    return f"**Error**: Rate limit exceeded. Please try switching models from the settings."
                # You can add more checks here if needed for other keys
                       
        # Handle error responses
        if isinstance(api_response, dict) and "error" in api_response:
            return f"**Error**: {api_response['error']}"
        if "response" in api_response and isinstance(api_response['response'], str):
            if any(err in api_response['response'].lower() for err in ["auth", "api", "lm"]):
                return "**Error**: Authentication failed. Please check your API key in settings and try again."
            if "model" in api_response['response'].lower():
                return "**Error**: Model configuration error. Please verify your model selection in settings."

        for agent, content in api_response.items():
            agent = agent.split("__")[0] if "__" in agent else agent
            if "memory" in agent or not content:
                continue
            
            if "complexity" in content:
                markdown.append(f"{format_complexity(content)}\n")
                
            markdown.append(f"\n## {agent.replace('_', ' ').title()}\n")
            
            if agent == "analytical_planner":
                logger.log_message(f"Analytical planner content: {content}", level=logging.INFO)
                if 'plan_desc' in content:
                    markdown.append(f"### Reasoning\n{content['plan_desc']}\n")
                if 'plan_instructions' in content:
                    markdown.append(f"{format_plan_instructions(content['plan_instructions'])}\n")
                else:
                    markdown.append(f"### Reasoning\n{content['rationale']}\n")
            else:  
                if "rationale" in content:
                    markdown.append(f"### Reasoning\n{content['rationale']}\n")

            if 'code' in content:
                markdown.append(f"### Code Implementation\n{format_code_backticked_block(content['code'])}\n")
            if 'answer' in content:
                markdown.append(f"### Answer\n{content['answer']}\n Please ask a query about the data")
                # if agent_name is not None:
                #     # execute the code
                #     clean_code = format_code_block(content['code'])
                #     output, json_outputs = execute_code_from_markdown(clean_code, dataframe)
                #     if output:
                #         markdown.append("### Execution Output\n")
                #         markdown.append(f"```output\n{output}\n```\n")

                #     if json_outputs:
                #         markdown.append("### Plotly JSON Outputs\n")
                #         for idx, json_output in enumerate(json_outputs):
                #             if len(json_output) > 1000000:  # If JSON is larger than 1MB
                #                 logger.log_message(f"Large JSON output detected: {len(json_output)} bytes", level=logging.WARNING)
                #             markdown.append(f"```plotly\n{json_output}\n```\n")

            if 'summary' in content:
                # make the summary a bullet-point list
                summary_lines = remove_code_block_from_summary(content['summary'])
                summary_lines = content['summary'].split('\n')
                # remove code block from summary
                markdown.append("### Summary\n")
                for line in summary_lines:
                    if line != "":
                        if line.strip().startswith('•') or line.strip().startswith('-') or line.strip().startswith('*'):
                            line = line.strip().replace('•', '').replace('-', '').replace('*', '')
                            markdown.append(f"* {line.strip()}\n")
                        else:
                            markdown.append(f"{line.strip()}\n")

            if 'refined_complete_code' in content and 'summary' in content:
                try:
                    if content['refined_complete_code'] is not None and content['refined_complete_code'] != "":
                        clean_code = format_code_block(content['refined_complete_code']) 
                        markdown_code = format_code_backticked_block(content['refined_complete_code'])
                        output, json_outputs = execute_code_from_markdown(clean_code, dataframe)
                    elif "```python" in content['summary']:
                        clean_code = format_code_block(content['summary'])
                        markdown_code = format_code_backticked_block(content['summary'])
                        output, json_outputs = execute_code_from_markdown(clean_code, dataframe)
                except Exception as e:
                    logger.log_message(f"Error in execute_code_from_markdown: {str(e)}", level=logging.ERROR)
                    markdown_code = f"**Error**: {str(e)}"
                    # continue
                
                if markdown_code is not None:
                    markdown.append(f"### Refined Complete Code\n{markdown_code}\n")
                
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
        logger.log_message(f"Error in format_response_to_markdown: {str(e)}", level=logging.ERROR)
        return f"{str(e)}"
        
    # logger.log_message(f"Generated markdown content for agent '{agent_name}' at {time.strftime('%Y-%m-%d %H:%M:%S')}: {markdown}, length: {len(markdown)}", level=logging.INFO)
    
    if not markdown or len(markdown) <= 1:
        logger.log_message(
            f"Invalid markdown content for agent '{agent_name}' at {time.strftime('%Y-%m-%d %H:%M:%S')}: "
            f"Content: '{markdown}', Type: {type(markdown)}, Length: {len(markdown) if markdown else 0}, "
            f"API Response: {api_response}",
            level=logging.ERROR
        )
        return " "
        
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