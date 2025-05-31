import dspy
import asyncio
from src.agents.agents import planner_data_viz_agent, planner_preprocessing_agent, planner_sk_learn_agent, planner_statistical_analytics_agent
from src.agents.agents import data_viz_agent,preprocessing_agent,statistical_analytics_agent,sk_learn_agent
from src.agents.agents import PLANNER_AGENTS_WITH_DESCRIPTION, AGENTS_WITH_DESCRIPTION
import ast
import json
import markdown
from bs4 import BeautifulSoup
import numpy as np
import pandas as pd


class deep_questions(dspy.Signature):
    """
You are a data analysis assistant.

Your role is to take a user’s high-level analytical goal and generate a set of deep, targeted follow-up questions. These questions should guide an analyst toward a more thorough understanding of the goal by encouraging exploration, segmentation, and causal reasoning.

Instructions:
- Generate up to 5 insightful, data-relevant questions.
- Use the dataset structure to tailor your questions (e.g., look at the available columns, data types, and what kind of information they can reveal).
- The questions should help the user decompose their analytic goal and explore it from multiple angles (e.g., time trends, customer segments, usage behavior, external factors, feedback).
- Each question should be specific enough to guide actionable analysis or investigation.
- Use a clear and concise style, but maintain depth.

Inputs:
- goal: The user’s analytical goal or main question they want to explore
- dataset_info: A description of the dataset the user is querying, including:
    - What the dataset represents
    - Key columns and their data types

Output:
- deep_questions: A list of up to 5 specific, data-driven questions that support the analytic goal

---

Example:

Analytical Goal:
Understand why churn has been rising

Dataset Info:
Customer Retention Dataset tracking subscription activity over time.  
Columns:
- customer_id (string)
- join_date (date)
- churn_date (date, nullable)
- is_churned (boolean)
- plan_type (string: 'basic', 'premium', 'enterprise')
- region (string)
- last_login_date (date)
- avg_weekly_logins (float)
- support_tickets_last_30d (int)
- satisfaction_score (float, 0–10 scale)

Decomposed Questions:
1. How has the churn rate changed month-over-month, and during which periods was the increase most pronounced?
2. Are specific plan types or regions showing a higher churn rate relative to others?
3. What is the average satisfaction score and support ticket count among churned users compared to retained users?
4. Do churned users exhibit different login behavior (e.g., avg_weekly_logins) in the weeks leading up to their churn date?
5. What is the tenure distribution (time from join_date to churn_date) among churned customers, and are short-tenure users more likely to churn?

    """
    goal = dspy.InputField(desc="User analytical goal — what main insight or question they want to answer")
    dataset_info = dspy.InputField(desc="A description of the dataset: what it represents, and the main columns with data types")
    deep_questions = dspy.OutputField(desc="A list of up to five questions that help deeply explore the analytical goal using the dataset")

class deep_synthesizer(dspy.Signature):
    """
You are a data analysis synthesis expert.

Your job is to take the outputs from a multi-agent data analytics system - including the original user query, the code summaries from each agent, and the actual printed results from running those code blocks - and synthesize them into a comprehensive, well-structured final report.

This report should:
- Explain what steps were taken and why (based on the query)
- Summarize the code logic used by each agent, without including raw code
- Highlight key findings and results from the code outputs
- Offer clear, actionable insights tied back to the user's original question
- Be structured, readable, and suitable for decision-makers or analysts

Instructions:
- Begin with a brief restatement of the original query and what it aimed to solve
- Organize your report step-by-step or by analytical theme (e.g., segmentation, trend analysis, etc.)
- For each part, summarize what was analyzed, how (based on code summaries), and what the result was (based on printed output)
- End with a final set of synthesized conclusions and potential next steps or recommendations

Inputs:
- query: The user's original analytical question or goal
- summaries: A list of natural language descriptions of what each agent's code did
- print_outputs: A list of printed outputs (results) from running each agent's code

Output:
- synthesized_report: A structured and readable report that ties all parts together, grounded in the code logic and results

Example use:
You are not just summarizing outputs - you're telling a story that answers the user's query using real data.
    """

    query = dspy.InputField(desc="The original user query or analytical goal")
    summaries = dspy.InputField(desc="List of code summaries - each describing what a particular agent's code did")
    print_outputs = dspy.InputField(desc="List of print outputs - the actual data insights generated by the code")
    synthesized_report = dspy.OutputField(desc="The final, structured report that synthesizes all the information into clear insights")

