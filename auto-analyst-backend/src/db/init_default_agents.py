"""
Initialize default agents in the database.
This module should be run during application startup to ensure
default agents are available in the database.
"""

import logging
from datetime import datetime, UTC
from src.utils.logger import Logger

# Initialize logger
logger = Logger("init_default_agents", see_time=True, console_log=False)

def load_default_agents_to_db(db_session, force_update=False):
    """
    Load the default agents into the AgentTemplate table.
    
    Args:
        db_session: Database session
        force_update: If True, update existing agents. If False, skip existing ones.
    
    Returns:
        Tuple (success: bool, message: str)
    """
    try:
        from src.db.schemas.models import AgentTemplate
        
        # Define default agents with their signatures and metadata
        default_agents = {
            "preprocessing_agent": {
                "display_name": "Data Preprocessing Agent",
                "description": "Cleans and prepares a DataFrame using Pandas and NumPy—handles missing values, detects column types, and converts date strings to datetime.",
                "prompt_template": """You are a AI data-preprocessing agent. Generate clean and efficient Python code using NumPy and Pandas to perform introductory data preprocessing on a pre-loaded DataFrame df, based on the user's analysis goals.
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
 Respond in the user's language for all summary and reasoning but keep the code in english""",
                "category": "Data Manipulation",
                "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg"
            },
            "statistical_analytics_agent": {
                "display_name": "Statistical Analytics Agent",
                "description": "Performs statistical analysis (e.g., regression, seasonal decomposition) using statsmodels, with proper handling of categorical data and missing values.",
                "prompt_template": """ 
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
Respond in the user's language for all summary and reasoning but keep the code in english""",
                "category": "Statistical Analysis",
                "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/statsmodels/statsmodels-original.svg"
            },
            "sk_learn_agent": {
                "display_name": "Machine Learning Agent",
                "description": "Trains and evaluates machine learning models using scikit-learn, including classification, regression, and clustering with feature importance insights.",
                "prompt_template": """You are a machine learning agent. 
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
Respond in the user's language for all summary and reasoning but keep the code in english""",
                "category": "Modelling",
                "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/scikit-learn/scikit-learn-original.svg"
            },
            "data_viz_agent": {
                "display_name": "Data Visualization Agent",
                "description": "Generates interactive visualizations with Plotly, selecting the best chart type to reveal trends, comparisons, and insights based on the analysis goal.",
                "prompt_template": """    
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
Respond in the user's language for all summary and reasoning but keep the code in english
Example Summary:  
• Created an interactive scatter plot of sales vs. marketing spend with color-coded product categories  
• Included a trend line showing positive correlation (r=0.72)  
• Highlighted outliers where high marketing spend resulted in low sales  
• Generated a time series chart of monthly revenue from 2020-2023  
• Added annotations for key business events  
• Visualization reveals 35% YoY growth with seasonal peaks in Q4""",
                "category": "Visualization",
                "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/plotly/plotly-original.svg"
            }
        }
        
        created_count = 0
        updated_count = 0
        
        for template_name, agent_data in default_agents.items():
            # Check if agent already exists
            existing_agent = db_session.query(AgentTemplate).filter(
                AgentTemplate.template_name == template_name
            ).first()
            
            if existing_agent:
                if force_update:
                    # Update existing agent
                    existing_agent.display_name = agent_data["display_name"]
                    existing_agent.description = agent_data["description"]
                    existing_agent.prompt_template = agent_data["prompt_template"]
                    existing_agent.category = agent_data["category"]
                    existing_agent.icon_url = agent_data["icon_url"]
                    existing_agent.is_premium_only = False
                    existing_agent.is_active = True
                    existing_agent.updated_at = datetime.now(UTC)
                    updated_count += 1
                else:
                    logger.log_message(f"Agent '{template_name}' already exists, skipping", level=logging.INFO)
                    continue
            else:
                # Create new agent
                new_agent = AgentTemplate(
                    template_name=template_name,
                    display_name=agent_data["display_name"],
                    description=agent_data["description"],
                    prompt_template=agent_data["prompt_template"],
                    category=agent_data["category"],
                    icon_url=agent_data["icon_url"],
                    is_premium_only=False,
                    is_active=True,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC)
                )
                db_session.add(new_agent)
                created_count += 1
        
        db_session.commit()
        
        message = f"Successfully loaded default agents. Created: {created_count}, Updated: {updated_count}"
        logger.log_message(message, level=logging.INFO)
        return True, message
        
    except Exception as e:
        db_session.rollback()
        error_msg = f"Error loading default agents: {str(e)}"
        logger.log_message(error_msg, level=logging.ERROR)
        return False, error_msg

def initialize_default_agents(force_update=False):
    """
    Initialize default agents during application startup.
    
    Args:
        force_update: If True, update existing agents. If False, skip existing ones.
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        from src.db.init_db import session_factory
        
        session = session_factory()
        try:
            success, message = load_default_agents_to_db(session, force_update=force_update)
            logger.log_message(f"Default agents initialization: {message}", level=logging.INFO)
            return success
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Failed to initialize default agents: {str(e)}", level=logging.ERROR)
        return False 
    
if __name__ == "__main__":
    initialize_default_agents(force_update=True)