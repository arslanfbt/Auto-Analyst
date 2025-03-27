import dspy
import src.agents.memory_agents as m
import asyncio
from concurrent.futures import ThreadPoolExecutor
import os

class analytical_planner(dspy.Signature):
    # The planner agent which routes the query to Agent(s)
    # The output is like this Agent1->Agent2 etc
    """ You are data analytics planner agent. You have access to three inputs
    1. Datasets
    2. Data Agent descriptions
    3. User-defined Goal
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
    # Doer Agent which performs pre-processing like cleaning data, make new columns etc
    """ Given a user-defined analysis goal and a pre-loaded dataset df, 
    I will generate Python code using NumPy and Pandas to build an exploratory analytics pipeline.
      The goal is to simplify the preprocessing and introductory analysis of the dataset.

Task Requirements:

Identify and separate numeric and categorical columns into two lists: numeric_columns and categorical_columns.
Handle null values in the dataset, applying the correct logic for numeric and categorical columns.
Convert string dates to datetime format.
Create a correlation matrix that only includes numeric columns.
Use the correct column names according to the dataset.

The generated Python code should be concise, readable, and follow best practices for data preprocessing and introductory analysis. 
The code should be written using NumPy and Pandas libraries, and should not read the CSV file into the dataframe (it is already loaded as df).
When splitting numerical and categorical use this script:

categorical_columns = df.select_dtypes(include=[object, 'category']).columns.tolist()
numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()

DONOT 

Use this to handle conversion to Datetime
def safe_to_datetime(date):
    try:
        return pd.to_datetime(date,errors='coerce', cache=False)
    except (ValueError, TypeError):
        return pd.NaT

df['datetime_column'] = df['datetime_column'].apply(safe_to_datetime)

You will be given recent history as a hint! Use that to infer what the user is saying
If visualizing use plotly

    """
    dataset = dspy.InputField(desc="Available datasets loaded in the system, use this df, column_names  set df as copy of df")
    goal = dspy.InputField(desc="The user defined goal could ")
    code = dspy.OutputField(desc ="The code that does the data preprocessing and introductory analysis")
    commentary = dspy.OutputField(desc="The comments about what analysis is being performed")
    


class statistical_analytics_agent(dspy.Signature):
    # Statistical Analysis Agent, builds statistical models using StatsModel Package
    """ 
    You are a statistical analytics agent. Your task is to take a dataset and a user-defined goal and output Python code that performs the appropriate statistical analysis to achieve that goal. Follow these guidelines:

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


    You may be give recent agent interactions as a hint! With the first being the latest
If visualizing use plotly


    """
    dataset = dspy.InputField(desc="Available datasets loaded in the system, use this df,columns  set df as copy of df")
    goal = dspy.InputField(desc="The user defined goal for the analysis to be performed")
    code = dspy.OutputField(desc ="The code that does the statistical analysis using statsmodel")
    commentary = dspy.OutputField(desc="The comments about what analysis is being performed")
    

class sk_learn_agent(dspy.Signature):
    # Machine Learning Agent, performs task using sci-kit learn
    """You are a machine learning agent. 
    Your task is to take a dataset and a user-defined goal, and output Python code that performs the appropriate machine learning analysis to achieve that goal. 
    You should use the scikit-learn library.


    Make sure your output is as intended!

    You may be give recent agent interactions as a hint! With the first being the latest

    
    """
    dataset = dspy.InputField(desc="Available datasets loaded in the system, use this df,columns. set df as copy of df")
    goal = dspy.InputField(desc="The user defined goal ")
    code = dspy.OutputField(desc ="The code that does the Exploratory data analysis")
    commentary = dspy.OutputField(desc="The comments about what analysis is being performed")
    
    
    
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


    Double check column_names/dtypes using dataset, also check if applied logic works for the datatype
    df.copy = df.copy()
    Also add this to display Plotly chart
    fig.show()



    Make sure your output is as intended!
        You may be give recent agent interactions as a hint! With the first being the latest


    """
    dataset = dspy.InputField(desc="Use this double check column_names, data types")
    agent_code_list =dspy.InputField(desc="A list of code given by each agent")
    refined_complete_code = dspy.OutputField(desc="Refined complete code base")
    
    
