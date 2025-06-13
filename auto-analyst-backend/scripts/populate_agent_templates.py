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
            "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/matplotlib/matplotlib-original.svg",
            "prompt_template": """
You are a matplotlib/seaborn visualization expert. Your task is to create high-quality static visualizations using matplotlib and seaborn libraries.

IMPORTANT Instructions:
- You must only use matplotlib, seaborn, and numpy/polars for visualizations
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
            "icon_url": "https://seaborn.pydata.org/_images/logo-mark-lightbg.svg",
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
            "icon_url": "https://raw.githubusercontent.com/pola-rs/polars-static/master/logos/polars-logo-dark.svg",
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
            "icon_url": "https://cdn-icons-png.flaticon.com/512/2103/2103633.png",
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
            "icon_url": "https://cdn-icons-png.flaticon.com/512/2103/2103658.png",
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
                    icon_url=template_data["icon_url"],
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