"""
User profile model for role management.

Now fully self-hosted — no Supabase dependency.
Handles authentication, roles, and query limits.
"""
import uuid
import enum
from sqlalchemy import Column, String, DateTime, Integer, Date
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
import datetime


class UserRole(str, enum.Enum):
    """User role types."""
    USER = "user"
    TEACHER = "teacher"  # Can upload course documents to community
    ADMIN = "admin"


class UserProfile(Base):
    """
    User model storing credentials, role and metadata.

    This is now the single source of truth for user identity.
    user_id kept as alias of id for backward compatibility with existing code.
    """
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # user_id kept as a computed alias in code — the DB column is 'id'
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(20), default=UserRole.USER.value, nullable=False)
    
    # Daily query limit tracking
    daily_query_count = Column(Integer, default=0, nullable=False)
    last_query_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    @property
    def user_id(self):
        """Backward compatibility: many places use user_id which was the Supabase UID."""
        return self.id

    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.role == UserRole.ADMIN.value


