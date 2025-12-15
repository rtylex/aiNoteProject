"""
Initial setup endpoints.

These endpoints handle first-time setup operations like creating
the initial admin user. They are designed to work only once.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text, inspect
from sqlalchemy.exc import ProgrammingError
from app.services.auth import get_current_user
from app.db.session import SessionLocal
from app.models.user import UserProfile, UserRole
import uuid

router = APIRouter()


class SetupResponse(BaseModel):
    """Response for setup operations."""
    message: str
    success: bool


def table_exists(db, table_name: str) -> bool:
    """Check if a table exists in the database."""
    try:
        inspector = inspect(db.bind)
        return table_name in inspector.get_table_names()
    except Exception:
        return False


def ensure_user_profiles_table(db):
    """Create user_profiles table if it doesn't exist."""
    if not table_exists(db, 'user_profiles'):
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID UNIQUE NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            )
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_user_profiles_user_id ON user_profiles (user_id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_user_profiles_role ON user_profiles (role)"))
        db.commit()


@router.post("/make-me-admin", response_model=SetupResponse)
async def make_first_admin(
    current_user: dict = Depends(get_current_user)
):
    """
    Make the current user the first admin.

    This endpoint only works if:
    1. There are no existing admin users in the system
    2. The user is authenticated

    Use this for initial setup only. After the first admin is created,
    use the admin panel to manage other users' roles.
    """
    db = SessionLocal()
    try:
        # Ensure table exists
        ensure_user_profiles_table(db)

        # Check if any admin exists
        existing_admin = db.query(UserProfile).filter(
            UserProfile.role == UserRole.ADMIN.value
        ).first()

        if existing_admin:
            raise HTTPException(
                status_code=400,
                detail="An admin already exists. Use the admin panel to manage roles."
            )

        user_id = uuid.UUID(current_user.get("sub"))
        email = current_user.get("email")

        # Get or create user profile
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

        if not profile:
            profile = UserProfile(
                user_id=user_id,
                role=UserRole.ADMIN.value
            )
            db.add(profile)
        else:
            profile.role = UserRole.ADMIN.value

        db.commit()

        return SetupResponse(
            message=f"User {email} is now an admin!",
            success=True
        )
    finally:
        db.close()


@router.get("/status")
async def get_setup_status():
    """
    Check if initial setup is needed.

    Returns whether an admin exists in the system.
    """
    db = SessionLocal()
    try:
        # Ensure table exists first
        ensure_user_profiles_table(db)

        admin_exists = db.query(UserProfile).filter(
            UserProfile.role == UserRole.ADMIN.value
        ).first() is not None

        return {
            "admin_exists": admin_exists,
            "setup_needed": not admin_exists
        }
    except Exception as e:
        # If table doesn't exist, setup is needed
        return {
            "admin_exists": False,
            "setup_needed": True,
            "error": str(e)
        }
    finally:
        db.close()
