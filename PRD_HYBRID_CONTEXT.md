# Akıllı Hibrit Context Stratejisi

DeepSeek cache optimizasyonunu maksimize etmek için doküman boyutuna göre otomatik context seçimi.

## Mevcut Durum

Şu anda **RAG (Retrieval Augmented Generation)** kullanılıyor:
- Her soruda embedding ile en yakın 5 chunk çekiliyor
- Context her soruda değişiyor → Cache faydası %0

## Ön Gereksinim: page_number Kolonu

> ⚠️ **NOT:** `document_embeddings` tablosunda `page_number` kolonu eskiden vardı ama
> `5a225a9e0dd0_initial_migration_with_uuid.py` ile kaldırılmış. Bu kolonu geri eklememiz gerekiyor.

## Hibrit Strateji

```
if toplam_token < MODEL_THRESHOLD[model]:
    → FULL DOCUMENT (cache ~%90)
else:
    → RAG (mevcut sistem)
```

### Model Bazlı Token Limitleri

| Model | Max Context | Güvenli Eşik | Neden? |
|-------|-------------|--------------|--------|
| DeepSeek-V3 | 64K token | **25K token** | Response için yer bırak |
| Gemini 2.5 Flash | 1M token | **100K token** | Çok daha yüksek kapasite |

---

## Backend Implementasyonu

### 0. Migration: page_number Kolonunu Geri Ekle

**Yeni migration dosyası oluştur:**

```bash
cd backend
alembic revision -m "add_page_number_to_embeddings"
```

**Migration içeriği:**

```python
"""Add page_number to document_embeddings

Revision ID: [auto-generated]
Revises: [previous]
"""
from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    op.add_column('document_embeddings',
        sa.Column('page_number', sa.Integer(), nullable=True, default=0)
    )
    op.create_index('ix_document_embeddings_page_number',
        'document_embeddings', ['page_number'])

def downgrade() -> None:
    op.drop_index('ix_document_embeddings_page_number', 'document_embeddings')
    op.drop_column('document_embeddings', 'page_number')
```

**Model güncelleme** (`backend/app/models/document.py`):

```python
class DocumentEmbedding(Base):
    __tablename__ = "document_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"))
    page_number = Column(Integer, nullable=True, default=0, index=True)  # YENİ
    content = Column(String)
    embedding = Column(Vector(768))

    document = relationship("Document", back_populates="embeddings")
```

**pdf_service.py güncelleme** (`backend/app/services/pdf_service.py`):

```python
# Satır 126 civarı - chunk işleme döngüsü
current_page_index = 0
for i in range(0, len(page_texts), chunk_size):
    chunk = page_texts[i:i+chunk_size]

    # ... embedding generation ...

    for idx, (text, embedding) in enumerate(zip(chunk, embeddings)):
        # ... error handling ...

        db_embedding = DocumentEmbedding(
            document_id=document.id,
            page_number=current_page_index + idx,  # YENİ: Sayfa/chunk sırası
            content=text,
            embedding=embedding
        )
        db.add(db_embedding)

    current_page_index += len(chunk)
```

---

### 1. Yeni Helper Fonksiyonlar

**Dosya:** `backend/app/api/endpoints/chat.py`

```python
from sqlalchemy import func

# Model bazlı token eşikleri
TOKEN_THRESHOLDS = {
    "deepseek": 25000,   # ~100 sayfa
    "gemini": 100000     # ~400 sayfa
}


async def get_document_token_count(doc_id: uuid.UUID, db: Session) -> int:
    """Dokümanın toplam token sayısını tahmin et (DB'de hesapla)."""
    total_chars = db.query(func.sum(func.length(DocumentEmbedding.content))).filter(
        DocumentEmbedding.document_id == doc_id
    ).scalar() or 0
    return total_chars // 4  # ~4 char per token


async def get_smart_context(
    doc_id: uuid.UUID,
    question: str,
    db: Session,
    model: str = "deepseek"
) -> tuple[str, str]:
    """
    Akıllı context seçimi - doküman boyutuna göre.

    Returns:
        tuple[str, str]: (context, mode) where mode is "full" or "rag"
    """
    # Önce token sayısını kontrol et (hafif query)
    estimated_tokens = await get_document_token_count(doc_id, db)
    threshold = TOKEN_THRESHOLDS.get(model, 25000)

    if estimated_tokens < threshold:
        # FULL DOCUMENT MODE - Tüm içeriği sayfa sırasına göre çek
        all_chunks = db.query(DocumentEmbedding).filter(
            DocumentEmbedding.document_id == doc_id
        ).order_by(DocumentEmbedding.page_number).all()

        if not all_chunks:
            return "", "empty"

        full_content = "\n\n".join([c.content for c in all_chunks if c.content])
        print(f"[Chat] FULL mode: {estimated_tokens} tokens, threshold: {threshold}")
        return full_content, "full"

    else:
        # RAG MODE - Semantic search ile en alakalı chunk'ları çek
        query_embedding = await gemini_service.generate_query_embedding(question)

        if query_embedding and any(query_embedding):
            relevant_chunks = db.query(DocumentEmbedding).filter(
                DocumentEmbedding.document_id == doc_id
            ).order_by(
                DocumentEmbedding.embedding.cosine_distance(query_embedding)
            ).limit(5).all()

            context = "\n\n".join([c.content for c in relevant_chunks if c.content])
        else:
            # Fallback: İlk 5 chunk
            fallback_chunks = db.query(DocumentEmbedding).filter(
                DocumentEmbedding.document_id == doc_id
            ).order_by(DocumentEmbedding.page_number).limit(5).all()
            context = "\n\n".join([c.content for c in fallback_chunks if c.content])

        print(f"[Chat] RAG mode: {estimated_tokens} tokens, threshold: {threshold}")
        return context, "rag"
```

