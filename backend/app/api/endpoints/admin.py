"""
Admin management endpoints.

Handles document approval workflow and admin dashboard statistics.
Only users with admin role can access these endpoints.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, text, inspect
from sqlalchemy.orm import Session
from app.services.auth import get_current_user
from app.db.session import get_db
from app.models.document import Document, DocumentEmbedding, VisibilityType, DocumentCategory
from app.models.chat import ChatSession, ChatMessage
from app.models.user import UserProfile, UserRole
import uuid

router = APIRouter()


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
                full_name VARCHAR(100),
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT now(),
                updated_at TIMESTAMP DEFAULT now()
            )
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_user_profiles_user_id ON user_profiles (user_id)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_user_profiles_role ON user_profiles (role)"))
        db.commit()


# ============================================================================
# Pydantic Schemas
# ============================================================================

class AdminStats(BaseModel):
    """Dashboard statistics for admin panel."""
    pending_count: int
    approved_today_count: int
    total_documents: int
    total_public_documents: int
    total_users: int


class DocumentPreview(BaseModel):
    """Preview information for pending documents."""
    id: str
    title: str
    course_name: Optional[str]
    topic: Optional[str]
    user_id: str
    file_url: str
    created_at: str
    status: str


class ApprovalResponse(BaseModel):
    """Response after approval/rejection action."""
    message: str
    document_id: str
    new_status: str


class UserRoleUpdate(BaseModel):
    """Schema for updating user role."""
    role: str


class UserProfileResponse(BaseModel):
    """Schema for user profile response."""
    id: str
    user_id: str
    full_name: Optional[str]
    email: Optional[str]
    role: str
    created_at: str


# ============================================================================
# Helper Functions
# ============================================================================

def get_or_create_user_profile(db, user_id: uuid.UUID, email: str = None, full_name: str = None) -> UserProfile:
    """
    Get existing user profile or create a new one.

    This ensures every user has a profile record for role management.
    Email and full_name are synced from Supabase Auth when available.
    """
    # Ensure table exists
    ensure_user_profiles_table(db)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

    if not profile:
        profile = UserProfile(
            user_id=user_id,
            email=email,
            full_name=full_name,
            role=UserRole.USER.value
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    else:
        # Sync email and full_name from Supabase Auth if changed
        updated = False
        if email and profile.email != email:
            profile.email = email
            updated = True
        if full_name and profile.full_name != full_name:
            profile.full_name = full_name
            updated = True
        if updated:
            db.commit()
            db.refresh(profile)

    return profile


def verify_admin_role(db, current_user: dict) -> UserProfile:
    """
    Verify that the current user has admin privileges.

    Returns the user profile if admin, raises HTTPException otherwise.
    """
    user_id = uuid.UUID(current_user.get("sub"))

    profile = get_or_create_user_profile(db, user_id)

    if not profile.is_admin():
        raise HTTPException(
            status_code=403,
            detail="Admin access required. Contact system administrator to request admin privileges."
        )

    return profile


# ============================================================================
# User Profile & Role Management
# ============================================================================

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's profile including role.

    Creates a profile if one doesn't exist.
    Syncs email and full_name from Supabase Auth to profile.
    """
    user_id = uuid.UUID(current_user.get("sub"))
    email = current_user.get("email")  # Get email from Supabase Auth
    # Try to get name from user_metadata (check both full_name and display_name)
    user_metadata = current_user.get("user_metadata", {})
    full_name = None
    if user_metadata:
        full_name = user_metadata.get("full_name") or user_metadata.get("display_name") or user_metadata.get("name")

    profile = get_or_create_user_profile(db, user_id, email=email, full_name=full_name)

    return UserProfileResponse(
        id=str(profile.id),
        user_id=str(profile.user_id),
        full_name=profile.full_name,
        email=profile.email,  # Now from profile (synced from Supabase Auth)
        role=profile.role,
        created_at=profile.created_at.isoformat() if profile.created_at else ""
    )


