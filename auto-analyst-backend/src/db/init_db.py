import logging
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from src.db.schemas.models import Base
from src.utils.logger import Logger

logger = Logger("init_db", see_time=True, console_log=True)
load_dotenv()

# Create the database engine based on environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///chat_database.db")

# Determine database type and set appropriate engine configurations
if DATABASE_URL.startswith('postgresql'):
    # PostgreSQL-specific configuration
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,  # Check connection validity before use
        pool_recycle=300     # Recycle connections after 5 minutes
    )
    is_postgresql = True
    logger.log_message("Using PostgreSQL database engine", logging.INFO)
else:
    # SQLite configuration
    engine = create_engine(DATABASE_URL)
    is_postgresql = False
    # For SQLite, enable foreign key constraints
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    logger.log_message("Using SQLite database engine", logging.INFO)

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

# Add function to check if using PostgreSQL
def is_postgres_db():
    return is_postgresql

if __name__ == "__main__":
    init_db() 