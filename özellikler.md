# 📋 Test Oluşturma & Çözme Özelliği — Uygulama Planı

> **Proje**: Bitig — AI Destekli Akademik Çalışma Platformu
> **Özellik**: PDF'den Test Oluşturma & Çözme
> **Tarih**: 05.05.2026

---

## 🎯 Özellik Tanımı

Kullanıcı, yüklediği PDF dokümanından yapay zeka destekli çoktan seçmeli testler oluşturabilir, çözebilir ve sonuçlarını görebilir.

### Temel Gereksinimler

| # | Gereksinim | Detay |
|---|-----------|-------|
| 1 | **Test Formatı** | Sadece çoktan seçmeli (A/B/C/D) |
| 2 | **Soru Sayısı** | Hybrid: AI PDF uzunluğuna göre önersin (10-20 arası), kullanıcı dropdown ile değiştirip onaylasın |
| 3 | **Geçmiş** | Tüm testler saklanacak, "Testlerim" sekmesinden erişilebilecek |
| 4 | **Açıklama** | Her sorunun doğru cevabı gönderildiğinde AI tarafından açıklanacak |
| 5 | **Paylaşım** | Oluşturulan testler toplulukla paylaşılabilir (public link) |

### Kapsam Dışı (İleride Eklenebilir)

- ❌ Doğru/Yanlış sorular
- ❌ Kısa cevap sorular
- ❌ Eşleştirme soruları
- ❌ Süre limiti
- ❌ Çoklu doküman testleri

---

## 📁 Dosya Değişiklik Planı

### Backend

#### 🆕 Yeni Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `backend/app/models/test.py` | `Test`, `TestQuestion` SQLAlchemy modelleri |
| `backend/app/api/endpoints/test.py` | Test CRUD endpoint'leri |
| `backend/app/services/test_service.py` | AI test üretme servisi |

#### ✏️ Deşecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `backend/app/api/api.py` | Test router'ı ekle |
| `backend/app/models/__init__.py` | Test modelini import et |
| `backend/app/services/ai_service.py` | `generate_test()` metodu ekle |

#### 🗄️ Yeni Tablolar

**`tests` tablosu:**

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | Birincil anahtar |
| `user_id` | UUID | Testi oluşturan kullanıcı |
| `document_id` | UUID | FK → `documents.id` |
| `title` | String(255) | "Fizik Testi - 15.01.2026" |
| `question_count` | Integer | İstenen soru sayısı |
| `score` | Integer | Nullable, tamamlanınca dolar |
| `total_questions` | Integer | Toplam soru sayısı |
| `completed` | Boolean | Default `false` |
| `is_public` | Boolean | Default `false`, paylaşım için |
| `created_at` | DateTime | Oluşturma tarihi |
| `completed_at` | DateTime | Nullable, tamamlanma tarihi |

**`test_questions` tablosu:**

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | Birincil anahtar |
| `test_id` | UUID | FK → `tests.id`, CASCADE |
| `question_text` | Text | Soru metni |
| `options` | JSON | `["A) ...", "B) ...", "C) ...", "D) ..."]` |
| `correct_answer` | String(10) | `"A"`, `"B"`, `"C"`, `"D"` |
| `user_answer` | String(10) | Nullable, öğrenci cevabı |
| `explanation` | Text | AI açıklaması |
| `is_correct` | Boolean | Nullable |
| `order_num` | Integer | Sıra numarası |

#### 📡 Endpoint'ler

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `POST` | `/api/v1/test/generate` | PDF'den test oluştur | ✅ |
| `GET` | `/api/v1/test/` | Kullanıcının testlerini listele | ✅ |
| `GET` | `/api/v1/test/{test_id}` | Test detayı + sorular | ✅ |
| `POST` | `/api/v1/test/{test_id}/submit` | Cevapları gönder, puanla | ✅ |
| `DELETE` | `/api/v1/test/{test_id}` | Test sil | ✅ |
| `PATCH` | `/api/v1/test/{test_id}/share` | Toplulukla paylaş (public yap) | ✅ |
| `GET` | `/api/v1/test/public` | Public testleri listele | ❌ |

#### 🤖 AI Prompt Taslağı

