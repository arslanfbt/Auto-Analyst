import dspy
import src.agents.memory_agents as m
import asyncio
from concurrent.futures import ThreadPoolExecutor
import os
from dotenv import load_dotenv

load_dotenv()

AGENTS_WITH_DESCRIPTION = {
    "preprocessing_agent": "Cleans and prepares a DataFrame using Pandas and NumPy—handles missing values, detects column types, and converts date strings to datetime.",
    "statistical_analytics_agent": "Performs statistical analysis (e.g., regression, seasonal decomposition) using statsmodels, with proper handling of categorical data and missing values.",
    "sk_learn_agent": "Trains and evaluates machine learning models using scikit-learn, including classification, regression, and clustering with feature importance insights.",
    "data_viz_agent": "Generates interactive visualizations with Plotly, selecting the best chart type to reveal trends, comparisons, and insights based on the analysis goal."
}

def get_agent_description(agent_name):
    return AGENTS_WITH_DESCRIPTION[agent_name.lower()] if agent_name.lower() in AGENTS_WITH_DESCRIPTION else "No description available for this agent"


class analytical_planner(dspy.Signature):
    # The planner agent which routes the query to Agent(s)
    # The output is like this Agent1->Agent2 etc
    """ You are data analytics planner agent. You have access to three inputs
    1. Datasets
    2. Data Agent descriptions
    3. User-defined Goal

    IMPORTANT: You may be provided with previous interaction history. The section marked "### Current Query:" contains the user's current request. Any text in "### Previous Interaction History:" is for context only and is NOT part of the current request.
    
    You take these three inputs to develop a comprehensive plan to achieve the user-defined goal from the data & Agents available.
    In case you think the user-defined goal is infeasible you can ask the user to redefine or add more description to the goal.

    Give your output in this format:
    plan: Agent1->Agent2->Agent3
    plan_desc = Use Agent 1 for this reason, then agent2 for this reason and lastly agent3 for this reason.

    You don't have to use all the agents in response of the query
    
    """
    dataset = dspy.InputField(desc="Available datasets loaded in the system, use this df,columns  set df as copy of df")
    Agent_desc = dspy.InputField(desc= "The agents available in the system")
    goal = dspy.InputField(desc="The user defined goal ")
    plan = dspy.OutputField(desc="The plan that would achieve the user defined goal", prefix='Plan:')
    plan_desc= dspy.OutputField(desc="The reasoning behind the chosen plan")

class goal_refiner_agent(dspy.Signature):
    # Called to refine the query incase user query not elaborate
    """You take a user-defined goal given to a AI data analyst planner agent, 
    you make the goal more elaborate using the datasets available and agent_desc"""
    dataset = dspy.InputField(desc="Available datasets loaded in the system, use this df,columns  set df as copy of df")
    Agent_desc = dspy.InputField(desc= "The agents available in the system")
    goal = dspy.InputField(desc="The user defined goal ")
    refined_goal = dspy.OutputField(desc='Refined goal that helps the planner agent plan better')

class preprocessing_agent(dspy.Signature):
    """You are a AI data-preprocessing agent. Generate clean and efficient Python code using NumPy and Pandas to perform introductory data preprocessing on a pre-loaded DataFrame df, based on the user's analysis goals.

    Preprocessing Requirements:

    1. Identify Column Types
    - Separate columns into numeric and categorical using:
        categorical_columns = df.select_dtypes(include=[object, 'category']).columns.tolist()
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()

    2. Handle Missing Values
    - Numeric columns: Impute missing values using the mean of each column
    - Categorical columns: Impute missing values using the mode of each column

    3. Convert Date Strings to Datetime
    - For any column suspected to represent dates (in string format), convert it to datetime using:
        def safe_to_datetime(date):
            try:
                return pd.to_datetime(date, errors='coerce', cache=False)
            except (ValueError, TypeError):
                return pd.NaT
        df['datetime_column'] = df['datetime_column'].apply(safe_to_datetime)
    - Replace 'datetime_column' with the actual column names containing date-like strings

    Important Notes:
    - Do NOT create a correlation matrix — correlation analysis is outside the scope of preprocessing
    - Do NOT generate any plots or visualizations

    Output Instructions:
    1. Include the full preprocessing Python code
    2. Provide a brief bullet-point summary of the steps performed. Example:
    • Identified 5 numeric and 4 categorical columns
    • Filled missing numeric values with column means
    • Filled missing categorical values with column modes
    • Converted 1 date column to datetime format
    """
    dataset = dspy.InputField(desc="Available datasets loaded in the system, use this df, column_names  set df as copy of df")
    goal = dspy.InputField(desc="The user defined goal could ")
    code = dspy.OutputField(desc ="The code that does the data preprocessing and introductory analysis")
    summary = dspy.OutputField(desc="A concise bullet-point summary of the preprocessing operations performed")
    


