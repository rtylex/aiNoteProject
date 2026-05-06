"""
Flashcard management endpoints.

Handles flashcard creation from PDF documents and multi-document sessions,
study mode with spaced repetition, and CRUD operations.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.services.auth import get_current_user
from app.db.session import get_db
from app.models.document import Document
from app.models.chat import MultiDocumentSession
from app.models.flashcard import FlashcardSet
from app.services.flashcard_service import (
    extract_document_content,
    extract_session_content,
    generate_flashcards,
    create_flashcard_set,
    list_user_sets,
    get_set_with_cards,
    get_study_cards,
    review_card,
    add_card_to_set,
    update_card,
    delete_card,
    delete_set,
    toggle_set_public,
    list_public_sets,
    get_user_stats,
    get_difficult_cards,
)
from app.services.query_limit import check_and_consume_query


router = APIRouter()


class FlashcardGenerateRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    card_count: int = Field(default=20, ge=5, le=50)


class FlashcardGenerateFromSessionRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    card_count: int = Field(default=25, ge=5, le=50)


class FlashcardCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    cards: list[dict] = Field(default_factory=list)


class FlashcardAddCardRequest(BaseModel):
    front: str = Field(..., min_length=1, max_length=2000)
    back: str = Field(..., min_length=1, max_length=5000)
    extra_notes: str | None = Field(default=None, max_length=5000)


class FlashcardUpdateCardRequest(BaseModel):
    front: str | None = Field(default=None, max_length=2000)
    back: str | None = Field(default=None, max_length=5000)
    extra_notes: str | None = Field(default=None, max_length=5000)


class FlashcardReviewRequest(BaseModel):
    quality: int = Field(..., ge=0, le=5)


class FlashcardShareRequest(BaseModel):
    is_public: bool


def check_and_use_query_limit(user_id: uuid.UUID, db: Session) -> bool:
    """Check if user has remaining query quota and consume one for flashcard generation."""
    can_use, message = check_and_consume_query(user_id, db)
    if not can_use:
        raise HTTPException(status_code=429, detail=message)
    return True


@router.post("/generate")
async def generate_flashcards_from_document(
    request: FlashcardGenerateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate flashcards from a PDF document."""
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
        raise HTTPException(status_code=400, detail="Document has no content for flashcard generation")

    try:
        result = await generate_flashcards(content, request.card_count)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    cards_data = result["cards"]
    is_partial = result.get("partial", False)

    title = f"{document.title} - Flashcard"

    flashcard_set = create_flashcard_set(
        db=db,
        user_id=user_uuid,
        document_id=doc_uuid,
        session_id=None,
        title=title,
        description=None,
        cards_data=cards_data
    )

    response = {
        "set_id": str(flashcard_set.id),
        "title": flashcard_set.title,
        "card_count": flashcard_set.card_count,
        "cards": [
            {
                "id": str(card.id),
                "front": card.front,
                "back": card.back,
                "order": card.order_num
            }
            for card in flashcard_set.cards
        ]
    }

    if is_partial:
        response["warning"] = f"{request.card_count} kart istendi ama {len(cards_data)} kart üretilebildi. Kısmi sonuç gösteriliyor."

    return response


