import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, Enum as SQLEnum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime
import enum


class VisibilityType(str, enum.Enum):
    """Document visibility options."""
    PRIVATE = "private"
    PUBLIC = "public"


class DocumentType(str, enum.Enum):
    """Document type options."""
    COURSE = "course"  # Ders dökümanı
    NON_COURSE = "non_course"  # Ders dışı döküman


class DocumentCategory(Base):
    """
    Category model for non-course documents.

    Categories are created by admins and selected by users when uploading
    non-course documents (e.g., Article, Thesis, Book, Report, etc.)
    """
    __tablename__ = "document_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), nullable=True)

    documents = relationship("Document", back_populates="category")


class Document(Base):
    """
    Document model representing uploaded PDF files.

    Supports both private (personal) and public (community) documents.
    Public documents require admin approval before becoming visible.
    """
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), index=True)
    title = Column(String, index=True)
    file_url = Column(String)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Document type: course or non-course
    document_type = Column(String(20), default=DocumentType.COURSE.value, index=True)

    # Social features - Course categorization (for course documents)
    course_name = Column(String(100), index=True, nullable=True)
    topic = Column(String(200), index=True, nullable=True)

    # Category for non-course documents
    category_id = Column(UUID(as_uuid=True), ForeignKey("document_categories.id"), nullable=True, index=True)
    category = relationship("DocumentCategory", back_populates="documents")

    # Visibility and approval
    visibility = Column(String(20), default=VisibilityType.PRIVATE.value, index=True)
    is_approved = Column(Boolean, default=False, index=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(UUID(as_uuid=True), nullable=True)

    embeddings = relationship("DocumentEmbedding", back_populates="document")
    chat_sessions = relationship("ChatSession", back_populates="document")

from pgvector.sqlalchemy import Vector

class DocumentEmbedding(Base):
    __tablename__ = "document_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"))
    page_number = Column(Integer, nullable=True, default=0, index=True)  # Chunk order for full-doc retrieval
    content = Column(String)
    embedding = Column(Vector(768))
    
    document = relationship("Document", back_populates="embeddings")
