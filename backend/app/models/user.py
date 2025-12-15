"""
User profile model for role management.

This model extends Supabase auth with additional user data,
primarily the role field for admin access control.
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
    User profile model storing role and metadata.

    This table is separate from Supabase auth.users but linked via user_id.
    Created automatically when a user first interacts with the system.
    """
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=True)  # User's full name from registration
    email = Column(String(255), nullable=True)  # Synced from Supabase Auth on login
    role = Column(String(20), default=UserRole.USER.value, nullable=False)
    
    # Daily query limit tracking
    daily_query_count = Column(Integer, default=0, nullable=False)
    last_query_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.role == UserRole.ADMIN.value