@router.get("/users")
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all user profiles. Admin only.
    """
    verify_admin_role(db, current_user)

    query = db.query(UserProfile)

    if role:
        query = query.filter(UserProfile.role == role)

    profiles = query.order_by(UserProfile.created_at.desc()).offset(offset).limit(limit).all()

    # Email and full_name are synced from Supabase Auth when user logs in
    return [
        UserProfileResponse(
            id=str(p.id),
            user_id=str(p.user_id),
            full_name=p.full_name,
            email=p.email,  # Email synced from Supabase Auth on user login
            role=p.role,
            created_at=p.created_at.isoformat() if p.created_at else ""
        )
        for p in profiles
    ]


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a user's role. Admin only.

    Available roles: 'user', 'teacher', 'admin'
    """
    verify_admin_role(db, current_user)

    valid_roles = [UserRole.USER.value, UserRole.TEACHER.value, UserRole.ADMIN.value]
    if role_update.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    target_user_id = uuid.UUID(user_id)
    profile = db.query(UserProfile).filter(UserProfile.user_id == target_user_id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    profile.role = role_update.role
    profile.updated_at = datetime.utcnow()
    db.commit()

    return {
        "message": f"User role updated to {role_update.role}",
        "user_id": user_id,
        "new_role": role_update.role
    }


# ============================================================================
# Admin Dashboard
# ============================================================================

@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics for admin panel.

    Returns counts for pending documents, approvals, and totals.
    """
    verify_admin_role(db, current_user)

    # Pending documents count
    pending_count = db.query(func.count(Document.id)).filter(
        Document.visibility == VisibilityType.PUBLIC.value,
        Document.is_approved == False,
        Document.status == "completed"
    ).scalar()

    # Approved today count
    today = datetime.utcnow().date()
    approved_today = db.query(func.count(Document.id)).filter(
        Document.approved_at >= datetime(today.year, today.month, today.day)
    ).scalar()

    # Total documents
    total_documents = db.query(func.count(Document.id)).scalar()

    # Total public approved documents
    total_public = db.query(func.count(Document.id)).filter(
        Document.visibility == VisibilityType.PUBLIC.value,
        Document.is_approved == True
    ).scalar()

    # Total unique users (from profiles)
    total_users = db.query(func.count(UserProfile.id)).scalar()

    return AdminStats(
        pending_count=pending_count or 0,
        approved_today_count=approved_today or 0,
        total_documents=total_documents or 0,
        total_public_documents=total_public or 0,
        total_users=total_users or 0
    )


# ============================================================================
# Pending Documents Queue
# ============================================================================

@router.get("/documents/pending")
async def list_pending_documents(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all documents waiting for admin approval.

    Only shows public documents that are:
    - Not yet approved
    - Processing is completed (ready for review)
    """
    verify_admin_role(db, current_user)

    documents = db.query(Document).filter(
        Document.visibility == VisibilityType.PUBLIC.value,
        Document.is_approved == False,
        Document.status == "completed"
    ).order_by(Document.created_at.asc()).offset(offset).limit(limit).all()

    return [
        DocumentPreview(
            id=str(doc.id),
            title=doc.title,
            course_name=doc.course_name,
            topic=doc.topic,
            user_id=str(doc.user_id),
            file_url=doc.file_url,
            created_at=doc.created_at.isoformat() if doc.created_at else "",
            status=doc.status
        )
        for doc in documents
    ]


# ============================================================================
# Document Approval Actions
# ============================================================================

@router.put("/documents/{document_id}/approve", response_model=ApprovalResponse)
async def approve_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve a document for public visibility.

    After approval, the document becomes visible in public library searches.
    """
    verify_admin_role(db, current_user)

    doc_uuid = uuid.UUID(document_id)
    admin_uuid = uuid.UUID(current_user.get("sub"))

    document = db.query(Document).filter(Document.id == doc_uuid).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.visibility != VisibilityType.PUBLIC.value:
        raise HTTPException(
            status_code=400,
            detail="Only public documents can be approved"
        )

    if document.is_approved:
        raise HTTPException(
            status_code=400,
            detail="Document is already approved"
        )

    document.is_approved = True
    document.approved_at = datetime.utcnow()
    document.approved_by = admin_uuid

    db.commit()

    return ApprovalResponse(
        message="Document approved successfully",
        document_id=document_id,
        new_status="approved"
    )


@router.put("/documents/{document_id}/reject", response_model=ApprovalResponse)
async def reject_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject a document submission.

    The document is deleted from the system.
    """
    verify_admin_role(db, current_user)

    doc_uuid = uuid.UUID(document_id)

    document = db.query(Document).filter(Document.id == doc_uuid).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete related records
    db.query(DocumentEmbedding).filter(
        DocumentEmbedding.document_id == doc_uuid
    ).delete(synchronize_session=False)

    sessions = db.query(ChatSession).filter(
        ChatSession.document_id == doc_uuid
    ).all()

    for session in sessions:
        db.query(ChatMessage).filter(
            ChatMessage.session_id == session.id
        ).delete(synchronize_session=False)

    db.query(ChatSession).filter(
        ChatSession.document_id == doc_uuid
    ).delete(synchronize_session=False)

    db.delete(document)
    db.commit()

    return ApprovalResponse(
        message="Document rejected and deleted",
        document_id=document_id,
        new_status="rejected"
    )


@router.get("/documents/{document_id}")
async def get_document_for_review(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get full document details for admin review.

    Returns complete document information including file URL for preview.
    """
    verify_admin_role(db, current_user)

    doc_uuid = uuid.UUID(document_id)
    document = db.query(Document).filter(Document.id == doc_uuid).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document


# ============================================================================
# Category Management (for non-course documents)
# ============================================================================

class CategoryCreate(BaseModel):
    """Schema for creating a new category."""
    name: str
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    """Schema for updating a category."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    """Schema for category response."""
    id: str
    name: str
    description: Optional[str]
    is_active: bool
    created_at: str
    document_count: int = 0


def ensure_categories_table(db):
    """Create document_categories table if it doesn't exist."""
    if not table_exists(db, 'document_categories'):
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS document_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) UNIQUE NOT NULL,
                description VARCHAR(500),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT now(),
                created_by UUID
            )
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_document_categories_name ON document_categories (name)"))
        db.execute(text("CREATE INDEX IF NOT EXISTS ix_document_categories_is_active ON document_categories (is_active)"))
        db.commit()


