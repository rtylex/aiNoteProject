# 📋 Flashcard (Çalışma Kartları) Özelliği — Uygulama Planı

> **Proje**: Bitig — AI Destekli Akademik Çalışma Platformu
> **Özellik**: PDF'den ve Multi-Session'dan Flashcard Oluşturma & Çalışma
> **Tarih**: 05.05.2026

---

## 🎯 Özellik Tanımı

Kullanıcı, yüklediği PDF dokümanından veya çoklu doküman oturumundan yapay zeka destekli flashcard setleri oluşturabilir, kartları çevirerek öğrenebilir ve spaced repetition (aralıklı tekrar) sistemi ile bilgilerini pekiştirebilir.

### Temel Gereksinimler

| # | Gereksinim | Detay |
|---|-----------|-------|
| 1 | **Kart Formatı** | Ön (soru/terim) ve arka (cevap/tanım) |
| 2 | **Otomatik Oluşturma** | AI PDF içeriğinden flashcard çıkarsın |
| 3 | **Multi-Session Desteği** | Çoklu doküman oturumlarından da flashcard oluşturulabilsin |
| 4 | **Manuel Oluşturma** | Kullanıcı kendi kartlarını da ekleyebilsin |
| 5 | **Kart Çevirme** | 3D flip animasyonu ile kart çevirme |
| 6 | **Spaced Repetition** | SM-2 algoritması ile akıllı tekrar planı |
| 7 | **İlerleme Takibi** | Bilme/Bilmeme/Tekrar durumları |
| 8 | **Geçmiş** | Tüm setler saklanacak, "Flashcard'larım" sekmesinden erişilebilecek |
| 9 | **Paylaşım** | Setler toplulukla paylaşılabilir (public link) |

### Kapsam Dışı (İleride Eklenebilir)

- ❌ Çoklu doküman flashcard setleri (aynı anda birden fazla PDF)
- ❌ Sesli flashcard (TTS ile okuma)
- ❌ İstatistik dashboard (haftalık/aylık ilerleme grafikleri)
- ❌ Arkadaşlarla paylaşma ve yarışma modu

---

## 📁 Dosya Değişiklik Planı

### Backend

#### 🆕 Yeni Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `backend/app/models/flashcard.py` | `FlashcardSet`, `Flashcard`, `FlashcardProgress` SQLAlchemy modelleri |
| `backend/app/api/endpoints/flashcard.py` | Flashcard CRUD endpoint'leri |
| `backend/app/services/flashcard_service.py` | AI flashcard üretme servisi + SM-2 algoritması |

#### ✏️ Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `backend/app/api/api.py` | Flashcard router'ı ekle |
| `backend/app/models/__init__.py` | Flashcard modellerini import et |
| `backend/app/models/document.py` | `flashcard_sets` relationship ekle |
| `backend/alembic/env.py` | Flashcard modelini import et |

#### 🗄️ Yeni Tablolar

**`flashcard_sets` tablosu:**

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | Birincil anahtar |
| `user_id` | UUID | Seti oluşturan kullanıcı |
| `document_id` | UUID FK | Nullable, doküman bazlı ise |
| `session_id` | UUID FK | Nullable, multi-session bazlı ise |
| `title` | String(255) | "Fizik - Termodinamik Kartları" |
| `description` | Text | Opsiyonel açıklama |
| `card_count` | Integer | Toplam kart sayısı |
| `is_public` | Boolean | Default `false` |
| `created_at` | DateTime | Oluşturma tarihi |
| `updated_at` | DateTime | Güncelleme tarihi |

**`flashcards` tablosu:**

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | Birincil anahtar |
| `set_id` | UUID FK | CASCADE silme |
| `front` | Text | Soru/terim (ön yüz) |
| `back` | Text | Cevap/tanım (arka yüz) |
| `order_num` | Integer | Sıra numarası |

