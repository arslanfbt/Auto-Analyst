# Schema Design Explanation

The database schema is designed to support the application's functionality by efficiently managing user data, chat sessions, messages, and model usage statistics. Each model is structured to ensure data integrity and facilitate quick access to relevant information, enabling seamless interactions within the Auto-Analyst application.

## Database Configuration

The application supports both PostgreSQL and SQLite databases, configured through the `DATABASE_URL` environment variable. PostgreSQL-specific configurations include connection pooling and connection recycling, while SQLite configurations include foreign key constraint enforcement.

## Database Schema

The application uses the following database models:

### User
The User table stores user information and maintains relationships with chats and usage records.

```python
class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    usage_records = relationship("ModelUsage", back_populates="user")
```

### Chat
The Chat table stores chat sessions and maintains relationships with users, messages, and usage records. Messages are automatically deleted when a chat is deleted (cascade delete).

```python
class Chat(Base):
    __tablename__ = 'chats'
    
    chat_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete="CASCADE"), nullable=True)
    title = Column(String, default='New Chat')
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    usage_records = relationship("ModelUsage", back_populates="chat")
```

### Message
The Message table stores individual messages within chats. Messages are automatically deleted when their associated chat is deleted.

```python
class Message(Base):
    __tablename__ = 'messages'
    
    message_id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(Integer, ForeignKey('chats.chat_id', ondelete="CASCADE"), nullable=False)
    sender = Column(String, nullable=False)  # 'user' or 'ai'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    chat = relationship("Chat", back_populates="messages")
```

### ModelUsage
The ModelUsage table tracks AI model usage metrics for analytics and billing purposes. When a user or chat is deleted, the usage records are preserved but their references are set to NULL.

```python
class ModelUsage(Base):
    __tablename__ = 'model_usage'
    
    usage_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id', ondelete="SET NULL"), nullable=True)
    chat_id = Column(Integer, ForeignKey('chats.chat_id', ondelete="SET NULL"), nullable=True)
    model_name = Column(String(100), nullable=False)
    provider = Column(String(50), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    query_size = Column(Integer, default=0)  # Size in characters
    response_size = Column(Integer, default=0)  # Size in characters
    cost = Column(Float, default=0.0)  # Cost in USD
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_streaming = Column(Boolean, default=False)
    request_time_ms = Column(Integer, default=0)  # Request processing time in milliseconds
    user = relationship("User", back_populates="usage_records")
    chat = relationship("Chat", back_populates="usage_records")
```

## Database Management

The database is managed using SQLAlchemy, which provides an Object-Relational Mapping (ORM) layer. The database initialization and session management are handled in `init_db.py`, which provides the following key functions:

- `init_db()`: Creates all database tables
- `get_session()`: Returns a new database session
- `get_db()`: Provides a database session with proper error handling and cleanup
- `is_postgres_db()`: Checks if the application is using PostgreSQL

The models defined in this schema are utilized for storing and retrieving data in the database, with proper relationship management and cascade operations to maintain data integrity.
