#!/usr/bin/env python3
"""
SQLite Agent Template Management Script
Similar to manage_templates.py but optimized for local SQLite development.
Reads agents from agents_config.json and manages SQLite database.
"""

import sys
import os
import json
import requests
from datetime import datetime, UTC
from pathlib import Path

# Add the project root to the Python path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
project_root = os.path.dirname(os.path.dirname(backend_dir))

# Change to backend directory to ensure proper path resolution
os.chdir(backend_dir)
sys.path.append(backend_dir)

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

def load_agents_config():
    """Load agents configuration from agents_config.json"""
    # Try multiple possible locations for agents_config.json
    possible_paths = [
        os.path.join(backend_dir, 'agents_config.json'),  # Backend directory (copied file)
        os.path.join(project_root, 'agents_config.json'),  # Project root
        '/app/agents_config.json',  # Container root (HF Spaces)
        'agents_config.json'  # Current directory
    ]
    
    config_path = None
    for path in possible_paths:
        if os.path.exists(path):
            config_path = path
            print(f"📖 Found agents_config.json at: {config_path}")
            break
    
    if not config_path:
        paths_str = '\n  '.join(possible_paths)
        raise FileNotFoundError(f"agents_config.json not found in any of these locations:\n  {paths_str}")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    return config.get('templates', [])

def download_icon(icon_url, template_name):
    """Download icon from URL and save to frontend directory"""
    if not icon_url or not icon_url.startswith('http'):
        print(f"⏭️  Skipping icon download for {template_name} (not a URL: {icon_url})")
        return icon_url
    
    try:
        # Determine frontend directory
        frontend_dir = os.path.join(project_root, 'Auto-Analyst-CS', 'auto-analyst-frontend')
        public_dir = os.path.join(frontend_dir, 'public')
        
        if not os.path.exists(public_dir):
            print(f"⚠️  Frontend public directory not found: {public_dir}")
            return icon_url
        
        # Parse the path from icon_url
        if '/icons/templates/' in icon_url:
            relative_path = icon_url.split('/icons/templates/')[-1]
            icon_dir = os.path.join(public_dir, 'icons', 'templates')
        else:
            # Fallback: use filename from URL
            filename = icon_url.split('/')[-1]
            if not filename.endswith(('.svg', '.png', '.jpg', '.jpeg')):
                filename += '.svg'
            relative_path = filename
            icon_dir = os.path.join(public_dir, 'icons', 'templates')
        
        # Create icon directory if it doesn't exist
        os.makedirs(icon_dir, exist_ok=True)
        
        # Download and save icon
        icon_path = os.path.join(icon_dir, relative_path)
        
        # Skip if already exists
        if os.path.exists(icon_path):
            print(f"📁 Icon already exists: {relative_path}")
            return f"/icons/templates/{relative_path}"
        
        response = requests.get(icon_url, timeout=10)
        response.raise_for_status()
        
        with open(icon_path, 'wb') as f:
            f.write(response.content)
        
        print(f"📥 Downloaded icon: {relative_path}")
        return f"/icons/templates/{relative_path}"
        
    except Exception as e:
        print(f"❌ Failed to download icon for {template_name}: {str(e)}")
        return icon_url