class data_viz_agent(dspy.Signature):
    # Visualizes data using Plotly
    """
    You are AI agent who uses the goal to generate data visualizations in Plotly.
    You have to use the tools available to your disposal
    If row_count of dataset > 50000, use sample while visualizing 
    use this
    if len(df)>50000:
        .......
    Only this agent does the visualization
    Also only use x_axis/y_axis once in update layout
    {dataset}
    {styling_index}

    You must give an output as code, in case there is no relevant columns, just state that you don't have the relevant information
    
    Make sure your output is as intended! DO NOT OUTPUT THE DATASET/STYLING INDEX 
    ONLY OUTPUT THE CODE AND COMMENTARY. ONLY USE ONE OF THESE 'K','M' or 1,000/1,000,000. NOT BOTH
    ALWAYS RETURN fig.to_html(full_html=False)
    You may be give recent agent interactions as a hint! With the first being the latest
    DONT INCLUDE GOAL/DATASET/STYLING INDEX IN YOUR OUTPUT!
    You can add trendline into a scatter plot to show it changes,only if user mentions for it in the query!

    """
    goal = dspy.InputField(desc="user defined goal which includes information about data and chart they want to plot")
    dataset = dspy.InputField(desc=" Provides information about the data in the data frame. Only use column names and dataframe_name as in this context")
    styling_index = dspy.InputField(desc='Provides instructions on how to style your Plotly plots')
    code= dspy.OutputField(desc="Plotly code that visualizes what the user needs according to the query & dataframe_index & styling_context")
    commentary = dspy.OutputField(desc="The comments about what analysis is being performed, this should not include code")
    
    

class code_fix(dspy.Signature):
    # Called to fix unexecutable code
    """
You are an AI specializing in fixing faulty data analytics code provided by another agent. Your task is to:  

1. Analyze the provided faulty code and the associated error message to understand the issue.  
2. Fix **only** the faulty part of the code while keeping the rest unchanged.  

Additional requirements:  
- Ensure the corrected code performs the intended analysis as described by the user.  
- Output **only the corrected code** without any additional explanation or comments.  
- Ensure the final code runs end-to-end without errors.  

Make your fixes precise and reliable.
    """
    faulty_code = dspy.InputField(desc="The faulty code that did not work")
    error = dspy.InputField(desc="The error generated")
    fixed_code= dspy.OutputField(desc="The fixed code")


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
            self.agent_desc.append(str(a.__pydantic_core_schema__['cls']))
            
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
                agent_response=specified_agent+' '+agent_dict['code']+'\n'+agent_dict['commentary'],
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
            
            # If we have code from multiple agents, combine them
            # if len(code_list) > 1:
            #     with dspy.settings.context(lm=dspy.LM(model="anthropic/claude-3-5-sonnet-latest", max_tokens=8000, temperature=1.0)):
            #         combiner_result = self.code_combiner_agent(agent_code_list=str(code_list), dataset=dict_['dataset'])
            #         results['code_combiner_agent'] = dict(combiner_result)
            
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
        
        # Create modules from agent signatures
        for i, a in enumerate(agents):
            name = a.__pydantic_core_schema__['schema']['model_name']
            self.agents[name] = dspy.ChainOfThought(a)
            self.agent_inputs[name] = {x.strip() for x in str(agents[i].__pydantic_core_schema__['cls']).split('->')[0].split('(')[1].split(',')}
            self.agent_desc.append(str(a.__pydantic_core_schema__['cls']))
        
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
        plan_list = plan_text.split('->')

        
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
        with dspy.settings.context(lm=dspy.LM(model="anthropic/claude-3-5-sonnet-latest", max_tokens=8000, temperature=1.0)):
            combiner_result = self.code_combiner_agent(agent_code_list=str(code_list), dataset=dict_['dataset'])
        yield 'code_combiner_agent', str(code_list), dict(combiner_result)

# Agent to make a Chat history name from a query
class chat_history_name_agent(dspy.Signature):
    """You are an agent that takes a query and returns a name for the chat history"""
    query = dspy.InputField(desc="The query to make a name for")
    name = dspy.OutputField(desc="A name for the chat history (max 3 words)")

class dataset_description_agent(dspy.Signature):
    """You are an agent that takes a dataset and returns a detailed description for the dataset. 
    The description should provide insights into the nature of the dataset, including its purpose, 
    the type of data it contains, and any relevant context that would help users understand its significance. 
    For example, if the dataset pertains to sales data, the description could include information about 
    the time period covered, the geographical scope, and the types of products included. 
    Here are a few examples of dataset descriptions that illustrate this approach:

    1. 'This dataset contains sales transactions from an e-commerce platform over the last five years, 
    including product categories, customer demographics, and purchase amounts, providing a comprehensive 
    view of consumer behavior and trends in online shopping.'

    2. 'The dataset consists of weather data collected from various meteorological stations across the 
    United States, covering temperature, humidity, and precipitation levels from 2000 to 2020, 
    which can be used for climate analysis and forecasting.'

    By providing a rich and informative description, users can better grasp the dataset's relevance 
    and applicability to their specific needs or research questions."""
    dataset = dspy.InputField(desc="The dataset to make a description for")
    description = dspy.OutputField(desc="A detailed description for the dataset, at least 200 words.")

if __name__ == "__main__":
    import dspy
    from dspy import ChainOfThought
    dspy.configure(lm=dspy.LM(model="anthropic/claude-3-5-sonnet-latest", max_tokens=8000, temperature=1.0))
    query = "What is the average price of the product?"
    respose = ChainOfThought(chat_history_name_agent)(query=query)
    print(respose)