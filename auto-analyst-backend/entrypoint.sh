#!/bin/bash

# Entrypoint script for Auto-Analyst backend
# This script safely initializes the database and starts the application
# SAFE for PostgreSQL/RDS - only modifies SQLite databases

set -e  # Exit on any error

echo "🚀 Starting Auto-Analyst Backend..."

# Function to run safe database initialization
init_production_database() {
    echo "🔧 Running SAFE database initialization..."
    
    # Run the safe initialization script
    python scripts/init_production_db.py
    
    # Don't fail if database initialization has issues - let app try to start
    if [ $? -eq 0 ]; then
        echo "✅ Database initialization completed successfully"
    else
        echo "⚠️  Database initialization had issues, but continuing..."
        echo "📋 App will start but some features may not work properly"
    fi
}

# Function to verify basic app imports work
verify_app_imports() {
    echo "🔍 Verifying application imports..."
    python -c "
try:
    from app import app
    print('✅ Main application imports successful')
except Exception as e:
    print(f'❌ Application import failed: {e}')
    exit(1)
" || {
    echo "❌ Critical application import failure - cannot start"
    exit 1
}
}

# Function to verify database connectivity (non-failing)
verify_database_connectivity() {
    echo "🔗 Testing database connectivity..."
    python -c "
try:
    from src.db.init_db import get_session, is_postgres_db
    from src.db.schemas.models import AgentTemplate
    
    db_type = 'PostgreSQL/RDS' if is_postgres_db() else 'SQLite'
    print(f'🗄️  Database type: {db_type}')
    
    session = get_session()
    
    # Try to query templates if table exists
    try:
        template_count = session.query(AgentTemplate).count()
        print(f'✅ Database connected. Found {template_count} templates.')
    except Exception as table_error:
        print(f'⚠️  Database connected but template table issue: {table_error}')
        print('📋 Template functionality may not work')
    finally:
        session.close()
        
except Exception as e:
    print(f'⚠️  Database connectivity issue: {e}')
    print('📋 App will start but database features may not work')
"
    # Don't exit on database connectivity issues - let app try to start
}

# Main startup sequence
echo "🔧 Initializing production environment..."

# Verify critical imports first
verify_app_imports

# Initialize database safely (won't modify RDS)
init_production_database

# Test database connectivity (non-failing)
verify_database_connectivity

echo "🎯 Starting FastAPI application..."
echo "🌐 Application will be available on port 7860"

# Start the FastAPI application
exec uvicorn app:app --host 0.0.0.0 --port 7860 