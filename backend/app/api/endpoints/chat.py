from fastapi import APIRouter, Depends, HTTPException, status
import uuid
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from app.services.auth import get_current_user
from app.db.session import get_db
from app.models.chat import ChatSession, ChatMessage, MultiDocumentSession, MultiSessionMessage, multi_session_documents
from app.models.document import Document, DocumentEmbedding
from app.models.user import UserProfile, UserRole
from app.services.gemini_service import gemini_service
from app.services.ai_service import ai_service, ModelUnavailableError
from app.services.query_limit import check_query_limit, increment_query_count, get_query_status

router = APIRouter()


class ChatRequest(BaseModel):
    document_id: str
    message: str
    session_id: str | None = None
    model: Literal["gemini", "deepseek"] = "deepseek"  # Default: DeepSeek (economic)


class MultiDocumentChatRequest(BaseModel):
    """Request for chatting with multiple documents at once."""
    document_ids: list[str]
    message: str
    session_id: str | None = None
    model: Literal["gemini", "deepseek"] = "deepseek"  # Default: DeepSeek (economic)


# Multi-Document Session Schemas
class CreateMultiSessionRequest(BaseModel):
    """Create a new multi-document session."""
    title: str = Field(..., min_length=1, max_length=255)
    document_ids: list[str] = Field(..., min_items=2, max_items=10)


class UpdateMultiSessionRequest(BaseModel):
    """Update session title."""
    title: str = Field(..., min_length=1, max_length=255)


class MultiSessionMessageRequest(BaseModel):
    """Send a message in a multi-document session."""
    message: str = Field(..., min_length=1)
    model: Literal["gemini", "deepseek"] = "deepseek"  # Default: DeepSeek (economic)


def _parse_uuid(value: str | None, field_name: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}")


# =============================================================================
# Hybrid Context Strategy - Smart Context Selection
# =============================================================================
# Token thresholds for switching between Full Document and RAG modes
# Full mode: entire document in context (better for DeepSeek cache)
# RAG mode: semantic search for relevant chunks (for large documents)
TOKEN_THRESHOLDS = {
    "deepseek": 25000,   # ~100 pages - DeepSeek V3 has 64K context
    "gemini": 100000     # ~400 pages - Gemini has 1M context
}


async def get_document_token_count(doc_id: uuid.UUID, db: Session) -> int:
    """
    Estimate total token count for a document.
    Uses character count / 4 as approximation (~4 chars per token).
    """
    total_chars = db.query(func.sum(func.length(DocumentEmbedding.content))).filter(
        DocumentEmbedding.document_id == doc_id
    ).scalar() or 0
    return total_chars // 4


async def get_smart_context(
    doc_id: uuid.UUID,
    question: str,
    db: Session,
    model: str = "deepseek"
) -> tuple[str, str]:
    """
    Smart context selection based on document size.
    
    Returns:
        tuple[str, str]: (context, mode) where mode is "full" or "rag"
    """
    # Check token count (lightweight query)
    estimated_tokens = await get_document_token_count(doc_id, db)
    threshold = TOKEN_THRESHOLDS.get(model, 25000)

    if estimated_tokens < threshold:
        # FULL DOCUMENT MODE - Get all chunks ordered by page_number
        all_chunks = db.query(DocumentEmbedding).filter(
            DocumentEmbedding.document_id == doc_id
        ).order_by(DocumentEmbedding.page_number).all()

        if not all_chunks:
            return "", "empty"

        full_content = "\n\n".join([c.content for c in all_chunks if c.content])
        print(f"[Chat] FULL mode: {estimated_tokens} tokens, threshold: {threshold}")
        return full_content, "full"

    else:
        # RAG MODE - Semantic search for most relevant chunks
        query_embedding = await gemini_service.generate_query_embedding(question)

        if query_embedding and any(query_embedding):
            relevant_chunks = db.query(DocumentEmbedding).filter(
                DocumentEmbedding.document_id == doc_id
            ).order_by(
                DocumentEmbedding.embedding.cosine_distance(query_embedding)
            ).limit(5).all()

            context = "\n\n".join([c.content for c in relevant_chunks if c.content])
        else:
            # Fallback: first 5 chunks by page order
            fallback_chunks = db.query(DocumentEmbedding).filter(
                DocumentEmbedding.document_id == doc_id
            ).order_by(DocumentEmbedding.page_number).limit(5).all()
            context = "\n\n".join([c.content for c in fallback_chunks if c.content])

        print(f"[Chat] RAG mode: {estimated_tokens} tokens, threshold: {threshold}")
        return context, "rag"