class statistical_analytics_agent(dspy.Signature):
    # Statistical Analysis Agent, builds statistical models using StatsModel Package
    """ 
    You are a statistical analytics agent. Your task is to take a dataset and a user-defined goal and output Python code that performs the appropriate statistical analysis to achieve that goal. Follow these guidelines:

    IMPORTANT: You may be provided with previous interaction history. The section marked "### Current Query:" contains the user's current request. Any text in "### Previous Interaction History:" is for context only and is NOT part of the current request.

    Data Handling:

    Always handle strings as categorical variables in a regression using statsmodels C(string_column).
    Do not change the index of the DataFrame.
    Convert X and y into float when fitting a model.
    Error Handling:

    Always check for missing values and handle them appropriately.
    Ensure that categorical variables are correctly processed.
    Provide clear error messages if the model fitting fails.
    Regression:

    For regression, use statsmodels and ensure that a constant term is added to the predictor using sm.add_constant(X).
    Handle categorical variables using C(column_name) in the model formula.
    Fit the model with model = sm.OLS(y.astype(float), X.astype(float)).fit().
    Seasonal Decomposition:

    Ensure the period is set correctly when performing seasonal decomposition.
    Verify the number of observations works for the decomposition.
    Output:

    Ensure the code is executable and as intended.
    Also choose the correct type of model for the problem
    Avoid adding data visualization code.

    Use code like this to prevent failing:
    import pandas as pd
    import numpy as np
    import statsmodels.api as sm

    def statistical_model(X, y, goal, period=None):
        try:
            # Check for missing values and handle them
            X = X.dropna()
            y = y.loc[X.index].dropna()

            # Ensure X and y are aligned
            X = X.loc[y.index]

            # Convert categorical variables
            for col in X.select_dtypes(include=['object', 'category']).columns:
                X[col] = X[col].astype('category')

            # Add a constant term to the predictor
            X = sm.add_constant(X)

            # Fit the model
            if goal == 'regression':
                # Handle categorical variables in the model formula
                formula = 'y ~ ' + ' + '.join([f'C({col})' if X[col].dtype.name == 'category' else col for col in X.columns])
                model = sm.OLS(y.astype(float), X.astype(float)).fit()
                return model.summary()

            elif goal == 'seasonal_decompose':
                if period is None:
                    raise ValueError("Period must be specified for seasonal decomposition")
                decomposition = sm.tsa.seasonal_decompose(y, period=period)
                return decomposition

            else:
                raise ValueError("Unknown goal specified. Please provide a valid goal.")

        except Exception as e:
            return f"An error occurred: {e}"

    # Example usage:
    result = statistical_analysis(X, y, goal='regression')
    print(result)

    If visualizing use plotly

    Provide a concise bullet-point summary of the statistical analysis performed.
    
    Example Summary:
    • Applied linear regression with OLS to predict house prices based on 5 features
    • Model achieved R-squared of 0.78
    • Significant predictors include square footage (p<0.001) and number of bathrooms (p<0.01)
    • Detected strong seasonal pattern with 12-month periodicity
    • Forecast shows 15% growth trend over next quarter

    """
    dataset = dspy.InputField(desc="Available datasets loaded in the system, use this df,columns  set df as copy of df")
    goal = dspy.InputField(desc="The user defined goal for the analysis to be performed")
    code = dspy.OutputField(desc ="The code that does the statistical analysis using statsmodel")
    summary = dspy.OutputField(desc="A concise bullet-point summary of the statistical analysis performed and key findings")
    

