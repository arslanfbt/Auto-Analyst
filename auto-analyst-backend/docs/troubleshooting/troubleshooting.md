# Auto-Analyst Backend Troubleshooting Guide

## 🚨 Common Startup Issues

### 1. **Database Connection Problems**

#### Problem: Database connection failed
```
❌ sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table: users
```

**Solutions:**
1. **Initialize Database**:
   ```bash
   python -c "
   from src.db.init_db import init_db
   init_db()
   print('✅ Database initialized')
   "
   ```

2. **Check Database File Permissions**:
   ```bash
   # For SQLite
   ls -la auto_analyst.db
   chmod 666 auto_analyst.db  # If needed
   ```

3. **Verify DATABASE_URL**:
   ```bash
   # Check .env file
   cat .env | grep DATABASE_URL
   
   # For PostgreSQL (production)
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # For SQLite (development)  
   DATABASE_URL=sqlite:///./auto_analyst.db
   ```

#### Problem: PostgreSQL connection issues
```
❌ psycopg2.OperationalError: FATAL: database "auto_analyst" does not exist
```

**Solutions:**
1. **Create Database**:
   ```sql
   -- Connect to PostgreSQL
   psql -h localhost -U postgres
   CREATE DATABASE auto_analyst;
   \q
   ```

2. **Update Connection String**:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/auto_analyst
   ```

### 2. **Agent Template Loading Issues**

#### Problem: No agents found
```
❌ RuntimeError: No agents loaded for user. Cannot proceed with analysis.
```

**Solutions:**
1. **Initialize Default Agents**:
   ```python
   python -m scripts.populate_agent_templates
   print('✅ Default agents initialized')
   "
   ```

2. **Check Agent Templates in Database**:
   ```python
   python -c "
   from src.db.init_db import session_factory
   from src.db.schemas.models import AgentTemplate
   session = session_factory()
   templates = session.query(AgentTemplate).all()
   print(f'Found {len(templates)} templates:')
   for t in templates:
       print(f'  - {t.template_name}: {t.is_active}')
   session.close()
   "
   ```

3. **Populate Templates from Config**:
   ```bash
   python scripts/populate_agent_templates.py
   ```

### 3. **API Key Issues**

#### Problem: Missing API keys
```
❌ AuthenticationError: Invalid API key provided
```

**Solutions:**
1. **Check Environment Variables**:
   ```bash
   # Verify API keys are set
   echo $ANTHROPIC_API_KEY
   echo $OPENAI_API_KEY
   
   # Or check .env file
   cat .env | grep API_KEY
   ```

2. **Add Missing Keys**:
   ```env
   # Add to .env file
   ANTHROPIC_API_KEY=sk-ant-api03-...
   OPENAI_API_KEY=sk-...
   ADMIN_API_KEY=your_admin_key_here
   ```

3. **Test API Key Validity**:
   ```python
   python -c "
   import os
   from anthropic import Anthropic
   client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
   try:
       # Test call
       response = client.messages.create(
           model='claude-3-sonnet-20241022',
           max_tokens=10,
           messages=[{'role': 'user', 'content': 'Hello'}]
       )
       print('✅ Anthropic API key valid')
   except Exception as e:
       print(f'❌ Anthropic API key invalid: {e}')
   "
   ```

## 🤖 Agent System Issues

### 1. **Agent Not Found Errors**

#### Problem: Specific agent not available
```
❌ KeyError: 'custom_agent' not found in loaded agents
```

**Solutions:**
1. **Check Available Agents**:
   ```python
   python -c "
   from src.agents.agents import load_user_enabled_templates_from_db
   from src.db.init_db import session_factory
   session = session_factory()
   agents = load_user_enabled_templates_from_db('test_user', session)
   print('Available agents:', list(agents.keys()))
   session.close()
   "
   ```

2. **Verify Agent Template Exists**:
   ```python
   python -c "
   from src.db.init_db import session_factory
   from src.db.schemas.models import AgentTemplate
   session = session_factory()
   agent = session.query(AgentTemplate).filter_by(template_name='custom_agent').first()
   if agent:
       print(f'Agent found: {agent.display_name}, Active: {agent.is_active}')
   else:
       print('Agent not found in database')
   session.close()
   "
   ```

3. **Add Missing Agent Template**:
   ```python
   # Add to agents_config.json or use database insertion
   python scripts/populate_agent_templates.py
   ```

### 2. **Deep Analysis Failures**

#### Problem: Deep analysis stops unexpectedly
```
❌ DeepAnalysisError: Agent execution failed at step 3
```

**Solutions:**
1. **Check Agent Configuration**:
   ```python
   # Verify user has required agents enabled
   python -c "
   from src.agents.deep_agents import get_user_enabled_agent_names
   from src.db.init_db import session_factory
   session = session_factory()
   agents = get_user_enabled_agent_names('test_user', session)
   required = ['preprocessing_agent', 'statistical_analytics_agent', 'sk_learn_agent', 'data_viz_agent']
   print('Required agents:', required)
   print('Available agents:', agents)
   print('Missing:', [a for a in required if a not in agents])
   session.close()
   "
   ```

2. **Increase Timeout Settings**:
   ```python
   # In deep_agents.py, increase timeout values
   timeout = 300  # Increase from default
   ```

3. **Check Dataset Size**:
   ```python
   # Reduce dataset size for complex analysis
   df_sample = df.sample(n=1000)  # Use sample for testing
   ```

## ⚡ Code Execution Problems

### 1. **Code Execution Timeouts**

#### Problem: Code execution takes too long
```
❌ TimeoutError: Code execution exceeded 120 seconds
```

**Solutions:**
1. **Optimize Generated Code**:
   - Use data sampling for large datasets
   - Simplify analysis requirements
   - Use sampling for large datasets

2. **Check Resource Usage**:
   ```python
   import psutil
   print(f"Memory usage: {psutil.virtual_memory().percent}%")
   print(f"CPU usage: {psutil.cpu_percent()}%")
   ```

3. **Increase Timeout Settings**:
   ```python
   # In clean_and_store_code function
   future.result(timeout=600)  # Increase timeout to 10 minutes
   ```

#### Problem: Import Errors in Generated Code
```
❌ ModuleNotFoundError: No module named 'some_library'
```

**Solutions:**
1. **Check Available Libraries**:
   ```python
   # Available in execution environment:
   import pandas as pd
   import numpy as np
   import plotly.express as px
   import plotly.graph_objects as go
   import sklearn
   import statsmodels.api as sm
   ```

2. **Add Missing Dependencies**:
   ```bash
   pip install missing_library
   ```

3. **Update Execution Environment**:
   ```python
   # In clean_and_store_code function
   exec_globals.update({
       'new_library': __import__('new_library')
   })
   ```

### 4. **Database Issues**

#### Problem: Migration Errors
```
❌ alembic.util.exc.CommandError: Can't locate revision identified by 'xyz'
```

**Solutions:**
1. **Reset Migration History**:
   ```bash
   # Delete migration files (except __init__.py)
   rm migrations/versions/*.py
   
   # Create new initial migration
   alembic revision --autogenerate -m "initial migration"
   alembic upgrade head
   ```

2. **Force Migration**:
   ```bash
   # Mark current state as up-to-date
   alembic stamp head
   ```

3. **Recreate Database**:
   ```bash
   # For SQLite (development)
   rm auto_analyst.db
   python -c "from src.db.init_db import init_db; init_db()"
   ```

#### Problem: Constraint Violations
```
❌ IntegrityError: UNIQUE constraint failed
```

**Solutions:**
1. **Check Existing Records**:
   ```python
   from src.db.init_db import session_factory
   from src.db.schemas.models import AgentTemplate
   
   session = session_factory()
   templates = session.query(AgentTemplate).all()
   for t in templates:
       print(f"{t.template_name}: {t.template_id}")
   session.close()
   ```

2. **Clean Duplicate Data**:
   ```bash
   python -c "
   from src.db.init_db import session_factory
   from src.db.schemas.models import AgentTemplate
   session = session_factory()
   # Remove duplicates based on template_name
   seen = set()
   for template in session.query(AgentTemplate).all():
       if template.template_name in seen:
           session.delete(template)
       else:
           seen.add(template.template_name)
   session.commit()
   session.close()
   "
   ```

### 5. **Authentication and Authorization Issues**

#### Problem: Unauthorized Access
```
❌ 401 Unauthorized: Invalid session
```

**Solutions:**
1. **Check Session ID**:
   ```python
   # Ensure session_id is provided in request
   headers = {"X-Session-ID": "your_session_id"}
   # Or as query parameter: ?session_id=your_session_id
   ```

2. **Create Valid Session**:
   ```bash
   curl -X POST "http://localhost:8000/session_info" \
        -H "Content-Type: application/json"
   ```

3. **Verify Admin API Key**:
   ```bash
   curl -X GET "http://localhost:8000/analytics/usage" \
        -H "X-API-Key: your_admin_key"
   ```

### 6. **Performance Issues**

#### Problem: Slow Response Times
```
⚠️ Request taking longer than expected
```

**Solutions:**
1. **Enable Database Connection Pooling**:
   ```python
   # In init_db.py
   engine = create_engine(
       DATABASE_URL,
       poolclass=QueuePool,
       pool_size=10,
       max_overflow=20
   )
   ```

2. **Optimize Database Queries**:
   ```python
   # Use eager loading for relationships
   session.query(User).options(joinedload(User.chats)).all()
   ```

3. **Add Response Caching**:
   ```python
   # Use local caching for expensive operations
   @lru_cache(maxsize=100)
   def expensive_operation(data):
       return result
   ```

#### Problem: Memory Usage High
```
⚠️ Memory usage above 80%
```

**Solutions:**
1. **Optimize DataFrame Operations**:
   ```python
   # Use chunking for large datasets
   for chunk in pd.read_csv('file.csv', chunksize=1000):
       process_chunk(chunk)
   ```

2. **Clear Unused Variables**:
   ```python
   # In code execution
   del large_dataframe
   import gc
   gc.collect()
   ```

3. **Monitor Memory Usage**:
   ```python
   import psutil
   import logging
   
   memory_percent = psutil.virtual_memory().percent
   if memory_percent > 80:
       logging.warning(f"High memory usage: {memory_percent}%")
   ```

## 🔧 Debugging Tools and Commands

### Health Check Commands

```bash
# Test basic connectivity
curl http://localhost:8000/health

# Check database status
python -c "
from src.db.init_db import session_factory
try:
    session = session_factory()
    session.execute('SELECT 1')
    print('✅ Database connection OK')
    session.close()
except Exception as e:
    print(f'❌ Database error: {e}')
"

# Verify agent templates
python -c "
from src.db.init_db import session_factory
from src.db.schemas.models import AgentTemplate
session = session_factory()
count = session.query(AgentTemplate).count()
print(f'Agent templates in database: {count}')
session.close()
"
```

### Performance Monitoring

```python
# Memory and CPU monitoring
import psutil
import time

def monitor_system():
    while True:
        cpu = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        print(f"CPU: {cpu}% | Memory: {memory.percent}% | Available: {memory.available // 1024 // 1024}MB")
        time.sleep(5)

# Run monitoring
monitor_system()
```

### Database Inspection

```python
# Inspect database tables
from src.db.init_db import session_factory
from src.db.schemas.models import *

session = session_factory()

# Count records in each table
tables = [User, Chat, Message, AgentTemplate, UserTemplatePreference, DeepAnalysisReport]
for table in tables:
    count = session.query(table).count()
    print(f"{table.__name__}: {count} records")

session.close()
```

### Log Analysis

```bash
# View recent logs
tail -f logs/app.log

# Search for errors
grep "ERROR" logs/app.log | tail -20

# Search for specific issues
grep -i "agent" logs/app.log | grep -i "error"
```

## 🚀 Performance Optimization Tips

### Database Optimization

1. **Use Indexes**: Ensure frequently queried columns have indexes
2. **Query Optimization**: Use `joinedload` for relationships
3. **Connection Pooling**: Configure appropriate pool sizes
4. **Batch Operations**: Use bulk operations for multiple records

### Agent Performance

1. **Async Execution**: Use async patterns for concurrent operations
2. **Result Caching**: Cache expensive computations
3. **Memory Management**: Clean up large objects after use
4. **Code Optimization**: Simplify generated code for better performance

### System Monitoring

1. **Resource Tracking**: Monitor CPU, memory, and disk usage
2. **Error Monitoring**: Set up alerting for critical errors
3. **Performance Metrics**: Track response times and throughput
4. **Usage Analytics**: Monitor feature usage and optimization opportunities

This troubleshooting guide covers the most common issues you'll encounter with the Auto-Analyst backend. For additional help, check the system logs and use the debugging tools provided. 