# Auto-Analyst Backend Development Workflow

## 🎯 Development Philosophy

The Auto-Analyst backend follows modern Python development practices with emphasis on:
- **Modularity**: Clear separation of concerns across components
- **Async-First**: Non-blocking operations for scalability
- **Type Safety**: Comprehensive type hints and validation
- **Documentation**: Self-documenting code and comprehensive docs
- **Testing**: Robust testing at multiple levels
- **Performance**: Optimized for real-world usage patterns

## 🏗️ Code Organization Principles

### 1. **Directory Structure Standards**

```
src/
├── agents/           # AI agent implementations
│   ├── agents.py    # Core agent definitions
│   ├── deep_agents.py # Deep analysis system
│   └── retrievers/  # Information retrieval components
├── db/              # Database layer
│   ├── init_db.py   # Database initialization
│   └── schemas/     # SQLAlchemy models
├── managers/        # Business logic layer
│   ├── chat_manager.py    # Chat operations
│   ├── ai_manager.py      # AI model management
│   └── session_manager.py # Session lifecycle
├── routes/          # FastAPI route handlers
│   ├── session_routes.py     # Core functionality
│   ├── chat_routes.py     # Chat endpoints
│   └── [feature]_routes.py # Feature-specific routes
├── utils/           # Shared utilities
│   ├── logger.py    # Centralized logging
│   └── helpers.py   # Common functions
└── schemas/         # Pydantic models
    ├── chat_schemas.py    # Chat data models
    └── [feature]_schemas.py # Feature schemas
```

### 2. **Import Organization**

```python
# Standard library imports
import asyncio
import json
from datetime import datetime
from typing import List, Optional, Dict, Any

# Third-party imports
import dspy
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Local imports
from src.db.init_db import session_factory
from src.db.schemas.models import User, Chat
from src.utils.logger import Logger
from src.managers.chat_manager import ChatManager
```

## 🛠️ Development Patterns

### 1. **Agent Development Pattern**

```python
# 1. Define DSPy Signature
class new_analysis_agent(dspy.Signature):
    """
    Comprehensive docstring explaining:
    - Agent purpose and capabilities
    - Input requirements and formats
    - Expected output format
    - Usage examples
    """
    goal = dspy.InputField(desc="Clear description of analysis objective")
    dataset = dspy.InputField(desc="Dataset structure and content description")
    plan_instructions = dspy.InputField(desc="Execution plan from planner")
    
    summary = dspy.OutputField(desc="Natural language summary of analysis")
    code = dspy.OutputField(desc="Executable Python code for analysis")

# 2. Add to Agent Configuration
# In agents_config.json:
{
  "template_name": "new_analysis_agent",
  "description": "Performs specialized analysis on datasets",
  "variant_type": "both",  # individual, planner, or both
  "is_premium": false, # Will be active by default
  "usage_count": 0,
  "icon_url": "analysis.svg"
}

# 3. Register in Agent System
# In agents.py, add to the appropriate loading functions
```

### 2. **Route Development Pattern**

```python
# 1. Create route file: src/routes/feature_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from src.db.init_db import session_factory
from src.db.schemas.models import FeatureModel
from src.utils.logger import Logger

logger = Logger("feature_routes", see_time=True, console_log=False)
router = APIRouter(prefix="/feature", tags=["feature"])

# 2. Define Pydantic schemas
class FeatureCreate(BaseModel):
    name: str
    description: Optional[str] = None
    
class FeatureResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime

# 3. Implement endpoints with proper error handling
@router.post("/", response_model=FeatureResponse)
async def create_feature(feature: FeatureCreate):
    try:
        session = session_factory()
        try:
            new_feature = FeatureModel(
                name=feature.name,
                description=feature.description
            )
            session.add(new_feature)
            session.commit()
            session.refresh(new_feature)
            
            return FeatureResponse(
                id=new_feature.id,
                name=new_feature.name,
                description=new_feature.description,
                created_at=new_feature.created_at
            )
            
        except Exception as e:
            session.rollback()
            logger.log_message(f"Error creating feature: {str(e)}", level=logging.ERROR)
            raise HTTPException(status_code=500, detail=f"Failed to create feature: {str(e)}")
        finally:
            session.close()
            
    except Exception as e:
        logger.log_message(f"Error in create_feature: {str(e)}", level=logging.ERROR)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# 4. Register in app.py
from src.routes.feature_routes import router as feature_router
app.include_router(feature_router)
```

