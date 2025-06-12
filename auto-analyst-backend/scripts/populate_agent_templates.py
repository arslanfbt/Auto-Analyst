#!/usr/bin/env python3
"""
Script to populate agent templates.
These templates are available to all users but usable only by paid users.
"""

import sys
import os
from datetime import datetime, UTC

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.init_db import session_factory
from src.db.schemas.models import AgentTemplate
from sqlalchemy.exc import IntegrityError

# Template agent definitions
AGENT_TEMPLATES = {
    "Visualization": [
        {
            "template_name": "matplotlib_agent",
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
        }
    ],
    "Modelling": [
        {
            "template_name": "xgboost_agent",
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
            "template_name": "time_series_agent",
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
            "template_name": "data_cleaning_agent",
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
            "template_name": "feature_engineering_agent",
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
                template_name = template_data["template_name"]
                
                # Check if template already exists
                existing = session.query(AgentTemplate).filter(
                    AgentTemplate.template_name == template_name
                ).first()
                
                if existing:
                    print(f"⏭️  Skipping {template_name} (already exists)")
                    skipped_count += 1
                    continue
                
                # Create new template
                template = AgentTemplate(
                    template_name=template_name,
                    display_name=template_data["display_name"],
                    description=template_data["description"],
                    prompt_template=template_data["prompt_template"],
                    category=category,
                    is_premium_only=True,  # All templates require premium
                    is_active=True,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC)
                )
                
                session.add(template)
                print(f"✅ Created template: {template_name}")
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

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage agent templates")
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