def clean_and_store_code(code):
    """
    Cleans and stores code execution results in a standardized format.
    Safely handles execution errors and returns clean output even if execution fails.
    Ensures plotly figures are properly created and captured.
    
    Args:
        code (str): Raw code text to execute
        
    Returns:
        dict: Dictionary containing execution results with keys:
            - exec_result: Result of code execution (None if failed)
            - printed_output: Captured stdout output
            - plotly_figs: List of any plotly figures generated
            - error: Error message if execution failed, None otherwise
    """
    # Check if code contains markdown code block markers
    # If found, extract the Python code between them
    # Otherwise use the entire code string
    # Replace triple double quotes with triple single quotes to avoid parsing issues
    if "```python" in code:
        # Replace quotes first to avoid string parsing issues
        code = code.replace('"""', "'''")
        # Get code between markers
        parts = code.split("```python")
        code_text = parts[1].split("```")[0] if len(parts) > 1 else code
    else:
        code_text = code.replace('"""', "'''")
    
    # Fix try statement syntax
    code_text = code_text.replace('try\n', 'try:\n')
    
    # Remove code patterns that would make the code unrunnable
    invalid_patterns = [
        '```', # Code block markers
        '"""', # Triple double quotes
        "'''", # Triple single quotes
        '\\n', # Raw newlines
        '\\t', # Raw tabs
        '\\r', # Raw carriage returns
        '\\',  # Raw backslashes
    ]
    
    for pattern in invalid_patterns:
        if pattern in code_text:
            code_text = code_text.replace(pattern, '')
            
    # Capture stdout using StringIO
    from io import StringIO
    import sys
    import plotly.graph_objects as go
    stdout_capture = StringIO()
    original_stdout = sys.stdout
    sys.stdout = stdout_capture
    
    # Execute code in a new namespace to avoid polluting globals
    local_vars = {}
    exec_output = exec(code_text, globals(), local_vars)
    
    # Capture any plotly figures from local namespace
    plotly_figs = []
    for var_name, var in local_vars.items():
        # Check for plotly figures
        if isinstance(var, go.Figure):
            # Ensure figure is properly configured
            if not var.layout.title:
                var.update_layout(title=f"Figure {len(plotly_figs) + 1}")
            if not var.layout.template:
                var.update_layout(template="plotly_white")
            plotly_figs.append(var)
        # Also check for lists/tuples that might contain figures
        elif isinstance(var, (list, tuple)):
            for item in var:
                if isinstance(item, go.Figure):
                    if not item.layout.title:
                        item.update_layout(title=f"Figure {len(plotly_figs) + 1}")
                    if not item.layout.template:
                        item.update_layout(template="plotly_white")
                    plotly_figs.append(item)
    
    # Restore stdout and get captured output
    sys.stdout = original_stdout
    captured_output = stdout_capture.getvalue()
    stdout_capture.close()
    
    return {
        'exec_result': exec_output,
        'printed_output': captured_output,
        'plotly_figs': plotly_figs
    }

