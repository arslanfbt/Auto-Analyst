from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, Text, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Define the base class for declarative models
Base = declarative_base()

# Define the Users table
class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# Define the Chats table
class Chat(Base):
    __tablename__ = 'chats'
    
    chat_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=True)
    title = Column(String, default='New Chat')
    created_at = Column(DateTime, default=datetime.utcnow)

# Define the Messages table
class Message(Base):
    __tablename__ = 'messages'
    
    message_id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(Integer, ForeignKey('chats.chat_id'), nullable=False)
    sender = Column(String, nullable=False)  # 'user' or 'ai'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Define the Model Usage table
class ModelUsage(Base):
    """Tracks AI model usage metrics for analytics and billing purposes."""
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