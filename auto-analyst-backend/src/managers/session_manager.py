from typing import Optional, Dict, Any
import uuid
import time
import random
import logging
from fastapi import Request
from .user_manager import create_user, User

logger = logging.getLogger(__name__)

class SessionManager:
    def __init__(self):
        self._sessions = {}  # Store session-specific states
    
    def get_session_id(self, request: Request) -> str:
        """Extract or create session ID from request"""
        # First try to get from query params
        session_id = request.query_params.get("session_id")
        
        # If not in query params, try to get from headers
        if not session_id:
            session_id = request.headers.get("X-Session-ID")
        
        # If still not found, generate a new one
        if not session_id:
            session_id = str(uuid.uuid4())
        
        return session_id
    
    def get_session_state(self, session_id: str) -> Dict[str, Any]:
        """Get or create session-specific state"""
        if session_id not in self._sessions:
            # Initialize with empty state
            self._sessions[session_id] = {}
        return self._sessions[session_id]
    
    def associate_user(self, session_id: str, user_id: int, chat_id: Optional[int] = None) -> Dict[str, Any]:
        """Associate a user with a session"""
        # Ensure we have a session state
        session_state = self.get_session_state(session_id)
        
        # Store user ID
        session_state["user_id"] = user_id
        
        # Generate or use chat ID
        if chat_id:
            chat_id_to_use = chat_id
        else:
            # Check if chat_id already exists
            if "chat_id" not in session_state or not session_state["chat_id"]:
                # Generate a new chat ID
                chat_id_to_use = int(time.time() * 1000) % 1000000 + random.randint(1, 999)
            else:
                chat_id_to_use = session_state["chat_id"]
        
        # Store chat ID
        session_state["chat_id"] = chat_id_to_use
        
        # Log the association
        logger.info(f"Associated session {session_id} with user_id={user_id}, chat_id={chat_id_to_use}")
        
        return session_state
    
    def ensure_user_for_session(self, session_id: str, user_id_param: Optional[str] = None) -> int:
        """Ensure a session has an associated user, creating a guest user if needed"""
        session_state = self.get_session_state(session_id)
        
        # If user_id param was provided, use it
        if user_id_param:
            try:
                user_id = int(user_id_param)
                if session_state.get("user_id") != user_id:
                    self.associate_user(session_id, user_id)
                return user_id
            except (ValueError, TypeError):
                logger.warning(f"Invalid user_id in params: {user_id_param}")
        
        # If session already has a user_id, use it
        if session_state.get("user_id") is not None:
            return session_state["user_id"]
        
        # Otherwise create a guest user
        guest_username = f"guest_{session_id[:8]}"
        guest_email = f"{guest_username}@example.com"
        
        try:
            user = create_user(username=guest_username, email=guest_email)
            user_id = user.user_id
            self.associate_user(session_id, user_id)
            logger.info(f"Created guest user {user_id} for session {session_id}")
            return user_id
        except Exception as e:
            logger.error(f"Error creating guest user: {str(e)}")
            # Fallback to default user
            return 1 