def score_code(args,code):
    """
    Cleans and stores code execution results in a standardized format.
    Safely handles execution errors and returns clean output even if execution fails.
    Ensures plotly figures are properly created and captured.
    
    Args:
        code (str): Raw code text to execute
        
    Returns:
        dict: Dictionary containing execution results with keys:
            - exec_result: Result of code execution (None if failed)
            - printed_output: Captured stdout output
            - plotly_figs: List of any plotly figures generated
            - error: Error message if execution failed, None otherwise
            - score: Integer score (0=error, 1=success, 2=success with plots)
    """
    code = code.combined_code
    try:
        # Check if code contains markdown code block markers
        if "```python" in code:
            code = code.replace('"""', "'''")
            parts = code.split("```python")
            code_text = parts[1].split("```")[0] if len(parts) > 1 else code
        else:
            code_text = code.replace('"""', "'''")
        
        # Fix try statement syntax
        code_text = code_text.replace('try\n', 'try:\n')
        
        # Remove code patterns that would make the code unrunnable
        invalid_patterns = [
            '```', '"""', "'''", '\\n', '\\t', '\\r', '\\'
        ]
        
        for pattern in invalid_patterns:
            if pattern in code_text:
                code_text = code_text.replace(pattern, '')
                
        # Capture stdout using StringIO
        from io import StringIO
        import sys
        import plotly.graph_objects as go
        stdout_capture = StringIO()
        original_stdout = sys.stdout
        sys.stdout = stdout_capture
        
        # Execute code in a new namespace to avoid polluting globals
        local_vars = {}
        exec(code_text, globals(), local_vars)
        
        # Capture any plotly figures from local namespace
        plotly_figs = []
        for var_name, var in local_vars.items():
            if isinstance(var, go.Figure):
                if not var.layout.title:
                    var.update_layout(title=f"Figure {len(plotly_figs) + 1}")
                if not var.layout.template:
                    var.update_layout(template="plotly_white")
                plotly_figs.append(var)
            elif isinstance(var, (list, tuple)):
                for item in var:
                    if isinstance(item, go.Figure):
                        if not item.layout.title:
                            item.update_layout(title=f"Figure {len(plotly_figs) + 1}")
                        if not item.layout.template:
                            item.update_layout(template="plotly_white")
                        plotly_figs.append(item)
        
        # Restore stdout and get captured output
        sys.stdout = original_stdout
        captured_output = stdout_capture.getvalue()
        stdout_capture.close()
        
        # Calculate score based on execution and plot generation
        score = 2 if plotly_figs else 1
        
        return score
        
    except Exception as e:
        # Restore stdout in case of error
        if 'stdout_capture' in locals():
            sys.stdout = original_stdout
            stdout_capture.close()
            
        return 0

class deep_planner(dspy.Signature):
    """
    You are an advanced multi-question planning agent. Your task is to generate the most optimized and minimal plan
    to answer up to 5 analytical questions using available agents.

    Your responsibilities:
    1. Feasibility: Verify that the goal is achievable using the provided datasets and agent descriptions.
    2. Optimization: 
       - Batch up to 2 similar questions per agent call.
       - Reuse outputs across questions wherever possible.
       - Avoid unnecessary agents or redundant processing.
       - Minimize total agent calls while preserving correctness.
    3. Clarity: 
       - Define clear variable usage (create/use).
       - Specify concise step-by-step instructions per agent.
       - Use dependency arrows (->) to indicate required agent outputs used by others.

    Inputs:
    - deep_questions: A list of up to 5 deep analytical questions (e.g., ["q1", "q2", ..., "q5"])
    - dataset: The available dataset(s) in memory or context
    - agents_desc: Dictionary containing each agent's name and its capabilities or descriptions

    Outputs:
    - plan_instructions: Detailed per-agent variable flow and functionality in the format:
        {
            "agent_x": {
                "create": ["cleaned_data: DataFrame - cleaned version of the input dataset"],
                "use": ["df: DataFrame - raw input dataset"],
                "instruction": "Clean the dataset by handling null values and standardizing formats."
            },
            "agent_y": {
                "create": ["analysis_results: dict - results of correlation analysis"],
                "use": ["cleaned_data: DataFrame - output from @agent_x"],
                "instruction": "Perform correlation analysis to identify strong predictors."
            }
        }

    Output Goal:
    Generate a small, clean, optimized execution plan using minimal agent calls, reusable outputs, and well-structured dependencies.
    USE THE EXACT NAME OF THE AGENTS IN THE INSTRUCTIONS
    """

    deep_questions = dspy.InputField(desc="List of up to 5 deep analytical questions to answer")
    dataset = dspy.InputField(desc="Available datasets, use 'df' as the working dataset")
    agents_desc = dspy.InputField(desc="Descriptions of available agents and their functions")
    plan_instructions = dspy.OutputField(desc="Variable-level instructions for each agent used in the plan")

