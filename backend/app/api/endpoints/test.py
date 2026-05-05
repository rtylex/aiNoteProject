"""
Test management endpoints.

Handles test creation from PDF documents, quiz taking, submission and history.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.services.auth import get_current_user
from app.db.session import get_db
from app.services.test_service import (
    extract_document_content,
    generate_test_questions,
    create_test,
    submit_test,
    get_test_with_questions,
    list_user_tests,
    list_public_tests,
    delete_test,
    toggle_test_public,
)
from app.services.query_limit import check_and_consume_query


router = APIRouter()


class TestGenerateRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    question_count: int = Field(default=15, ge=5, le=30)


class TestSubmitRequest(BaseModel):
    answers: list[dict] = Field(default_factory=list)


class TestShareRequest(BaseModel):
    is_public: bool


def check_and_use_query_limit(user_id: uuid.UUID, db: Session) -> bool:
    """Check if user has remaining query quota and consume one for test generation."""
    can_use, message = check_and_consume_query(user_id, db)
    if not can_use:
        raise HTTPException(status_code=429, detail=message)
    return True


@router.post("/generate")
async def generate_test(
    request: TestGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a test from a PDF document.

    This endpoint:
    1. Verifies the user has remaining query quota (1 query for test generation)
    2. Extracts document content from embeddings
    3. Uses DeepSeek AI to generate multiple-choice questions
    4. Creates test and questions in database
    5. Returns the test ID and questions
    """
    user_uuid = uuid.UUID(current_user.get("sub"))

    check_and_use_query_limit(user_uuid, db)

    doc_uuid = uuid.UUID(request.document_id)

    from app.models.document import Document
from app.models.test import Test, TestQuestion
    document = db.query(Document).filter(Document.id == doc_uuid).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status != "completed":
        raise HTTPException(status_code=400, detail="Document is not yet processed")

    content = extract_document_content(db, doc_uuid)
    if not content:
        raise HTTPException(status_code=400, detail="Document has no content for test generation")

    try:
        questions_data = await generate_test_questions(content, request.question_count)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    title = f"{document.title} - Test"

    test = create_test(
        db=db,
        user_id=user_uuid,
        document_id=doc_uuid,
        title=title,
        questions_data=questions_data,
        question_count=request.question_count
    )

    db_questions = db.query(TestQuestion).filter(
        TestQuestion.test_id == test.id
    ).order_by(TestQuestion.order_num).all()

    return {
        "test_id": str(test.id),
        "title": test.title,
        "question_count": test.total_questions,
        "questions": [
            {
                "id": str(q.id),
                "question_text": q.question_text,
                "options": q.options,
                "order": q.order_num
            }
            for q in db_questions
        ]
    }


@router.get("/")
async def list_my_tests(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all tests created by the current user."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    return list_user_tests(db, user_uuid, limit, offset)


@router.get("/public")
async def list_public_tests(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List all public completed tests for community."""
    return list_public_tests(db, limit, offset)


@router.get("/{test_id}")
async def get_test(
    test_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get test details with questions (without correct answers for taking)."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    test_uuid = uuid.UUID(test_id)

    try:
        return get_test_with_questions(db, test_uuid, user_uuid, include_answers=False)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{test_id}/submit")
async def submit_test(
    test_id: str,
    request: TestSubmitRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit test answers and get score with explanations."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    test_uuid = uuid.UUID(test_id)

    try:
        return submit_test(db, test_uuid, user_uuid, request.answers)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{test_id}/share")
async def toggle_test_share(
    test_id: str,
    request: TestShareRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle test visibility (public/private) for community sharing."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    test_uuid = uuid.UUID(test_id)

    try:
        return toggle_test_public(db, test_uuid, user_uuid, request.is_public)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{test_id}")
async def delete_test(
    test_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a test. Only the owner can delete."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    test_uuid = uuid.UUID(test_id)

    try:
        delete_test(db, test_uuid, user_uuid)
        return {"message": "Test deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))