"""
Document management endpoints.

Handles document upload, retrieval, and management operations.
Supports both private and public documents with admin approval workflow.
"""
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
from app.services.auth import get_current_user
from app.db.session import get_db
from app.models.document import Document, DocumentEmbedding, VisibilityType, DocumentType, DocumentCategory
from app.models.chat import ChatSession, ChatMessage
from app.models.user import UserProfile, UserRole
from app.services.pdf_service import process_document
from app.services.storage_security import ensure_allowed_storage_url, InvalidStorageURLError
import uuid

router = APIRouter()


def sync_user_profile(db: Session, current_user: dict):
    """Sync user profile data (email, full_name) from Supabase Auth to user_profiles table."""
    user_id = uuid.UUID(current_user.get("sub"))
    email = current_user.get("email")
    user_metadata = current_user.get("user_metadata", {})
    full_name = None
    if user_metadata:
        full_name = user_metadata.get("full_name") or user_metadata.get("display_name") or user_metadata.get("name")
    
    # Get or create profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id, email=email, full_name=full_name, role=UserRole.USER.value)
        db.add(profile)
        db.commit()
    else:
        # Sync data if changed
        updated = False
        if email and profile.email != email:
            profile.email = email
            updated = True
        if full_name and profile.full_name != full_name:
            profile.full_name = full_name
            updated = True
        if updated:
            db.commit()


def ensure_document_columns(db):
    """Add social feature columns to documents table if they don't exist."""
    try:
        # Check if columns exist by trying to query them
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'documents'"))
        existing_columns = [row[0] for row in result]

        columns_to_add = []
        if 'course_name' not in existing_columns:
            columns_to_add.append("ADD COLUMN IF NOT EXISTS course_name VARCHAR(100)")
        if 'topic' not in existing_columns:
            columns_to_add.append("ADD COLUMN IF NOT EXISTS topic VARCHAR(200)")
        if 'visibility' not in existing_columns:
            columns_to_add.append("ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private'")
        if 'is_approved' not in existing_columns:
            columns_to_add.append("ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false")
        if 'approved_at' not in existing_columns:
            columns_to_add.append("ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP")
        if 'approved_by' not in existing_columns:
            columns_to_add.append("ADD COLUMN IF NOT EXISTS approved_by UUID")

        if columns_to_add:
            for col in columns_to_add:
                db.execute(text(f"ALTER TABLE documents {col}"))
            db.commit()
    except Exception as e:
        print(f"Warning: Could not ensure document columns: {e}")
        db.rollback()


# ============================================================================
# Pydantic Schemas
# ============================================================================

class DocumentCreate(BaseModel):
    """Schema for creating a new document."""
    title: str = Field(..., min_length=1, max_length=255)
    file_url: str
    document_type: str = Field(default="course", pattern="^(course|non_course)$")
    # For course documents
    course_name: Optional[str] = Field(None, max_length=100)
    topic: Optional[str] = Field(None, max_length=200)
    # For non-course documents
    category_id: Optional[str] = Field(None)
    visibility: str = Field(default="private", pattern="^(private|public)$")


class DocumentUpdate(BaseModel):
    """Schema for updating document metadata."""
    title: Optional[str] = Field(None, max_length=255)
    course_name: Optional[str] = Field(None, max_length=100)
    topic: Optional[str] = Field(None, max_length=200)


class DocumentResponse(BaseModel):
    """Schema for document response."""
    id: str
    user_id: str
    title: str
    file_url: str
    status: str
    document_type: str
    course_name: Optional[str]
    topic: Optional[str]
    category_id: Optional[str]
    category_name: Optional[str] = None
    visibility: str
    is_approved: bool
    created_at: str

    class Config:
        from_attributes = True


class PublicCategoryResponse(BaseModel):
    """Schema for public category listing (for upload form)."""
    id: str
    name: str
    description: Optional[str]


class CourseInfo(BaseModel):
    """Schema for course listing."""
    course_name: str
    topic_count: int
    document_count: int


class TopicInfo(BaseModel):
    """Schema for topic listing."""
    topic: str
    document_count: int


