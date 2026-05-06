import uuid
import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, Integer, Float, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime


class FlashcardSet(Base):
    """Flashcard set model."""
    __tablename__ = "flashcard_sets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("multi_document_sessions.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    card_count = Column(Integer, default=0)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="flashcard_sets")
    session = relationship("MultiDocumentSession", back_populates="flashcard_sets")
    cards = relationship("Flashcard", back_populates="flashcard_set", cascade="all, delete-orphan", order_by="Flashcard.order_num")


class Flashcard(Base):
    """Individual flashcard model."""
    __tablename__ = "flashcards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    set_id = Column(UUID(as_uuid=True), ForeignKey("flashcard_sets.id", ondelete="CASCADE"), nullable=False, index=True)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    extra_notes = Column(Text, nullable=True)
    order_num = Column(Integer, default=0)

    flashcard_set = relationship("FlashcardSet", back_populates="cards")
    progress_entries = relationship("FlashcardProgress", back_populates="flashcard", cascade="all, delete-orphan")


class FlashcardStatus(str, enum.Enum):
    NEW = "new"
    LEARNING = "learning"
    REVIEW = "review"
    MASTERED = "mastered"


class FlashcardProgress(Base):
    """User progress for individual flashcards (Spaced Repetition)."""
    __tablename__ = "flashcard_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    flashcard_id = Column(UUID(as_uuid=True), ForeignKey("flashcards.id", ondelete="CASCADE"), nullable=False, index=True)
    ease_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=0)
    repetitions = Column(Integer, default=0)
    next_review = Column(DateTime, nullable=True)
    last_reviewed = Column(DateTime, nullable=True)
    status = Column(String(20), default=FlashcardStatus.NEW.value)

    flashcard = relationship("Flashcard", back_populates="progress_entries")