### 2. Multi-Document İçin Hibrit Context

```python
async def get_smart_context_multi(
    doc_ids: list[uuid.UUID],
    question: str,
    db: Session,
    model: str = "deepseek"
) -> tuple[dict[uuid.UUID, str], str]:
    """
    Multi-document için akıllı context seçimi.

    Returns:
        tuple[dict, str]: (doc_contexts dict, mode)
    """
    # Tüm dokümanların toplam token sayısını hesapla
    total_tokens = 0
    doc_char_counts = {}

    for doc_id in doc_ids:
        chars = db.query(func.sum(func.length(DocumentEmbedding.content))).filter(
            DocumentEmbedding.document_id == doc_id
        ).scalar() or 0
        doc_char_counts[doc_id] = chars
        total_tokens += chars // 4

    # Multi-doc için eşik: tek doc eşiğinin 1.5 katı
    threshold = int(TOKEN_THRESHOLDS.get(model, 25000) * 1.5)

    if total_tokens < threshold:
        # FULL MODE - Tüm dokümanların tam içeriği
        doc_contexts = {}
        for doc_id in doc_ids:
            chunks = db.query(DocumentEmbedding).filter(
                DocumentEmbedding.document_id == doc_id
            ).order_by(DocumentEmbedding.page_number).all()

            doc_contexts[doc_id] = "\n\n".join([c.content for c in chunks if c.content])

        print(f"[MultiChat] FULL mode: {total_tokens} tokens, threshold: {threshold}")
        return doc_contexts, "full"

    else:
        # RAG MODE - Her dokümandan en alakalı 3 chunk
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
```

---

## Endpoint Güncellemeleri

### 3. Single Document Chat (`/chat/message`)

```python
@router.post("/message")
async def chat_message(request: ChatRequest, ...):
    # ... existing session/auth code ...

    # GÜNCELLEME: Yeni smart context
    context, mode = await get_smart_context(
        doc_id=session.document_id,
        question=request.message,
        db=db,
        model=request.model
    )

    if not context:
        raise HTTPException(status_code=404, detail="Document has no content")

    # Generate AI response
    ai_response_text = await ai_service.generate_answer(
        request.message,
        context,
        request.model
    )

    # ... save message code ...

    return {
        "session_id": str(session.id),
        "message": ai_response_text,
        "sender": "ai",
        "context_mode": mode,  # YENİ: Frontend'e mode bilgisi
        "query_limit": query_status
    }
```

### 4. Multi-Document Chat (`/chat/multi-document`)

```python
@router.post("/multi-document")
async def multi_document_chat(request: MultiDocumentChatRequest, ...):
    # ... existing validation code ...

    # GÜNCELLEME: Yeni smart context
    doc_contexts, mode = await get_smart_context_multi(
        doc_ids=doc_uuids,
        question=request.message,
        db=db,
        model=request.model
    )

    # Context'leri kaynak etiketleriyle birleştir
    all_contexts = []
    for doc_id, content in doc_contexts.items():
        if content:
            title = document_titles[str(doc_id)]
            all_contexts.append(f"[KAYNAK: {title}]\n{content}\n")

    combined_context = "\n---\n".join(all_contexts)

    # Limit kontrolü (full modda bile güvenlik için)
    max_chars = 120000 if request.model == "gemini" else 50000
    combined_context = combined_context[:max_chars]

    # Generate AI response
    ai_response_text = await ai_service.generate_answer_multi_doc(
        question=request.message,
        combined_context=combined_context,
        model=request.model
    )

    return {
        "message": ai_response_text,
        "sender": "ai",
        "document_count": len(doc_uuids),
        "documents": [...],
        "context_mode": mode,  # YENİ
        "query_limit": query_status
    }
```