async def get_smart_context_multi(
    doc_ids: list[uuid.UUID],
    question: str,
    db: Session,
    model: str = "deepseek"
) -> tuple[dict[uuid.UUID, str], str]:
    """
    Smart context selection for multiple documents.
    
    Returns:
        tuple[dict, str]: (doc_contexts dict, mode)
    """
    # Calculate total token count across all documents
    total_tokens = 0
    doc_char_counts = {}

    for doc_id in doc_ids:
        chars = db.query(func.sum(func.length(DocumentEmbedding.content))).filter(
            DocumentEmbedding.document_id == doc_id
        ).scalar() or 0
        doc_char_counts[doc_id] = chars
        total_tokens += chars // 4

    # Multi-doc threshold: 1.5x single doc threshold
    threshold = int(TOKEN_THRESHOLDS.get(model, 25000) * 1.5)

    if total_tokens < threshold:
        # FULL MODE - Get entire content from all documents
        doc_contexts = {}
        for doc_id in doc_ids:
            chunks = db.query(DocumentEmbedding).filter(
                DocumentEmbedding.document_id == doc_id
            ).order_by(DocumentEmbedding.page_number).all()

            doc_contexts[doc_id] = "\n\n".join([c.content for c in chunks if c.content])

        print(f"[MultiChat] FULL mode: {total_tokens} tokens, threshold: {threshold}")
        return doc_contexts, "full"

    else:
        # RAG MODE - Get top 3 relevant chunks from each document
        query_embedding = await gemini_service.generate_query_embedding(question)
        doc_contexts = {}

        for doc_id in doc_ids:
            if query_embedding and any(query_embedding):
                chunks = db.query(DocumentEmbedding).filter(
                    DocumentEmbedding.document_id == doc_id
                ).order_by(
                    DocumentEmbedding.embedding.cosine_distance(query_embedding)
                ).limit(3).all()
            else:
                chunks = db.query(DocumentEmbedding).filter(
                    DocumentEmbedding.document_id == doc_id
                ).order_by(DocumentEmbedding.page_number).limit(3).all()

            doc_contexts[doc_id] = "\n\n".join([c.content for c in chunks if c.content])

        print(f"[MultiChat] RAG mode: {total_tokens} tokens, threshold: {threshold}")
        return doc_contexts, "rag"