def sync_agents_from_config():
    """Synchronize agents from agents_config.json to SQLite database"""
    session = session_factory()
    db_type = get_database_type()
    
    if db_type != "sqlite":
        print(f"⚠️  This script is designed for SQLite, but detected {db_type}")
        print("Consider using manage_templates.py for PostgreSQL")
        return
    
    try:
        # Load configuration
        print(f"📖 Loading agents from agents_config.json...")
        templates_config = load_agents_config()
        
        if not templates_config:
            print("❌ No templates found in agents_config.json")
            return
        
        # Track statistics
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        print(f"🔍 Processing {len(templates_config)} templates for SQLite database")
        print(f"📋 Database URL: {DATABASE_URL}")
        
        # Group templates by category for display
        categories = {}
        for template_data in templates_config:
            category = template_data.get('category', 'Uncategorized')
            if category not in categories:
                categories[category] = []
            categories[category].append(template_data)
        
        # Process templates by category
        for category, templates in categories.items():
            print(f"\n📁 {category}:")
            
            for template_data in templates:
                template_name = template_data["template_name"]
                
                # Check if template already exists
                existing = session.query(AgentTemplate).filter(
                    AgentTemplate.template_name == template_name
                ).first()
                
                # Download icon if it's a URL
                icon_url = template_data.get("icon_url", "")
                if icon_url.startswith('http'):
                    icon_url = download_icon(icon_url, template_name)
                
                if existing:
                    # Update existing template
                    existing.display_name = template_data["display_name"]
                    existing.description = template_data["description"]
                    existing.icon_url = icon_url
                    existing.prompt_template = template_data["prompt_template"]
                    existing.category = template_data.get("category", "Uncategorized")
                    existing.is_premium_only = template_data.get("is_premium_only", False)
                    existing.is_active = template_data.get("is_active", True)
                    existing.variant_type = template_data.get("variant_type", "individual")
                    existing.base_agent = template_data.get("base_agent", template_name)
                    existing.updated_at = datetime.now(UTC)
                    
                    variant_icon = "🤖" if template_data.get("variant_type") == "planner" else "👤"
                    premium_icon = "🔒" if template_data.get("is_premium_only") else "🆓"
                    print(f"🔄 Updated: {template_name} {variant_icon} {premium_icon}")
                    updated_count += 1
                else:
                    # Create new template
                    template = AgentTemplate(
                        template_name=template_name,
                        display_name=template_data["display_name"],
                        description=template_data["description"],
                        icon_url=icon_url,
                        prompt_template=template_data["prompt_template"],
                        category=template_data.get("category", "Uncategorized"),
                        is_premium_only=template_data.get("is_premium_only", False),
                        is_active=template_data.get("is_active", True),
                        variant_type=template_data.get("variant_type", "individual"),
                        base_agent=template_data.get("base_agent", template_name),
                        created_at=datetime.now(UTC),
                        updated_at=datetime.now(UTC)
                    )
                    
                    session.add(template)
                    variant_icon = "🤖" if template_data.get("variant_type") == "planner" else "👤"
                    premium_icon = "🔒" if template_data.get("is_premium_only") else "🆓"
                    print(f"✅ Created: {template_name} {variant_icon} {premium_icon}")
                    created_count += 1
        
        # Handle removals if specified in config
        remove_list = []
        # Re-load the full config to check for removals
        try:
            full_config_path = None
            possible_paths = [
                os.path.join(backend_dir, 'agents_config.json'),
                os.path.join(project_root, 'agents_config.json'),
                '/app/agents_config.json',
                'agents_config.json'
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    full_config_path = path
                    break
            
            if full_config_path:
                with open(full_config_path, 'r', encoding='utf-8') as f:
                    full_config = json.load(f)
                    if 'remove' in full_config:
                        remove_list = full_config['remove']
        except Exception as e:
            print(f"⚠️ Could not load removal list: {e}")
        
        # Remove templates marked for removal
        if remove_list:
            print(f"\n🗑️ --- Processing Removals ---")
            for template_name in remove_list:
                existing = session.query(AgentTemplate).filter(
                    AgentTemplate.template_name == template_name
                ).first()
                
                if existing:
                    session.delete(existing)
                    print(f"🗑️ Removed: {template_name}")
                else:
                    print(f"⏭️ Skipping removal: {template_name} (not found)")
        
        # Commit all changes
        session.commit()
        
        print(f"\n📊 --- Summary ---")
        print(f"✅ Templates created: {created_count}")
        print(f"🔄 Templates updated: {updated_count}")
        print(f"⏭️ Templates skipped: {skipped_count}")
        
        # Show total count in database
        total_count = session.query(AgentTemplate).count()
        free_count = session.query(AgentTemplate).filter(AgentTemplate.is_premium_only == False).count()
        premium_count = session.query(AgentTemplate).filter(AgentTemplate.is_premium_only == True).count()
        individual_count = session.query(AgentTemplate).filter(AgentTemplate.variant_type == 'individual').count()
        planner_count = session.query(AgentTemplate).filter(AgentTemplate.variant_type == 'planner').count()
        
        print(f"🗄️ Total templates in database: {total_count}")
        print(f"🆓 Free templates: {free_count}")
        print(f"🔒 Premium templates: {premium_count}")
        print(f"👤 Individual variants: {individual_count}")
        print(f"🤖 Planner variants: {planner_count}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error syncing templates: {str(e)}")
        raise
    finally:
        session.close()

def list_templates():
    """List all existing templates in the database"""
    session = session_factory()
    
    try:
        templates = session.query(AgentTemplate).order_by(
            AgentTemplate.category, 
            AgentTemplate.is_premium_only, 
            AgentTemplate.template_name
        ).all()
        
        if not templates:
            print("No templates found in database.")
            return
        
        print(f"\n--- Existing Templates ({len(templates)} total) ---")
        
        current_category = None
        for template in templates:
            if template.category != current_category:
                current_category = template.category
                print(f"\n📁 {current_category}:")
            
            status = "🔒 Premium" if template.is_premium_only else "🆓 Free"
            active = "✅ Active" if template.is_active else "❌ Inactive"
            variant = getattr(template, 'variant_type', 'individual')
            variant_icon = "🤖" if variant == "planner" else "👤"
            
            print(f"  • {template.template_name} ({template.display_name})")
            print(f"    {status} - {active} - {variant_icon} {variant}")
            print(f"    📝 {template.description}")
    
    except Exception as e:
        print(f"❌ Error listing templates: {str(e)}")
    finally:
        session.close()

def remove_all_templates():
    """Remove all templates from database (for testing)"""
    session = session_factory()
    
    try:
        deleted_count = session.query(AgentTemplate).delete()
        session.commit()
        print(f"🗑️ Removed {deleted_count} templates from database")
    
    except Exception as e:
        session.rollback()
        print(f"❌ Error removing templates: {str(e)}")
    finally:
        session.close()

def validate_config():
    """Validate the agents_config.json structure"""
    try:
        templates_config = load_agents_config()
        
        print(f"📋 Validating agents_config.json...")
        print(f"✅ Found {len(templates_config)} templates")
        
        # Check required fields
        required_fields = ['template_name', 'display_name', 'description', 'prompt_template']
        issues = []
        
        for i, template in enumerate(templates_config):
            for field in required_fields:
                if field not in template:
                    issues.append(f"Template {i}: Missing required field '{field}'")
        
        if issues:
            print(f"❌ Validation issues found:")
            for issue in issues:
                print(f"  • {issue}")
        else:
            print(f"✅ Configuration is valid")
            
        # Show summary by category
        categories = {}
        for template in templates_config:
            category = template.get('category', 'Uncategorized')
            if category not in categories:
                categories[category] = {'free': 0, 'premium': 0, 'individual': 0, 'planner': 0}
            
            if template.get('is_premium_only', False):
                categories[category]['premium'] += 1
            else:
                categories[category]['free'] += 1
                
            if template.get('variant_type', 'individual') == 'planner':
                categories[category]['planner'] += 1
            else:
                categories[category]['individual'] += 1
        
        print(f"\n📊 Summary by category:")
        for category, counts in categories.items():
            total = counts['free'] + counts['premium']
            print(f"  📁 {category}: {total} templates")
            print(f"    🆓 Free: {counts['free']} | 🔒 Premium: {counts['premium']}")
            print(f"    👤 Individual: {counts['individual']} | 🤖 Planner: {counts['planner']}")
    
    except Exception as e:
        print(f"❌ Error validating config: {str(e)}")

def create_minimal_templates():
    """Create a minimal set of essential templates for container environments"""
    session = session_factory()
    
    try:
        print("🔧 Creating minimal template set...")
        
        # Define minimal essential templates
        minimal_templates = [
            {
                "template_name": "preprocessing_agent",
                "display_name": "Data Preprocessing Agent",
                "description": "Cleans and prepares DataFrame using Pandas and NumPy",
                "icon_url": "/icons/templates/preprocessing_agent.svg",
                "category": "Data Manipulation",
                "is_premium_only": False,
                "variant_type": "individual",
                "base_agent": "preprocessing_agent",
                "is_active": True,
                "prompt_template": "You are a preprocessing agent that cleans and prepares data using Pandas and NumPy. Handle missing values, detect column types, and convert date strings to datetime. Generate clean Python code for data preprocessing based on the user's analysis goals."
            },
            {
                "template_name": "data_viz_agent",
                "display_name": "Data Visualization Agent",
                "description": "Creates interactive visualizations using Plotly",
                "icon_url": "/icons/templates/data_viz_agent.svg",
                "category": "Data Visualization",
                "is_premium_only": False,
                "variant_type": "individual",
                "base_agent": "data_viz_agent",
                "is_active": True,
                "prompt_template": "You are a data visualization agent. Create interactive visualizations using Plotly based on user requirements. Generate appropriate chart types, apply styling, and ensure visualizations effectively communicate insights."
            },
            {
                "template_name": "sk_learn_agent",
                "display_name": "Machine Learning Agent",
                "description": "Trains ML models using scikit-learn",
                "icon_url": "/icons/templates/sk_learn_agent.svg",
                "category": "Data Modelling",
                "is_premium_only": False,
                "variant_type": "individual",
                "base_agent": "sk_learn_agent",
                "is_active": True,
                "prompt_template": "You are a machine learning agent. Use scikit-learn to train and evaluate ML models including classification, regression, and clustering. Provide feature importance insights and model performance metrics."
            }
        ]
        
        created_count = 0
        
        for template_data in minimal_templates:
            template_name = template_data["template_name"]
            
            # Check if template already exists
            existing = session.query(AgentTemplate).filter(
                AgentTemplate.template_name == template_name
            ).first()
            
            if not existing:
                template = AgentTemplate(
                    template_name=template_name,
                    display_name=template_data["display_name"],
                    description=template_data["description"],
                    icon_url=template_data["icon_url"],
                    prompt_template=template_data["prompt_template"],
                    category=template_data["category"],
                    is_premium_only=template_data["is_premium_only"],
                    is_active=template_data["is_active"],
                    variant_type=template_data["variant_type"],
                    base_agent=template_data["base_agent"],
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC)
                )
                
                session.add(template)
                print(f"✅ Created minimal template: {template_name}")
                created_count += 1
            else:
                print(f"⏭️ Template already exists: {template_name}")
        
        session.commit()
        print(f"📊 Created {created_count} minimal templates")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating minimal templates: {str(e)}")
        raise
    finally:
        session.close()

