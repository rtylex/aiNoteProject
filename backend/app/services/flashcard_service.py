"""
Flashcard Service - Business logic for flashcard generation, study and spaced repetition.

This service handles:
- AI-powered flashcard generation from PDF document content
- Spaced Repetition (SM-2 algorithm)
- Flashcard set and progress management
"""
import uuid
import json
import re
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.flashcard import FlashcardSet, Flashcard, FlashcardProgress, FlashcardStatus
from app.models.document import Document, DocumentEmbedding
from app.services.deepseek_service import deepseek_service
from app.services.gemini_service import gemini_service


FLASHCARD_SYSTEM_PROMPT = """Sen akademik flashcard hazırlama uzmanısın. Aşağıdaki ders içeriğinden çalışma kartı hazırlıyorsun.

KURALLAR:
- Türkçe kartlar hazırla
- Her kartın önü: Kısa ve net bir soru veya terim
- Her kartın arkası: Açık ve anlaşılır cevap veya tanım
- extra_notes: Cevabı destekleyen kısa bir ipucu, formül veya ek açıklama (2-3 cümle)
- Kartlar birbirinden bağımsız olmalı
- Zorluk seviyesi: orta
- Kavramsal sorular ve tanımlar dengeli olmalı

JSON formatında dön:
{
  "cards": [
    {
      "front": "Soru/terim buraya",
      "back": "Cevap/tanım buraya",
      "extra_notes": "Ek ipucu/formül/açıklama buraya"
    }
  ]
}"""


def extract_document_content(db: Session, document_id: uuid.UUID) -> str:
    """Extract full text content from document embeddings for flashcard generation."""
    embeddings = db.query(DocumentEmbedding).filter(
        DocumentEmbedding.document_id == document_id
    ).order_by(DocumentEmbedding.page_number).all()

    if not embeddings:
        return ""

    content_parts = []
    for emb in embeddings:
        if emb.content:
            content_parts.append(emb.content)

    return "\n\n".join(content_parts)


def extract_session_content(db: Session, session_id: uuid.UUID) -> str:
    """Extract combined content from all documents in a multi-document session."""
    from app.models.chat import MultiDocumentSession, multi_session_documents

    session = db.query(MultiDocumentSession).filter(MultiDocumentSession.id == session_id).first()
    if not session:
        raise ValueError("Session not found")

    session_doc_ids = db.query(multi_session_documents.c.document_id).filter(
        multi_session_documents.c.session_id == session_id
    ).all()

    if not session_doc_ids:
        raise ValueError("Session has no documents")

    doc_ids = [row[0] for row in session_doc_ids]

    contents = []
    for doc_id in doc_ids:
        doc_embeddings = db.query(DocumentEmbedding).filter(
            DocumentEmbedding.document_id == doc_id
        ).order_by(DocumentEmbedding.page_number).all()

        for emb in doc_embeddings:
            if emb.content:
                contents.append(emb.content)

    return "\n\n---\n\n".join(contents) if contents else ""


def extract_public_documents_content(db: Session, document_ids: list[uuid.UUID]) -> str:
    """Extract combined content from multiple public documents (for library multi-select)."""
    from app.models.document import Document

    contents = []

    for doc_id in document_ids:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            continue

        doc_embeddings = db.query(DocumentEmbedding).filter(
            DocumentEmbedding.document_id == doc_id
        ).order_by(DocumentEmbedding.page_number).all()

        content_parts = []
        for emb in doc_embeddings:
            if emb.content:
                content_parts.append(emb.content)

        if content_parts:
            contents.append(f"--- {doc.title} ---\n\n" + "\n\n".join(content_parts))

    return "\n\n---\n\n".join(contents) if contents else ""


def suggest_card_count(document_content: str) -> int:
    """Suggest card count based on document length. Min: 5, Max: 50."""
    char_count = len(document_content)

    if char_count < 2000:
        return 5
    elif char_count < 5000:
        return 10
    elif char_count < 10000:
        return 20
    elif char_count < 20000:
        return 30
    else:
        return 40