**`flashcard_progress` tablosu (Spaced Repetition):**

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | Birincil anahtar |
| `user_id` | UUID | Kullanıcı |
| `flashcard_id` | UUID FK | CASCADE silme |
| `ease_factor` | Float | SM-2 zorluk faktörü (varsayılan 2.5) |
| `interval` | Integer | Gün cinsinden tekrar aralığı |
| `repetitions` | Integer | Başarılı tekrar sayısı |
| `next_review` | DateTime | Bir sonraki tekrar tarihi |
| `last_reviewed` | DateTime | Son tekrar tarihi |
| `status` | String | `new`, `learning`, `review`, `mastered` |

#### 📡 Endpoint'ler

| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| `POST` | `/api/v1/flashcard/generate` | PDF'den flashcard seti oluştur | ✅ |
| `POST` | `/api/v1/flashcard/generate-from-session` | Multi-session'dan flashcard seti oluştur | ✅ |
| `POST` | `/api/v1/flashcard/` | Manuel flashcard seti oluştur | ✅ |
| `GET` | `/api/v1/flashcard/` | Kullanıcının setlerini listele | ✅ |
| `GET` | `/api/v1/flashcard/{set_id}` | Set detayı + kartlar | ✅ |
| `POST` | `/api/v1/flashcard/{set_id}/cards` | Sete kart ekle | ✅ |
| `PUT` | `/api/v1/flashcard/card/{card_id}` | Kartı güncelle | ✅ |
| `DELETE` | `/api/v1/flashcard/card/{card_id}` | Kartı sil | ✅ |
| `DELETE` | `/api/v1/flashcard/{set_id}` | Seti sil | ✅ |
| `PATCH` | `/api/v1/flashcard/{set_id}/share` | Toplulukla paylaş | ✅ |
| `GET` | `/api/v1/flashcard/public` | Public setleri listele | ❌ |
| `POST` | `/api/v1/flashcard/card/{card_id}/review` | Kart tekrar kaydı (SM-2) | ✅ |
| `GET` | `/api/v1/flashcard/{set_id}/study` | Tekrar için kartları getir | ✅ |
| `GET` | `/api/v1/flashcard/stats` | Kullanıcı istatistikleri | ✅ |

#### 🤖 AI Prompt Taslağı

```
Sen akademik flashcard hazırlama uzmanısın. Aşağıdaki ders içeriğinden
{kart_sayısı} adet çalışma kartı hazırla.

KURALLAR:
- Türkçe kartlar hazırla
- Her kartın önü: Kısa ve net bir soru veya terim
- Her kartın arkası: Açık ve anlaşılır cevap veya tanım
- Kartlar birbirinden bağımsız olmalı
- Zorluk seviyesi: orta
- Kavramsal sorular ve tanımlar dengeli olmalı

JSON formatında dön:
{
  "cards": [
    {
      "front": "Newton'un birinci yasası nedir?",
      "back": "Bir cisim üzerine net kuvvet etki etmiyorsa, cisim duruyorsa durmaya, hareket ediyorsa sabit hızla doğrusal harekete devam eder."
    },
    {
      "front": "Termodinamiğin birinci yasası",
      "back": "Enerji yoktan var edilemez ve vardan yok edilemez; yalnızca bir biçimden diğerine dönüşebilir. ΔU = Q - W"
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
| `frontend/src/app/flashcard/page.tsx` | Flashcard setleri listesi sayfası |
| `frontend/src/app/flashcard/[id]/page.tsx` | Set detay + çalışma sayfası |
| `frontend/src/components/flashcard/create-flashcard-modal.tsx` | Set oluşturma modal'ı |
| `frontend/src/components/flashcard/flashcard-flip.tsx` | 3D kart çevirme bileşeni |
| `frontend/src/components/flashcard/study-mode.tsx` | Çalışma modu (spaced repetition) |
| `frontend/src/components/flashcard/flashcard-stats.tsx` | İlerleme istatistikleri |
| `frontend/src/components/flashcard/delete-flashcard-dialog.tsx` | Silme onay dialog'u |
| `frontend/src/components/flashcard/add-card-modal.tsx` | Manuel kart ekleme modal'ı |

#### ✏️ Değişecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `frontend/src/app/dashboard/page.tsx` | "Flashcard'larım" sekmesi + doküman kartına "Flashcard Oluştur" butonu + multi-session kartına "Flashcard Oluştur" butonu |
| `frontend/src/components/navbar.tsx` | "Flashcards" navigasyon linki |

---

## 🎨 UI/UX Akış

### 1. Flashcard Oluşturma Akışı (PDF'den)

```
Kullanıcı Dashboard → Doküman Kartı → "Flashcard Oluştur" butonu
    ↓