@router.get("/query-status")
async def get_user_query_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's daily query status."""
    user_uuid = _parse_uuid(current_user.get("sub"), "user identifier")
    
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
    if not user_profile:
        user_profile = UserProfile(user_id=user_uuid)
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)
    
    status = get_query_status(user_profile)
    return status


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        user_uuid = _parse_uuid(current_user.get("sub"), "user identifier")

        # Check daily query limit first
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
        if not user_profile:
            user_profile = UserProfile(user_id=user_uuid)
            db.add(user_profile)
            db.commit()
            db.refresh(user_profile)
        
        limit_status = check_query_limit(user_profile, db)
        if not limit_status["allowed"]:
            raise HTTPException(
                status_code=429, 
                detail={
                    "message": "Günlük sorgu limitinize ulaştınız",
                    "remaining": 0,
                    "limit": limit_status["limit"],
                    "reset": "Yarın sıfırlanacak"
                }
            )

        session: ChatSession | None = None
        document_uuid: uuid.UUID | None = None

        # 1. Get or Create Session with strict ownership checks
        if request.session_id:
            session_uuid = _parse_uuid(request.session_id, "session id")
            session = db.query(ChatSession).filter(ChatSession.id == session_uuid).first()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
            if session.user_id != user_uuid:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this session")

            document_uuid = session.document_id
            if request.document_id and str(document_uuid) != request.document_id:
                raise HTTPException(status_code=400, detail="Session does not match the requested document")
        else:
            document_uuid = _parse_uuid(request.document_id, "document id")
            document = db.query(Document).filter(Document.id == document_uuid).first()
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            # Check if user has access (Owner OR Public & Approved OR Admin)
            is_owner = document.user_id == user_uuid
            is_public_approved = (document.visibility == 'public' and document.is_approved)
            is_admin = user_profile and user_profile.role == UserRole.ADMIN

            if not is_owner and not is_public_approved and not is_admin:
                 raise HTTPException(status_code=403, detail="Access denied")


            session = ChatSession(
                user_id=user_uuid,
                document_id=document.id,
                title=document.title or "New Chat"
            )
            db.add(session)
            db.commit()
            db.refresh(session)

        # 2. Save User Message
        user_msg = ChatMessage(
            session_id=session.id,
            sender="user",
            message=request.message
        )
        db.add(user_msg)
        db.commit()

        # 3. Get smart context (full doc for small docs, RAG for large docs)
        context, context_mode = await get_smart_context(
            doc_id=session.document_id,
            question=request.message,
            db=db,
            model=request.model
        )

        if not context and context_mode == "empty":
            raise HTTPException(status_code=404, detail="Document has no content")

        ai_response_text = await ai_service.generate_answer(request.message, context, request.model)

        # 4. Save AI Message
        ai_msg = ChatMessage(
            session_id=session.id,
            sender="ai",
            message=ai_response_text
        )
        db.add(ai_msg)
        db.commit()

        # 5. Increment query count after successful response
        query_status = increment_query_count(user_profile, db)

        return {
            "session_id": str(session.id),
            "message": ai_response_text,
            "sender": "ai",
            "context_mode": context_mode,  # NEW: Indicate which mode was used
            "query_limit": query_status
        }

    except ModelUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "model_unavailable",
                "model": e.model,
                "message": e.message
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/history/{document_id}")
async def get_chat_history(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_uuid = uuid.UUID(current_user.get("sub"))
    doc_uuid = uuid.UUID(document_id)

    # Get the latest session for this document and user
    session = db.query(ChatSession).filter(
        ChatSession.document_id == doc_uuid,
        ChatSession.user_id == user_uuid
    ).order_by(ChatSession.updated_at.desc()).first()

    if not session:
        return {"session_id": None, "messages": []}

    # Get messages for this session
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.asc()).all()

    return {
        "session_id": str(session.id),
        "messages": [
            {
                "id": str(msg.id),
                "sender": msg.sender,
                "message": msg.message,
                "created_at": msg.created_at
            } for msg in messages
        ]
    }