class deep_plan_fixer(dspy.Signature):
    """
    You are a plan instruction fixer agent. Your task is to take potentially malformed plan instructions
    and convert them into a properly structured dictionary format that can be safely evaluated.

    Your responsibilities:
    1. Parse and validate the input plan instructions
    2. Convert the instructions into a proper dictionary format
    3. Ensure all agent instructions follow the required structure:
       {
           "@agent_name": {
               "create": ["variable: type - description"],
               "use": ["variable: type - description"],
               "instruction": "clear instruction text"
           }
       }
    4. Handle any malformed or missing components
    5. Return a properly formatted dictionary string that can be safely evaluated

    Inputs:
    - plan_instructions: The potentially malformed plan instructions to fix

    Outputs:
    - fixed_plan: A properly formatted dictionary string that can be safely evaluated
    """

    plan_instructions = dspy.InputField(desc="The potentially malformed plan instructions to fix")
    fixed_plan = dspy.OutputField(desc="Properly formatted dictionary string that can be safely evaluated")

class final_conclusion(dspy.Signature):
    """
You are a high-level analytics reasoning engine.

Your task is to take multiple synthesized analytical results (each answering part of the original query) and produce a cohesive final conclusion that directly addresses the user’s original question.

This is not just a summary — it’s a judgment. Use evidence from the synthesized findings to:
- Answer the original question with clarity
- Highlight the most important insights
- Offer any causal reasoning or patterns discovered
- Suggest next steps or strategic recommendations where appropriate

Instructions:
- Focus on relevance to the original query
- Do not just repeat what the synthesized sections say — instead, infer, interpret, and connect dots
- Prioritize clarity and insight over detail
- End with a brief “Next Steps” section if applicable

Inputs:
- query: The original user question or goal
- synthesized_sections: A list of synthesized result sections from the deep_synthesizer step (each covering part of the analysis)

Output:
- final_summary: A cohesive final conclusion that addresses the query, draws insight, and offers high-level guidance

---

Example Output Structure:

**Conclusion**  
Summarize the overall answer to the user’s question, using the most compelling evidence across the synthesized sections.

**Key Takeaways**  
- Bullet 1  
- Bullet 2  
- Bullet 3  

**Recommended Next Steps**  
(Optional based on context)

    """

    query = dspy.InputField(desc="The user's original query or analytical goal")
    synthesized_sections = dspy.InputField(desc="List of synthesized outputs — each one corresponding to a sub-part of the analysis")
    final_conclusion = dspy.OutputField(desc="A cohesive, conclusive answer that addresses the query and integrates key insights")




