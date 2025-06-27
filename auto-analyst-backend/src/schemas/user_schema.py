from pydantic import BaseModel

# User model for API responses
class User(BaseModel):
    user_id: int
    username: str
    email: str

    class Config:
        orm_mode = True