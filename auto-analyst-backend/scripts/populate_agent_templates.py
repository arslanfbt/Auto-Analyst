#!/usr/bin/env python3
"""
Enhanced Script to populate agent templates for development.
Includes both default agents (free) and premium templates.
Automatically detects database type and populates accordingly.
"""

import sys
import os
from datetime import datetime, UTC

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.init_db import session_factory, DATABASE_URL
from src.db.schemas.models import AgentTemplate
from sqlalchemy.exc import IntegrityError

def get_database_type():
    """Detect database type from DATABASE_URL"""
    if DATABASE_URL.startswith('postgresql'):
        return "postgresql"
    elif DATABASE_URL.startswith('sqlite'):
        return "sqlite"
    else:
        return "unknown"

DEFAULT_AGENTS = {
    "Data Manipulation": [
        {
            "template_name": "preprocessing_agent",
            "display_name": "Data Preprocessing Agent",
            "description": "Cleans and prepares a DataFrame using Pandas and NumPy—handles missing values, detects column types, and converts date strings to datetime.",
            "icon_url": "/icons/templates/pandas.svg",
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
 Respond in the user's language for all summary and reasoning but keep the code in english"""
        }
    ],
    "Data Modelling": [
        {
            "template_name": "statistical_analytics_agent",
            "display_name": "Statistical Analytics Agent",
            "description": "Performs statistical analysis (e.g., regression, seasonal decomposition) using statsmodels, with proper handling of categorical data and missing values.",
            "icon_url": "/icons/templates/statsmodels.svg",
            "prompt_template": """You are a statistical analytics agent. Your task is to take a dataset and a user-defined goal and output Python code that performs the appropriate statistical analysis to achieve that goal. Follow these guidelines:
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
Respond in the user's language for all summary and reasoning but keep the code in english"""
        },
        {
            "template_name": "sk_learn_agent",
            "display_name": "Machine Learning Agent",
            "description": "Trains and evaluates machine learning models using scikit-learn, including classification, regression, and clustering with feature importance insights.",
            "icon_url": "/icons/templates/scikit-learn.svg",
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
Respond in the user's language for all summary and reasoning but keep the code in english"""
        }
    ],
    "Data Visualization": [
        {
            "template_name": "data_viz_agent",
            "display_name": "Data Visualization Agent",
            "description": "Generates interactive visualizations with Plotly, selecting the best chart type to reveal trends, comparisons, and insights based on the analysis goal.",
            "icon_url": "/icons/templates/plotly.svg",
            "prompt_template": """You are an AI agent responsible for generating interactive data visualizations using Plotly.
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
• Visualization reveals 35% YoY growth with seasonal peaks in Q4"""
        }
    ]
}