def ensure_document_type_columns(db):
    """Add document_type and category_id columns to documents table if they don't exist."""
    try:
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents'"))
        existing_columns = [row[0] for row in result]

        if 'document_type' not in existing_columns:
            db.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'course'"))
        if 'category_id' not in existing_columns:
            db.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES document_categories(id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_documents_category_id ON documents (category_id)"))
            db.execute(text("CREATE INDEX IF NOT EXISTS ix_documents_document_type ON documents (document_type)"))
        db.commit()
    except Exception as e:
        print(f"Warning: Could not ensure document type columns: {e}")
        db.rollback()


@router.get("/categories")
async def list_categories(
    include_inactive: bool = Query(False, description="Include inactive categories"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all document categories. Admin only.
    """
    verify_admin_role(db, current_user)
    ensure_categories_table(db)
    ensure_document_type_columns(db)

    query = db.query(DocumentCategory)
    if not include_inactive:
        query = query.filter(DocumentCategory.is_active == True)

    categories = query.order_by(DocumentCategory.name).all()

    result = []
    for cat in categories:
        doc_count = db.query(func.count(Document.id)).filter(
            Document.category_id == cat.id
        ).scalar() or 0

        result.append(CategoryResponse(
            id=str(cat.id),
            name=cat.name,
            description=cat.description,
            is_active=cat.is_active,
            created_at=cat.created_at.isoformat() if cat.created_at else "",
            document_count=doc_count
        ))

    return result


@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new document category. Admin only.
    """
    verify_admin_role(db, current_user)
    ensure_categories_table(db)
    ensure_document_type_columns(db)

    # Check if category already exists
    existing = db.query(DocumentCategory).filter(
        func.lower(DocumentCategory.name) == func.lower(category.name)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Category '{category.name}' already exists"
        )

    admin_uuid = uuid.UUID(current_user.get("sub"))

    new_category = DocumentCategory(
        name=category.name,
        description=category.description,
        is_active=True,
        created_by=admin_uuid
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return CategoryResponse(
        id=str(new_category.id),
        name=new_category.name,
        description=new_category.description,
        is_active=new_category.is_active,
        created_at=new_category.created_at.isoformat() if new_category.created_at else "",
        document_count=0
    )


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_update: CategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a document category. Admin only.
    """
    verify_admin_role(db, current_user)

    cat_uuid = uuid.UUID(category_id)
    category = db.query(DocumentCategory).filter(DocumentCategory.id == cat_uuid).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category_update.name is not None:
        # Check for duplicate name
        existing = db.query(DocumentCategory).filter(
            func.lower(DocumentCategory.name) == func.lower(category_update.name),
            DocumentCategory.id != cat_uuid
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Category '{category_update.name}' already exists"
            )
        category.name = category_update.name

    if category_update.description is not None:
        category.description = category_update.description

    if category_update.is_active is not None:
        category.is_active = category_update.is_active

    db.commit()
    db.refresh(category)

    doc_count = db.query(func.count(Document.id)).filter(
        Document.category_id == cat_uuid
    ).scalar() or 0

    return CategoryResponse(
        id=str(category.id),
        name=category.name,
        description=category.description,
        is_active=category.is_active,
        created_at=category.created_at.isoformat() if category.created_at else "",
        document_count=doc_count
    )


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a document category. Admin only.

    Categories with documents cannot be deleted - deactivate them instead.
    """
    verify_admin_role(db, current_user)

    cat_uuid = uuid.UUID(category_id)
    category = db.query(DocumentCategory).filter(DocumentCategory.id == cat_uuid).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if category has documents
    doc_count = db.query(func.count(Document.id)).filter(
        Document.category_id == cat_uuid
    ).scalar() or 0

    if doc_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {doc_count} documents. Deactivate it instead."
        )

    db.delete(category)
    db.commit()

    return {"message": f"Category '{category.name}' deleted successfully"}
