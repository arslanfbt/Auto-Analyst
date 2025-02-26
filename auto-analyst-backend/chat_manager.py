from sqlalchemy import create_engine, desc, func
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.exc import SQLAlchemyError
from init_db import Base, User, Chat, Message
import logging
import requests
import json
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime

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
            
            logger.info(f"Created new chat {chat.chat_id} for user {user_id}")
            
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
    
    def add_message(self, chat_id: int, content: str, sender: str) -> Dict[str, Any]:
        """
        Add a message to a chat.
        
        Args:
            chat_id: ID of the chat to add the message to
            content: Message content
            sender: Message sender ('user' or 'bot')
            
        Returns:
            Dictionary containing message information
        """
        session = self.Session()
        try:
            # Check if chat exists
            chat = session.query(Chat).filter(Chat.chat_id == chat_id).first()
            if not chat:
                raise ValueError(f"Chat with ID {chat_id} not found")
            
            # Create a new message
            message = Message(
                chat_id=chat_id,
                content=content,
                sender=sender,
                timestamp=datetime.utcnow()
            )
            session.add(message)
            
            # If this is the first bot response and chat title is still default,
            # update the chat title based on the first user query
            if sender == 'bot':
                first_bot_message = session.query(Message).filter(
                    Message.chat_id == chat_id,
                    Message.sender == 'bot'
                ).first()
                
                if not first_bot_message and chat.title == 'New Chat':
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
                        logger.info(f"Updated chat {chat_id} title to '{new_title}'")
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
    
    def get_chat(self, chat_id: int) -> Dict[str, Any]:
        """
        Get a chat by ID with all its messages.
        
        Args:
            chat_id: ID of the chat to retrieve
            
        Returns:
            Dictionary containing chat information and messages
        """
        session = self.Session()
        try:
            # Get the chat
            chat = session.query(Chat).filter(Chat.chat_id == chat_id).first()
            if not chat:
                raise ValueError(f"Chat with ID {chat_id} not found")
            
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
    
    def delete_chat(self, chat_id: int) -> bool:
        """
        Delete a chat and all its messages.
        
        Args:
            chat_id: ID of the chat to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        session = self.Session()
        try:
            # Delete all messages in the chat
            session.query(Message).filter(Message.chat_id == chat_id).delete()
            
            # Delete the chat
            result = session.query(Chat).filter(Chat.chat_id == chat_id).delete()
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
                logger.info(f"Created new user: {username} ({email})")
            
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