### 5. Multi-Session Message (`/chat/multi-document/session/{id}/message`)

```python
@router.post("/multi-document/session/{session_id}/message")
async def send_multi_session_message(...):
    # ... existing code ...

    # GÜNCELLEME: Session'daki dokümanlar için smart context
    doc_ids = [doc.id for doc in session.documents]
    doc_contexts, mode = await get_smart_context_multi(
        doc_ids=doc_ids,
        question=request.message,
        db=db,
        model=request.model
    )

    # Context birleştirme
    all_contexts = []
    for doc in session.documents:
        content = doc_contexts.get(doc.id, "")
        if content:
            all_contexts.append(f"[KAYNAK: {doc.title}]\n{content}\n")

    combined_context = "\n---\n".join(all_contexts)
    max_chars = 120000 if request.model == "gemini" else 50000
    combined_context = combined_context[:max_chars]

    # ... rest of the code ...

    return {
        "session_id": str(session.id),
        "message": ai_response_text,
        "sender": "ai",
        "context_mode": mode,  # YENİ
        "query_limit": query_status
    }
```

---

## Cache Faydası Karşılaştırması

### Single Document

| Senaryo | Mevcut (RAG) | Hibrit |
|---------|--------------|--------|
| 10 sayfa PDF, 5 soru | %0 cache | **%80 cache** |
| 50 sayfa PDF, 5 soru | %0 cache | **%80 cache** |
| 100 sayfa PDF, 5 soru | %0 cache | **%80 cache** |
| 200 sayfa PDF, 5 soru | %0 cache | %0 cache (RAG) |

### Multi-Document

| Senaryo | Mevcut (RAG) | Hibrit |
|---------|--------------|--------|
| 3 × 20 sayfa, 5 soru | %0 cache | **%80 cache** |
| 5 × 30 sayfa, 5 soru | %0 cache | **%80 cache** |
| 10 × 50 sayfa, 5 soru | %0 cache | %0 cache (RAG) |

### Maliyet Etkisi (DeepSeek)

- Cache hit durumunda: **%90 maliyet düşüşü**
- Örnek: 10 soruluk session
  - Mevcut: 10 × $0.001 = $0.01
  - Hibrit (full mode): 1 × $0.001 + 9 × $0.0001 = **$0.0019**

---

## Implementation Checklist

### Backend

- [ ] `get_document_token_count()` fonksiyonunu ekle
- [ ] `get_smart_context()` fonksiyonunu ekle
- [ ] `get_smart_context_multi()` fonksiyonunu ekle
- [ ] `/chat/message` endpoint'ini güncelle
- [ ] `/chat/multi-document` endpoint'ini güncelle
- [ ] `/chat/multi-document/session/{id}/message` endpoint'ini güncelle
- [ ] Response'lara `context_mode` field ekle

### Frontend (Opsiyonel)

- [ ] Chat UI'da mode göstergesi (badge: "Full Doc" / "RAG")
- [ ] Tooltip ile açıklama: "Tüm doküman bağlamda" vs "Alakalı bölümler"

### Testing

- [ ] Küçük doküman (<25K token) - full mode testi
- [ ] Büyük doküman (>25K token) - RAG mode testi
- [ ] Multi-doc full mode testi
- [ ] Multi-doc RAG mode testi
- [ ] Gemini vs DeepSeek threshold testi
- [ ] Edge case: Boş doküman, tek chunk doküman

---

## Monitoring

Başarıyı ölçmek için log'lara eklenecek metrikler:

```python
print(f"[Chat] Mode: {mode}, Tokens: {estimated_tokens}, Model: {model}, Cache: {'likely' if mode == 'full' else 'unlikely'}")
```

İleride Prometheus/Grafana entegrasyonu:
- `chat_context_mode_total{mode="full|rag"}` - Mode dağılımı
- `chat_estimated_tokens_histogram` - Token dağılımı
- `chat_cache_hit_rate` - Cache hit oranı (DeepSeek API'den)

---

## Gelecek İyileştirmeler

- [ ] **Session-based caching**: Aynı session'da context'i DB'de cache'le
- [ ] **Adaptive threshold**: Ortalama doküman boyutuna göre dinamik eşik
- [ ] **Hybrid-hybrid**: Büyük dokümanlarda özet + alakalı bölümler
- [ ] **tiktoken entegrasyonu**: Daha hassas token hesaplama
- [ ] **Streaming desteği**: Full mode'da streaming response