def populate_templates():
    """Legacy compatibility function for backward compatibility"""
    print("⚠️  Legacy populate_templates() called - checking for agents_config.json...")
    
    # Check if agents_config.json exists anywhere
    possible_paths = [
        os.path.join(backend_dir, 'agents_config.json'),
        os.path.join(project_root, 'agents_config.json'),
        '/app/agents_config.json',
        'agents_config.json'
    ]
    
    config_exists = any(os.path.exists(path) for path in possible_paths)
    
    if config_exists:
        print("📖 Found agents_config.json - using sync_agents_from_config()")
        sync_agents_from_config()
    else:
        print("⚠️  agents_config.json not found - using fallback minimal templates")
        print("💡 Creating essential templates for container environment")
        create_minimal_templates()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="SQLite Agent Template Management")
    parser.add_argument("action", choices=["sync", "list", "remove-all", "validate"], 
                       help="Action to perform")
    
    args = parser.parse_args()
    
    if args.action == "sync":
        print("🚀 Synchronizing agents from agents_config.json to SQLite...")
        sync_agents_from_config()
    elif args.action == "list":
        list_templates()
    elif args.action == "validate":
        validate_config()
    elif args.action == "remove-all":
        confirm = input("⚠️ Are you sure you want to remove ALL templates? (yes/no): ")
        if confirm.lower() == "yes":
            remove_all_templates()
        else:
            print("Operation cancelled.") 