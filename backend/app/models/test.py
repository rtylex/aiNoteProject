import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Text, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime


class Test(Base):
    __tablename__ = "tests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), index=True)
    title = Column(String(255), index=True)
    question_count = Column(Integer, default=0)
    score = Column(Integer, nullable=True)
    total_questions = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    document = relationship("Document", back_populates="tests")
    questions = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan")


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    test_id = Column(UUID(as_uuid=True), ForeignKey("tests.id", ondelete="CASCADE"), index=True)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer = Column(String(10), nullable=False)
    user_answer = Column(String(10), nullable=True)
    explanation = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    order_num = Column(Integer, nullable=False)

    test = relationship("Test", back_populates="questions")