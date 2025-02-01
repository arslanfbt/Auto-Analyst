from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel

Base = declarative_base()

class Response(Base):
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String(255))
    query = Column(String(255))
    response = Column(String(255))
    created_at = Column(DateTime, default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "agent_name": self.agent_name,
            "query": self.query,
            "response": self.response,
            "created_at": self.created_at,
        }


class Query(Base):
    __tablename__ = "queries"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String(255))
    created_at = Column(DateTime, default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "query": self.query,
            "created_at": self.created_at,
        }


# Pydantic models for serialization
class ResponseSchema(BaseModel):
    id: int
    agent_name: str
    query: str
    response: str
    created_at: str

    class Config:
        orm_mode = True


class QuerySchema(BaseModel):
    id: int
    query: str
    created_at: str

    class Config:
        orm_mode = True