PREMIUM_TEMPLATES = {
    "Data Visualization": [
        {
            "template_name": "matplotlib_agent",
            "display_name": "Matplotlib Visualization Agent",
            "description": "Creates static publication-quality plots using matplotlib and seaborn",
            "icon_url": "/icons/templates/matplotlib.svg",
            "prompt_template": """
You are a matplotlib/seaborn visualization expert. Your task is to create high-quality static visualizations using matplotlib and seaborn libraries.

IMPORTANT Instructions:
- You must only use matplotlib, seaborn, and numpy/pandas for visualizations
- Always use plt.style.use('seaborn-v0_8') or a clean style for better aesthetics
- Include proper titles, axis labels, and legends
- Use appropriate color palettes and consider accessibility
- Sample data if len(df) > 50000 using: df = df.sample(50000, random_state=42)
- Save figures with plt.tight_layout() and high DPI: plt.savefig('plot.png', dpi=300, bbox_inches='tight')
- Always end with plt.show()

Focus on creating publication-ready static visualizations that are informative and aesthetically pleasing.
"""
        },
        {
            "template_name": "seaborn_agent",
            "display_name": "Seaborn Statistical Plots Agent",
            "description": "Creates statistical visualizations and data exploration plots using seaborn",
            "icon_url": "/icons/templates/seaborn.svg",
            "prompt_template": """
You are a seaborn statistical visualization expert. Your task is to create statistical plots and exploratory data visualizations.

IMPORTANT Instructions:
- Focus on seaborn for statistical plotting (distributions, relationships, categorical data)
- Use matplotlib as the backend for customization
- Create informative statistical plots: histograms, box plots, violin plots, pair plots, heatmaps
- Apply proper statistical annotations and significance testing where relevant
- Use seaborn's built-in themes and color palettes for professional appearance
- Include statistical summaries and insights in plot annotations
- Handle categorical and numerical data appropriately
- Always include proper legends, titles, and axis labels

Focus on revealing statistical patterns and relationships in data through visualization.
"""
        },
    ],
    "Data Manipulation": [
        {
            "template_name": "polars_agent",
            "display_name": "Polars Data Processing Agent",
            "description": "High-performance data manipulation and analysis using Polars",
            "icon_url": "/icons/templates/polars.svg",
            "prompt_template": """
You are a Polars data processing expert. Perform high-performance data manipulation and analysis using Polars.

IMPORTANT Instructions:
- Use Polars for fast, memory-efficient data processing
- Leverage lazy evaluation with pl.scan_csv() and .lazy() for large datasets
- Implement efficient data transformations using Polars expressions
- Use Polars-specific methods for groupby, aggregations, and window functions
- Handle various data types and perform type conversions appropriately
- Optimize queries for performance using lazy evaluation and query optimization
- Implement complex data reshaping (pivots, melts, joins)
- Use Polars datetime functionality for time-based operations
- Convert to pandas only when necessary for visualization or other libraries
- Focus on performance and memory efficiency

Focus on leveraging Polars' speed and efficiency for data processing tasks.
"""
        },
        {
            "template_name": "data_cleaning_agent",
            "display_name": "Data Cleaning Specialist Agent",
            "description": "Specialized in comprehensive data cleaning and quality assessment",
            "icon_url": "/icons/templates/data-cleaning.png",
            "prompt_template": """
You are a data cleaning specialist. Perform comprehensive data quality assessment and cleaning.

IMPORTANT Instructions:
- Detect and handle missing values, duplicates, and outliers
- Identify data type inconsistencies and fix them
- Perform data validation and quality checks
- Handle inconsistent formatting (dates, strings, numbers)
- Detect and fix encoding issues
- Create data quality reports with statistics and visualizations
- Implement robust cleaning pipelines
- Flag potential data quality issues for manual review
- Use appropriate imputation strategies based on data characteristics
- Document all cleaning steps and transformations applied

Focus on delivering high-quality, analysis-ready datasets with comprehensive documentation.
"""
        },
        {
            "template_name": "feature_engineering_agent",
            "display_name": "Feature Engineering Agent",
            "description": "Creates and transforms features for machine learning models",
            "icon_url": "/icons/templates/feature-engineering.png",
            "prompt_template": """
You are a feature engineering expert. Create, transform, and select features for machine learning.

IMPORTANT Instructions:
- Create meaningful features from existing data (polynomial, interaction, binning)
- Encode categorical variables appropriately (one-hot, label, target encoding)
- Scale and normalize numerical features
- Handle datetime features (extract components, create time-based features)
- Perform feature selection using statistical tests and model-based methods
- Create domain-specific features based on data context
- Handle high-cardinality categorical features
- Use cross-validation for feature selection to avoid overfitting
- Visualize feature distributions and relationships
- Document feature creation rationale and transformations

Focus on creating predictive features that improve model performance while avoiding data leakage.
"""
        }
    ]
}

def populate_agents_and_templates(include_defaults=True, include_premiums=True):
    """Populate the database with default agents and premium templates."""
    session = session_factory()
    db_type = get_database_type()
    
    try:
        # Track statistics
        default_created = 0
        premium_created = 0
        skipped_count = 0
        
        print(f"🔍 Detected {db_type.upper()} database")
        print(f"📋 Database URL: {DATABASE_URL}")
        
        # Populate default agents (free)
        if include_defaults:
            print(f"\n🆓 --- Processing Default Agents (Free) ---")
            for category, agents in DEFAULT_AGENTS.items():
                print(f"\n📁 {category}:")
                
                for agent_data in agents:
                    template_name = agent_data["template_name"]
                    
                    # Check if agent already exists
                    existing = session.query(AgentTemplate).filter(
                        AgentTemplate.template_name == template_name
                    ).first()
                    
                    if existing:
                        print(f"⏭️  Skipping {template_name} (already exists)")
                        skipped_count += 1
                        continue
                    
                    # Create new default agent
                    template = AgentTemplate(
                        template_name=template_name,
                        display_name=agent_data["display_name"],
                        description=agent_data["description"],
                        icon_url=agent_data["icon_url"],
                        prompt_template=agent_data["prompt_template"],
                        category=category,
                        is_premium_only=False,  # Default agents are free
                        is_active=True,
                        created_at=datetime.now(UTC),
                        updated_at=datetime.now(UTC)
                    )
                    
                    session.add(template)
                    print(f"✅ Created default agent: {template_name}")
                    default_created += 1
        
        # Populate premium templates (paid)
        if include_premiums:
            print(f"\n🔒 --- Processing Premium Templates (Paid) ---")
            for category, templates in PREMIUM_TEMPLATES.items():
                print(f"\n📁 {category}:")
                
                for template_data in templates:
                    template_name = template_data["template_name"]
                    
                    # Check if template already exists
                    existing = session.query(AgentTemplate).filter(
                        AgentTemplate.template_name == template_name
                    ).first()
                    
                    if existing:
                        print(f"⏭️  Skipping {template_name} (already exists)")
                        skipped_count += 1
                        continue
                    
                    # Create new premium template
                    template = AgentTemplate(
                        template_name=template_name,
                        display_name=template_data["display_name"],
                        description=template_data["description"],
                        icon_url=template_data["icon_url"],
                        prompt_template=template_data["prompt_template"],
                        category=category,
                        is_premium_only=True,  # Premium templates require subscription
                        is_active=True,
                        created_at=datetime.now(UTC),
                        updated_at=datetime.now(UTC)
                    )
                    
                    session.add(template)
                    print(f"✅ Created premium template: {template_name}")
                    premium_created += 1
        
        # Commit all changes
        session.commit()
        
        print(f"\n📊 --- Summary ---")
        print(f"🆓 Default agents created: {default_created}")
        print(f"🔒 Premium templates created: {premium_created}")
        print(f"⏭️  Skipped (already exist): {skipped_count}")
        print(f"📈 Total new templates: {default_created + premium_created}")
        
        # Show total count in database
        total_count = session.query(AgentTemplate).count()
        print(f"🗄️  Total templates in database: {total_count}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error populating templates: {str(e)}")
        raise
    finally:
        session.close()