@router.post("/generate-from-session")
async def generate_flashcards_from_session(
    request: FlashcardGenerateFromSessionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate flashcards from a multi-document chat session."""
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
        raise HTTPException(status_code=400, detail="Session has no content for flashcard generation")

    try:
        result = await generate_flashcards(content, request.card_count)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    cards_data = result["cards"]
    is_partial = result.get("partial", False)

    title = f"{session.title} - Flashcard"

    flashcard_set = create_flashcard_set(
        db=db,
        user_id=user_uuid,
        document_id=None,
        session_id=session_uuid,
        title=title,
        description=None,
        cards_data=cards_data
    )

    response = {
        "set_id": str(flashcard_set.id),
        "title": flashcard_set.title,
        "card_count": flashcard_set.card_count,
        "cards": [
            {
                "id": str(card.id),
                "front": card.front,
                "back": card.back,
                "order": card.order_num
            }
            for card in flashcard_set.cards
        ]
    }

    if is_partial:
        response["warning"] = f"{request.card_count} kart istendi ama {len(cards_data)} kart üretilebildi. Kısmi sonuç gösteriliyor."

    return response


@router.post("/")
async def create_manual_set(
    request: FlashcardCreateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a manual flashcard set."""
    user_uuid = uuid.UUID(current_user.get("sub"))

    if not request.cards:
        raise HTTPException(status_code=400, detail="At least one card is required")

    flashcard_set = create_flashcard_set(
        db=db,
        user_id=user_uuid,
        document_id=None,
        session_id=None,
        title=request.title,
        description=request.description,
        cards_data=request.cards
    )

    return {
        "set_id": str(flashcard_set.id),
        "title": flashcard_set.title,
        "card_count": flashcard_set.card_count,
        "cards": [
            {
                "id": str(card.id),
                "front": card.front,
                "back": card.back,
                "order": card.order_num
            }
            for card in flashcard_set.cards
        ]
    }


@router.get("/")
async def list_my_sets(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all flashcard sets created by the current user."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    return list_user_sets(db, user_uuid, limit, offset)


@router.get("/public")
async def list_public_flashcard_sets(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List all public flashcard sets for community."""
    return list_public_sets(db, limit, offset)


@router.get("/{set_id}")
async def get_set(
    set_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get flashcard set details with cards and progress."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    set_uuid = uuid.UUID(set_id)

    try:
        return get_set_with_cards(db, set_uuid, user_uuid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{set_id}/cards")
async def add_card(
    set_id: str,
    request: FlashcardAddCardRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a card to an existing set."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    set_uuid = uuid.UUID(set_id)

    try:
        card = add_card_to_set(db, set_uuid, user_uuid, request.front, request.back, request.extra_notes)
        return {
            "id": str(card.id),
            "front": card.front,
            "back": card.back,
            "extra_notes": card.extra_notes,
            "order": card.order_num
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/card/{card_id}")
async def update_card_endpoint(
    card_id: str,
    request: FlashcardUpdateCardRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a flashcard."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    card_uuid = uuid.UUID(card_id)

    try:
        card = update_card(db, card_uuid, user_uuid, request.front, request.back, request.extra_notes)
        return {
            "id": str(card.id),
            "front": card.front,
            "back": card.back,
            "extra_notes": card.extra_notes,
            "order": card.order_num
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/card/{card_id}")
async def delete_card_endpoint(
    card_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a flashcard."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    card_uuid = uuid.UUID(card_id)

    try:
        delete_card(db, card_uuid, user_uuid)
        return {"message": "Card deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{set_id}")
async def delete_set_endpoint(
    set_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a flashcard set."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    set_uuid = uuid.UUID(set_id)

    try:
        delete_set(db, set_uuid, user_uuid)
        return {"message": "Flashcard set deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{set_id}/share")
async def toggle_share(
    set_id: str,
    request: FlashcardShareRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle flashcard set visibility (public/private)."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    set_uuid = uuid.UUID(set_id)

    try:
        return toggle_set_public(db, set_uuid, user_uuid, request.is_public)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/card/{card_id}/review")
async def review_card_endpoint(
    card_id: str,
    request: FlashcardReviewRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a flashcard review with SM-2 spaced repetition."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    card_uuid = uuid.UUID(card_id)

    try:
        return review_card(db, card_uuid, user_uuid, request.quality)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{set_id}/study")
async def get_study_set(
    set_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cards due for review in a set for studying."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    set_uuid = uuid.UUID(set_id)

    try:
        return get_study_cards(db, set_uuid, user_uuid)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/stats")
async def get_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's flashcard study statistics."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    return get_user_stats(db, user_uuid)


@router.get("/reviews/difficult")
async def list_difficult_cards(
    limit: int = Query(50, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cards that the user found difficult (rated 1-2 or low ease factor)."""
    user_uuid = uuid.UUID(current_user.get("sub"))
    return get_difficult_cards(db, user_uuid, limit)