class sk_learn_agent(dspy.Signature):
    # Machine Learning Agent, performs task using sci-kit learn
    """You are a machine learning agent. 
    Your task is to take a dataset and a user-defined goal, and output Python code that performs the appropriate machine learning analysis to achieve that goal. 
    You should use the scikit-learn library.

    IMPORTANT: You may be provided with previous interaction history. The section marked "### Current Query:" contains the user's current request. Any text in "### Previous Interaction History:" is for context only and is NOT part of the current request.

    Make sure your output is as intended!

    Provide a concise bullet-point summary of the machine learning operations performed.
    
    Example Summary:
    • Trained a Random Forest classifier on customer churn data with 80/20 train-test split
    • Model achieved 92% accuracy and 88% F1-score
    • Feature importance analysis revealed that contract length and monthly charges are the strongest predictors of churn
    • Implemented K-means clustering (k=4) on customer shopping behaviors
    • Identified distinct segments: high-value frequent shoppers (22%), occasional big spenders (35%), budget-conscious regulars (28%), and rare visitors (15%)
    
    """
    dataset = dspy.InputField(desc="Available datasets loaded in the system, use this df,columns. set df as copy of df")
    goal = dspy.InputField(desc="The user defined goal ")
    code = dspy.OutputField(desc ="The code that does the Exploratory data analysis")
    summary = dspy.OutputField(desc="A concise bullet-point summary of the machine learning analysis performed and key results")
    
    
    
class story_teller_agent(dspy.Signature):
    # Optional helper agent, which can be called to build a analytics story 
    # For all of the analysis performed
    """ You are a story teller agent, taking output from different data analytics agents, you compose a compelling story for what was done """
    agent_analysis_list =dspy.InputField(desc="A list of analysis descriptions from every agent")
    story = dspy.OutputField(desc="A coherent story combining the whole analysis")

class code_combiner_agent(dspy.Signature):
    # Combines code from different agents into one script
    """ You are a code combine agent, taking Python code output from many agents and combining the operations into 1 output
    You also fix any errors in the code. 

    IMPORTANT: You may be provided with previous interaction history. The section marked "### Current Query:" contains the user's current request. Any text in "### Previous Interaction History:" is for context only and is NOT part of the current request.

    Double check column_names/dtypes using dataset, also check if applied logic works for the datatype
    df = df.copy()
    Also add this to display Plotly chart
    fig.show()

    Make sure your output is as intended!

    Provide a concise bullet-point summary of the code integration performed.
    
    Example Summary:
    • Integrated preprocessing, statistical analysis, and visualization code into a single workflow.
    • Fixed variable scope issues, standardized DataFrame handling (e.g., using `df.copy()`), and corrected errors.
    • Validated column names and data types against the dataset definition to prevent runtime issues.
    • Ensured visualizations are displayed correctly (e.g., added `fig.show()`).

    """
    dataset = dspy.InputField(desc="Use this double check column_names, data types")
    agent_code_list =dspy.InputField(desc="A list of code given by each agent")
    refined_complete_code = dspy.OutputField(desc="Refined complete code base")
    summary = dspy.OutputField(desc="A concise 4 bullet-point summary of the code integration performed and improvements made")
    
    
class data_viz_agent(dspy.Signature):
    # Visualizes data using Plotly
    """    
    You are an AI agent responsible for generating interactive data visualizations using Plotly.

    IMPORTANT Instructions:

    - The section marked "### Current Query:" contains the user's request. Any text in "### Previous Interaction History:" is for context only and should NOT be treated as part of the current request.
    - You must only use the tools provided to you. This agent handles visualization only.
    - If len(df) > 50000, always sample the dataset before visualization using:  
    if len(df) > 50000:  
        df = df.sample(50000, random_state=1)

    - Each visualization must be generated as a **separate figure** using go.Figure().  
    Do NOT use subplots under any circumstances.

    - Each figure must be returned individually using:  
    fig.to_html(full_html=False)

    - Use update_layout with xaxis and yaxis **only once per figure**.

    - Enhance readability and clarity by:  
    • Using low opacity (0.4-0.7) where appropriate  
    • Applying visually distinct colors for different elements or categories  

    - Make sure the visual **answers the user's specific goal**:  
    • Identify what insight or comparison the user is trying to achieve  
    • Choose the visualization type and features (e.g., color, size, grouping) to emphasize that goal  
    • For example, if the user asks for "trends in revenue," use a time series line chart; if they ask for "top-performing categories," use a bar chart sorted by value  
    • Prioritize highlighting patterns, outliers, or comparisons relevant to the question

    - Never include the dataset or styling index in the output.

    - If there are no relevant columns for the requested visualization, respond with:  
    "No relevant columns found to generate this visualization."

    - Use only one number format consistently: either 'K', 'M', or comma-separated values like 1,000/1,000,000. Do not mix formats.

    - Only include trendlines in scatter plots if the user explicitly asks for them.

    - Output only the code and a concise bullet-point summary of what the visualization reveals.

    - Always end each visualization with:  
    fig.to_html(full_html=False)

    Example Summary:  
    • Created an interactive scatter plot of sales vs. marketing spend with color-coded product categories  
    • Included a trend line showing positive correlation (r=0.72)  
    • Highlighted outliers where high marketing spend resulted in low sales  
    • Generated a time series chart of monthly revenue from 2020-2023  
    • Added annotations for key business events  
    • Visualization reveals 35% YoY growth with seasonal peaks in Q4
    """
    goal = dspy.InputField(desc="user defined goal which includes information about data and chart they want to plot")
    dataset = dspy.InputField(desc=" Provides information about the data in the data frame. Only use column names and dataframe_name as in this context")
    styling_index = dspy.InputField(desc='Provides instructions on how to style your Plotly plots')
    code= dspy.OutputField(desc="Plotly code that visualizes what the user needs according to the query & dataframe_index & styling_context")
    summary = dspy.OutputField(desc="A concise bullet-point summary of the visualization created and key insights revealed")
    
    