def populate_templates():
    """Legacy function for backward compatibility - only premium templates."""
    populate_agents_and_templates(include_defaults=True, include_premiums=True)

def list_templates():
    """List all existing templates."""
    session = session_factory()
    
    try:
        templates = session.query(AgentTemplate).order_by(AgentTemplate.category, AgentTemplate.template_name).all()
        
        if not templates:
            print("No templates found in database.")
            return
        
        print(f"\n--- Existing Templates ({len(templates)} total) ---")
        
        current_category = None
        for template in templates:
            if template.category != current_category:
                current_category = template.category
                print(f"\n{current_category}:")
            
            status = "🔒 Premium" if template.is_premium_only else "🆓 Free"
            active = "✅ Active" if template.is_active else "❌ Inactive"
            print(f"  • {template.template_name} ({template.display_name}) - {status} - {active}")
            print(f"    {template.description}")
    
    except Exception as e:
        print(f"❌ Error listing templates: {str(e)}")
    finally:
        session.close()

def remove_all_templates():
    """Remove all templates (for testing)."""
    session = session_factory()
    
    try:
        deleted_count = session.query(AgentTemplate).delete()
        
        session.commit()
        print(f"🗑️  Removed {deleted_count} templates")
    
    except Exception as e:
        session.rollback()
        print(f"❌ Error removing templates: {str(e)}")
    finally:
        session.close()

def auto_populate_for_database():
    """Automatically populate based on database type."""
    db_type = get_database_type()
    
    if db_type == "sqlite":
        print("🔍 SQLite detected - populating both default agents and premium templates")
        populate_agents_and_templates(include_defaults=True, include_premiums=True)
    elif db_type == "postgresql":
        print("🔍 PostgreSQL detected - populating only premium templates")
        populate_agents_and_templates(include_defaults=False, include_premiums=True)
    else:
        print(f"⚠️  Unknown database type: {db_type}")
        print("Populating both default agents and premium templates")
        populate_agents_and_templates(include_defaults=True, include_premiums=True)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage agent templates")
    parser.add_argument("action", choices=["populate", "populate-all", "populate-defaults", "auto", "list", "remove-all"], 
                       help="Action to perform")
    
    args = parser.parse_args()
    
    if args.action == "populate":
        print("🚀 Populating premium templates only...")
        populate_templates()
    elif args.action == "populate-all":
        print("🚀 Populating both default agents and premium templates...")
        populate_agents_and_templates(include_defaults=True, include_premiums=True)
    elif args.action == "populate-defaults":
        print("🚀 Populating default agents only...")
        populate_agents_and_templates(include_defaults=True, include_premiums=False)
    elif args.action == "auto":
        print("🚀 Auto-populating based on database type...")
        auto_populate_for_database()
    elif args.action == "list":
        list_templates()
    elif args.action == "remove-all":
        confirm = input("⚠️  Are you sure you want to remove ALL templates? (yes/no): ")
        if confirm.lower() == "yes":
            remove_all_templates()
        else:
            print("Operation cancelled.") 