class deep_code_synthesizer(dspy.Signature):
    """
You are a code synthesis and optimization engine that combines and fixes code from multiple analytical agents.

Your task is to take code outputs from preprocessing, statistical analysis, machine learning, and visualization agents, then:
- Combine them into a single, coherent analysis pipeline
- Fix any errors or inconsistencies between agent outputs
- Ensure proper data flow between steps
- Optimize the combined code for efficiency
- Add necessary imports and dependencies
- Handle any data type mismatches or conversion issues
- Validate and normalize data types between agent outputs (e.g., ensure DataFrame operations maintain DataFrame type)
- Convert between common data structures (lists, dicts, DataFrames) as needed
- Add type hints and validation checks
- Ensure consistent variable naming across agents
- Ensure all visualizations use Plotly exclusively
- Create comprehensive visualizations that show all important variables and relationships
- Store all Plotly figures in a list for later use in the report

Instructions:
- Review each agent's code for correctness and completeness
- Ensure variables are properly passed between steps with consistent types
- Fix any syntax errors or logical issues
- Add error handling and type validation where needed
- Optimize code structure and performance
- Maintain consistent coding style
- Add clear comments explaining the analysis flow
- Add data type conversion functions where needed
- Validate input/output types between agent steps
- Handle edge cases where agents might return different data structures
- Convert any non-Plotly visualizations to Plotly format
- Ensure all important variables are visualized appropriately
- Store all Plotly figures in a list called plotly_figs
- Include appropriate titles, labels, and legends for all visualizations
- Use consistent styling across all Plotly visualizations
- DONOT COMMENT OUR ANYTHING AS THE CODE SHOULD RUN & SHOW OUTPUTS
- THE DATASET IS ALREADY LOADED, DON'T CREATE FAKE DATA. 'df' is always loaded

Inputs:
- deep_questions- The five deep questions this system is answering
- dataset_info - Information about the dataset structure and types
- planner_instructions - the plan according to the planner, ensure that the final code makes everything coherent
- code - List of all agent code


Output:
- combined_code: - A single, optimized Python script that combines all analysis steps with proper type handling and Plotly visualizations

"""
    deep_questions = dspy.InputField(desc="The five deep questions this system is answering")
    dataset_info = dspy.InputField(desc="Information about the dataset")
    planner_instructions = dspy.InputField(desc="The planner instructions for each")
    code = dspy.InputField(desc="The code generated by all agents")
    combined_code = dspy.OutputField(desc="A single, optimized Python script that combines all analysis steps")

class deep_code_fix(dspy.Signature):
    """
    You are a code debugging and fixing agent that analyzes and repairs code errors.
    
    Your task is to:
    - Analyze error messages and identify root causes
    - Fix syntax errors, logical issues, and runtime problems
    - Ensure proper data type handling and conversions
    - Add appropriate error handling and validation
    - Maintain code style and documentation
    - Preserve the original analysis intent
    
    Instructions:
    - Carefully analyze the error message and stack trace
    - Identify the specific line(s) causing the error
    - Determine if the issue is syntax, logic, or runtime related
    - Fix the code while maintaining its original purpose
    - Add appropriate error handling if needed
    - Ensure the fix doesn't introduce new issues
    - Document the changes made
    
    Inputs:
    - code: The code that generated the error
    - error: The error message and stack trace
    
    Output:
    - fixed_code: The repaired code with error handling
    - fix_explanation: Explanation of what was fixed and why
    """
    code = dspy.InputField(desc="The code that generated the error")
    error = dspy.InputField(desc="The error message and stack trace")
    fixed_code = dspy.OutputField(desc="The repaired code with error handling")
    fix_explanation = dspy.OutputField(desc="Explanation of what was fixed and why")


chart_instructions = """
Chart Styling Guidelines:

1. General Styling:
   - Use a clean, professional color palette (e.g., Tableau, ColorBrewer)
   - Include clear titles and axis labels
   - Add appropriate legends
   - Use consistent font sizes and styles
   - Include grid lines where helpful
   - Add hover information for interactive plots

2. Specific Chart Types:
   - Bar Charts:
     * Use horizontal bars for many categories
     * Sort bars by value when appropriate
     * Use consistent bar widths
     * Add value labels on bars
   
   - Line Charts:
     * Use distinct line styles/colors
     * Add markers at data points
     * Include trend lines when relevant
     * Show confidence intervals if applicable
   
   - Scatter Plots:
     * Use appropriate marker sizes
     * Add regression lines when needed
     * Use color to show additional dimensions
     * Include density contours for large datasets
   
   - Heatmaps:
     * Use diverging color schemes for correlation
     * Include value annotations
     * Sort rows/columns by similarity
     * Add clear color scale legend

3. Data Visualization Best Practices:
   - Start axes at zero when appropriate
   - Use log scales for wide-ranging data
   - Include reference lines/benchmarks
   - Add annotations for important points
   - Show uncertainty where relevant
   - Use consistent color encoding
   - Include data source and timestamp
   - Add clear figure captions

4. Interactive Features:
   - Enable zooming and panning
   - Add tooltips with detailed information
   - Include download options
   - Allow toggling of data series
   - Enable cross-filtering between charts

5. Accessibility:
   - Use colorblind-friendly palettes
   - Include alt text for all visualizations
   - Ensure sufficient contrast
   - Make interactive elements keyboard accessible
   - Provide text alternatives for key insights
"""