# ============================================================================
# Document Upload & Creation
# ============================================================================

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a document file directly."""
    file_path = f"mock_url/{file.filename}"

    db_doc = Document(
        user_id=uuid.UUID(current_user.get("sub")),
        title=file.filename,
        file_url=file_path,
        status="pending",
        visibility=VisibilityType.PRIVATE.value,
        is_approved=False
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    background_tasks.add_task(process_document, str(db_doc.id), file_path)

    return {"id": str(db_doc.id), "filename": file.filename, "status": "pending"}


@router.post("/")
async def create_document(
    doc_in: DocumentCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new document with metadata.

    Public documents require admin approval before becoming visible.
    Private documents are immediately available to the owner.

    document_type can be:
    - "course": For course documents (requires course_name)
    - "non_course": For non-course documents (requires category_id)
    """
    # Ensure new columns exist
    ensure_document_columns(db)

    try:
        safe_url = ensure_allowed_storage_url(doc_in.file_url)
    except InvalidStorageURLError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Validate document type specific fields
    if doc_in.document_type == DocumentType.NON_COURSE.value:
        if not doc_in.category_id:
            raise HTTPException(
                status_code=400,
                detail="category_id is required for non-course documents"
            )
        # Verify category exists and is active
        cat_uuid = uuid.UUID(doc_in.category_id)
        category = db.query(DocumentCategory).filter(
            DocumentCategory.id == cat_uuid,
            DocumentCategory.is_active == True
        ).first()
        if not category:
            raise HTTPException(
                status_code=400,
                detail="Invalid or inactive category"
            )

    # Check role for public course document uploads
    # Only teachers and admins can upload public course documents
    is_public = doc_in.visibility == VisibilityType.PUBLIC.value
    is_course_doc = doc_in.document_type == DocumentType.COURSE.value
    
    if is_public and is_course_doc:
        user_uuid = uuid.UUID(current_user.get("sub"))
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
        
        # Check if user has teacher or admin role
        allowed_roles = [UserRole.TEACHER.value, UserRole.ADMIN.value]
        if not user_profile or user_profile.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Topluluk kütüphanesine ders dökümanı yüklemek için öğretmen veya admin rolüne sahip olmalısınız."
            )

    # Determine if auto-approval is needed (private docs are auto-approved)
    is_approved = not is_public  # Private docs are auto-approved

    db_doc = Document(
        user_id=uuid.UUID(current_user.get("sub")),
        title=doc_in.title,
        file_url=safe_url,
        status="pending",
        document_type=doc_in.document_type,
        course_name=doc_in.course_name if doc_in.document_type == DocumentType.COURSE.value else None,
        topic=doc_in.topic if doc_in.document_type == DocumentType.COURSE.value else None,
        category_id=uuid.UUID(doc_in.category_id) if doc_in.category_id and doc_in.document_type == DocumentType.NON_COURSE.value else None,
        visibility=doc_in.visibility,
        is_approved=is_approved
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    background_tasks.add_task(process_document, str(db_doc.id), doc_in.file_url)

    return {
        "id": str(db_doc.id),
        "title": db_doc.title,
        "status": "pending",
        "document_type": db_doc.document_type,
        "visibility": db_doc.visibility,
        "is_approved": db_doc.is_approved
    }


# ============================================================================
# Document Retrieval
# ============================================================================

@router.get("/")
async def list_documents(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all documents owned by the current user."""
    # Sync user profile data from Supabase Auth
    sync_user_profile(db, current_user)
    
    user_uuid = uuid.UUID(current_user.get("sub"))
    documents = db.query(Document).filter(Document.user_id == user_uuid).all()
    return documents


@router.get("/public")
async def list_public_documents(
    document_type: Optional[str] = Query(None, description="Filter by document type (course/non_course)"),
    course_name: Optional[str] = Query(None, description="Filter by course name (for course docs)"),
    topic: Optional[str] = Query(None, description="Filter by topic (for course docs)"),
    category_id: Optional[str] = Query(None, description="Filter by category (for non-course docs)"),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    List all approved public documents.

    Only documents with visibility='public' and is_approved=True are returned.
    Supports filtering by document_type, course name, topic, and category.
    """
    query = db.query(Document).filter(
        Document.visibility == VisibilityType.PUBLIC.value,
        Document.is_approved == True,
        Document.status == "completed"
    )

    if document_type:
        query = query.filter(Document.document_type == document_type)
    if course_name:
        query = query.filter(Document.course_name == course_name)
    if topic:
        query = query.filter(Document.topic == topic)
    if category_id:
        query = query.filter(Document.category_id == uuid.UUID(category_id))

    documents = query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()

    # Add category names to results
    result = []
    for doc in documents:
        doc_dict = {
            "id": str(doc.id),
            "user_id": str(doc.user_id),
            "title": doc.title,
            "file_url": doc.file_url,
            "status": doc.status,
            "document_type": doc.document_type or "course",
            "course_name": doc.course_name,
            "topic": doc.topic,
            "category_id": str(doc.category_id) if doc.category_id else None,
            "category_name": None,
            "visibility": doc.visibility,
            "is_approved": doc.is_approved,
            "created_at": doc.created_at.isoformat() if doc.created_at else ""
        }
        if doc.category_id:
            category = db.query(DocumentCategory).filter(DocumentCategory.id == doc.category_id).first()
            if category:
                doc_dict["category_name"] = category.name
        result.append(doc_dict)

    return result


@router.get("/courses")
async def list_courses(db: Session = Depends(get_db)):
    """
    List all available courses with their document counts.

    Only returns courses that have approved public course documents.
    """
    from sqlalchemy import func

    results = db.query(
        Document.course_name,
        func.count(func.distinct(Document.topic)).label('topic_count'),
        func.count(Document.id).label('document_count')
    ).filter(
        Document.visibility == VisibilityType.PUBLIC.value,
        Document.is_approved == True,
        Document.status == "completed",
        Document.document_type == DocumentType.COURSE.value,
        Document.course_name.isnot(None)
    ).group_by(Document.course_name).all()

    return [
        CourseInfo(
            course_name=r.course_name,
            topic_count=r.topic_count,
            document_count=r.document_count
        )
        for r in results
    ]


@router.get("/courses/{course_name}/topics")
async def list_course_topics(course_name: str, db: Session = Depends(get_db)):
    """
    List all topics for a specific course.

    Only returns topics that have approved public documents.
    """
    from sqlalchemy import func

    results = db.query(
        Document.topic,
        func.count(Document.id).label('document_count')
    ).filter(
        Document.visibility == VisibilityType.PUBLIC.value,
        Document.is_approved == True,
        Document.status == "completed",
        Document.course_name == course_name,
        Document.topic.isnot(None)
    ).group_by(Document.topic).all()

    return [
        TopicInfo(topic=r.topic, document_count=r.document_count)
        for r in results
    ]


@router.get("/suggestions/all")
async def get_course_suggestions(db: Session = Depends(get_db)):
    """
    Get all unique course names and topics for autocomplete suggestions.
    
    Returns all courses and topics from the database (not just approved public ones)
    to help teachers avoid name conflicts and select existing courses/topics.
    """
    from sqlalchemy import func, distinct
    
    # Get all unique course names
    course_results = db.query(
        distinct(Document.course_name)
    ).filter(
        Document.course_name.isnot(None),
        Document.course_name != ""
    ).all()
    
    # Get all unique topics with their associated course names
    topic_results = db.query(
        Document.course_name,
        Document.topic
    ).filter(
        Document.topic.isnot(None),
        Document.topic != ""
    ).distinct().all()
    
    # Build course -> topics mapping
    course_topics = {}
    for course, topic in topic_results:
        if course:
            if course not in course_topics:
                course_topics[course] = []
            if topic and topic not in course_topics[course]:
                course_topics[course].append(topic)
    
    return {
        "courses": [r[0] for r in course_results if r[0]],
        "topics": list(set([r.topic for r in topic_results if r.topic])),
        "course_topics": course_topics  # Topics grouped by course
    }


@router.get("/categories/list")
async def list_public_categories(db: Session = Depends(get_db)):
    """
    List all active document categories.

    This endpoint is public and used in upload forms for non-course documents.
    """
    from sqlalchemy import func

    categories = db.query(DocumentCategory).filter(
        DocumentCategory.is_active == True
    ).order_by(DocumentCategory.name).all()

    # Get document counts for each category
    result = []
    for cat in categories:
        doc_count = db.query(func.count(Document.id)).filter(
            Document.category_id == cat.id,
            Document.visibility == VisibilityType.PUBLIC.value,
            Document.is_approved == True,
            Document.status == "completed"
        ).scalar() or 0

        result.append({
            "id": str(cat.id),
            "name": cat.name,
            "description": cat.description,
            "document_count": doc_count
        })

    return result


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific document by ID.

    Users can access:
    - Their own documents (any visibility)
    - Approved public documents from other users
    """
    user_uuid = uuid.UUID(current_user.get("sub"))
    doc_uuid = uuid.UUID(document_id)

    document = db.query(Document).filter(Document.id == doc_uuid).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check access rights
    is_owner = document.user_id == user_uuid
    is_public_approved = (
        document.visibility == VisibilityType.PUBLIC.value and
        document.is_approved
    )

    # Check if user is admin
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
    is_admin = user_profile and user_profile.role == UserRole.ADMIN

    if not is_owner and not is_public_approved and not is_admin:
        raise HTTPException(status_code=403, detail="Access denied")

    return document


# ============================================================================
# Document Management
# ============================================================================

@router.patch("/{document_id}")
async def update_document(
    document_id: str,
    doc_update: DocumentUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update document metadata. Only the owner can update."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    doc_uuid = uuid.UUID(document_id)

    document = db.query(Document).filter(
        Document.id == doc_uuid,
        Document.user_id == user_uuid
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc_update.title is not None:
        document.title = doc_update.title
    if doc_update.course_name is not None:
        document.course_name = doc_update.course_name
    if doc_update.topic is not None:
        document.topic = doc_update.topic

    db.commit()
    db.refresh(document)

    return document


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a document and all related data. Only the owner can delete."""
    # Parse UUIDs
    user_uuid = uuid.UUID(current_user.get("sub"))
    doc_uuid = uuid.UUID(document_id)

    # Check if user is admin
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
    is_admin = user_profile and user_profile.role == UserRole.ADMIN

    if is_admin:
        document = db.query(Document).filter(Document.id == doc_uuid).first()
    else:
        document = db.query(Document).filter(
            Document.id == doc_uuid,
            Document.user_id == user_uuid
        ).first()

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

    return {"message": "Document deleted successfully"}