### 3. **Database Model Pattern**

```python
# In src/db/schemas/models.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone

Base = declarative_base()

class NewModel(Base):
    __tablename__ = "new_models"
    
    # Primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Required fields
    name = Column(String(255), nullable=False, unique=True)
    
    # Optional fields
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="new_models")
    
    def __repr__(self):
        return f"<NewModel(id={self.id}, name='{self.name}')>"

# Update User model to include back reference
class User(Base):
    # ... existing fields ...
    new_models = relationship("NewModel", back_populates="user")
```

### 4. **Manager Pattern**

```python
# In src/managers/feature_manager.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from src.db.schemas.models import FeatureModel
from src.utils.logger import Logger

logger = Logger("feature_manager", see_time=True, console_log=False)

class FeatureManager:
    """
    Manages business logic for feature operations.
    Separates complex business logic from route handlers.
    """
    
    def __init__(self, session: Session):
        self.session = session
    
    async def create_feature(self, name: str, description: Optional[str] = None) -> FeatureModel:
        """Create a new feature with validation and business logic."""
        try:
            # Validation
            if not name or len(name.strip()) == 0:
                raise ValueError("Feature name cannot be empty")
            
            # Check for duplicates
            existing = self.session.query(FeatureModel).filter_by(name=name).first()
            if existing:
                raise ValueError(f"Feature with name '{name}' already exists")
            
            # Create feature
            feature = FeatureModel(name=name, description=description)
            self.session.add(feature)
            self.session.commit()
            self.session.refresh(feature)
            
            logger.log_message(f"Created feature: {name}", level=logging.INFO)
            return feature
            
        except Exception as e:
            self.session.rollback()
            logger.log_message(f"Error creating feature: {str(e)}", level=logging.ERROR)
            raise
    
    async def get_features(self, active_only: bool = True) -> List[FeatureModel]:
        """Retrieve features with optional filtering."""
        try:
            query = self.session.query(FeatureModel)
            if active_only:
                query = query.filter(FeatureModel.is_active == True)
            
            features = query.order_by(FeatureModel.created_at.desc()).all()
            return features
            
        except Exception as e:
            logger.log_message(f"Error retrieving features: {str(e)}", level=logging.ERROR)
            raise
```

## 📋 Code Quality Standards

### 1. **Type Hints and Documentation**

```python
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

async def process_analysis_data(
    data: pd.DataFrame,
    analysis_type: str,
    user_id: Optional[int] = None,
    options: Dict[str, Any] = None
) -> Dict[str, Union[str, List[Any], bool]]:
    """
    Process analysis data with specified parameters.
    
    Args:
        data: Input DataFrame containing the data to analyze
        analysis_type: Type of analysis to perform ("statistical", "ml", "viz")
        user_id: Optional user ID for tracking and personalization
        options: Additional options for analysis configuration
        
    Returns:
        Dictionary containing:
        - status: "success" or "error"
        - result: Analysis results or error message
        - metadata: Additional information about the analysis
        
    Raises:
        ValueError: If analysis_type is not supported
        DataError: If data format is invalid
        
    Example:
        >>> data = pd.DataFrame({"x": [1, 2, 3], "y": [4, 5, 6]})
        >>> result = await process_analysis_data(data, "statistical")
        >>> print(result["status"])
        "success"
    """
    if options is None:
        options = {}
    
    # Implementation...
    return {"status": "success", "result": [], "metadata": {}}
```

### 2. **Error Handling Patterns**