@router.post("/multi-document")
async def multi_document_chat(
    request: MultiDocumentChatRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Chat with multiple documents at once.
    
    This endpoint allows users to query multiple documents simultaneously,
    combining contexts from all selected documents for richer AI responses.
    Maximum 10 documents can be selected at once.
    """
    try:
        user_uuid = _parse_uuid(current_user.get("sub"), "user identifier")
        
        # Check daily query limit
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
        if not user_profile:
            user_profile = UserProfile(user_id=user_uuid)
            db.add(user_profile)
            db.commit()
            db.refresh(user_profile)
        
        limit_status = check_query_limit(user_profile, db)
        if not limit_status["allowed"]:
            raise HTTPException(
                status_code=429, 
                detail={
                    "message": "Günlük sorgu limitinize ulaştınız",
                    "remaining": 0,
                    "limit": limit_status["limit"],
                    "reset": "Yarın sıfırlanacak"
                }
            )
        
        # Validate document count
        if len(request.document_ids) == 0:
            raise HTTPException(status_code=400, detail="At least one document must be selected")
        if len(request.document_ids) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 documents can be selected at once")
        
        # Parse and validate all document IDs
        doc_uuids = []
        document_titles = {}
        for doc_id in request.document_ids:
            doc_uuid = _parse_uuid(doc_id, "document id")
            document = db.query(Document).filter(Document.id == doc_uuid).first()
            
            if not document:
                raise HTTPException(status_code=404, detail=f"Document not found: {doc_id}")
            
            # Check access rights for each document
            is_owner = document.user_id == user_uuid
            is_public_approved = (document.visibility == 'public' and document.is_approved)
            is_admin = user_profile and user_profile.role == UserRole.ADMIN
            
            if not is_owner and not is_public_approved and not is_admin:
                raise HTTPException(status_code=403, detail=f"Access denied to document: {doc_id}")
            
            doc_uuids.append(doc_uuid)
            document_titles[str(doc_uuid)] = document.title
        
        # Get smart context (full doc for small docs, RAG for large docs)
        doc_contexts, context_mode = await get_smart_context_multi(
            doc_ids=doc_uuids,
            question=request.message,
            db=db,
            model=request.model
        )
        
        # Build combined context with source labels
        all_contexts = []
        for doc_uuid in doc_uuids:
            content = doc_contexts.get(doc_uuid, "")
            if content:
                title = document_titles[str(doc_uuid)]
                all_contexts.append(f"[KAYNAK: {title}]\n{content}\n")
        
        combined_context = "\n---\n".join(all_contexts)
        
        # Apply model-based character limit (safety limit even in full mode)
        max_chars = 120000 if request.model == "gemini" else 50000
        combined_context = combined_context[:max_chars]
        
        # Use cache-optimized method for DeepSeek
        ai_response_text = await ai_service.generate_answer_multi_doc(
            question=request.message,
            combined_context=combined_context,
            model=request.model
        )
        
        # Increment query count after successful response
        query_status = increment_query_count(user_profile, db)
        
        return {
            "message": ai_response_text,
            "sender": "ai",
            "document_count": len(doc_uuids),
            "documents": [{"id": str(uid), "title": document_titles[str(uid)]} for uid in doc_uuids],
            "context_mode": context_mode,  # NEW: Indicate which mode was used
            "query_limit": query_status
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


# ============================================================================
# Multi-Document Session Endpoints
# ============================================================================

@router.post("/multi-document/session")
async def create_multi_session(
    request: CreateMultiSessionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new multi-document chat session."""
    user_uuid = _parse_uuid(current_user.get("sub"), "user identifier")
    
    # Validate all document IDs
    doc_uuids = []
    for doc_id in request.document_ids:
        doc_uuid = _parse_uuid(doc_id, "document id")
        document = db.query(Document).filter(Document.id == doc_uuid).first()
        
        if not document:
            raise HTTPException(status_code=404, detail=f"Document not found: {doc_id}")
        
        # Check access rights
        is_owner = document.user_id == user_uuid
        is_public_approved = (document.visibility == 'public' and document.is_approved)
        
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
        is_admin = user_profile and user_profile.role == UserRole.ADMIN
        
        if not is_owner and not is_public_approved and not is_admin:
            raise HTTPException(status_code=403, detail=f"Access denied to document: {doc_id}")
        
        doc_uuids.append(document)
    
    # Create session
    session = MultiDocumentSession(
        user_id=user_uuid,
        title=request.title
    )
    session.documents = doc_uuids
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "id": str(session.id),
        "title": session.title,
        "document_count": len(doc_uuids),
        "documents": [{"id": str(doc.id), "title": doc.title} for doc in doc_uuids],
        "created_at": session.created_at.isoformat()
    }


@router.get("/multi-document/sessions")
async def list_multi_sessions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all multi-document sessions for the current user."""
    user_uuid = _parse_uuid(current_user.get("sub"), "user identifier")
    
    # Eager loading ile N+1 sorununu çözüyoruz
    sessions = db.query(MultiDocumentSession).options(
        selectinload(MultiDocumentSession.documents),
        selectinload(MultiDocumentSession.messages)
    ).filter(
        MultiDocumentSession.user_id == user_uuid
    ).order_by(MultiDocumentSession.updated_at.desc()).all()
    
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "document_count": len(s.documents),
            "documents": [{"id": str(d.id), "title": d.title} for d in s.documents],
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
            "message_count": len(s.messages)
        }
        for s in sessions
    ]


@router.get("/multi-document/session/{session_id}")
async def get_multi_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a multi-document session with its messages."""
    user_uuid = _parse_uuid(current_user.get("sub"), "user identifier")
    session_uuid = _parse_uuid(session_id, "session id")
    
    # Eager loading ile N+1 sorununu çözüyoruz
    session = db.query(MultiDocumentSession).options(
        selectinload(MultiDocumentSession.documents),
        selectinload(MultiDocumentSession.messages)
    ).filter(
        MultiDocumentSession.id == session_uuid,
        MultiDocumentSession.user_id == user_uuid
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "id": str(session.id),
        "title": session.title,
        "documents": [{"id": str(d.id), "title": d.title} for d in session.documents],
        "messages": [
            {
                "id": str(m.id),
                "sender": m.sender,
                "message": m.message,
                "created_at": m.created_at.isoformat()
            }
            for m in sorted(session.messages, key=lambda x: x.created_at)
        ],
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat()
    }


