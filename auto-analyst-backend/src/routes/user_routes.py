from fastapi import APIRouter, Depends, Request, HTTPException
from src.managers.user_manager import get_current_user
from src.init_db import User, session_factory

router = APIRouter()

# Store app reference when router is initialized
_app_ref = None

def set_app_reference(app):
    global _app_ref
    _app_ref = app

@router.get("/api/user/credits")
async def get_user_credits(request: Request, current_user: User = Depends(get_current_user)):
    """Fetch the current user's credits."""
    if current_user is None:
        # Get the session ID from request headers
        session_id = request.headers.get('X-Session-ID')
        
        if not session_id:
            # Return default credits if no session ID
            return {"credits": 100, "error": "User not authenticated"}
        
        # Use the app reference without importing
        if _app_ref:
            try:
                session_state = _app_ref.state.get_session_state(session_id)
                user_id = session_state.get('user_id')
                
                if user_id:
                    # Get user from database
                    db_session = session_factory()
                    try:
                        user = db_session.query(User).filter(User.user_id == user_id).first()
                        if user:
                            return {"credits": user.credits}
                    finally:
                        db_session.close()
            except Exception as e:
                print(f"Error retrieving user from session: {e}")
        
        # If all else fails, return default credits
        return {"credits": 100, "note": "Default credits shown"}
    
    return {"credits": current_user.credits}