Modal açılır:
┌─────────────────────────────────────────┐
│  📚 Flashcard Oluştur                   │
│                                         │
│  Doküman: "Fizik Dersi Notları.pdf"     │
│                                         │
│  AI 20 kart öneriyor.                   │
│  Kart Sayısı: [-] 20 [+]               │
│  (Min: 5, Max: 50)                      │
│                                         │
│  [İptal]  [Seti Oluştur]               │
└─────────────────────────────────────────┘
    ↓
Loading: "Kartlar hazırlanıyor..."
    ↓
/flashcard/{set_id} sayfasına yönlendir
```

### 2. Flashcard Oluşturma Akışı (Multi-Session'dan)

```
Kullanıcı Dashboard → Multi-Session Kartı → "Flashcard Oluştur" butonu
    ↓
Modal açılır:
┌─────────────────────────────────────────┐
│  📚 Flashcard Oluştur                   │
│                                         │
│  Oturum: "Fizik + Matematik Çalışması"  │
│  (3 doküman birleştirilecek)            │
│                                         │
│  AI 25 kart öneriyor.                   │
│  Kart Sayısı: [-] 25 [+]               │
│  (Min: 5, Max: 50)                      │
│                                         │
│  [İptal]  [Seti Oluştur]               │
└─────────────────────────────────────────┘
    ↓
Loading: "Kartlar hazırlanıyor..."
    ↓
/flashcard/{set_id} sayfasına yönlendir
```

### 3. Set Detay Sayfası

```
/flashcard/{set_id} sayfası
    ↓
┌─────────────────────────────────────────┐
│  ← Geri    Fizik - Termodinamik         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  20 kart  ·  12 yeni  ·  5 öğren│    │
│  │  3 mastered  ·  %75 tamamlandı   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Çalışmaya Başla]  [Kartları Düzenle]  │
│  [Paylaş]  [Sil]                        │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Kartlar:                               │
│  ┌────────────────┐ ┌────────────────┐  │
│  │ Newton'un 1.yasa│ │ Termodinamik   │  │
│  │ ○ Yeni         │ │ ● Öğreniliyor  │  │
│  └────────────────┘ └────────────────┘  │
└─────────────────────────────────────────┘
```

### 4. Çalışma Modu (Flip Animasyonu)

```
/flashcard/{set_id}?mode=study
    ↓
┌─────────────────────────────────────────┐
│  Kart 5/20                    [████░░]  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   Newton'un birinci yasası      │    │
│  │   nedir?                        │    │
│  │                                 │    │
│  │      [Kartı Çevirmek İçin      │    │
│  │           Tıklayın]             │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Önceki]              [Sonraki]        │
└─────────────────────────────────────────┘

Kart çevrilince (3D flip animasyonu):
┌─────────────────────────────────────────┐
│  Kart 5/20                    [████░░]  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   Bir cisim üzerine net kuvvet  │    │
│  │   etki etmiyorsa, cisim         │    │
│  │   duruyorsa durmaya, hareket    │    │
│  │   ediyorsa sabit hızla          │    │
│  │   doğrusal harekete devam eder. │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Bu kartı ne kadar iyi biliyorsunuz?    │
│                                         │
│  [1]   [2]   [3]   [4]   [5]           │
│  Tekrar  Zor  Orta  İyi  Mükemmel      │
└─────────────────────────────────────────┘
```

### 5. Dashboard: Flashcard'larım Sekmesi

```
Dashboard → "Flashcard'larım" sekmesi
    ↓
