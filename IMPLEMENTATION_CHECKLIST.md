# Hibrit Context Stratejisi - Implementation Checklist

> **PRD:** [PRD_HYBRID_CONTEXT.md](./PRD_HYBRID_CONTEXT.md)
> **Hedef:** DeepSeek cache optimizasyonu ile %80-90 maliyet düşüşü

---

## Phase 0: Database Migration (ÖNCELİKLİ)

> ⚠️ **ÖNEMLİ:** `page_number` kolonu eskiden vardı ama `5a225a9e0dd0` migration'ı ile
> kaldırılmış. Bu kolonu geri eklememiz gerekiyor.

### 0.1 Migration Dosyası Oluştur
- [ ] Migration oluştur:
  ```bash
  cd backend
  alembic revision -m "add_page_number_to_embeddings"
  ```
- [ ] Migration içeriğini yaz:
  ```python
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

### 0.2 Model Güncelle
- [ ] `backend/app/models/document.py` dosyasını güncelle:
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

### 0.3 pdf_service.py Güncelle
- [ ] `backend/app/services/pdf_service.py` dosyasını güncelle:
  ```python
  # Satır 126 civarı - chunk işleme döngüsü
  current_page_index = 0
  for i in range(0, len(page_texts), chunk_size):
      chunk = page_texts[i:i+chunk_size]

      # ... embedding generation ...

      for idx, (text, embedding) in enumerate(zip(chunk, embeddings)):
          db_embedding = DocumentEmbedding(
              document_id=document.id,
              page_number=current_page_index + idx,  # YENİ
              content=text,
              embedding=embedding
          )
          db.add(db_embedding)

      current_page_index += len(chunk)
  ```

### 0.4 Migration Çalıştır
- [ ] Migration'ı uygula:
  ```bash
  alembic upgrade head
  ```
- [ ] Veritabanında kolon oluştuğunu doğrula

### 0.5 Mevcut Verileri Güncelle (Opsiyonel)
- [ ] Eski embedding'ler için page_number set et:
  ```sql
  -- Her document için embedding'leri id sırasına göre numarala
  WITH numbered AS (
      SELECT id, document_id,
             ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY id) - 1 as rn
      FROM document_embeddings
  )
  UPDATE document_embeddings e
  SET page_number = n.rn
  FROM numbered n
  WHERE e.id = n.id;
  ```

---

## Phase 1: Core Functions

### 1.1 Token Hesaplama Fonksiyonu
- [ ] `chat.py` dosyasına `from sqlalchemy import func` import ekle
- [ ] `TOKEN_THRESHOLDS` dictionary tanımla:
  ```python
  TOKEN_THRESHOLDS = {"deepseek": 25000, "gemini": 100000}
  ```
- [ ] `get_document_token_count()` fonksiyonunu ekle
- [ ] Unit test yaz: farklı boyutlarda dokümanlar için token sayısı doğrulaması

### 1.2 Single Document Smart Context
- [ ] `get_smart_context()` fonksiyonunu ekle
- [ ] Full mode: `page_number` sıralaması ile tüm chunk'ları çek
- [ ] RAG mode: mevcut cosine distance mantığını koru
- [ ] Empty document handling ekle
- [ ] Logging ekle: `[Chat] FULL/RAG mode: X tokens`

### 1.3 Multi-Document Smart Context
- [ ] `get_smart_context_multi()` fonksiyonunu ekle
- [ ] Multi-doc threshold: `base_threshold * 1.5`
- [ ] Her doküman için ayrı token hesabı
- [ ] Dict return type: `{doc_id: content}`

---

## Phase 2: Endpoint Updates

### 2.1 `/chat/message` Endpoint
- [ ] Mevcut RAG kodunu kaldır (satır 155-174)
- [ ] `get_smart_context()` çağrısı ekle
- [ ] `model` parametresini context fonksiyonuna geçir
- [ ] Response'a `context_mode` field ekle
- [ ] Boş context için hata handling

### 2.2 `/chat/multi-document` Endpoint
- [ ] Mevcut multi-doc RAG kodunu kaldır (satır 313-341)
- [ ] `get_smart_context_multi()` çağrısı ekle
- [ ] Kaynak etiketleme mantığını koru `[KAYNAK: title]`
- [ ] Model bazlı karakter limiti: Gemini 120K, DeepSeek 50K
- [ ] Response'a `context_mode` field ekle

### 2.3 `/chat/multi-document/session/{id}/message` Endpoint
- [ ] Mevcut session message RAG kodunu kaldır (satır 594-620)
- [ ] `get_smart_context_multi()` çağrısı ekle
- [ ] Session documents'tan doc_ids çıkar
- [ ] Response'a `context_mode` field ekle

---

## Phase 3: Testing

### 3.1 Unit Tests
- [ ] `test_get_document_token_count()` - token hesaplama doğruluğu
- [ ] `test_get_smart_context_full_mode()` - küçük doc full mode
- [ ] `test_get_smart_context_rag_mode()` - büyük doc RAG mode
- [ ] `test_get_smart_context_empty_doc()` - boş doküman handling
- [ ] `test_get_smart_context_multi_full()` - multi-doc full mode
- [ ] `test_get_smart_context_multi_rag()` - multi-doc RAG mode

### 3.2 Integration Tests
- [ ] Küçük PDF upload → chat → full mode doğrula
- [ ] Büyük PDF upload → chat → RAG mode doğrula
- [ ] 3 küçük PDF → multi-chat → full mode doğrula
- [ ] 10 büyük PDF → multi-chat → RAG mode doğrula
- [ ] Gemini model seçimi → 100K threshold doğrula
- [ ] DeepSeek model seçimi → 25K threshold doğrula

### 3.3 Edge Cases
- [ ] Boş doküman (0 chunk)
- [ ] Tek chunk doküman
- [ ] Threshold sınırında doküman (24.9K vs 25.1K token)
- [ ] Embedding generation hatası → fallback
- [ ] Mixed: bazı doc'lar boş, bazıları dolu
- [ ] page_number NULL olan eski veriler

---

## Phase 4: Frontend (Opsiyonel)

### 4.1 Context Mode Göstergesi
- [ ] Chat response'dan `context_mode` oku
- [ ] Badge component: "Full Doc" (yeşil) / "RAG" (mavi)
- [ ] Tooltip: "Tüm doküman bağlamda kullanılıyor"
- [ ] Tooltip: "En alakalı bölümler kullanılıyor"

### 4.2 UI Konumu
- [ ] Chat mesajının altında küçük badge
- [ ] Veya chat header'da session bilgisi yanında

---

## Phase 5: Monitoring & Logging

### 5.1 Logging Format
- [ ] Standart log formatı uygula:
  ```
  [Chat] Mode: full, Tokens: 12500, Model: deepseek, DocID: xxx
  [MultiChat] Mode: rag, Tokens: 45000, Model: gemini, DocCount: 5
  ```

### 5.2 Metrics (İleride)
- [ ] Prometheus counter: `chat_context_mode_total{mode="full|rag"}`
- [ ] Prometheus histogram: `chat_estimated_tokens`
- [ ] Grafana dashboard oluştur

---

## Phase 6: Deployment

### 6.1 Pre-Deployment
- [ ] Tüm testler geçiyor
- [ ] Code review tamamlandı
- [ ] Staging'de test edildi
- [ ] Migration production'da çalıştırıldı

### 6.2 Deployment Steps
- [ ] Migration çalıştır: `alembic upgrade head`
- [ ] Backend deploy
- [ ] Log'ları izle - mode dağılımı kontrol
- [ ] Cache hit oranını DeepSeek dashboard'dan kontrol
- [ ] Maliyet karşılaştırması (1 hafta sonra)

### 6.3 Rollback Plan
- [ ] `get_smart_context()` içinde feature flag ekle (opsiyonel)
- [ ] Sorun olursa RAG mode'a zorla:
  ```python
  FORCE_RAG_MODE = os.getenv("FORCE_RAG_MODE", "false") == "true"
  ```

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|-------|------------|
| `backend/alembic/versions/xxx_add_page_number.py` | +1 migration dosyası |
| `backend/app/models/document.py` | +1 kolon (page_number) |
| `backend/app/services/pdf_service.py` | page_number set etme |
| `backend/app/api/endpoints/chat.py` | +3 fonksiyon, 3 endpoint güncelleme |
| `backend/tests/test_chat.py` | +10 test case |
| `frontend/src/components/Chat.tsx` | +context_mode badge (opsiyonel) |

---

## Doğrulanmış İsimler

| PRD'deki | Gerçek Kod | Durum |
|----------|------------|-------|
| `gemini_service` | `gemini_service` | ✅ |
| `ai_service` | `ai_service` | ✅ |
| `generate_query_embedding()` | `generate_query_embedding()` | ✅ |
| `generate_answer()` | `generate_answer()` | ✅ |
| `generate_answer_multi_doc()` | `generate_answer_multi_doc()` | ✅ |
| `DocumentEmbedding` | `DocumentEmbedding` | ✅ |
| `cosine_distance()` | `cosine_distance()` | ✅ |
| `func.sum`, `func.length` | SQLAlchemy built-in | ✅ |
| `page_number` | Migration ile eklenecek | 🔄 |

---

## Zaman Tahmini

| Phase | Tahmini Süre |
|-------|--------------|
| **Phase 0: Migration** | **30-45 dk** |
| Phase 1: Core Functions | 2-3 saat |
| Phase 2: Endpoint Updates | 1-2 saat |
| Phase 3: Testing | 2-3 saat |
| Phase 4: Frontend | 1 saat (opsiyonel) |
| Phase 5: Monitoring | 30 dk |
| Phase 6: Deployment | 1 saat |
| **Toplam** | **~9-11 saat** |

---

## Notlar

- [ ] Phase 0 (Migration) tamamlandı
- [ ] Implementasyon tamamlandı
- [ ] Production'da 1 hafta izlendi
- [ ] Cache hit oranı hedeflenen seviyede (%80+)
- [ ] Maliyet düşüşü doğrulandı