```python
# Comprehensive error handling with logging and user-friendly messages
async def safe_operation(data: Any) -> Dict[str, Any]:
    """
    Template for safe operations with comprehensive error handling.
    """
    try:
        # Validation
        if not data:
            raise ValueError("Data cannot be empty")
        
        # Main operation
        result = await perform_operation(data)
        
        # Success logging
        logger.log_message("Operation completed successfully", level=logging.INFO)
        return {"success": True, "data": result}
        
    except ValueError as e:
        # Input validation errors
        logger.log_message(f"Validation error: {str(e)}", level=logging.WARNING)
        return {"success": False, "error": "Invalid input", "details": str(e)}
        
    except ConnectionError as e:
        # External service errors
        logger.log_message(f"Connection error: {str(e)}", level=logging.ERROR)
        return {"success": False, "error": "Service unavailable", "details": "Please try again later"}
        
    except Exception as e:
        # Unexpected errors
        logger.log_message(f"Unexpected error in safe_operation: {str(e)}", level=logging.ERROR)
        return {"success": False, "error": "Internal error", "details": "Please contact support"}
```

### 3. **Async/Await Best Practices**

```python
import asyncio
from typing import List, Coroutine

# Proper async function definition
async def async_agent_execution(agents: List[str], query: str) -> List[Dict[str, Any]]:
    """Execute multiple agents concurrently."""
    
    # Create coroutines
    tasks = [
        execute_single_agent(agent, query) 
        for agent in agents
    ]
    
    # Execute concurrently with error handling
    results = []
    for task in asyncio.as_completed(tasks):
        try:
            result = await task
            results.append(result)
        except Exception as e:
            logger.log_message(f"Agent execution failed: {e}", level=logging.ERROR)
            results.append({"error": str(e)})
    
    return results

# Database operations with proper session management
async def async_database_operation(session: Session) -> Any:
    """Template for async database operations."""
    try:
        # Use asyncio.to_thread for CPU-bound database operations
        result = await asyncio.to_thread(
            lambda: session.query(Model).filter(...).all()
        )
        return result
    except Exception as e:
        session.rollback()
        raise
    finally:
        session.close()
```

## 🔧 Development Workflow

### 1. **Feature Development Process**

1. **Plan the Feature**:
   ```bash
   # Create feature branch
   git checkout -b feature/new-analysis-agent
   
   # Document requirements
   echo "## New Analysis Agent" >> docs/feature_plan.md
   ```

2. **Implement Core Logic**:
   ```bash
   # Create agent signature
   # Add to agents_config.json
   # Implement business logic in managers/
   # Create route handlers
   ```

3. **Add Database Changes**:
   ```bash
   # Modify models if needed
   alembic revision --autogenerate -m "Add new analysis tables"
   alembic upgrade head
   ```

### 3. **Release Process**

1. **Pre-release Testing**:
   ```bash
   # Run full test suite
   pytest tests/
   
   # Test database migrations
   alembic upgrade head
   
   # Test with sample data
   python scripts/test_with_sample_data.py
   ```

2. **Documentation Updates**:
   ```bash
   # Update API documentation
   # Update troubleshooting guide
   # Update changelog
   ```

3. **Deployment Preparation**:
   ```bash
   # Update requirements.txt
   pip freeze > requirements.txt
   
   # Test container build
   docker build -t auto-analyst-backend .
   
   ```

## 📊 Performance Considerations

### 1. **Database Optimization**

```python
# Use query optimization
from sqlalchemy.orm import joinedload

# Bad: N+1 query problem
users = session.query(User).all()
for user in users:
    print(user.chats)  # Separate query for each user

# Good: Eager loading
users = session.query(User).options(joinedload(User.chats)).all()
for user in users:
    print(user.chats)  # No additional queries

# Use pagination for large datasets
def get_paginated_results(session, model, page=1, per_page=20):
    offset = (page - 1) * per_page
    return session.query(model).offset(offset).limit(per_page).all()
```


### 2. **Async Optimization**

```python
# Use connection pooling
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30
)

# Batch operations
async def batch_process_agents(agents: List[str], queries: List[str]):
    semaphore = asyncio.Semaphore(5)  # Limit concurrent operations
    
    async def process_with_limit(agent, query):
        async with semaphore:
            return await process_agent(agent, query)
    
    tasks = [
        process_with_limit(agent, query) 
        for agent, query in zip(agents, queries)
    ]
    
    return await asyncio.gather(*tasks, return_exceptions=True)
```

This development workflow guide provides a comprehensive framework for maintaining code quality, consistency, and performance in the Auto-Analyst backend system. Following these patterns ensures that new features integrate seamlessly with the existing architecture while maintaining the high standards of the codebase. 