def _calculate_max_tokens(card_count: int) -> int:
    """Calculate max tokens based on card count. Each card needs ~200-250 tokens."""
    base_tokens = 512
    per_card_tokens = 250
    calculated = base_tokens + (card_count * per_card_tokens)
    return min(max(calculated, 2048), 8192)


def _extract_partial_cards(text: str) -> list[dict]:
    """Extract complete cards from partial/malformed JSON response."""
    cards = []
    
    pattern = r'\{[^{}]*"front"\s*:\s*"[^"]*"[^{}]*"back"\s*:\s*"[^"]*"[^{}]*\}'
    matches = re.findall(pattern, text, re.DOTALL)
    
    for match in matches:
        try:
            obj = json.loads(match)
            if "front" in obj and "back" in obj:
                cards.append(obj)
        except json.JSONDecodeError:
            continue
    
    if not cards:
        try:
            cards_block = re.search(r'"cards"\s*:\s*\[(.*)', text, re.DOTALL)
            if cards_block:
                partial_json = '{"cards": [' + cards_block.group(1)
                
                while partial_json and not partial_json.rstrip().endswith(']}'):
                    partial_json = partial_json.rstrip()[:-1]
                
                if partial_json.rstrip().endswith(']}'):
                    parsed = json.loads(partial_json)
                    if "cards" in parsed and isinstance(parsed["cards"], list):
                        cards = [c for c in parsed["cards"] if isinstance(c, dict) and "front" in c and "back" in c]
        except (json.JSONDecodeError, Exception):
            pass
    
    return cards