┌─────────────────────────────────────────┐
│  Flashcard'larım (3)          [Yeni Set]│
│                                         │
│  ┌─────────────────┐ ┌─────────────────┐│
│  │ Fizik Kartları  │ │ Matematik       ││
│  │ 20 kart         │ │ 15 kart         ││
│  │ %75 tamamlandı  │ │ %40 tamamlandı  ││
│  │ ████████░░░░    │ │ █████░░░░░░░    ││
│  │ [Çalış] [Düzenle]│ │ [Çalış] [Düzenle]││
│  └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────┘
```

---

## 🔧 Teknik Detaylar

### SM-2 Spaced Repetition Algoritması

```python
def calculate_sm2(quality: int, card_progress: FlashcardProgress):
    """
    quality: 0-5 arası (0=hiç bilinmiyor, 5=mükemmel)
    """
    if quality >= 3:  # Başarılı
        if card_progress.repetitions == 0:
            card_progress.interval = 1
        elif card_progress.repetitions == 1:
            card_progress.interval = 6
        else:
            card_progress.interval = round(card_progress.interval * card_progress.ease_factor)
        card_progress.repetitions += 1
    else:  # Başarısız
        card_progress.repetitions = 0
        card_progress.interval = 1

    # Ease factor güncelle
    card_progress.ease_factor = max(1.3,
        card_progress.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    # Sonraki tekrar tarihi
    card_progress.next_review = datetime.utcnow() + timedelta(days=card_progress.interval)
    card_progress.last_reviewed = datetime.utcnow()

    # Durum güncelle
    if card_progress.repetitions >= 5 and card_progress.interval >= 21:
        card_progress.status = "mastered"
    elif card_progress.repetitions >= 2:
        card_progress.status = "review"
    else:
        card_progress.status = "learning"
```

### API İstek/Response Örnekleri

**PDF'den Flashcard Oluşturma:**

```http
POST /api/v1/flashcard/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_id": "uuid-buraya",
  "card_count": 20
}
```

```json
{
  "set_id": "uuid",
  "title": "Fizik Dersi Notları - Flashcard",
  "card_count": 20,
  "cards": [
    {
      "id": "uuid",
      "front": "Newton'un birinci yasası nedir?",
      "back": "Bir cisim üzerine net kuvvet etki etmiyorsa...",
      "order": 1
    }
  ]
}
```

**Multi-Session'dan Flashcard Oluşturma:**

```http
POST /api/v1/flashcard/generate-from-session
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_id": "uuid-buraya",
  "card_count": 25
}
```

```json
{
  "set_id": "uuid",
  "title": "Fizik + Matematik Çalışması - Flashcard",
  "card_count": 25,
  "cards": [
    {
      "id": "uuid",
      "front": "Newton'un birinci yasası nedir?",
      "back": "Bir cisim üzerine net kuvvet etki etmiyorsa...",
      "order": 1
    }
  ]
}
```

**Kart Tekrar Kaydı:**

```http
POST /api/v1/flashcard/card/{card_id}/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "quality": 4
}
```

```json
{
  "card_id": "uuid",
  "next_review": "2026-05-08T12:00:00Z",
  "interval": 3,
  "status": "learning"
}
```

### Rate Limiting

Flashcard oluşturma = 1 sorgu olarak sayılacak. Mevcut günlük 10 sorgu limitine tabi.

### Erişim Kontrolü

Kullanıcı sadece kendi setlerini görebilir/çalışabilir. Admin'ler tüm setleri görebilir.

---

## 📅 Uygulama Sırası

```
Adım 1: Backend — Model + Migration
  └─ models/flashcard.py oluştur (FlashcardSet, Flashcard, FlashcardProgress)
  └─ models/__init__.py'ye ekle
  └─ alembic/env.py'ye ekle
  └─ alembic revision --autogenerate
  └─ alembic upgrade head

Adım 2: Backend — AI Servisi
  └─ services/flashcard_service.py oluştur
  └─ AI prompt + JSON parsing
  └─ SM-2 algoritması implementasyonu
  └─ extract_document_content() fonksiyonu
  └─ extract_session_content() fonksiyonu

