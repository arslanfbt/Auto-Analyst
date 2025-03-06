# Schema Design Explanation

The database schema is designed to support the application's functionality by efficiently managing user data, chat sessions, messages, and model usage statistics. Each model is structured to ensure data integrity and facilitate quick access to relevant information, enabling seamless interactions within the Auto-Analyst application.

## Database Schema

The application uses the following database models:

### User
The User table is used to store user information, including their username, email, and creation date. It is defined in the `init_db.py` file at [init_db.py#L17](../src/init_db.py#L17).


```python
class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Chat
The Chat table is used to store chat sessions, including the chat ID, user ID, title, and creation date. It is defined in the `init_db.py` file at [init_db.py#L25](../src/init_db.py#L25).

```python
class Chat(Base):
    __tablename__ = 'chats'
    
    chat_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    title = Column(String, default='New Chat')
    created_at = Column(DateTime, default=datetime.utcnow)
```

### Message
The Message table is used to store messages, including the message ID, chat ID, sender, content, and timestamp. It is defined in the `init_db.py` file at [init_db.py#L30](../src/init_db.py#L30).

```python
class Message(Base):
    __tablename__ = 'messages'
    
    message_id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(Integer, ForeignKey('chats.chat_id'), nullable=False)
    sender = Column(String, nullable=False)  # 'user' or 'ai'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
```

### ModelUsage
The ModelUsage table is used to store model usage statistics, including the usage ID, user ID, chat ID, model name, provider, prompt tokens, completion tokens, total tokens, query size, response size, cost, timestamp, and streaming status. It is defined in the `init_db.py` file at [init_db.py#L40](../src/init_db.py#L40).

```python
class ModelUsage(Base):
    __tablename__ = 'model_usage'
    
    usage_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    chat_id = Column(Integer, ForeignKey('chats.chat_id'), nullable=True)
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
```


The models defined in this file are utilized for storing and retrieving data in the database. The database schema is managed using SQLAlchemy, which facilitates the creation and manipulation of these models. For the initialization of the database, refer to the [init_db.py](/Auto-Analyst-CS/auto-analyst-backend/src/init_db.py) file.