```
Sen akademik soru hazırlama uzmanısın. Aşağıdaki ders içeriğinden
{soru_sayısı} adet çoktan seçmeli soru hazırla.

KURALLAR:
- Türkçe sorular hazırla
- Zorluk seviyesi: orta
- Her soru 4 seçenekli olsun (A, B, C, D)
- Sadece 1 doğru cevap olsun
- Her soru için kısa açıklayıcı cevap yaz
- Çeldirici seçenekler gerçekçi olsun

JSON formatında dön:
{
  "questions": [
    {
      "question": "Soru metni buraya yazılır?",
      "options": ["A) Seçenek 1", "B) Seçenek 2", "C) Seçenek 3", "D) Seçenek 4"],
      "correct_answer": "B",
      "explanation": "Doğru cevap B çünkü..."
    }
  ]
}

Ders İçeriği:
{pdf_icerigi}
```

---

### Frontend

#### 🆕 Yeni Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `frontend/src/app/test/[id]/page.tsx` | Test çözme sayfası |
| `frontend/src/app/test/page.tsx` | Test geçmişi sayfası |
| `frontend/src/components/test/create-test-modal.tsx` | Test oluşturma modal'ı |
| `frontend/src/components/test/question-card.tsx` | Soru kartı bileşeni |
| `frontend/src/components/test/test-result.tsx` | Sonuç ekranı bileşeni |

#### ✏️ Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `frontend/src/app/dashboard/page.tsx` | "Testlerim" sekmesi + doküman kartına "Test Oluştur" butonu |

---

## 🎨 UI/UX Akış

### 1. Test Oluşturma Akışı

```
Kullanıcı Dashboard → Doküman Kartı → "Test Oluştur" butonu
    ↓
Modal açılır:
┌─────────────────────────────────────────┐
│  📝 Test Oluştur                        │
│                                         │
│  Doküman: "Fizik Dersi Notları.pdf"     │
│                                         │
│  AI 15 soru öneriyor.                   │
│  Soru Sayısı: [-] 15 [+]               │
│  (Min: 5, Max: 30)                      │
│                                         │
│  [İptal]  [Testi Oluştur]              │
└─────────────────────────────────────────┘
    ↓
Loading: "Sorular hazırlanıyor..."
    ↓
/test/{test_id} sayfasına yönlendir
```

### 2. Test Çözme Akışı

```
/test/{test_id} sayfası
    ↓
Sorular sırayla gösterilir:
┌─────────────────────────────────────────┐
│  Soru 3/15                    [████░░]  │
│                                         │
│  Newton'un birinci yasası aşağıdakiler- │
│  den hangisidir?                        │
│                                         │
│  ○ A) Eylemsizlik yasası                │
│  ● B) Kuvvet yasası                     │
│  ○ C) Tepki yasası                      │
│  ○ D) Evrensel çekim yasası             │
│                                         │
│  [Önceki]              [Sonraki]        │
└─────────────────────────────────────────┘
    ↓
Tüm sorular cevaplandı → "Testi Bitir" butonu aktif
    ↓
"Testi Bitir" tıklanır → Sonuç ekranı
```

### 3. Sonuç Ekranı

```
┌─────────────────────────────────────────┐
│  🎉 Test Tamamlandı!                    │
│                                         │
│  Skor: 12/15 (%80)                      │
│                                         │
│  ✅ Soru 1: Doğru                       │
│     "Newton'un birinci yasası..."        │
│     Açıklama: Eylemsizlik yasası...     │
│                                         │
│  ❌ Soru 3: Yanlış                      │
│     "Hangi kuvvet..."                   │
│     Doğru Cevap: B)                     │
│     Açıklama: Bu soruda dikkat edilmesi │
│     gereken nokta...                    │
│                                         │
│  [Testi Tekrar Çöz]  [Paylaş]          │
└─────────────────────────────────────────┘
```

### 4. Dashboard: Testlerim Sekmesi

```
Dashboard → "Testlerim" sekmesi
    ↓
┌─────────────────────────────────────────┐
│  Testlerim (5)                          │
│                                         │
│  ┌─────────────────┐ ┌─────────────────┐│
│  │ Fizik Testi     │ │ Matematik Testi ││
│  │ 12/15 (%80) ✅  │ │ 8/10 (%80) ✅   ││
│  │ 15 soru         │ │ 10 soru         ││
│  │ 05.05.2026      │ │ 04.05.2026      ││
│  │ [Tekrar Çöz]    │ │ [Tekrar Çöz]    ││
│  └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────┘
```

---

