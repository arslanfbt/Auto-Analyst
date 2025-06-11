#!/usr/bin/env python3
"""
Script to populate custom agent templates.
These templates are available to all users but usable only by paid users.
"""

import sys
import os
from datetime import datetime, UTC

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.init_db import session_factory
from src.db.schemas.models import CustomAgent
from sqlalchemy.exc import IntegrityError

# Template agent definitions
AGENT_TEMPLATES = {
    "Visualization": [
        {
            "agent_name": "matplotlib_agent",
            "display_name": "Matplotlib Visualization Agent",
            "description": "Creates static publication-quality plots using matplotlib and seaborn",
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
            "agent_name": "seaborn_agent", 
            "display_name": "Seaborn Statistical Plots Agent",
            "description": "Creates statistical visualizations and plots using seaborn library",
            "prompt_template": """
You are a seaborn statistical visualization expert. Create insightful statistical plots using seaborn.

IMPORTANT Instructions:
- Specialize in seaborn's statistical plotting capabilities
- Use seaborn's built-in statistical functions (regplot, distplot, boxplot, violin, etc.)
- Apply appropriate statistical themes and color palettes
- Include confidence intervals and statistical annotations where relevant
- Sample large datasets: if len(df) > 50000: df = df.sample(50000, random_state=42)
- Use plt.figure(figsize=(10, 6)) for appropriate sizing
- Always include proper statistical context in titles and labels

Focus on revealing statistical relationships and distributions in the data.
"""
        },
        {
            "agent_name": "plotly_advanced_agent",
            "display_name": "Advanced Plotly Agent", 
            "description": "Creates sophisticated interactive visualizations with advanced Plotly features",
            "prompt_template": """
You are an advanced Plotly visualization expert. Create sophisticated interactive visualizations with advanced features.

IMPORTANT Instructions:
- Use advanced Plotly features: subplots, animations, 3D plots, statistical charts
- Implement interactive features: hover data, clickable legends, zoom, pan
- Use plotly.graph_objects for fine control and plotly.express for rapid prototyping
- Add annotations, shapes, and custom styling
- Sample data if len(df) > 50000: df = df.sample(50000, random_state=42)
- Use fig.update_layout() for professional styling
- Return fig.to_html(full_html=False) for embedding

Focus on creating publication-quality interactive visualizations with advanced features.
"""
        }
    ],
    "Modelling": [
        {
            "agent_name": "xgboost_agent",
            "display_name": "XGBoost Machine Learning Agent",
            "description": "Builds and optimizes XGBoost models for classification and regression tasks",
            "prompt_template": """
You are an XGBoost machine learning expert. Build, tune, and evaluate XGBoost models.

IMPORTANT Instructions:
- Use XGBoost for both classification and regression tasks
- Implement proper train/validation/test splits
- Perform hyperparameter tuning using GridSearchCV or RandomizedSearchCV
- Handle categorical variables with proper encoding
- Include feature importance analysis and visualization
- Evaluate models with appropriate metrics (accuracy, precision, recall, F1, RMSE, MAE, etc.)
- Use cross-validation for robust model evaluation
- Plot training curves and validation curves
- Provide model interpretation and feature importance insights

Focus on building production-ready XGBoost models with proper evaluation and interpretation.
"""
        },
        {
            "agent_name": "neural_network_agent",
            "display_name": "Neural Network Agent", 
            "description": "Builds and trains neural networks using TensorFlow/Keras",
            "prompt_template": """
You are a neural network expert using TensorFlow/Keras. Build and train neural networks for various tasks.

IMPORTANT Instructions:
- Design appropriate network architectures for the task (classification, regression, etc.)
- Implement proper data preprocessing and normalization
- Use appropriate activation functions, optimizers, and loss functions
- Implement callbacks: EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
- Plot training history (loss and metrics over epochs)
- Evaluate model performance with appropriate metrics
- Include model summary and architecture visualization
- Handle overfitting with dropout, regularization, or data augmentation
- Use train/validation/test splits properly

Focus on building effective neural networks with proper training procedures and evaluation.
"""
        },
        {
            "agent_name": "time_series_agent",
            "display_name": "Time Series Forecasting Agent",
            "description": "Specialized in time series analysis and forecasting using ARIMA, Prophet, LSTM",
            "prompt_template": """
You are a time series forecasting expert. Analyze temporal data and create forecasting models.

IMPORTANT Instructions:
- Perform exploratory time series analysis (trend, seasonality, stationarity)
- Use appropriate models: ARIMA, SARIMA, Prophet, LSTM, or ensemble methods
- Test for stationarity using ADF test and apply differencing if needed
- Decompose time series into trend, seasonal, and residual components
- Create forecasts with confidence intervals
- Evaluate forecasts using MAE, RMSE, MAPE metrics
- Plot actual vs predicted values and residuals
- Handle missing values and outliers appropriately
- Consider multiple seasonalities and external factors

Focus on accurate time series forecasting with proper validation and uncertainty quantification.
"""
        }
    ],
    "Data Manipulation": [
        {
            "agent_name": "pandas_expert_agent",
            "display_name": "Pandas Data Expert Agent",
            "description": "Advanced pandas operations for complex data manipulation and analysis",
            "prompt_template": """
You are a pandas expert specializing in advanced data manipulation and analysis.

IMPORTANT Instructions:
- Use advanced pandas operations: groupby, pivot, merge, concat, apply, transform
- Implement efficient data cleaning and preprocessing workflows
- Handle missing data with multiple strategies (imputation, dropping, flagging)
- Perform advanced aggregations and window functions
- Use vectorized operations for performance
- Handle large datasets efficiently with chunking if needed
- Create custom functions for complex transformations
- Use proper indexing and data types for optimization
- Include data quality checks and validation

Focus on efficient and robust data manipulation that prepares data for analysis or modeling.
"""
        },
        {
            "agent_name": "data_cleaning_agent",
            "display_name": "Data Cleaning Specialist Agent",
            "description": "Specialized in comprehensive data cleaning and quality assessment",
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
            "agent_name": "feature_engineering_agent",
            "display_name": "Feature Engineering Agent",
            "description": "Creates and transforms features for machine learning models",
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

def populate_templates():
    """Populate the database with agent templates."""
    session = session_factory()
    
    try:
        # Track statistics
        created_count = 0
        skipped_count = 0
        
        for category, templates in AGENT_TEMPLATES.items():
            print(f"\n--- Processing {category} Templates ---")
            
            for template_data in templates:
                agent_name = template_data["agent_name"]
                
                # Check if template already exists
                existing = session.query(CustomAgent).filter(
                    CustomAgent.agent_name == agent_name,
                    CustomAgent.is_template == True
                ).first()
                
                if existing:
                    print(f"⏭️  Skipping {agent_name} (already exists)")
                    skipped_count += 1
                    continue
                
                # Create new template
                template = CustomAgent(
                    user_id=None,  # Templates don't belong to specific users
                    agent_name=agent_name,
                    display_name=template_data["display_name"],
                    description=template_data["description"],
                    prompt_template=template_data["prompt_template"],
                    is_template=True,
                    template_category=category,
                    is_premium_only=True,  # All templates require premium
                    is_active=True,
                    usage_count=0,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC)
                )
                
                session.add(template)
                print(f"✅ Created template: {agent_name}")
                created_count += 1
        
        # Commit all changes
        session.commit()
        
        print(f"\n--- Summary ---")
        print(f"Created: {created_count} templates")
        print(f"Skipped: {skipped_count} templates")
        print(f"Total templates in database: {created_count + skipped_count}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error populating templates: {str(e)}")
        raise
    finally:
        session.close()

def list_templates():
    """List all existing templates."""
    session = session_factory()
    
    try:
        templates = session.query(CustomAgent).filter(
            CustomAgent.is_template == True
        ).order_by(CustomAgent.template_category, CustomAgent.agent_name).all()
        
        if not templates:
            print("No templates found in database.")
            return
        
        print(f"\n--- Existing Templates ({len(templates)} total) ---")
        
        current_category = None
        for template in templates:
            if template.template_category != current_category:
                current_category = template.template_category
                print(f"\n{current_category}:")
            
            status = "🔒 Premium" if template.is_premium_only else "🆓 Free"
            active = "✅ Active" if template.is_active else "❌ Inactive"
            print(f"  • {template.agent_name} ({template.display_name}) - {status} - {active}")
            print(f"    {template.description}")
            print(f"    Usage: {template.usage_count} times")
    
    except Exception as e:
        print(f"❌ Error listing templates: {str(e)}")
    finally:
        session.close()

def remove_all_templates():
    """Remove all templates (for testing)."""
    session = session_factory()
    
    try:
        deleted_count = session.query(CustomAgent).filter(
            CustomAgent.is_template == True
        ).delete()
        
        session.commit()
        print(f"🗑️  Removed {deleted_count} templates")
    
    except Exception as e:
        session.rollback()
        print(f"❌ Error removing templates: {str(e)}")
    finally:
        session.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage custom agent templates")
    parser.add_argument("action", choices=["populate", "list", "remove-all"], 
                       help="Action to perform")
    
    args = parser.parse_args()
    
    if args.action == "populate":
        print("🚀 Populating agent templates...")
        populate_templates()
    elif args.action == "list":
        list_templates()
    elif args.action == "remove-all":
        confirm = input("⚠️  Are you sure you want to remove ALL templates? (yes/no): ")
        if confirm.lower() == "yes":
            remove_all_templates()
        else:
            print("Operation cancelled.") 