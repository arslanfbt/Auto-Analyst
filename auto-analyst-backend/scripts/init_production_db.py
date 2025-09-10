#!/usr/bin/env python3
"""
Production database initialization script.
This ensures templates are populated properly and verifies database health.
SAFE for PostgreSQL/RDS - only creates tables on SQLite databases.
"""

import sys
import os
import logging
from datetime import datetime, UTC

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.init_db import init_db, session_factory, engine, is_postgres_db
from src.db.schemas.models import Base, AgentTemplate, UserTemplatePreference
from scripts.populate_agent_templates import populate_templates
from sqlalchemy import inspect, text
from src.utils.logger import Logger

logger = Logger("init_production_db", see_time=True, console_log=True)

def get_database_type():
    """Get the database type (sqlite or postgresql)."""
    try:
        if is_postgres_db():
            return "postgresql"
        else:
            return "sqlite"
    except Exception as e:
        logger.log_message(f"Error determining database type: {e}", logging.ERROR)
        return "unknown"

def check_table_exists(table_name: str) -> bool:
    """Check if a table exists in the database."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return table_name in tables
    except Exception as e:
        logger.log_message(f"Error checking table existence: {e}", logging.ERROR)
        return False

def verify_database_schema():
    """Verify that all required tables exist. Only create tables on SQLite."""
    db_type = get_database_type()
    logger.log_message(f"🔍 Verifying database schema for {db_type.upper()} database...", logging.INFO)
    
    required_tables = [
        'users', 'chats', 'messages', 'model_usage', 'code_executions',
        'message_feedback', 'deep_analysis_reports', 'agent_templates',
        'user_template_preferences'
    ]
    
    missing_tables = []
    existing_tables = []
    
    for table in required_tables:
        if not check_table_exists(table):
            missing_tables.append(table)
            logger.log_message(f"❌ Missing table: {table}", logging.WARNING)
        else:
            existing_tables.append(table)
            logger.log_message(f"✅ Table exists: {table}", logging.INFO)
    
    if missing_tables:
        if db_type == "sqlite":
            logger.log_message(f"🔧 Creating missing tables on SQLite: {missing_tables}", logging.INFO)
            try:
                # Safe to create tables on SQLite
                Base.metadata.create_all(engine)
                logger.log_message("✅ All tables created successfully on SQLite", logging.INFO)
            except Exception as e:
                logger.log_message(f"❌ Failed to create tables: {e}", logging.ERROR)
                raise
        else:
            # PostgreSQL/RDS - DO NOT create tables automatically
            logger.log_message(f"⚠️  WARNING: Missing tables detected in {db_type.upper()} database: {missing_tables}", logging.WARNING)
            logger.log_message("🛡️  SAFETY: Not creating tables automatically on PostgreSQL/RDS", logging.INFO)
            logger.log_message("📋 Please ensure these tables exist in your RDS database:", logging.INFO)
            for table in missing_tables:
                logger.log_message(f"   - {table}", logging.INFO)
            
            # Continue without failing - the app might still work with existing tables
            if 'agent_templates' in missing_tables or 'user_template_preferences' in missing_tables:
                logger.log_message("⚠️  Template functionality may not work without agent_templates and user_template_preferences tables", logging.WARNING)
    else:
        logger.log_message(f"✅ All required tables exist in {db_type.upper()} database", logging.INFO)

def verify_template_data():
    """Verify that agent templates are populated. Safe for all database types."""
    logger.log_message("📋 Verifying template data...", logging.INFO)
    
    session = session_factory()
    try:
        # Check if agent_templates table exists before querying
        if not check_table_exists('agent_templates'):
            logger.log_message("⚠️  agent_templates table does not exist, skipping template verification", logging.WARNING)
            return
        
        template_count = session.query(AgentTemplate).filter(AgentTemplate.is_active == True).count()
        logger.log_message(f"📊 Found {template_count} active templates", logging.INFO)
        
        if template_count == 0:
            logger.log_message("🔧 No templates found, populating...", logging.INFO)
            try:
                populate_templates()
                
                # Verify population worked
                new_count = session.query(AgentTemplate).filter(AgentTemplate.is_active == True).count()
                logger.log_message(f"✅ Templates populated. Total active templates: {new_count}", logging.INFO)
            except Exception as e:
                logger.log_message(f"❌ Template population failed: {e}", logging.ERROR)
                logger.log_message("⚠️  App will continue but template functionality may not work", logging.WARNING)
        else:
            logger.log_message("✅ Templates already populated", logging.INFO)
            
    except Exception as e:
        logger.log_message(f"❌ Error verifying templates: {e}", logging.ERROR)
        logger.log_message("⚠️  Template verification failed, but app will continue", logging.WARNING)
    finally:
        session.close()

def test_template_api_functionality():
    """Test that template-related database operations work. Safe for all database types."""
    logger.log_message("🧪 Testing template API functionality...", logging.INFO)
    
    session = session_factory()
    try:
        # Check if agent_templates table exists before testing
        if not check_table_exists('agent_templates'):
            logger.log_message("⚠️  agent_templates table does not exist, skipping API test", logging.WARNING)
            return
        
        # Test basic template query
        templates = session.query(AgentTemplate).filter(AgentTemplate.is_active == True).limit(5).all()
        logger.log_message(f"✅ Successfully queried {len(templates)} templates", logging.INFO)
        
        if templates:
            sample_template = templates[0]
            logger.log_message(f"📄 Sample template: {sample_template.template_name} - {sample_template.display_name}", logging.INFO)
        else:
            logger.log_message("📭 No templates found in database", logging.INFO)
        
    except Exception as e:
        logger.log_message(f"❌ Template API test failed: {e}", logging.ERROR)
        logger.log_message("⚠️  Template API may not work properly", logging.WARNING)
    finally:
        session.close()

def run_safe_initialization():
    """Run safe database initialization that respects production databases."""
    db_type = get_database_type()
    logger.log_message(f"🚀 Starting SAFE database initialization for {db_type.upper()}...", logging.INFO)
    
    if db_type == "postgresql":
        logger.log_message("🛡️  PostgreSQL/RDS detected - running in SAFE mode", logging.INFO)
        logger.log_message("📋 Will only verify schema and populate templates", logging.INFO)
    elif db_type == "sqlite":
        logger.log_message("💽 SQLite detected - full initialization mode", logging.INFO)
    
    try:
        # Step 1: Initialize database (safe for all types)
        logger.log_message("Step 1: Basic database initialization", logging.INFO)
        if db_type == "sqlite":
            init_db()  # Only run full init on SQLite
        else:
            logger.log_message("Skipping init_db() for PostgreSQL (safety)", logging.INFO)
        
        # Step 2: Verify schema (safe - only creates tables on SQLite)
        logger.log_message("Step 2: Schema verification", logging.INFO)
        verify_database_schema()
        
        # Step 3: Verify template data (safe for all types)
        logger.log_message("Step 3: Template data verification", logging.INFO)
        verify_template_data()
        
        # Step 4: Test functionality (safe for all types)
        logger.log_message("Step 4: Functionality testing", logging.INFO)
        test_template_api_functionality()
        
        logger.log_message(f"🎉 Safe database initialization completed for {db_type.upper()}!", logging.INFO)
        
    except Exception as e:
        logger.log_message(f"💥 Database initialization failed: {e}", logging.ERROR)
        logger.log_message("⚠️  App may still start but some features might not work", logging.WARNING)
        # Don't raise - let the app try to start anyway

if __name__ == "__main__":
    run_safe_initialization() 