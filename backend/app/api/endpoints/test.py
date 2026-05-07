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
from app.models.document import Document
from app.models.test import Test, TestQuestion
from app.models.chat import MultiDocumentSession
from app.services.test_service import (
    extract_document_content,
    extract_session_content,
    extract_public_documents_content,
    generate_test_questions,
    create_test as create_test_in_db,
    submit_test as submit_test_answers,
    get_test_with_questions,
    list_user_tests,
    list_public_tests as get_public_tests,
    delete_test as delete_test_from_db,
    toggle_test_public,
    get_test_stats,
    get_test_attempts,
    explain_question_with_ai,
)
from app.services.query_limit import check_and_consume_query


router = APIRouter()


class TestGenerateRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    question_count: int = Field(default=15, ge=5, le=30)


class TestGenerateFromSessionRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    question_count: int = Field(default=15, ge=5, le=30)


class TestGenerateFromLibraryRequest(BaseModel):
    document_ids: list[str] = Field(..., min_length=1, max_length=10)
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

    document = db.query(Document).filter(Document.id == doc_uuid).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.status != "completed":
        raise HTTPException(status_code=400, detail="Document is not yet processed")

    content = extract_document_content(db, doc_uuid)
    if not content:
        raise HTTPException(status_code=400, detail="Document has no content for test generation")

    try:
        result = await generate_test_questions(content, request.question_count)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    questions_data = result["questions"]
    is_partial = result.get("partial", False)

    title = f"{document.title} - Test"

    test = create_test_in_db(
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

    response = {
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

    if is_partial:
        response["warning"] = f"{request.question_count} soru istendi ama {len(questions_data)} soru üretilebildi. Kısmi sonuç gösteriliyor."

    return response


@router.post("/generate-from-session")
async def generate_test_from_session(
    request: TestGenerateFromSessionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a test from a multi-document chat session.
    Uses all documents from the session to create a combined test.
    """
    user_uuid = uuid.UUID(current_user.get("sub"))

    check_and_use_query_limit(user_uuid, db)

    session_uuid = uuid.UUID(request.session_id)

    session = db.query(MultiDocumentSession).filter(
        MultiDocumentSession.id == session_uuid,
        MultiDocumentSession.user_id == user_uuid
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        content = extract_session_content(db, session_uuid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not content:
        raise HTTPException(status_code=400, detail="Session has no content for test generation")

    try:
        result = await generate_test_questions(content, request.question_count)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    questions_data = result["questions"]
    is_partial = result.get("partial", False)

    title = f"{session.title} - Test"

    test = create_test_in_db(
        db=db,
        user_id=user_uuid,
        document_id=None,
        title=title,
        questions_data=questions_data,
        question_count=request.question_count
    )

    db_questions = db.query(TestQuestion).filter(
        TestQuestion.test_id == test.id
    ).order_by(TestQuestion.order_num).all()

    response = {
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

    if is_partial:
        response["warning"] = f"{request.question_count} soru istendi ama {len(questions_data)} soru üretilebildi. Kısmi sonuç gösteriliyor."

    return response


@router.post("/generate-from-library")
async def generate_test_from_library(
    request: TestGenerateFromLibraryRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a test from multiple public documents selected in the community library.
    Users can select 2-10 documents and create a combined test from all of them.
    """
    user_uuid = uuid.UUID(current_user.get("sub"))

    check_and_use_query_limit(user_uuid, db)

    doc_uuids = [uuid.UUID(doc_id) for doc_id in request.document_ids]

    for doc_uuid in doc_uuids:
        doc = db.query(Document).filter(
            Document.id == doc_uuid,
            Document.visibility == "public",
            Document.is_approved == True,
            Document.status == "completed"
        ).first()
        if not doc:
            raise HTTPException(status_code=404, detail=f"Döküman bulunamadı veya erişim yetkiniz yok: {doc_uuid}")

    try:
        content = extract_public_documents_content(db, doc_uuids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not content:
        raise HTTPException(status_code=400, detail="Seçili dökümanlardan içerik çıkarılamadı")

    try:
        result = await generate_test_questions(content, request.question_count)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    questions_data = result["questions"]
    is_partial = result.get("partial", False)

    doc_titles = []
    for doc_uuid in doc_uuids:
        doc = db.query(Document).filter(Document.id == doc_uuid).first()
        if doc:
            doc_titles.append(doc.title)
    title = f"Kütüphane - {len(doc_uuids)} Döküman Testi"

    test = create_test_in_db(
        db=db,
        user_id=user_uuid,
        document_id=None,
        title=title,
        questions_data=questions_data,
        question_count=request.question_count
    )

    db_questions = db.query(TestQuestion).filter(
        TestQuestion.test_id == test.id
    ).order_by(TestQuestion.order_num).all()

    response = {
        "test_id": str(test.id),
        "title": test.title,
        "question_count": test.total_questions,
        "document_titles": doc_titles,
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

    if is_partial:
        response["warning"] = f"{request.question_count} soru istendi ama {len(questions_data)} soru üretilebildi. Kısmi sonuç gösteriliyor."

    return response


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
    return get_public_tests(db, limit, offset)


@router.get("/stats")
async def get_user_test_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive test statistics for the current user."""
    try:
        user_uuid = uuid.UUID(current_user.get("sub"))
        return get_test_stats(db, user_uuid)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Stats Error: {str(e)}")


@router.get("/{test_id}")
async def get_test(
    test_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get test details with questions (without correct answers for taking)."""
    if test_id == "stats":
        return await get_user_test_stats(current_user, db)
        
    user_uuid = uuid.UUID(current_user.get("sub"))
    test_uuid = uuid.UUID(test_id)

    try:
        return get_test_with_questions(db, test_uuid, user_uuid, include_answers=True if _test_completed(db, test_uuid) else False)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


def _test_completed(db: Session, test_id: uuid.UUID) -> bool:
    test = db.query(Test).filter(Test.id == test_id).first()
    return test.completed if test else False


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
        return submit_test_answers(db, test_uuid, user_uuid, request.answers)
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
        delete_test_from_db(db, test_uuid, user_uuid)
        return {"message": "Test deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


class TestExplainRequest(BaseModel):
    question_id: str = Field(..., min_length=1)
    user_answer: str | None = Field(default=None)




@router.get("/{test_id}/attempts")
async def list_test_attempts(
    test_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all attempt history for a specific test."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    test_uuid = uuid.UUID(test_id)

    try:
        return get_test_attempts(db, test_uuid, user_uuid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{test_id}/explain")
async def explain_question(
    test_id: str,
    request: TestExplainRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-powered detailed explanation for a question."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    test_uuid = uuid.UUID(test_id)

    test = db.query(Test).filter(Test.id == test_uuid).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    if test.user_id != user_uuid and not test.is_public:
        raise HTTPException(status_code=403, detail="Access denied")

    question_uuid = uuid.UUID(request.question_id)
    question = db.query(TestQuestion).filter(
        TestQuestion.id == question_uuid,
        TestQuestion.test_id == test_uuid
    ).first()

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Try to get document content if available
    document_content = None
    if test.document_id:
        document_content = extract_document_content(db, test.document_id)

    try:
        explanation = await explain_question_with_ai(
            question_text=question.question_text,
            options=question.options,
            correct_answer=question.correct_answer,
            user_answer=request.user_answer,
            explanation=question.explanation,
            document_content=document_content
        )
        return {"explanation": explanation}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))