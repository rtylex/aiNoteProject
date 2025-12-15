import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"))
    title = Column(String)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    document = relationship("Document", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id"))
    sender = Column(String) # 'user' or 'ai'
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    session = relationship("ChatSession", back_populates="messages")


# Multi-Document Session Models
# Association table for many-to-many relationship
multi_session_documents = Table(
    'multi_session_documents',
    Base.metadata,
    Column('session_id', UUID(as_uuid=True), ForeignKey('multi_document_sessions.id', ondelete='CASCADE'), primary_key=True),
    Column('document_id', UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), primary_key=True)
)


class MultiDocumentSession(Base):
    """Session for multi-document chat conversations."""
    __tablename__ = "multi_document_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    title = Column(String(255), nullable=False)  # User-provided name
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Many-to-many relationship with documents
    documents = relationship("Document", secondary=multi_session_documents, backref="multi_sessions")
    messages = relationship("MultiSessionMessage", back_populates="session", cascade="all, delete-orphan")


class MultiSessionMessage(Base):
    """Messages in a multi-document chat session."""
    __tablename__ = "multi_session_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("multi_document_sessions.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(10), nullable=False)  # 'user' or 'ai'
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    session = relationship("MultiDocumentSession", back_populates="messages")