class code_fix(dspy.Signature):
    """
You are an expert AI developer and data analyst assistant, skilled at identifying and resolving issues in Python code related to data analytics. Another agent has attempted to generate Python code for a data analytics task but produced code that is broken or throws an error.

Your task is to:
1. Carefully examine the provided **faulty_code** and the corresponding **error** message.
2. Identify the **exact cause** of the failure based on the error and surrounding context.
3. Modify only the necessary portion(s) of the code to fix the issue.
4. Ensure the **intended behavior** of the original code is preserved (e.g., if the code is meant to filter, group, or visualize data, that functionality must be preserved).
5. Ensure the final output is **runnable**, **error-free**, and **logically consistent**.

Strict instructions:
- Do **not** modify any working parts of the code unnecessarily.
- Do **not** change variable names, structure, or logic unless it directly contributes to resolving the issue.
- Do **not** output anything besides the corrected, full version of the code (i.e., no explanations, comments, or logs).
- Avoid introducing new dependencies or libraries unless absolutely required to fix the problem.
- The output must be complete and executable as-is.

Be precise, minimal, and reliable. Prioritize functional correctness.
    """
    faulty_code = dspy.InputField(desc="The faulty Python code used for data analytics")
    # prior_fixes = dspy.InputField(desc="If a fix for this code exists in our error retriever", default="use the error message")
    error = dspy.InputField(desc="The error message thrown when running the code")
    fixed_code = dspy.OutputField(desc="The corrected and executable version of the code")

class code_edit(dspy.Signature):
    """
You are an expert AI code editor that specializes in modifying existing data analytics code based on user requests. The user provides a working or partially working code snippet and a natural language prompt describing the desired change.

Your job is to:
1. Analyze the provided original_code and the user_prompt.
2. Modify only the part(s) of the code that are relevant to the user's request.
3. Leave all unrelated parts of the code unchanged, unless the user explicitly requests a full rewrite or broader changes.
4. Ensure that your changes maintain or improve the functionality and correctness of the code.

Your edits may include:
- Bug fixes or logic corrections (if requested)
- Plot and visualization styling changes
- Optimization or simplification
- Code reformatting or restructuring (if asked for)
- Adjusting data processing or analysis steps
- Any other edits specifically described in the user prompt

Strict requirements:
- Do not change variable names, function structures, or logic outside the scope of the user's request.
- Do not refactor, optimize, or rewrite unless explicitly instructed.
- Ensure the edited code remains complete and executable.
- Output only the modified code, without any additional explanation, comments, or extra formatting.

Make your edits precise, minimal, and faithful to the user's instructions.
    """
    original_code = dspy.InputField(desc="The original code the user wants modified")
    user_prompt = dspy.InputField(desc="The user instruction describing how the code should be changed")
    edited_code = dspy.OutputField(desc="The updated version of the code reflecting the user's request")

