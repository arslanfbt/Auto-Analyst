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

# Function to populate agents and templates for development (SQLite only)
# Uses agents_config.json if available, falls back to legacy method
populate_agents_templates() {
    echo "🔧 Checking if agents/templates need to be populated..."
    python -c "
try:
    from src.db.init_db import DATABASE_URL
    from src.db.schemas.models import AgentTemplate
    from src.db.init_db import session_factory
    
    # Check database type
    if DATABASE_URL.startswith('sqlite'):
        print('🔍 SQLite database detected - checking template population')
        
        session = session_factory()
        try:
            template_count = session.query(AgentTemplate).count()
            
            if template_count == 0:
                print('📋 No templates found - populating agents and templates...')
                session.close()
                exit(1)  # Signal that population is needed
            else:
                print(f'✅ Found {template_count} templates - population not needed')
                session.close()
                exit(0)  # Signal that population is not needed
        except Exception as e:
            print(f'⚠️  Error checking templates: {e}')
            print('📋 Will attempt to populate anyway')
            session.close()
            exit(1)  # Signal that population is needed
    else:
        print('🔍 PostgreSQL/RDS detected - skipping auto-population')
        exit(0)  # Signal that population is not needed
        
except Exception as e:
    print(f'❌ Error during template check: {e}')
    exit(0)  # Don't fail startup, just skip population
"
    
    # Check if population is needed (exit code 1 means yes)
    if [ $? -eq 1 ]; then
        echo "🚀 Running agent/template population for SQLite..."
        
        # Check if agents_config.json exists (try multiple locations)
        if [ -f "agents_config.json" ] || [ -f "/app/agents_config.json" ] || [ -f "../agents_config.json" ]; then
            echo "📖 Found agents_config.json - validating configuration..."
            
            # Validate configuration first
            python scripts/populate_agent_templates.py validate
            validation_result=$?
            
            if [ $validation_result -eq 0 ]; then
                echo "✅ Configuration valid - proceeding with sync"
                python scripts/populate_agent_templates.py sync
            else
                echo "⚠️  Configuration validation failed - attempting sync anyway"
                python scripts/populate_agent_templates.py sync
            fi
        else
            echo "⚠️  agents_config.json not found - trying legacy method"
            python scripts/populate_agent_templates.py
        fi
        
        if [ $? -eq 0 ]; then
            echo "✅ Agent/template population completed successfully"
        else
            echo "⚠️  Agent/template population had issues, but continuing..."
            echo "📋 You may need to populate templates manually"
            echo "💡 Tip: Ensure agents_config.json exists in the backend directory"
        fi
    fi
}

# Check if we need to find agents_config.json from space root
if [ ! -f "/app/agents_config.json" ]; then
    echo "⚠️  agents_config.json not found in container - checking build issues"
    echo "📁 Files in /app directory:"
    ls -la /app/ | head -10
else
    echo "✅ agents_config.json found in container"
fi

# Main startup sequence
echo "🔧 Initializing production environment..."

# Verify critical imports first
verify_app_imports

# Initialize database safely (won't modify RDS)
init_production_database

# Test database connectivity (non-failing)
verify_database_connectivity

# Populate agents and templates for development (SQLite only)
populate_agents_templates

echo "🎯 Starting FastAPI application..."
echo "🌐 Application will be available on port 7860"

# Start the FastAPI application
exec uvicorn app:app --host 0.0.0.0 --port 7860 