## 🔧 Teknik Detaylar

### API İstek/Response Örnekleri

**Test Oluşturma:**

```http
POST /api/v1/test/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_id": "uuid-buraya",
  "question_count": 15
}
```

```json
{
  "test_id": "uuid",
  "title": "Fizik Dersi Notları - Test",
  "question_count": 15,
  "questions": [
    {
      "id": "uuid",
      "question_text": "Newton'un birinci yasası nedir?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "order": 1
    }
  ]
}
```

**Cevap Gönderme:**

```http
POST /api/v1/test/{test_id}/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "answers": [
    {"question_id": "uuid", "answer": "B"},
    {"question_id": "uuid", "answer": "A"}
  ]
}
```

```json
{
  "test_id": "uuid",
  "score": 12,
  "total": 15,
  "percentage": 80,
  "questions": [
    {
      "id": "uuid",
      "question_text": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "B",
      "user_answer": "B",
      "is_correct": true,
      "explanation": "Doğru cevap B çünkü..."
    }
  ]
}
```

### Rate Limiting

Test oluşturma = 1 sorgu olarak sayılacak. Mevcut günlük 10 sorgu limitine tabi.

### Erişim Kontrolü

Kullanıcı sadece kendi testlerini görebilir/çözebilir. Admin'ler tüm testleri görebilir.

---

## 📅 Uygulama Sırası

```
Adım 1: Backend — Model + Migration
  └─ models/test.py oluştur
  └─ alembic revision --autogenerate
  └─ alembic upgrade head

Adım 2: Backend — AI Servisi
  └─ ai_service.py'ye generate_test() ekle
  └─ test_service.py oluştur (test logic)

Adım 3: Backend — Endpoint'ler
  └─ api/endpoints/test.py oluştur
  └─ api/api.py'ye router ekle

Adım 4: Frontend — Test Oluşturma Modal'ı
  └─ components/test/create-test-modal.tsx
  └─ Dashboard'daki doküman kartına buton ekle

Adım 5: Frontend — Test Çözme Sayfası
  └─ app/test/[id]/page.tsx
  └─ components/test/question-card.tsx
  └─ components/test/test-result.tsx

Adım 6: Frontend — Test Geçmişi
  └─ app/test/page.tsx
  └─ Dashboard'a "Testlerim" sekmesi ekle

Adım 7: Entegrasyon Testi
  └─ Lokalde tüm akışı test et
  └─ Edge case'leri kontrol et

Adım 8: Deploy
  └─ git push
  └─ VPS'te: git pull, alembic upgrade, build, restart
```

---

## ⏱️ Tahmini Süre

| Adım | Tahmini |
|------|---------|
| Backend: Model + Migration | 1 saat |
| Backend: AI Servisi | 1-2 saat |
| Backend: Endpoint'ler | 2 saat |
| Frontend: Modal + Dashboard | 2 saat |
| Frontend: Test Çözme Sayfası | 3-4 saat |
| Frontend: Test Geçmişi | 1 saat |
| Entegrasyon Testi | 1 saat |
| Deploy | 30 dk |
| **Toplam** | **~12-14 saat (1.5-2 gün)** |

---

## ✅ Kontrol Listesi

- [ ] `backend/app/models/test.py` — Modeller oluşturuldu
- [ ] `backend/app/api/endpoints/test.py` — Endpoint'ler oluşturuldu
- [ ] `backend/app/services/test_service.py` — Test servisi oluşturuldu
- [ ] `backend/app/api/api.py` — Router eklendi
- [ ] `backend/app/services/ai_service.py` — `generate_test()` eklendi
- [ ] Alembic migration çalıştırıldı
- [ ] `frontend/src/components/test/create-test-modal.tsx` — Modal oluşturuldu
- [ ] `frontend/src/app/test/[id]/page.tsx` — Test çözme sayfası oluşturuldu
- [ ] `frontend/src/components/test/question-card.tsx` — Soru kartı oluşturuldu
- [ ] `frontend/src/components/test/test-result.tsx` — Sonuç ekranı oluşturuldu
- [ ] `frontend/src/app/test/page.tsx` — Test geçmişi sayfası oluşturuldu
- [ ] `frontend/src/app/dashboard/page.tsx` — "Testlerim" sekmesi + buton eklendi
- [ ] Lokalde test edildi
- [ ] VPS'e deploy edildi