Adım 3: Backend — Endpoint'ler
  └─ api/endpoints/flashcard.py oluştur
  └─ generate, generate-from-session, CRUD, review endpoint'leri
  └─ api/api.py'ye router ekle

Adım 4: Frontend — Flashcard Flip Bileşeni
  └─ components/flashcard/flashcard-flip.tsx
  └─ 3D flip animasyonu (framer-motion)

Adım 5: Frontend — Oluşturma Modal'ı
  └─ components/flashcard/create-flashcard-modal.tsx
  └─ PDF ve multi-session desteği
  └─ Dashboard'daki doküman kartına buton ekle
  └─ Dashboard'daki multi-session kartına buton ekle

Adım 6: Frontend — Set Detay + Çalışma Sayfası
  └─ app/flashcard/[id]/page.tsx
  └─ components/flashcard/study-mode.tsx
  └─ SM-2 butonları (1-5 arası puan)

Adım 7: Frontend — Flashcard Listesi + Dashboard Entegrasyonu
  └─ app/flashcard/page.tsx
  └─ Dashboard'a "Flashcard'larım" sekmesi ekle
  └─ navbar.tsx'ye link ekle

Adım 8: Frontend — İstatistikler
  └─ components/flashcard/flashcard-stats.tsx
  └─ İlerleme çubuğu, kart durumları

Adım 9: Entegrasyon Testi
  └─ Lokalde tüm akışı test et
  └─ Edge case'leri kontrol et

Adım 10: Deploy
  └─ git push
  └─ VPS'te: git pull, alembic upgrade, build, restart
```

---

## ⏱️ Tahmini Süre

| Adım | Tahmini |
|------|---------|
| Backend: Model + Migration | 1 saat |
| Backend: AI Servisi + SM-2 | 2-3 saat |
| Backend: Endpoint'ler | 2 saat |
| Frontend: Flashcard Flip Bileşeni | 1-2 saat |
| Frontend: Oluşturma Modal'ı | 1 saat |
| Frontend: Set Detay + Çalışma Sayfası | 3-4 saat |
| Frontend: Listesi + Dashboard | 2 saat |
| Frontend: İstatistikler | 1-2 saat |
| Entegrasyon Testi | 1-2 saat |
| Deploy | 30 dk |
| **Toplam** | **~15-18 saat (2-2.5 gün)** |

---

## ✅ Kontrol Listesi

### Backend
- [ ] `backend/app/models/flashcard.py` — Modeller oluşturuldu
- [ ] `backend/app/models/__init__.py` — Import eklendi
- [ ] `backend/alembic/env.py` — Import eklendi
- [ ] Alembic migration çalıştırıldı
- [ ] `backend/app/services/flashcard_service.py` — AI servisi + SM-2 oluşturuldu
- [ ] `backend/app/api/endpoints/flashcard.py` — Endpoint'ler oluşturuldu
- [ ] `backend/app/api/api.py` — Router eklendi

### Frontend
- [ ] `frontend/src/components/flashcard/flashcard-flip.tsx` — Flip bileşeni oluşturuldu
- [ ] `frontend/src/components/flashcard/create-flashcard-modal.tsx` — Modal oluşturuldu
- [ ] `frontend/src/app/flashcard/[id]/page.tsx` — Çalışma sayfası oluşturuldu
- [ ] `frontend/src/components/flashcard/study-mode.tsx` — Çalışma modu oluşturuldu
- [ ] `frontend/src/app/flashcard/page.tsx` — Liste sayfası oluşturuldu
- [ ] `frontend/src/app/dashboard/page.tsx` — "Flashcard'larım" sekmesi eklendi
- [ ] `frontend/src/app/dashboard/page.tsx` — Doküman kartına "Flashcard Oluştur" butonu eklendi
- [ ] `frontend/src/app/dashboard/page.tsx` — Multi-session kartına "Flashcard Oluştur" butonu eklendi
- [ ] `frontend/src/components/navbar.tsx` — Navigasyon linki eklendi

### Test & Deploy
- [ ] Lokalde test edildi
- [ ] VPS'e deploy edildi