class deep_analysis_module(dspy.Module):
    def __init__(self,agents, agents_desc):
        self.agents = agents
        self.deep_questions = dspy.Predict(deep_questions)
        self.deep_planner = dspy.ChainOfThought(deep_planner)
        self.deep_synthesizer = dspy.ChainOfThought(deep_synthesizer)
        self.deep_code_synthesizer = dspy.Predict(deep_code_synthesizer)
        self.deep_plan_fixer = dspy.ChainOfThought(deep_plan_fixer)
        self.deep_code_fixer = dspy.ChainOfThought(deep_code_fix)
        self.styling_instructions = chart_instructions
        self.agents_desc = agents_desc
        self.final_conclusion = dspy.ChainOfThought(final_conclusion)

    async def execute_deep_analysis(self,goal, dataset_info):
        questions = self.deep_questions(goal = goal, dataset_info=dataset_info)
        # Convert the deep questions into a dictionary with numbered keys
        print("Questions generated")
        question_list = [q.strip() for q in questions.deep_questions.split('\n') if q.strip()]
        deep_plan = self.deep_planner(deep_questions = questions.deep_questions, dataset=dataset_info, agents_desc=str(self.agents_desc))
        print("Plan created")
        try:
            # First try to safely evaluate the string representation of the dictionary
            plan_instructions = ast.literal_eval(deep_plan.plan_instructions)
            if not isinstance(plan_instructions, dict):
                # If not a dict, try to parse it as JSON
                plan_instructions = json.loads(deep_plan.plan_instructions)
            keys = [key for key in plan_instructions.keys()]
            try:
                if not all(key in self.agents for key in keys):
                    raise ValueError(f"Invalid agent key(s) in plan instructions. Available agents: {list(self.agents.keys())}")
            except ValueError as e:
                print("Error with agent keys:", e)
                raise e

        except (ValueError, SyntaxError, json.JSONDecodeError) as e:
            try:
                deep_plan = self.deep_plan_fixer(plan_instructions=deep_plan.plan_instructions)
                plan_instructions = ast.literal_eval(deep_plan.fixed_plan)
                if not isinstance(plan_instructions, dict):
                    # If not a dict, try to parse it as JSON
                    plan_instructions = json.loads(deep_plan.fixed_plan)
                keys = [key for key in plan_instructions.keys()]

            except (ValueError, SyntaxError, json.JSONDecodeError) as e: 
                print("Error parsing plan instructions:", e)
                print("Raw plan instructions:", dict(deep_plan))
        # print(plan)
        print("Instructions parsed")

        queries = [
                dspy.Example(
                    goal=questions.deep_questions,
                    dataset=dataset_info,
                    **({"plan_instructions": str(plan_instructions[key])} if "planner" in key else {}),
                    **({"styling_index": "Sample styling guidelines"} if "data_viz" in key else {})
                ).with_inputs(
                    "goal",
                    "dataset",
                    *(["plan_instructions"] if "planner" in key else []),
                    *(["styling_index"] if "data_viz" in key else [])
                )
                for key in keys
            ]

        tasks = [self.agents[key](**q) for q, key in zip(queries,keys)]
        

        
        # Await all tasks to complete
        summaries = []
        codes = []
        plotly_figs = []
        print_outputs = []
        synthesis = []
        print("Tasks started")
        i =0
        for task in asyncio.as_completed(tasks):
            result = await task
            summaries.append(result.summary)
            codes.append(result.code)
            print("Done with this :"+keys[i])
            i+=1

        # code = ''.join(codes)
        code = [c.replace('"""',"'''").split("```python")[1].replace('try\n','try:\n').split("```")[0] for c in codes]
        deep_coder = dspy.Refine(module=self.deep_code_synthesizer, N=3, reward_fn=score_code, threshold=1.0, fail_count=2)
        with dspy.settings.context(lm = dspy.LM("anthropic/claude-4-opus-20250514", api_key = os.environ['ANTHROPIC_API_KEY'], max_tokens=17000)):
            import datetime
            print("Starting code generation...")
            start_time = datetime.datetime.now()
            print(f"Code generation started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
            # examples = [dspy.Example(deep_questions=str(questions.deep_questions), dataset_info=dataset_info,planner_instructions=str(plan_instructions), code=str(code)).with_inputs('deep_questions','dataset_info','planner_instructions','code')]
            deep_code = deep_coder(deep_questions=str(questions.deep_questions), dataset_info=dataset_info,planner_instructions=str(plan_instructions), code=str(code))
            print(f"Code generation completed at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        code = deep_code.combined_code
        print(code)
        output = clean_and_store_code(code)
        
        print("Deep Code generated")
        
        print_outputs.append(output['printed_output'])
        plotly_figs.append(output['plotly_figs'])
        # with dspy.settings.context(lm = dspy.LM("gemini/gemini-2.5-pro-preview-03-25", api_key = os.environ['GEMINI_API_KEY'], max_tokens=25000)):
        synthesis.append(self.deep_synthesizer(query=goal, summaries = str(summaries), print_outputs = str(output['printed_output'])))
            
        # with dspy.settings.context(lm = dspy.LM("gemini/gemini-2.5-pro-preview-03-25", api_key = os.environ['GEMINI_API_KEY'], max_tokens=35000)):
        print("Synthesis done")
        final_conclusion = self.final_conclusion(query=goal, synthesized_sections =str([s.synthesized_report for s in synthesis ]))

        print("Conclusion Made")
        return_dict = {'goal':goal, 'deep_questions':questions.deep_questions, 'deep_plan':deep_plan.plan_instructions, 'summaries':summaries, 'code':deep_code.combined_code, 'plotly_figs':plotly_figs,
                  'synthesis':[s.synthesized_report for s in synthesis ], 'final_conclusion':final_conclusion.final_conclusion }

        return return_dict
    
def generate_html_report(return_dict):
    """Generate a clean HTML report focusing on visualizations and key insights"""
    
    def convert_markdown_to_html(text):
        """Convert markdown text to HTML safely"""
        if not text:
            return ""
        text = str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        html = markdown.markdown(text, extensions=['tables', 'fenced_code'])
        return str(BeautifulSoup(html, 'html.parser'))

    # Convert key text sections to HTML
    summaries = [convert_markdown_to_html(s) for s in return_dict['summaries']]
    goal = convert_markdown_to_html(return_dict['goal'])
    questions = convert_markdown_to_html(return_dict['deep_questions'])
    conclusion = convert_markdown_to_html(return_dict['final_conclusion'])
    synthesis = ''.join(f'<div class="synthesis-section">{convert_markdown_to_html(s)}</div>' 
                       for s in return_dict['synthesis'])

    # Generate visualization sections
    viz_sections = []
    for i, summary in enumerate(summaries):
        viz_html = ''
        if return_dict['plotly_figs'] and i < len(return_dict['plotly_figs']):
            viz_html = ''.join(fig.to_html(full_html=False, include_plotlyjs='cdn', 
                                          config={'displayModeBar': True}) 
                              for fig in return_dict['plotly_figs'][i])
        
        viz_sections.append(f"""
        <div class="analysis-step">
            <div class="summary">
                <h3>Step {i+1}</h3>
                {summary}
            </div>
            <div class="visualization">
                {viz_html if viz_html else '<p>No visualization available</p>'}
            </div>
        </div>""")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Analysis Report</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; color: #333; }}
            .section {{ margin-bottom: 30px; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            h1, h2, h3 {{ color: #2c3e50; }}
            .analysis-step {{ margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; }}
            .summary {{ margin-bottom: 15px; }}
            .visualization {{ margin: 15px 0; }}
            .synthesis-section {{ margin: 15px 0; padding: 15px; background: #f1f8ff; border-radius: 6px; }}
            .conclusion-content {{ padding: 15px; background: #e8f5e9; border-radius: 6px; }}
        </style>
    </head>
    <body>
        <div class="section">
            <h1>Analysis Report</h1>
            <h2>Goal</h2>
            <p>{goal}</p>
        </div>

        <div class="section">
            <h2>Analysis Questions</h2>
            {questions}
        </div>

        <div class="section">
            <h2>Analysis Steps</h2>
            {''.join(viz_sections)}
        </div>

        <div class="section">
            <h2>Synthesis</h2>
            {synthesis}
        </div>

        <div class="section">
            <h2>Conclusion</h2>
            <div class="conclusion-content">
                {conclusion}
            </div>
        </div>
    </body>
    </html>"""
    return html

# Add this to the return_dict section:

        # return results
import os

dspy.configure(lm = dspy.LM("anthropic/claude-3-7-sonnet-20250219", api_key = os.environ['ANTHROPIC_API_KEY'], max_tokens=7000))        

agents = {
    "planner_data_viz_agent": dspy.asyncify(dspy.ChainOfThought(planner_data_viz_agent)),
    "planner_statistical_analytics_agent":dspy.asyncify(dspy.ChainOfThought(planner_statistical_analytics_agent)), 
    "planner_sk_learn_agent": dspy.asyncify(dspy.ChainOfThought(planner_sk_learn_agent)),
    "planner_preprocessing_agent": dspy.asyncify(dspy.ChainOfThought(planner_preprocessing_agent))
}
# agents = {
#     "data_viz_agent": dspy.asyncify(dspy.Predict(data_viz_agent)),
#     "statistical_analytics_agent": dspy.asyncify(dspy.Predict(statistical_analytics_agent)), 
#     "sk_learn_agent": dspy.asyncify(dspy.Predict(sk_learn_agent)),
#     "preprocessing_agent": dspy.asyncify(dspy.Predict(preprocessing_agent))
# }

agents_desc = PLANNER_AGENTS_WITH_DESCRIPTION
# agents_desc = AGENTS_WITH_DESCRIPTION

query = "What is happening to the price of the house?"

import pandas as pd

df = pd.read_csv('Housing.csv')

# Get data types info
dtypes_info = pd.DataFrame({
    'Column': df.columns,
    'Data Type': df.dtypes.astype(str)
}).to_markdown()

# Combine sample data with data types info
dataset_info = f"Sample Data:\n{df.head(2).to_markdown()}\n\nData Types:\n{dtypes_info}"
print("Deep analysis started ")
deep_analyzer = deep_analysis_module(agents=agents,agents_desc=agents_desc)

# Execute deep analysis and save results
return_dict = asyncio.run(deep_analyzer.execute_deep_analysis(goal=query, dataset_info=dataset_info))

print(return_dict['plotly_figs'])

# # Save the analysis results to a JSON file
# import json
# with open('analysis_results.json', 'w') as f:
#     json.dump(return_dict, f, indent=2)

# Load the analysis results from JSON file
# try:
#     with open('analysis_results.json', 'r') as f:
#         return_dict = json.load(f)
#     print("Successfully loaded analysis results from JSON")
# except FileNotFoundError:
#     print("analysis_results.json not found - please run the analysis first")
#     return_dict = None
# except json.JSONDecodeError as e:
#     print(f"Error decoding JSON: {e}")
#     return_dict = None


from datetime import datetime

# Get current timestamp
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

# Generate and save HTML report with timestamp in filename
html_report = generate_html_report(return_dict)
report_filename = f'analysis_report_deep_{timestamp}.html'

with open(report_filename, 'w', encoding='utf-8') as f:
    f.write(html_report)
    f.flush()  # Ensure all data is written to disk
    os.fsync(f.fileno())  # Force system to write to disk
        # for q in question_list:
            # task.append(self.auto_analyst())