@router.patch("/multi-document/session/{session_id}")
async def update_multi_session(
    session_id: str,
    request: UpdateMultiSessionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update session title."""
    user_uuid = _parse_uuid(current_user.get("sub"), "user identifier")
    session_uuid = _parse_uuid(session_id, "session id")
    
    session = db.query(MultiDocumentSession).filter(
        MultiDocumentSession.id == session_uuid,
        MultiDocumentSession.user_id == user_uuid
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.title = request.title
    db.commit()
    db.refresh(session)
    
    return {"id": str(session.id), "title": session.title}


@router.delete("/multi-document/session/{session_id}")
async def delete_multi_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a multi-document session."""
    user_uuid = _parse_uuid(current_user.get("sub"), "user identifier")
    session_uuid = _parse_uuid(session_id, "session id")
    
    session = db.query(MultiDocumentSession).filter(
        MultiDocumentSession.id == session_uuid,
        MultiDocumentSession.user_id == user_uuid
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    
    return {"message": "Session deleted successfully"}


@router.post("/multi-document/session/{session_id}/message")
async def send_multi_session_message(
    session_id: str,
    request: MultiSessionMessageRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message in a multi-document session."""
    user_uuid = _parse_uuid(current_user.get("sub"), "user identifier")
    session_uuid = _parse_uuid(session_id, "session id")
    
    # Check daily query limit
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
    if not user_profile:
        user_profile = UserProfile(user_id=user_uuid)
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)
    
    limit_status = check_query_limit(user_profile, db)
    if not limit_status["allowed"]:
        raise HTTPException(
            status_code=429, 
            detail={
                "message": "Günlük sorgu limitinize ulaştınız",
                "remaining": 0,
                "limit": limit_status["limit"],
                "reset": "Yarın sıfırlanacak"
            }
        )
    
    # Eager loading ile documents'ı önceden yükle (N+1 sorunu çözümü)
    session = db.query(MultiDocumentSession).options(
        selectinload(MultiDocumentSession.documents)
    ).filter(
        MultiDocumentSession.id == session_uuid,
        MultiDocumentSession.user_id == user_uuid
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Save user message
    user_msg = MultiSessionMessage(
        session_id=session.id,
        sender="user",
        message=request.message
    )
    db.add(user_msg)
    db.commit()
    
    # Get smart context from session documents (full doc for small docs, RAG for large)
    doc_ids = [doc.id for doc in session.documents]
    document_titles = {str(doc.id): doc.title for doc in session.documents}
    
    doc_contexts, context_mode = await get_smart_context_multi(
        doc_ids=doc_ids,
        question=request.message,
        db=db,
        model=request.model
    )
    
    # Build combined context with source labels
    all_contexts = []
    for doc in session.documents:
        content = doc_contexts.get(doc.id, "")
        if content:
            all_contexts.append(f"[KAYNAK: {doc.title}]\n{content}\n")
    
    combined_context = "\n---\n".join(all_contexts)
    
    # Apply model-based character limit
    max_chars = 120000 if request.model == "gemini" else 50000
    combined_context = combined_context[:max_chars]

    # Use cache-optimized method for DeepSeek
    ai_response_text = await ai_service.generate_answer_multi_doc(
        question=request.message,
        combined_context=combined_context,
        model=request.model
    )

    # Save AI message
    ai_msg = MultiSessionMessage(
        session_id=session.id,
        sender="ai",
        message=ai_response_text
    )
    db.add(ai_msg)
    
    # Update session timestamp
    import datetime
    session.updated_at = datetime.datetime.utcnow()
    db.commit()
    
    # Increment query count after successful response
    query_status = increment_query_count(user_profile, db)
    
    return {
        "session_id": str(session.id),
        "message": ai_response_text,
        "sender": "ai",
        "context_mode": context_mode,  # NEW: Indicate which mode was used
        "query_limit": query_status
    }


