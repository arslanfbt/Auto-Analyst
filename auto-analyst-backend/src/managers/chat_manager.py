from sqlalchemy import create_engine, desc, func
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.exc import SQLAlchemyError
from src.db.schemas.models import Base, User, Chat, Message, ModelUsage
import logging
import requests
import json
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime
import time
import tiktoken

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ChatManager:
    """
    Manages chat operations including creating, storing, retrieving, and updating chats and messages.
    Provides an interface between the application and the database for chat-related operations.
    """
    
    def __init__(self, db_url: str = 'sqlite:///chat_database.db'):
        """
        Initialize the ChatManager with a database connection.
        
        Args:
            db_url: Database connection URL (defaults to SQLite)
        """
        self.engine = create_engine(db_url)
        Base.metadata.create_all(self.engine)  # Ensure tables exist
        self.Session = scoped_session(sessionmaker(bind=self.engine))
        
        # Add price mappings for different models
        self.model_costs = {
            # OpenAI models (per 1M tokens)
            "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},
            "gpt-3.5-turbo-16k": {"input": 0.003, "output": 0.004},
            "gpt-4o": {"input": 0.01, "output": 0.03},
            "gpt-4o-mini": {"input": 0.0015, "output": 0.002},
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-4-32k": {"input": 0.06, "output": 0.12},
            # Anthropic models
            "claude-3-opus-20240229": {"input": 0.015, "output": 0.075},
            "claude-3-sonnet-20240229": {"input": 0.003, "output": 0.015},
            "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
            "claude-3-5-sonnet-latest": {"input": 0.003, "output": 0.015},
            # Groq models
            "llama-3-70b-8192": {"input": 0.0007, "output": 0.0007},
            "llama-3-8b-8192": {"input": 0.0002, "output": 0.0002},
            "mixtral-8x7b-32768": {"input": 0.0006, "output": 0.0006},
        }
        
        # Add model providers mapping
        self.model_providers = {
            "gpt-": "openai",
            "claude-": "anthropic", 
            "llama-": "groq",
            "mixtral-": "groq",
        }
    
    def create_chat(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Create a new chat session.
        
        Args:
            user_id: Optional user ID if authentication is enabled
            
        Returns:
            Dictionary containing chat information
        """
        session = self.Session()
        try:
            # Create a new chat
            chat = Chat(
                user_id=user_id,
                title='New Chat',
                created_at=datetime.utcnow()
            )
            session.add(chat)
            session.commit()
            
            # logger.info(f"Created new chat {chat.chat_id} for user {user_id}")
            
            return {
                "chat_id": chat.chat_id,
                "user_id": chat.user_id,
                "title": chat.title,
                "created_at": chat.created_at.isoformat()
            }
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Error creating chat: {str(e)}")
            raise
        finally:
            session.close()
    
    def add_message(self, chat_id: int, content: str, sender: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Add a message to a chat.
        
        Args:
            chat_id: ID of the chat to add the message to
            content: Message content
            sender: Message sender ('user' or 'ai')
            user_id: Optional user ID to verify ownership
            
        Returns:
            Dictionary containing message information
        """
        session = self.Session()
        try:
            # Check if chat exists and belongs to the user if user_id is provided
            query = session.query(Chat).filter(Chat.chat_id == chat_id)
            if user_id is not None:
                query = query.filter((Chat.user_id == user_id) | (Chat.user_id.is_(None)))
            
            chat = query.first()
            if not chat:
                raise ValueError(f"Chat with ID {chat_id} not found or access denied")
            
            # Create a new message
            message = Message(
                chat_id=chat_id,
                content=content,
                sender=sender,
                timestamp=datetime.utcnow()
            )
            session.add(message)
            
            # If this is the first AI response and chat title is still default,
            # update the chat title based on the first user query
            if sender == 'ai':
                first_ai_message = session.query(Message).filter(
                    Message.chat_id == chat_id,
                    Message.sender == 'ai'
                ).first()
                
                if not first_ai_message and chat.title == 'New Chat':
                    # Get the user's first message
                    first_user_message = session.query(Message).filter(
                        Message.chat_id == chat_id,
                        Message.sender == 'user'
                    ).order_by(Message.timestamp).first()
                    
                    if first_user_message:
                        # Generate title from user query
                        new_title = self.generate_title_from_query(first_user_message.content)
                        chat.title = new_title
            
            session.commit()
            
            return {
                "message_id": message.message_id,
                "chat_id": message.chat_id,
                "content": message.content,
                "sender": message.sender,
                "timestamp": message.timestamp.isoformat()
            }
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Error adding message: {str(e)}")
            raise
        finally:
            session.close()
    
    def _update_chat_title(self, chat_id: int, first_response: str) -> None:
        """
        Update chat title based on the first bot response.
        
        Args:
            chat_id: ID of the chat to update
            first_response: First bot response content to generate title from
        """
        session = self.Session()
        try:
            # Get the user's query (the message before the bot response)
            user_query = session.query(Message).filter(
                Message.chat_id == chat_id,
                Message.sender == 'user'
            ).order_by(Message.timestamp.desc()).first()
            
            if not user_query:
                logger.warning(f"No user query found for chat {chat_id}")
                return
            
            # Call the chat_history_name endpoint to generate a title
            try:
                # This would typically be an internal API call
                # For demonstration, we're showing how it would be structured
                # In a real implementation, you might want to directly call the function
                # that generates the title rather than making an HTTP request
                response = requests.post(
                    "http://localhost:8000/chat_history_name",
                    json={"query": user_query.content},
                    timeout=5
                )
                
                if response.status_code == 200:
                    title_data = response.json()
                    new_title = title_data.get("name", "Chat")
                    
                    # Update chat title
                    chat = session.query(Chat).filter(Chat.chat_id == chat_id).first()
                    if chat:
                        chat.title = new_title
                        session.commit()
                        # logger.info(f"Updated chat {chat_id} title to '{new_title}'")
                else:
                    logger.warning(f"Failed to generate title: {response.status_code}")
            except Exception as e:
                logger.error(f"Error calling chat_history_name endpoint: {str(e)}")
                # Continue execution even if title generation fails
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Error updating chat title: {str(e)}")
        finally:
            session.close()
    
    def get_chat(self, chat_id: int, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get a chat by ID with all its messages.
        
        Args:
            chat_id: ID of the chat to retrieve
            user_id: Optional user ID to verify ownership
            
        Returns:
            Dictionary containing chat information and messages
        """
        session = self.Session()
        try:
            # Get the chat
            query = session.query(Chat).filter(Chat.chat_id == chat_id)
            
            # If user_id is provided, ensure the chat belongs to this user
            if user_id is not None:
                query = query.filter(Chat.user_id == user_id)
            
            chat = query.first()
            if not chat:
                raise ValueError(f"Chat with ID {chat_id} not found or access denied")
            
            # Get the chat messages ordered by timestamp
            messages = session.query(Message).filter(
                Message.chat_id == chat_id
            ).order_by(Message.timestamp).all()
            
            return {
                "chat_id": chat.chat_id,
                "title": chat.title,
                "created_at": chat.created_at.isoformat(),
                "user_id": chat.user_id,
                "messages": [
                    {
                        "message_id": msg.message_id,
                        "chat_id": msg.chat_id,
                        "content": msg.content,
                        "sender": msg.sender,
                        "timestamp": msg.timestamp.isoformat()
                    } for msg in messages
                ]
            }
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving chat: {str(e)}")
            raise
        finally:
            session.close()
    
    def get_user_chats(self, user_id: Optional[int] = None, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Get recent chats for a user, or all chats if no user_id is provided.
        
        Args:
            user_id: Optional user ID to filter chats
            limit: Maximum number of chats to return
            offset: Number of chats to skip (for pagination)
            
        Returns:
            List of dictionaries containing chat information
        """
        session = self.Session()
        try:
            query = session.query(Chat)
            
            # Filter by user_id if provided
            if user_id is not None:
                query = query.filter(Chat.user_id == user_id)
            
            chats = query.order_by(Chat.created_at.desc()).limit(limit).offset(offset).all()
            
            return [
                {
                    "chat_id": chat.chat_id,
                    "user_id": chat.user_id,
                    "title": chat.title,
                    "created_at": chat.created_at.isoformat()
                } for chat in chats
            ]
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving chats: {str(e)}")
            return []
        finally:
            session.close()
    
    def _get_last_message(self, chat_id: int) -> Optional[Dict[str, Any]]:
        """
        Get the last message from a chat for preview purposes.
        
        Args:
            chat_id: ID of the chat
            
        Returns:
            Dictionary containing last message information or None
        """
        session = self.Session()
        try:
            last_message = session.query(Message).filter(
                Message.chat_id == chat_id
            ).order_by(desc(Message.timestamp)).first()
            
            if last_message:
                return {
                    "content": last_message.content[:100] + "..." if len(last_message.content) > 100 else last_message.content,
                    "sender": last_message.sender,
                    "timestamp": last_message.timestamp.isoformat()
                }
            return None
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving last message: {str(e)}")
            return None
        finally:
            session.close()
    
    def delete_chat(self, chat_id: int, user_id: Optional[int] = None) -> bool:
        """
        Delete a chat and all its messages.
        
        Args:
            chat_id: ID of the chat to delete
            user_id: Optional user ID to verify ownership
            
        Returns:
            True if deletion was successful, False otherwise
        """
        session = self.Session()
        try:
            # Check if chat exists and belongs to the user if user_id is provided
            if user_id is not None:
                chat = session.query(Chat).filter(
                    Chat.chat_id == chat_id,
                    Chat.user_id == user_id
                ).first()
                if not chat:
                    return False  # Chat not found or doesn't belong to the user
            
            # Delete all messages in the chat
            session.query(Message).filter(Message.chat_id == chat_id).delete()
            
            # Delete the chat (with user_id filter if provided)
            query = session.query(Chat).filter(Chat.chat_id == chat_id)
            if user_id is not None:
                query = query.filter(Chat.user_id == user_id)
            
            result = query.delete()
            session.commit()
            
            return result > 0
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Error deleting chat: {str(e)}")
            return False
        finally:
            session.close()
    
    def search_chats(self, query: str, user_id: Optional[int] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for chats containing the query string.
        
        Args:
            query: Search query string
            user_id: Optional user ID to filter chats
            limit: Maximum number of results to return
            
        Returns:
            List of dictionaries containing matching chat information
        """
        session = self.Session()
        try:
            # Build base query to find messages containing the search term
            message_query = session.query(Message.chat_id).filter(
                Message.content.ilike(f"%{query}%")
            ).distinct()
            
            # Apply user filter if provided
            chat_query = session.query(Chat).filter(Chat.chat_id.in_(message_query))
            if user_id is not None:
                chat_query = chat_query.filter(Chat.user_id == user_id)
            
            # Get matching chats
            chats = chat_query.order_by(desc(Chat.created_at)).limit(limit).all()
            
            # Format response
            return [
                {
                    "chat_id": chat.chat_id,
                    "title": chat.title,
                    "created_at": chat.created_at.isoformat(),
                    "user_id": chat.user_id,
                    "matching_messages": self._get_matching_messages(chat.chat_id, query)
                } for chat in chats
            ]
        except SQLAlchemyError as e:
            logger.error(f"Error searching chats: {str(e)}")
            raise
        finally:
            session.close()
    
    def _get_matching_messages(self, chat_id: int, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Get messages from a chat that match the search query.
        
        Args:
            chat_id: ID of the chat
            query: Search query string
            limit: Maximum number of matching messages to return
            
        Returns:
            List of dictionaries containing matching message information
        """
        session = self.Session()
        try:
            matching_messages = session.query(Message).filter(
                Message.chat_id == chat_id,
                Message.content.ilike(f"%{query}%")
            ).order_by(Message.timestamp).limit(limit).all()
            
            return [
                {
                    "message_id": msg.message_id,
                    "content": msg.content,
                    "sender": msg.sender,
                    "timestamp": msg.timestamp.isoformat()
                } for msg in matching_messages
            ]
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving matching messages: {str(e)}")
            return []
        finally:
            session.close()
    
    def get_or_create_user(self, username: str, email: str) -> Dict[str, Any]:
        """
        Get an existing user by email or create a new one if not found.
        
        Args:
            username: User's display name
            email: User's email address
            
        Returns:
            Dictionary containing user information
        """
        session = self.Session()
        try:
            # Try to find existing user by email
            user = session.query(User).filter(User.email == email).first()
            
            if not user:
                # Create new user if not found
                user = User(username=username, email=email)
                session.add(user)
                session.commit()
                # logger.info(f"Created new user: {username} ({email})")
            
            return {
                "user_id": user.user_id,
                "username": user.username,
                "email": user.email,
                "created_at": user.created_at.isoformat()
            }
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Error getting/creating user: {str(e)}")
            raise
        finally:
            session.close()
    
    def update_chat(self, chat_id: int, title: Optional[str] = None, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Update a chat's title or user_id.
        
        Args:
            chat_id: ID of the chat to update
            title: New title for the chat (optional)
            user_id: New user ID for the chat (optional)
            
        Returns:
            Dictionary containing updated chat information
        """
        session = self.Session()
        try:
            # Get the chat
            chat = session.query(Chat).filter(Chat.chat_id == chat_id).first()
            if not chat:
                raise ValueError(f"Chat with ID {chat_id} not found")
            
            # Update fields if provided
            if title is not None:
                chat.title = title
            if user_id is not None:
                chat.user_id = user_id
            
            session.commit()
            
            return {
                "chat_id": chat.chat_id,
                "title": chat.title,
                "created_at": chat.created_at.isoformat(),
                "user_id": chat.user_id
            }
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Error updating chat: {str(e)}")
            raise
        finally:
            session.close()
    
    def generate_title_from_query(self, query: str) -> str:
        """
        Generate a title for a chat based on the first query.
        
        Args:
            query: The user's first query in the chat
            
        Returns:
            A generated title string
        """
        try:
            # Simple title generation - take first few words
            words = query.split()
            if len(words) > 3:
                title = "Chat about " + " ".join(words[0:3]) + "..."
            else:
                title = "Chat about " + query
            
            # Limit title length
            if len(title) > 40:
                title = title[:37] + "..."
            
            return title
        except Exception as e:
            logger.error(f"Error generating title: {str(e)}")
            return "New Chat"
    
    def delete_empty_chats(self, user_id: Optional[int] = None, is_admin: bool = False) -> int:
        """
        Delete empty chats (chats with no messages) for a user.
        
        Args:
            user_id: ID of the user whose empty chats should be deleted
            is_admin: Whether this is an admin user
            
        Returns:
            Number of chats deleted
        """
        session = self.Session()
        try:
            # Get all chats for the user
            query = session.query(Chat)
            if user_id is not None:
                query = query.filter(Chat.user_id == user_id)
            elif not is_admin:
                return 0  # Don't delete anything if not a user or admin
            
            # For each chat, check if it has any messages
            chats_to_delete = []
            for chat in query.all():
                message_count = session.query(Message).filter(
                    Message.chat_id == chat.chat_id
                ).count()
                
                if message_count == 0:
                    chats_to_delete.append(chat.chat_id)
            
            # Delete the empty chats
            if chats_to_delete:
                deleted = session.query(Chat).filter(
                    Chat.chat_id.in_(chats_to_delete)
                ).delete(synchronize_session=False)
                
                session.commit()
                return deleted
            return 0
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Error deleting empty chats: {str(e)}")
            return 0
        finally:
            session.close()

    def save_ai_response(self, chat_id: int, content: str, user_id: Optional[int] = None, 
                         model_name: str = "gpt-4o-mini", prompt: str = "", 
                         prompt_tokens: Optional[int] = None, 
                         completion_tokens: Optional[int] = None, 
                         start_time: Optional[float] = None):
        """
        Save an AI response to a chat and track model usage.
        
        Args:
            chat_id: ID of the chat to add the message to
            content: AI response content
            user_id: Optional user ID for tracking
            model_name: Model used to generate the response
            prompt: The prompt sent to the model
            prompt_tokens: Optional pre-counted prompt tokens
            completion_tokens: Optional pre-counted completion tokens
            start_time: Optional start time of the request
        """
        session = self.Session()
        try:
            # Create and save message
            new_message = Message(
                chat_id=chat_id,
                sender='ai',
                content=content,
                timestamp=datetime.utcnow()
            )
            session.add(new_message)
            session.commit()
            
            # Track model usage
            end_time = time.time()
            start_time = start_time or end_time - 1  # Default to 1 second if not provided
            
            self.track_model_usage(
                user_id=user_id,
                chat_id=chat_id,
                model_name=model_name,
                prompt=prompt,
                response=content,
                start_time=start_time,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens
            )
            
        except SQLAlchemyError as e:
            logger.error(f"Error saving AI response: {str(e)}")
            session.rollback()
        finally:
            session.close()

    def track_model_usage(self, user_id: Optional[int], chat_id: int, model_name: str, 
                           prompt: str, response: str, start_time: float, 
                           is_streaming: bool = False, 
                           prompt_tokens: Optional[int] = None, 
                           completion_tokens: Optional[int] = None) -> Dict[str, Any]:
        """
        Track AI model usage for analytics and billing.
        
        Args:
            user_id: Optional user ID making the request
            chat_id: Chat ID associated with the request
            model_name: Name of the AI model used
            prompt: The prompt text sent to the model
            response: The response text from the model
            start_time: Start time of the request (time.time() value)
            is_streaming: Whether the response was streamed
            prompt_tokens: Optional pre-counted prompt tokens
            completion_tokens: Optional pre-counted completion tokens
            
        Returns:
            Dictionary with usage information
        """
        session = self.Session()
        try:
            # Determine model provider
            provider = "unknown"
            for prefix, prov in self.model_providers.items():
                if model_name.startswith(prefix):
                    provider = prov
                    break
                
            # Calculate tokens if not provided
            if prompt_tokens is None or completion_tokens is None:
                try:
                    encoding = tiktoken.encoding_for_model(model_name) if provider == "openai" else tiktoken.get_encoding("cl100k_base")
                    prompt_tokens = len(encoding.encode(prompt)) if prompt_tokens is None else prompt_tokens
                    completion_tokens = len(encoding.encode(response)) if completion_tokens is None else completion_tokens
                except Exception as e:
                    logger.warning(f"Error calculating tokens: {str(e)}")
                    # Fallback to character-based estimation
                    prompt_tokens = len(prompt) // 4
                    completion_tokens = len(response) // 4
            
            total_tokens = prompt_tokens + completion_tokens
            
            # Calculate cost
            cost = 0.0
            if model_name in self.model_costs:
                cost = (prompt_tokens * self.model_costs[model_name]["input"] / 1000000) + \
                       (completion_tokens * self.model_costs[model_name]["output"] / 1000000)
            
            # Calculate request time
            request_time_ms = int((time.time() - start_time) * 1000)
            
            # Create usage record
            usage = ModelUsage(
                user_id=user_id,
                chat_id=chat_id,
                model_name=model_name,
                provider=provider,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                query_size=len(prompt),
                response_size=len(response),
                cost=cost,
                timestamp=datetime.utcnow(),
                is_streaming=is_streaming,
                request_time_ms=request_time_ms
            )
            
            session.add(usage)
            session.commit()
            
            return {
                "usage_id": usage.usage_id,
                "model_name": model_name,
                "provider": provider,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "cost": cost,
                "request_time_ms": request_time_ms
            }
        
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Error tracking model usage: {str(e)}")
            return {}
        finally:
            session.close()

    def get_model_usage_analytics(self, start_date: Optional[datetime] = None, 
                                  end_date: Optional[datetime] = None,
                                  user_id: Optional[int] = None,
                                  model_name: Optional[str] = None,
                                  provider: Optional[str] = None,
                                  limit: int = 1000) -> List[Dict[str, Any]]:
        """
        Get model usage analytics with optional filtering.
        
        Args:
            start_date: Optional start date for the analytics period
            end_date: Optional end date for the analytics period
            user_id: Optional user ID to filter by
            model_name: Optional model name to filter by
            provider: Optional provider to filter by
            limit: Maximum number of records to return
            
        Returns:
            List of dictionaries containing usage records
        """
        session = self.Session()
        try:
            query = session.query(ModelUsage)
            
            # Apply filters
            if start_date:
                query = query.filter(ModelUsage.timestamp >= start_date)
            if end_date:
                query = query.filter(ModelUsage.timestamp <= end_date)
            if user_id:
                query = query.filter(ModelUsage.user_id == user_id)
            if model_name:
                query = query.filter(ModelUsage.model_name == model_name)
            if provider:
                query = query.filter(ModelUsage.provider == provider)
            
            # Order by timestamp descending
            query = query.order_by(ModelUsage.timestamp.desc()).limit(limit)
            
            usages = query.all()
            
            return [{
                "usage_id": usage.usage_id,
                "user_id": usage.user_id,
                "chat_id": usage.chat_id,
                "model_name": usage.model_name,
                "provider": usage.provider,
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
                "query_size": usage.query_size,
                "response_size": usage.response_size,
                "cost": usage.cost,
                "timestamp": usage.timestamp.isoformat(),
                "is_streaming": usage.is_streaming,
                "request_time_ms": usage.request_time_ms
            } for usage in usages]
        
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving model usage analytics: {str(e)}")
            return []
        finally:
            session.close()

    def get_usage_summary(self, start_date: Optional[datetime] = None, 
                          end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Get a summary of model usage including total costs, tokens, and usage by model.
        
        Args:
            start_date: Optional start date for the summary period
            end_date: Optional end date for the summary period
            
        Returns:
            Dictionary containing usage summary
        """
        session = self.Session()
        try:
            query = session.query(
                func.sum(ModelUsage.cost).label("total_cost"),
                func.sum(ModelUsage.prompt_tokens).label("total_prompt_tokens"),
                func.sum(ModelUsage.completion_tokens).label("total_completion_tokens"),
                func.sum(ModelUsage.total_tokens).label("total_tokens"),
                func.count(ModelUsage.usage_id).label("request_count"),
                func.avg(ModelUsage.request_time_ms).label("avg_request_time")
            )
            
            # Apply date filters
            if start_date:
                query = query.filter(ModelUsage.timestamp >= start_date)
            if end_date:
                query = query.filter(ModelUsage.timestamp <= end_date)
            
            result = query.first()
            
            # Get usage breakdown by model
            model_query = session.query(
                ModelUsage.model_name,
                func.sum(ModelUsage.cost).label("model_cost"),
                func.sum(ModelUsage.total_tokens).label("model_tokens"),
                func.count(ModelUsage.usage_id).label("model_requests")
            )
            
            if start_date:
                model_query = model_query.filter(ModelUsage.timestamp >= start_date)
            if end_date:
                model_query = model_query.filter(ModelUsage.timestamp <= end_date)
            
            model_query = model_query.group_by(ModelUsage.model_name)
            model_breakdown = model_query.all()
            
            # Get usage breakdown by provider
            provider_query = session.query(
                ModelUsage.provider,
                func.sum(ModelUsage.cost).label("provider_cost"),
                func.sum(ModelUsage.total_tokens).label("provider_tokens"),
                func.count(ModelUsage.usage_id).label("provider_requests")
            )
            
            if start_date:
                provider_query = provider_query.filter(ModelUsage.timestamp >= start_date)
            if end_date:
                provider_query = provider_query.filter(ModelUsage.timestamp <= end_date)
            
            provider_query = provider_query.group_by(ModelUsage.provider)
            provider_breakdown = provider_query.all()
            
            # Get top users by cost
            user_query = session.query(
                ModelUsage.user_id,
                func.sum(ModelUsage.cost).label("user_cost"),
                func.sum(ModelUsage.total_tokens).label("user_tokens"),
                func.count(ModelUsage.usage_id).label("user_requests")
            )
            
            if start_date:
                user_query = user_query.filter(ModelUsage.timestamp >= start_date)
            if end_date:
                user_query = user_query.filter(ModelUsage.timestamp <= end_date)
            
            user_query = user_query.group_by(ModelUsage.user_id)
            user_query = user_query.order_by(func.sum(ModelUsage.cost).desc())
            user_query = user_query.limit(10)
            user_breakdown = user_query.all()
            
            return {
                "summary": {
                    "total_cost": float(result.total_cost) if result.total_cost else 0.0,
                    "total_prompt_tokens": int(result.total_prompt_tokens) if result.total_prompt_tokens else 0,
                    "total_completion_tokens": int(result.total_completion_tokens) if result.total_completion_tokens else 0,
                    "total_tokens": int(result.total_tokens) if result.total_tokens else 0,
                    "request_count": int(result.request_count) if result.request_count else 0,
                    "avg_request_time_ms": float(result.avg_request_time) if result.avg_request_time else 0.0
                },
                "model_breakdown": [
                    {
                        "model_name": model.model_name,
                        "cost": float(model.model_cost) if model.model_cost else 0.0,
                        "tokens": int(model.model_tokens) if model.model_tokens else 0,
                        "requests": int(model.model_requests) if model.model_requests else 0
                    } for model in model_breakdown
                ],
                "provider_breakdown": [
                    {
                        "provider": provider.provider,
                        "cost": float(provider.provider_cost) if provider.provider_cost else 0.0,
                        "tokens": int(provider.provider_tokens) if provider.provider_tokens else 0,
                        "requests": int(provider.provider_requests) if provider.provider_requests else 0
                    } for provider in provider_breakdown
                ],
                "top_users": [
                    {
                        "user_id": user.user_id,
                        "cost": float(user.user_cost) if user.user_cost else 0.0,
                        "tokens": int(user.user_tokens) if user.user_tokens else 0,
                        "requests": int(user.user_requests) if user.user_requests else 0
                    } for user in user_breakdown
                ]
            }
        
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving usage summary: {str(e)}")
            return {
                "summary": {
                    "total_cost": 0.0,
                    "total_tokens": 0,
                    "request_count": 0
                },
                "model_breakdown": [],
                "provider_breakdown": [],
                "top_users": []
            }
        finally:
            session.close() 