# The ind module is called when agent_name is 
# explicitly mentioned in the query
class auto_analyst_ind(dspy.Module):
    """Handles individual agent execution when explicitly specified in query"""
    
    def __init__(self, agents, retrievers):
        # Initialize agent modules and retrievers
        self.agents = {}
        self.agent_inputs = {}
        self.agent_desc = []
        
        # Create modules from agent signatures
        for i, a in enumerate(agents):
            name = a.__pydantic_core_schema__['schema']['model_name']
            self.agents[name] = dspy.ChainOfThoughtWithHint(a)
            self.agent_inputs[name] = {x.strip() for x in str(agents[i].__pydantic_core_schema__['cls']).split('->')[0].split('(')[1].split(',')}
            self.agent_desc.append(get_agent_description(name))
            
        # Initialize components
        self.memory_summarize_agent = dspy.ChainOfThought(m.memory_summarize_agent)
        self.dataset = retrievers['dataframe_index'].as_retriever(k=1)
        self.styling_index = retrievers['style_index'].as_retriever(similarity_top_k=1)
        self.code_combiner_agent = dspy.ChainOfThought(code_combiner_agent)
        
        # Initialize thread pool
        self.executor = ThreadPoolExecutor(max_workers=min(4, os.cpu_count() * 2))
    
    def execute_agent(self, specified_agent, inputs):
        """Execute agent and generate memory summary in parallel"""
        try:
            # Execute main agent
            agent_result = self.agents[specified_agent.strip()](**inputs)
            return specified_agent.strip(), dict(agent_result)
            
        except Exception as e:
            return specified_agent.strip(), {"error": str(e)}

    def execute_agent_with_memory(self, specified_agent, inputs, query):
        """Execute agent and generate memory summary in parallel"""
        try:
            # Execute main agent
            agent_result = self.agents[specified_agent.strip()](**inputs)
            agent_dict = dict(agent_result)
            
            # Generate memory summary
            memory_result = self.memory_summarize_agent(
                agent_response=specified_agent+' '+agent_dict['code']+'\n'+agent_dict['summary'],
                user_goal=query
            )
            
            return {
                specified_agent.strip(): agent_dict,
                'memory_'+specified_agent.strip(): str(memory_result.summary)
            }
        except Exception as e:
            return {"error": str(e)}

    def forward(self, query, specified_agent):
        try:
            # If specified_agent contains multiple agents separated by commas
            # This is for handling multiple @agent mentions in one query
            if "," in specified_agent:
                agent_list = [agent.strip() for agent in specified_agent.split(",")]
                return self.execute_multiple_agents(query, agent_list)
            
            # Process query with specified agent (single agent case)
            dict_ = {}
            dict_['dataset'] = self.dataset.retrieve(query)[0].text
            dict_['styling_index'] = self.styling_index.retrieve(query)[0].text
            dict_['hint'] = []
            dict_['goal'] = query
            dict_['Agent_desc'] = str(self.agent_desc)

            # Prepare inputs
            inputs = {x:dict_[x] for x in self.agent_inputs[specified_agent.strip()]}
            inputs['hint'] = str(dict_['hint']).replace('[','').replace(']','')
            
            # Execute agent
            result = self.agents[specified_agent.strip()](**inputs)
            output_dict = {specified_agent.strip(): dict(result)}

            if "error" in output_dict:
                return {"response": f"Error executing agent: {output_dict['error']}"}

            return output_dict

        except Exception as e:
            return {"response": f"This is the error from the system: {str(e)}"}
    
    def execute_multiple_agents(self, query, agent_list):
        """Execute multiple agents sequentially on the same query"""
        try:
            # Initialize resources
            dict_ = {}
            dict_['dataset'] = self.dataset.retrieve(query)[0].text
            dict_['styling_index'] = self.styling_index.retrieve(query)[0].text
            dict_['hint'] = []
            dict_['goal'] = query
            dict_['Agent_desc'] = str(self.agent_desc)
            
            results = {}
            code_list = []
            
            # Execute each agent sequentially
            for agent_name in agent_list:
                if agent_name not in self.agents:
                    results[agent_name] = {"error": f"Agent '{agent_name}' not found"}
                    continue
                
                # Prepare inputs for this agent
                inputs = {x:dict_[x] for x in self.agent_inputs[agent_name] if x in dict_}
                inputs['hint'] = str(dict_['hint']).replace('[','').replace(']','')
                
                # Execute agent
                agent_result = self.agents[agent_name](**inputs)
                agent_dict = dict(agent_result)
                results[agent_name] = agent_dict
                
                # Collect code for later combination
                if 'code' in agent_dict:
                    code_list.append(agent_dict['code'])
            
            return results
            
        except Exception as e:
            return {"response": f"Error executing multiple agents: {str(e)}"}

