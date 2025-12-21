from fastapi import APIRouter, Depends, HTTPException, status
import uuid
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from sqlalchemy.orm import Session
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

        # 3. Retrieve context limited to the authenticated user's document via vector search
        query_embedding = await gemini_service.generate_query_embedding(request.message)
        context_chunks: list[str] = []

        if query_embedding and any(query_embedding):
            doc_embeddings = (
                db.query(DocumentEmbedding)
                .filter(DocumentEmbedding.document_id == session.document_id)
                .order_by(DocumentEmbedding.embedding.cosine_distance(query_embedding))
                .limit(5)
                .all()
            )
            context_chunks = [emb.content for emb in doc_embeddings if emb.content]

        if not context_chunks:
            fallback_embeddings = db.query(DocumentEmbedding).filter(
                DocumentEmbedding.document_id == session.document_id
            ).limit(5).all()
            context_chunks = [emb.content for emb in fallback_embeddings if emb.content]

        context = "\n\n".join(context_chunks)[:30000]

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
        
        # Generate query embedding
        query_embedding = await gemini_service.generate_query_embedding(request.message)
        
        # Collect context from all documents with source labels
        all_contexts = []
        
        for doc_uuid in doc_uuids:
            doc_title = document_titles[str(doc_uuid)]
            
            if query_embedding and any(query_embedding):
                doc_embeddings = (
                    db.query(DocumentEmbedding)
                    .filter(DocumentEmbedding.document_id == doc_uuid)
                    .order_by(DocumentEmbedding.embedding.cosine_distance(query_embedding))
                    .limit(3)  # Top 3 chunks per document
                    .all()
                )
            else:
                doc_embeddings = db.query(DocumentEmbedding).filter(
                    DocumentEmbedding.document_id == doc_uuid
                ).limit(3).all()
            
            if doc_embeddings:
                doc_context = "\n".join([emb.content for emb in doc_embeddings if emb.content])
                if doc_context:
                    all_contexts.append(f"[KAYNAK: {doc_title}]\n{doc_context}\n")
        
        # Combine all contexts
        combined_context = "\n---\n".join(all_contexts)[:50000]  # Extended limit for multi-doc
        
        # Generate AI response with multi-document prompt
        multi_doc_prompt = f"""Sen akademik düzeyde bilgiye sahip, uzman bir çalışma asistanısın. Kaynakları REFERANS olarak kullan.

SORU TİPİNE GÖRE YANITLA:

1. NORMAL SORU (bilgi isteme, tanım, açıklama):
   - SADECE sorulan soruya odaklan
   - Ekstra bilgi, ek açıklama veya ilgisiz detay EKLEME
   - Kısa ve öz yanıt ver
   - "Ayrıca...", "Bunun yanında..." gibi ifadelerle konu dışına ÇIKMA

2. FİKİR/DEĞERLENDİRME SORUSU (ne düşünüyorsun, değerlendirir misin, yorumlar mısın, analiz et, karşılaştır):
   - Kaynakları DERİNLEMESİNE İNCELE
   - Özenli ve kapsamlı bir DEĞERLENDİRME sun
   - Artıları ve eksileri belirt
   - Farklı açılardan analiz yap
   - Kendi yorumunu ve çıkarımlarını ekle
   - Kaynaklar arası bağlantıları göster

PARAPHRASE KURALLARI:
1. Kaynakları TEMELİ OLARAK KULLAN ama KOPYALAMA YAPMA
2. BİLGİLERİ SENTEZle - Kendi cümlelerinle yeniden yaz
3. Minimum %50 değiştirilmiş metin - asla direkt alıntı yapma

FORMATLAMA:
- Türkçe yanıt ver
- Önemli kavramları **kalın** yap
- Gerekirse ## başlık ve ### alt başlık kullan
- Kod varsa ``` bloğu kullan

Kaynak Materyaller (sadece referans amaçlı):
{combined_context}

Kullanıcı Sorusu: {request.message}

Yanıt:"""

        ai_response_text = await ai_service.generate_answer_simple(multi_doc_prompt, request.model)
        
        # Increment query count after successful response
        query_status = increment_query_count(user_profile, db)
        
        return {
            "message": ai_response_text,
            "sender": "ai",
            "document_count": len(doc_uuids),
            "documents": [{"id": str(uid), "title": document_titles[str(uid)]} for uid in doc_uuids],
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
    
    sessions = db.query(MultiDocumentSession).filter(
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
    
    session = db.query(MultiDocumentSession).filter(
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
    
    session = db.query(MultiDocumentSession).filter(
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
    
    # Get context from all session documents
    query_embedding = await gemini_service.generate_query_embedding(request.message)
    all_contexts = []
    document_titles = {}
    
    for doc in session.documents:
        document_titles[str(doc.id)] = doc.title
        
        if query_embedding and any(query_embedding):
            doc_embeddings = (
                db.query(DocumentEmbedding)
                .filter(DocumentEmbedding.document_id == doc.id)
                .order_by(DocumentEmbedding.embedding.cosine_distance(query_embedding))
                .limit(3)
                .all()
            )
        else:
            doc_embeddings = db.query(DocumentEmbedding).filter(
                DocumentEmbedding.document_id == doc.id
            ).limit(3).all()
        
        if doc_embeddings:
            doc_context = "\n".join([emb.content for emb in doc_embeddings if emb.content])
            if doc_context:
                all_contexts.append(f"[KAYNAK: {doc.title}]\n{doc_context}\n")
    
    combined_context = "\n---\n".join(all_contexts)[:50000]

    # Generate AI response
    multi_doc_prompt = f"""Sen akademik düzeyde bilgiye sahip, uzman bir çalışma asistanısın. Kaynakları REFERANS olarak kullan.

SORU TİPİNE GÖRE YANITLA:

1. NORMAL SORU (bilgi isteme, tanım, açıklama):
   - SADECE sorulan soruya odaklan
   - Ekstra bilgi, ek açıklama veya ilgisiz detay EKLEME
   - Kısa ve öz yanıt ver
   - "Ayrıca...", "Bunun yanında..." gibi ifadelerle konu dışına ÇIKMA

2. FİKİR/DEĞERLENDİRME SORUSU (ne düşünüyorsun, değerlendirir misin, yorumlar mısın, analiz et, karşılaştır):
   - Kaynakları DERİNLEMESİNE İNCELE
   - Özenli ve kapsamlı bir DEĞERLENDİRME sun
   - Artıları ve eksileri belirt
   - Farklı açılardan analiz yap
   - Kendi yorumunu ve çıkarımlarını ekle
   - Kaynaklar arası bağlantıları göster

PARAPHRASE KURALLARI:
1. Kaynakları TEMELİ OLARAK KULLAN ama KOPYALAMA YAPMA
2. BİLGİLERİ SENTEZle - Kendi cümlelerinle yeniden yaz
3. Minimum %50 değiştirilmiş metin - asla direkt alıntı yapma

FORMATLAMA:
- Türkçe yanıt ver
- Önemli kavramları **kalın** yap
- Gerekirse ## başlık ve ### alt başlık kullan
- Kod varsa ``` bloğu kullan

Kaynak Materyaller (sadece referans amaçlı):
{combined_context}

Kullanıcı Sorusu: {request.message}

Yanıt:"""

    ai_response_text = await ai_service.generate_answer_simple(multi_doc_prompt, request.model)

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
        "query_limit": query_status
    }


