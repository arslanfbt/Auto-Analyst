from fastapi import APIRouter, Depends
from src.managers.user_manager import get_current_user
from src.db.schemas.models import User

router = APIRouter()

@router.get("/user/credits")
async def get_user_credits(current_user: User = Depends(get_current_user)):
    return {"credits": current_user.credits}