# This is the auto_analyst with planner
class auto_analyst(dspy.Module):
    """Main analyst module that coordinates multiple agents using a planner"""
    
    def __init__(self, agents, retrievers):
        # Initialize agent modules and retrievers
        self.agents = {}
        self.agent_inputs = {}
        self.agent_desc = []
        
        for i, a in enumerate(agents):
            name = a.__pydantic_core_schema__['schema']['model_name']
            self.agents[name] = dspy.ChainOfThought(a)
            self.agent_inputs[name] = {x.strip() for x in str(agents[i].__pydantic_core_schema__['cls']).split('->')[0].split('(')[1].split(',')}
            self.agent_desc.append({name: get_agent_description(name)})
        
        # Initialize coordination agents
        self.planner = dspy.ChainOfThought(analytical_planner)
        self.refine_goal = dspy.ChainOfThought(goal_refiner_agent)
        self.code_combiner_agent = dspy.ChainOfThought(code_combiner_agent)
        self.story_teller = dspy.ChainOfThought(story_teller_agent)
        self.memory_summarize_agent = dspy.ChainOfThought(m.memory_summarize_agent)
                
        # Initialize retrievers
        self.dataset = retrievers['dataframe_index'].as_retriever(k=1)
        self.styling_index = retrievers['style_index'].as_retriever(similarity_top_k=1)
        
        # Initialize thread pool for parallel execution
        self.executor = ThreadPoolExecutor(max_workers=min(len(agents) + 2, os.cpu_count() * 2))

    def execute_agent(self, agent_name, inputs):
        """Execute a single agent with given inputs"""
        try:
            result = self.agents[agent_name.strip()](**inputs)
            return agent_name.strip(), dict(result)
        except Exception as e:
            return agent_name.strip(), {"error": str(e)}

    def get_plan(self, query):
        """Get the analysis plan"""
        dict_ = {}
        dict_['dataset'] = self.dataset.retrieve(query)[0].text
        dict_['styling_index'] = self.styling_index.retrieve(query)[0].text
        dict_['goal'] = query
        dict_['Agent_desc'] = str(self.agent_desc)
        
        plan = self.planner(goal=dict_['goal'], dataset=dict_['dataset'], Agent_desc=dict_['Agent_desc'])
        return dict(plan)

    async def execute_plan(self, query, plan):
        """Execute the plan and yield results as they complete"""
        dict_ = {}
        dict_['dataset'] = self.dataset.retrieve(query)[0].text
        dict_['styling_index'] = self.styling_index.retrieve(query)[0].text
        dict_['hint'] = []
        dict_['goal'] = query
        
        plan_text = plan['plan'].replace('Plan','').replace(':','').strip()
        plan_list = [agent.strip() for agent in plan_text.split('->') if agent.strip()]

        if len(plan_list) == 0:
            yield "plan_not_found",  dict(plan), {"error": "No plan found"}
            return
        # Execute agents in parallel
        futures = []
        for agent_name in plan_list:
            inputs = {x:dict_[x] for x in self.agent_inputs[agent_name.strip()]}
            future = self.executor.submit(self.execute_agent, agent_name, inputs)
            futures.append((agent_name, inputs, future))
        
        # yield "analytical_planner",  dict(plan)

        # Yield results as they complete 
        completed_results = []
        for agent_name, inputs, future in futures:
            try:
                name, result = await asyncio.get_event_loop().run_in_executor(None, future.result)
                completed_results.append((name, result))
                yield name, inputs, result
            except Exception as e:
                yield agent_name, inputs, {"error": str(e)}
        # Execute code combiner after all agents complete
        code_list = [result['code'] for _, result in completed_results if 'code' in result]
        # max tokens is number of characters - number of words / 2
        char_count = sum(len(code) for code in code_list)
        word_count = sum(len(code.split()) for code in code_list)
        max_tokens = int((char_count - word_count) / 2)
        print(f"Max tokens: {max_tokens}")
        try:
            with dspy.context(lm=dspy.LM(model="gemini/gemini-2.5-pro-preview-03-25", api_key = os.environ['GEMINI_API_KEY'], max_tokens=max_tokens)):
                combiner_result = self.code_combiner_agent(agent_code_list=str(code_list), dataset=dict_['dataset'])
                yield 'code_combiner_agent__gemini', str(code_list), dict(combiner_result)
        except:
            try: 
                with dspy.context(lm=dspy.GROQ(model="qwen-qwq-32b", max_tokens=max_tokens, temperature=1.0, api_key=os.getenv("GROQ_API_KEY"))):
                    combiner_result = self.code_combiner_agent(agent_code_list=str(code_list), dataset=dict_['dataset'])
                    yield 'code_combiner_agent__qwen', str(code_list), dict(combiner_result)
            except:
                try: 
                    with dspy.context(lm=dspy.GROQ(model="deepseek-r1-distill-llama-70b", max_tokens=max_tokens, temperature=1.0, api_key=os.getenv("GROQ_API_KEY"))):
                        combiner_result = self.code_combiner_agent(agent_code_list=str(code_list), dataset=dict_['dataset'])
                        yield 'code_combiner_agent__deepseek', str(code_list), dict(combiner_result)
                except Exception as e:
                    yield 'code_combiner_agent__none', str(code_list), {"error": "Error in code combiner: "+str(e)}

