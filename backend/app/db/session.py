from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from app.core.config import settings

# Use connection string for Supabase (PostgreSQL)
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=300,  # Recycle connections every 5 minutes (Supabase can be aggressive)
    pool_pre_ping=True,  # Test connection before using it
    connect_args={
        "connect_timeout": 30,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency for FastAPI.

    Handles connection errors gracefully and ensures proper cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    except OperationalError as e:
        # Connection was lost - rollback and don't try to close normally
        print(f"Database connection error: {e}")
        try:
            db.rollback()
        except Exception:
            pass
        raise
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        try:
            db.close()
        except Exception:
            # Connection already dead, just invalidate it
            try:
                db.invalidate()
            except Exception:
                pass
