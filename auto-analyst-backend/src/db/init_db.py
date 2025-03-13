import logging
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.db.schemas.models import Base
from src.utils.logger import Logger

logger = Logger("init_db", see_time=True, console_log=True)
load_dotenv()

# Create an SQLite database engine (or connect to an existing one)
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

# Create session factory
Session = sessionmaker(bind=engine)
session_factory = Session
# Database initialization function
def init_db():
    # Create all tables
    Base.metadata.create_all(engine)
    logger.log_message("Database and tables created successfully.", logging.INFO)
    logger.log_message(f"Models: {Base.metadata.tables.keys()}", logging.INFO)

# Utility function to get a new session
def get_session():
    return Session()

def get_db():
    db = Session()
    try:
        yield db
    except Exception as e:
        logger.log_message(f"Error getting database session: {e}", logging.ERROR)
    finally:
        db.close()


if __name__ == "__main__":
    init_db() 