# Agent to make a Chat history name from a query
class chat_history_name_agent(dspy.Signature):
    """You are an agent that takes a query and returns a name for the chat history"""
    query = dspy.InputField(desc="The query to make a name for")
    name = dspy.OutputField(desc="A name for the chat history (max 3 words)")

class dataset_description_agent(dspy.Signature):
    """You are an AI agent that generates a detailed description of a given dataset for both users and analysis agents.
Your description should serve two key purposes:
1. Provide users with context about the dataset's purpose, structure, and key attributes.
2. Give analysis agents critical data handling instructions to prevent common errors.

For data handling instructions, you must always include Python data types and address the following:
- Data type warnings (e.g., numeric columns stored as strings that need conversion).
- Null value handling recommendations.
- Format inconsistencies that require preprocessing.
- Explicit warnings about columns that appear numeric but are stored as strings (e.g., '10' vs 10).
- Explicit Python data types for each major column (e.g., int, float, str, bool, datetime).
- Columns with numeric values that should be treated as categorical (e.g., zip codes, IDs).
- Any date parsing or standardization required (e.g., MM/DD/YYYY to datetime).
- Any other technical considerations that would affect downstream analysis or modeling.
- List all columns and their data types with exact case sensitive spelling

If an existing description is provided, enhance it with both business context and technical guidance for analysis agents, preserving accurate information from the existing description or what the user has written.

Ensure the description is comprehensive and provides actionable insights for both users and analysis agents.


Example:
This housing dataset contains property details including price, square footage, bedrooms, and location data.
It provides insights into real estate market trends across different neighborhoods and property types.

TECHNICAL CONSIDERATIONS FOR ANALYSIS:
- price (str): Appears numeric but is stored as strings with a '$' prefix and commas (e.g., "$350,000"). Requires cleaning with str.replace('$','').replace(',','') and conversion to float.
- square_footage (str): Contains unit suffix like 'sq ft' (e.g., "1,200 sq ft"). Remove suffix and commas before converting to int.
- bedrooms (int): Correctly typed but may contain null values (~5% missing) – consider imputation or filtering.
- zip_code (int): Numeric column but should be treated as str or category to preserve leading zeros and prevent unintended numerical analysis.
- year_built (float): May contain missing values (~15%) – consider mean/median imputation or exclusion depending on use case.
- listing_date (str): Dates stored in "MM/DD/YYYY" format – convert to datetime using pd.to_datetime().
- property_type (str): Categorical column with inconsistent capitalization (e.g., "Condo", "condo", "CONDO") – normalize to lowercase for consistent grouping.
    """
    dataset = dspy.InputField(desc="The dataset to describe, including headers, sample data, null counts, and data types.")
    existing_description = dspy.InputField(desc="An existing description to improve upon (if provided).", default="")
    description = dspy.OutputField(desc="A comprehensive dataset description with business context and technical guidance for analysis agents.")

if __name__ == "__main__":
    import dspy
    from dspy import ChainOfThought
    dspy.configure(lm=dspy.LM(model="anthropic/claude-3-5-sonnet-latest", max_tokens=8000, temperature=1.0))
    query = "What is the average price of the product?"
    respose = ChainOfThought(chat_history_name_agent)(query=query)
    print(respose)