async def _generate_flashcard_batch(
    document_content: str,
    card_count: int,
    model: str,
    batch_index: int,
    total_batches: int
) -> dict:
    """Generate a single batch of flashcards."""
    max_tokens = _calculate_max_tokens(card_count)

    batch_hint = ""
    if total_batches > 1:
        batch_hint = f" Bu {batch_index + 1}. batch (toplam {total_batches} batch). Lütfen farklı konulardan kart üret."

    user_prompt = f"""Aşağıdaki ders içeriğinden {card_count} adet çalışma kartı hazırla:{batch_hint}

DERS İÇERİĞİ:
{document_content[:15000]}"""

    result = None

    try:
        import asyncio
        loop = asyncio.get_event_loop()

        if model == "gemma" or model == "gemini":
            result = await gemini_service.generate_structured_content(
                system_prompt=FLASHCARD_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                max_tokens=max_tokens
            )
        else:
            if not deepseek_service.enabled:
                raise ValueError("DeepSeek service is not enabled")

            def _generate():
                response = deepseek_service.client.chat.completions.create(
                    model=deepseek_service.model,
                    messages=[
                        {"role": "system", "content": FLASHCARD_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content

            result = await asyncio.wait_for(
                loop.run_in_executor(None, _generate),
                timeout=180.0
            )

        if not result:
            raise ValueError("Empty response from AI")

        cleaned = result.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[len("```json"):].strip()
        if cleaned.startswith("```"):
            cleaned = cleaned[len("```"):].strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            partial_cards = _extract_partial_cards(cleaned)
            if partial_cards and len(partial_cards) >= 3:
                return {
                    "cards": partial_cards,
                    "partial": True,
                    "requested_count": card_count,
                    "generated_count": len(partial_cards)
                }
            raise ValueError(f"Invalid JSON from AI and could not extract partial cards")

        if "cards" not in parsed or not isinstance(parsed["cards"], list):
            raise ValueError(f"Invalid AI response format: {result[:200]}")

        return {
            "cards": parsed["cards"],
            "partial": False,
            "requested_count": card_count,
            "generated_count": len(parsed["cards"])
        }

    except asyncio.TimeoutError:
        raise ValueError("AI timeout - flashcard generation took too long")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Flashcard generation failed: {str(e)}")


async def generate_flashcards(
    document_content: str,
    card_count: int,
    model: str = "deepseek"
) -> dict:
    """
    Generate flashcards using AI.
    For 15+ cards, splits into 2 parallel batches for speed.

    Args:
        document_content: Full text content from document
        card_count: Number of cards to generate
        model: "deepseek" or "gemma" (default: deepseek)

    Returns:
        Dict with 'cards' list and optional 'partial' flag
    """
    # Single batch for small requests
    if card_count <= 15:
        return await _generate_flashcard_batch(document_content, card_count, model, 0, 1)

    # Split into 2 parallel batches for speed
    batch_size_1 = card_count // 2
    batch_size_2 = card_count - batch_size_1

    import asyncio

    results = await asyncio.gather(
        _generate_flashcard_batch(document_content, batch_size_1, model, 0, 2),
        _generate_flashcard_batch(document_content, batch_size_2, model, 1, 2),
        return_exceptions=True
    )

    all_cards = []
    is_partial = False
    total_generated = 0

    for result in results:
        if isinstance(result, Exception):
            raise ValueError(f"Batch failed: {str(result)}")
        all_cards.extend(result["cards"])
        if result.get("partial"):
            is_partial = True
        total_generated += result.get("generated_count", len(result["cards"]))

    return {
        "cards": all_cards,
        "partial": is_partial,
        "requested_count": card_count,
        "generated_count": total_generated
    }


def calculate_sm2(quality: int, progress: FlashcardProgress):
    """
    SM-2 Spaced Repetition algorithm.
    quality: 0-5 (0=hiç bilinmiyor, 5=mükemmel)
    """
    if quality >= 3:
        if progress.repetitions == 0:
            progress.interval = 1
        elif progress.repetitions == 1:
            progress.interval = 6
        else:
            progress.interval = round(progress.interval * progress.ease_factor)
        progress.repetitions += 1
    else:
        progress.repetitions = 0
        progress.interval = 1

    progress.ease_factor = max(1.3,
        progress.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    progress.next_review = datetime.utcnow() + timedelta(days=progress.interval)
    progress.last_reviewed = datetime.utcnow()

    if progress.repetitions >= 5 and progress.interval >= 21:
        progress.status = FlashcardStatus.MASTERED.value
    elif progress.repetitions >= 2:
        progress.status = FlashcardStatus.REVIEW.value
    else:
        progress.status = FlashcardStatus.LEARNING.value


def create_flashcard_set(
    db: Session,
    user_id: uuid.UUID,
    document_id: uuid.UUID | None,
    session_id: uuid.UUID | None,
    title: str,
    description: str | None,
    cards_data: list[dict]
) -> FlashcardSet:
    """Create a flashcard set with cards in the database."""
    original_expire = db.expire_on_commit
    db.expire_on_commit = False
    try:
        flashcard_set = FlashcardSet(
            id=uuid.uuid4(),
            user_id=user_id,
            document_id=document_id,
            session_id=session_id,
            title=title,
            description=description,
            card_count=len(cards_data),
            is_public=False
        )
        db.add(flashcard_set)
        db.flush()

        for idx, card_data in enumerate(cards_data):
            card = Flashcard(
                id=uuid.uuid4(),
                set_id=flashcard_set.id,
                front=card_data["front"],
                back=card_data["back"],
                extra_notes=card_data.get("extra_notes"),
                order_num=idx + 1
            )
            db.add(card)

            # Create initial progress for the user
            progress = FlashcardProgress(
                id=uuid.uuid4(),
                user_id=user_id,
                flashcard_id=card.id,
                ease_factor=2.5,
                interval=0,
                repetitions=0,
                status=FlashcardStatus.NEW.value
            )
            db.add(progress)

        db.commit()
        db.refresh(flashcard_set)
        return flashcard_set
    finally:
        db.expire_on_commit = original_expire


def list_user_sets(
    db: Session,
    user_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0
) -> list[dict]:
    """List all flashcard sets for a user with progress summary."""
    sets = db.query(FlashcardSet).filter(
        FlashcardSet.user_id == user_id
    ).order_by(FlashcardSet.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for s in sets:
        # Get progress summary
        progress_counts = {
            "new": 0,
            "learning": 0,
            "review": 0,
            "mastered": 0
        }

        for card in s.cards:
            prog = db.query(FlashcardProgress).filter(
                FlashcardProgress.flashcard_id == card.id,
                FlashcardProgress.user_id == user_id
            ).first()
            if prog:
                progress_counts[prog.status] = progress_counts.get(prog.status, 0) + 1

        total = len(s.cards)
        mastered = progress_counts.get("mastered", 0)
        completion_pct = round((mastered / total) * 100) if total > 0 else 0

        result.append({
            "id": str(s.id),
            "title": s.title,
            "description": s.description,
            "card_count": s.card_count,
            "is_public": s.is_public,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "progress": progress_counts,
            "completion_percentage": completion_pct
        })

    return result


def get_set_with_cards(
    db: Session,
    set_id: uuid.UUID,
    user_id: uuid.UUID
) -> dict:
    """Get flashcard set details with cards and user progress."""
    flashcard_set = db.query(FlashcardSet).filter(FlashcardSet.id == set_id).first()

    if not flashcard_set:
        raise ValueError("Flashcard set not found")

    if flashcard_set.user_id != user_id and not flashcard_set.is_public:
        from app.models.user import UserProfile, UserRole
        user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        if not user or user.role != UserRole.ADMIN:
            raise ValueError("Access denied")

    cards = []
    progress_counts = {
        "new": 0,
        "learning": 0,
        "review": 0,
        "mastered": 0
    }

    for card in flashcard_set.cards:
        prog = db.query(FlashcardProgress).filter(
            FlashcardProgress.flashcard_id == card.id,
            FlashcardProgress.user_id == user_id
        ).first()

        if prog:
            progress_counts[prog.status] = progress_counts.get(prog.status, 0) + 1

        cards.append({
            "id": str(card.id),
            "front": card.front,
            "back": card.back,
            "extra_notes": card.extra_notes,
            "order": card.order_num,
            "status": prog.status if prog else "new",
            "next_review": prog.next_review.isoformat() if prog and prog.next_review else None,
            "last_reviewed": prog.last_reviewed.isoformat() if prog and prog.last_reviewed else None,
        })

    total = len(cards)
    mastered = progress_counts.get("mastered", 0)
    completion_pct = round((mastered / total) * 100) if total > 0 else 0

    return {
        "id": str(flashcard_set.id),
        "title": flashcard_set.title,
        "description": flashcard_set.description,
        "card_count": flashcard_set.card_count,
        "is_public": flashcard_set.is_public,
        "created_at": flashcard_set.created_at.isoformat() if flashcard_set.created_at else None,
        "updated_at": flashcard_set.updated_at.isoformat() if flashcard_set.updated_at else None,
        "progress": progress_counts,
        "completion_percentage": completion_pct,
        "cards": cards
    }


def get_study_cards(
    db: Session,
    set_id: uuid.UUID,
    user_id: uuid.UUID
) -> list[dict]:
    """Get cards due for review or new cards for studying."""
    flashcard_set = db.query(FlashcardSet).filter(FlashcardSet.id == set_id).first()
    if not flashcard_set:
        raise ValueError("Flashcard set not found")

    if flashcard_set.user_id != user_id and not flashcard_set.is_public:
        raise ValueError("Access denied")

    now = datetime.utcnow()

    cards = []
    for card in flashcard_set.cards:
        prog = db.query(FlashcardProgress).filter(
            FlashcardProgress.flashcard_id == card.id,
            FlashcardProgress.user_id == user_id
        ).first()

        is_due = not prog or not prog.next_review or prog.next_review <= now or prog.status in [FlashcardStatus.NEW.value, FlashcardStatus.LEARNING.value]

        if is_due:
            cards.append({
                "id": str(card.id),
                "front": card.front,
                "back": card.back,
                "extra_notes": card.extra_notes,
                "order": card.order_num,
                "status": prog.status if prog else FlashcardStatus.NEW.value,
                "interval": prog.interval if prog else 0,
                "repetitions": prog.repetitions if prog else 0,
            })

    return cards


def review_card(
    db: Session,
    card_id: uuid.UUID,
    user_id: uuid.UUID,
    quality: int
) -> dict:
    """Record a review for a flashcard and update SM-2 progress."""
    if quality < 0 or quality > 5:
        raise ValueError("Quality must be between 0 and 5")

    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if not card:
        raise ValueError("Card not found")

    flashcard_set = db.query(FlashcardSet).filter(FlashcardSet.id == card.set_id).first()
    if not flashcard_set or (flashcard_set.user_id != user_id and not flashcard_set.is_public):
        raise ValueError("Access denied")

    progress = db.query(FlashcardProgress).filter(
        FlashcardProgress.flashcard_id == card_id,
        FlashcardProgress.user_id == user_id
    ).first()

    if not progress:
        progress = FlashcardProgress(
            id=uuid.uuid4(),
            user_id=user_id,
            flashcard_id=card_id,
            ease_factor=2.5,
            interval=0,
            repetitions=0,
            status=FlashcardStatus.NEW.value
        )
        db.add(progress)
        db.flush()

    calculate_sm2(quality, progress)
    db.commit()
    db.refresh(progress)

    return {
        "card_id": str(card_id),
        "next_review": progress.next_review.isoformat() if progress.next_review else None,
        "interval": progress.interval,
        "status": progress.status,
        "ease_factor": progress.ease_factor,
        "repetitions": progress.repetitions
    }


def add_card_to_set(
    db: Session,
    set_id: uuid.UUID,
    user_id: uuid.UUID,
    front: str,
    back: str,
    extra_notes: str | None = None
) -> Flashcard:
    """Add a new card to an existing set."""
    flashcard_set = db.query(FlashcardSet).filter(FlashcardSet.id == set_id).first()
    if not flashcard_set:
        raise ValueError("Flashcard set not found")

    if flashcard_set.user_id != user_id:
        raise ValueError("Access denied")

    max_order = db.query(Flashcard).filter(Flashcard.set_id == set_id).count()

    card = Flashcard(
        id=uuid.uuid4(),
        set_id=set_id,
        front=front,
        back=back,
        extra_notes=extra_notes,
        order_num=max_order + 1
    )
    db.add(card)

    # Create initial progress
    progress = FlashcardProgress(
        id=uuid.uuid4(),
        user_id=user_id,
        flashcard_id=card.id,
        ease_factor=2.5,
        interval=0,
        repetitions=0,
        status=FlashcardStatus.NEW.value
    )
    db.add(progress)

    flashcard_set.card_count += 1
    db.commit()
    db.refresh(card)
    return card


def update_card(
    db: Session,
    card_id: uuid.UUID,
    user_id: uuid.UUID,
    front: str | None,
    back: str | None,
    extra_notes: str | None = None
) -> Flashcard:
    """Update a flashcard's front or back."""
    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if not card:
        raise ValueError("Card not found")

    flashcard_set = db.query(FlashcardSet).filter(FlashcardSet.id == card.set_id).first()
    if not flashcard_set or flashcard_set.user_id != user_id:
        raise ValueError("Access denied")

    if front is not None:
        card.front = front
    if back is not None:
        card.back = back
    if extra_notes is not None:
        card.extra_notes = extra_notes

    db.commit()
    db.refresh(card)
    return card


def delete_card(
    db: Session,
    card_id: uuid.UUID,
    user_id: uuid.UUID
) -> bool:
    """Delete a flashcard."""
    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if not card:
        raise ValueError("Card not found")

    flashcard_set = db.query(FlashcardSet).filter(FlashcardSet.id == card.set_id).first()
    if not flashcard_set or flashcard_set.user_id != user_id:
        raise ValueError("Access denied")

    db.delete(card)
    flashcard_set.card_count -= 1
    db.commit()
    return True


def delete_set(
    db: Session,
    set_id: uuid.UUID,
    user_id: uuid.UUID
) -> bool:
    """Delete a flashcard set and all its cards."""
    flashcard_set = db.query(FlashcardSet).filter(FlashcardSet.id == set_id).first()
    if not flashcard_set:
        raise ValueError("Flashcard set not found")

    if flashcard_set.user_id != user_id:
        raise ValueError("Access denied")

    db.delete(flashcard_set)
    db.commit()
    return True


def toggle_set_public(
    db: Session,
    set_id: uuid.UUID,
    user_id: uuid.UUID,
    make_public: bool
) -> dict:
    """Toggle flashcard set public/private status."""
    flashcard_set = db.query(FlashcardSet).filter(FlashcardSet.id == set_id).first()
    if not flashcard_set:
        raise ValueError("Flashcard set not found")

    if flashcard_set.user_id != user_id:
        raise ValueError("Access denied")

    flashcard_set.is_public = make_public
    db.commit()
    db.refresh(flashcard_set)

    return {
        "id": str(flashcard_set.id),
        "is_public": flashcard_set.is_public
    }


def list_public_sets(
    db: Session,
    limit: int = 50,
    offset: int = 0
) -> list[dict]:
    """List all public flashcard sets."""
    sets = db.query(FlashcardSet).filter(
        FlashcardSet.is_public == True
    ).order_by(FlashcardSet.created_at.desc()).offset(offset).limit(limit).all()

    return [
        {
            "id": str(s.id),
            "title": s.title,
            "description": s.description,
            "card_count": s.card_count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sets
    ]


def get_user_stats(db: Session, user_id: uuid.UUID) -> dict:
    """Get flashcard study statistics for a user."""
    total_sets = db.query(FlashcardSet).filter(FlashcardSet.user_id == user_id).count()
    total_cards = db.query(Flashcard).join(FlashcardSet).filter(FlashcardSet.user_id == user_id).count()

    progress_stats = db.query(FlashcardProgress).join(Flashcard).join(FlashcardSet).filter(
        FlashcardSet.user_id == user_id
    ).all()

    status_counts = {"new": 0, "learning": 0, "review": 0, "mastered": 0}
    for prog in progress_stats:
        status_counts[prog.status] = status_counts.get(prog.status, 0) + 1

    mastered = status_counts.get("mastered", 0)
    completion_pct = round((mastered / total_cards) * 100) if total_cards > 0 else 0

    return {
        "total_sets": total_sets,
        "total_cards": total_cards,
        "status_counts": status_counts,
        "completion_percentage": completion_pct
    }


def get_difficult_cards(db: Session, user_id: uuid.UUID, limit: int = 50) -> list[dict]:
    """Get cards where user last rated 1-2 (difficult cards for review)."""
    from sqlalchemy import func

    # Find cards where the most recent review had quality <= 2
    # We look at cards with progress status 'learning' and low ease_factor
    difficult_progs = db.query(FlashcardProgress).join(Flashcard).join(FlashcardSet).filter(
        FlashcardSet.user_id == user_id,
        FlashcardProgress.ease_factor <= 2.0,
        FlashcardProgress.repetitions <= 2
    ).order_by(FlashcardProgress.last_reviewed.desc()).limit(limit).all()

    result = []
    for prog in difficult_progs:
        card = prog.flashcard
        set_title = card.flashcard_set.title if card.flashcard_set else ""
        result.append({
            "id": str(card.id),
            "front": card.front,
            "back": card.back,
            "extra_notes": card.extra_notes,
            "set_id": str(card.set_id),
            "set_title": set_title,
            "ease_factor": prog.ease_factor,
            "last_reviewed": prog.last_reviewed.isoformat() if prog.last_reviewed else None,
        })

    return result
