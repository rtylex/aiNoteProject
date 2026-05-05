# Bitig — AI Destekli Akademik Çalışma Platformu

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Bitig** — PDF belgelerinizi yükleyin, yapay zeka ile analiz edin ve akademik konularda anında cevap alın.

Tekli & Çoklu Doküman Sohbeti · Topluluk Kütüphanesi · RAG Tabanlı Arama · OCR · Türkçe Odaklı

🌐 **Canlı Demo**: [bitig.site](https://bitig.site)

---

## 🚀 Proje Hakkında

**Bitig**, öğrenciler ve akademisyenler için geliştirilmiş, yapay zeka destekli bir öğrenme ve belge analiz platformudur. Kullanıcılar PDF dosyalarını yükleyerek:

- Tek bir doküman üzerinde **AI ile sohbet** edebilir,
- **Birden fazla dokümanı aynı anda** seçip karşılaştırmalı analiz yapabilir,
- Notlarını **topluluk kütüphanesinde** paylaşabilir ve başkalarının notlarına erişebilir,
- Günlük sorgu limitleri dahilinde **ücretsiz** kullanabilir.

Platform, **RAG (Retrieval-Augmented Generation)** mimarisi ile çalışır ve **Google Gemini** ile **DeepSeek** modellerini destekler. Tamamen kendi VPS'inizde barındırılabilir, bağımsız bir çözümdür (herhangi bir BaaS bağımlılığı yoktur).

---

## ✨ Özellikler

### 📄 Doküman Yönetimi
- **PDF Yükleme & İşleme**: Yüklenen PDF'ler otomatik olarak metne çıkarılır, vektörel embedding'e dönüştürülür ve PostgreSQL + pgvector'da saklanır.
- **OCR Desteği**: Normal metin çıkaramayan (taralı/taranmış) PDF'ler için DeepSeek Vision ve Gemini Vision ile OCR desteği.
- **Özel & Topluluk Modu**: Dokümanları sadece kendiniz için saklayabilir veya topluluk kütüphanesinde paylaşabilirsiniz.
- **Ders Sınıflandırması**: Paylaşılan ders dökümanları ders adı ve konu bazlı otomatik kategorize edilir.
- **Ders Dışı Kategoriler**: Makale, tez, kitap gibi akademik kaynaklar için admin tanımlı kategoriler.

### 🤖 AI Sohbet & RAG
- **Tekli Doküman Chat**: Bir PDF üzerinde doğal dilde sorular sorun, AI bağlamdan cevap versin.
- **Çoklu Doküman Chat (Multi-Chat)**: 2 ila 10 dokümanı aynı anda seçip karşılaştırmalı analiz, özet ve sınav sorusu hazırlama.
- **Akıllı Bağlam Seçimi (Hybrid Context)**: Küçük dokümanlarda tam metin, büyük dokümanlarda semantik arama (RAG) kullanılır.
- **Prompt Şablonları**: "Kısaca özetle", "Detaylı özetle", "Sınav sorusu hazırla", "Basitçe açıkla" gibi hazır şablonlar.
- **Çalışma Oturumları**: Çoklu chat'ler isimlendirip kaydedilebilir, daha sonra devam edilebilir.

### 🏛️ Topluluk Kütüphanesi
- **Ders Bazlı Keşif**: Ders adı → Konu → Doküman hiyerarşisi ile not keşfi.
- **Arama**: Başlık bazlı arama.
- **Çoklu Seçim**: Kütüphaneden birden fazla doküman seçip AI çalışması başlatma.
- **Rol Tabanlı Yükleme**: Sadece öğretmen ve admin rolleri ders dökümanı paylaşabilir.
- **Admin Onayı**: Topluluk paylaşımları admin onayından sonra yayına alınır.

### 🔐 Kimlik Doğrulama & Yetkilendirme
- **JWT Tabanlı Auth**: Tamamen kendi barındırmanızda çalışan, bağımsız auth sistemi (bcrypt + python-jose).
- **Rol Sistemi**: `user`, `teacher`, `admin` rolleri.
- **Admin Paneli**: Onay kuyruğu, kullanıcı yönetimi, kategori CRUD, istatistikler.
- **İlk Admin Kurulumu**: Sistemde admin yoksa, ilk kayıtlı kullanıcı kendini admin yapabilir (`/setup/make-me-admin`).

### ⚡ Performans & Optimizasyon
- **DeepSeek Prefix Caching**: Çoklu doküman chat'lerinde sabit bağlam önbelleğe alınarak maliyet %90 azaltılır.
- **Connection Pooling**: SQLAlchemy QueuePool ile PostgreSQL bağlantı havuzu.
- **N+1 Önleme**: Eager loading (`joinedload`, `selectinload`) ile veritabanı sorguları optimize edilmiştir.
- **Rate Limiting**: Kullanıcı başına günlük 10 sorgu limiti.

---

## 🛠️ Teknoloji Yığını

### Frontend
| Teknoloji | Açıklama |
|-----------|----------|
| **Next.js 16** | React framework (App Router) |
| **React 19** | UI kütüphanesi |
| **Tailwind CSS 4** | Utility-first CSS |
| **Radix UI** | Headless UI component'leri (Dialog, Dropdown, Tabs, vb.) |
| **Framer Motion** | Animasyonlar |
| **react-markdown** | AI yanıtlarını Markdown olarak render etme |

### Backend
| Teknoloji | Açıklama |
|-----------|----------|
| **FastAPI** | Python async web framework |
| **SQLAlchemy** | ORM |
| **Alembic** | Veritabanı migration |
| **PostgreSQL + pgvector** | Vektörel veritabanı (768-dim embeddings) |
| **Google Gemini 2.5 Flash** | Embedding & OCR & yanıt üretimi |
| **DeepSeek V3 / VL2** | Ekonomik chat & OCR modelleri |
| **PyMuPDF / pypdf** | PDF işleme |

### Altyapı
| Teknoloji | Açıklama |
|-----------|----------|
| **VPS / Docker** | Kendi sunucunuzda barındırma |
| **Nginx** | Reverse proxy |
| **PM2** | Frontend process manager |
| **Gunicorn + Uvicorn** | ASGI/WSGI sunucusu |

---

## 📁 Proje Yapısı

```
aiNoteProject/
├── backend/                          # FastAPI Backend
│   ├── app/
│   │   ├── api/endpoints/            # API route'ları
│   │   │   ├── auth.py               # JWT auth (login, register, me)
│   │   │   ├── documents.py          # Doküman CRUD, upload, public listing
│   │   │   ├── chat.py               # Tekli & çoklu chat, RAG logic
│   │   │   ├── admin.py              # Admin panel endpoints
│   │   │   └── setup.py              # İlk admin kurulumu
│   │   ├── core/config.py            # Uygulama ayarları (.env)
│   │   ├── db/session.py             # PostgreSQL bağlantı havuzu
│   │   ├── models/                   # SQLAlchemy modelleri
│   │   │   ├── user.py               # Kullanıcı, rol, sorgu limiti
│   │   │   ├── document.py           # Doküman, embedding, kategori
│   │   │   └── chat.py               # Chat session & mesajlar
│   │   └── services/                 # İş mantığı servisleri
│   │       ├── auth.py               # Password hash, JWT encode/decode
│   │       ├── ai_service.py         # AI model routing (Gemini / DeepSeek)
│   │       ├── gemini_service.py     # Gemini embedding, OCR, chat
│   │       ├── deepseek_service.py   # DeepSeek chat & cache optimization
│   │       ├── pdf_service.py        # PDF işleme pipeline
│   │       └── query_limit.py        # Günlük sorgu limit takibi
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                         # Next.js Frontend
│   ├── src/app/                      # App Router sayfaları
│   │   ├── page.tsx                  # Landing page
│   │   ├── login/page.tsx            # Giriş / Kayıt
│   │   ├── dashboard/page.tsx        # Kütüphanem & Çoklu Çalışmalar
│   │   ├── chat/[id]/page.tsx        # Tekli doküman chat
│   │   ├── multi-chat/page.tsx       # Çoklu doküman chat
│   │   ├── library/page.tsx          # Topluluk kütüphanesi
│   │   └── admin/page.tsx            # Admin paneli
│   ├── src/components/
│   │   ├── chat/                     # Chat arayüzleri
│   │   ├── documents/                # Upload modal, PDF viewer
│   │   ├── auth/                     # Login form, side panel
│   │   ├── ui/                       # shadcn/ui bileşenleri
│   │   ├── navbar.tsx                # Üst navigasyon
│   │   └── typewriter-text.tsx       # Landing animasyonu
│   ├── src/lib/
│   │   ├── auth-context.tsx          # React auth context (JWT + localStorage)
│   │   └── api-config.ts             # API base URL
│   └── .env.example
│
└── task.md                           # Görev listesi (VPS taşıma)
```

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+ (pgvector uzantısı kurulu olmalı)
- VPS / Cloud sunucu (opsiyonel, lokalde de çalışır)

### 1. Veritabanı Kurulumu

```bash
# PostgreSQL'de veritabanı ve kullanıcı oluşturun
sudo -u postgres psql -c "CREATE DATABASE ainote_db;"
sudo -u postgres psql -c "CREATE USER ainote_user WITH PASSWORD 'guclu_sifre';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ainote_db TO ainote_user;"

# pgvector uzantısını etkinleştirin
sudo -u postgres psql -d ainote_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 2. Backend Kurulumu

```bash
cd backend

# Virtual environment oluşturun
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt

# .env dosyasını oluşturun
cp .env.example .env
# .env dosyasını düzenleyin (API anahtarları, veritabanı URL, JWT secret)

# Alembic migration çalıştırın
alembic upgrade head

# Sunucuyu başlatın (geliştirme)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production (Gunicorn + Uvicorn worker)
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000
```

### 3. Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükleyin
npm install

# .env dosyasını oluşturun
cp .env.example .env.local
# NEXT_PUBLIC_API_URL'yi backend adresinize göre ayarlayın

# Geliştirme sunucusu
npm run dev

# Production build
npm run build
npm start
```

### 4. İlk Admin Kurulumu

1. Uygulamayı açın ve bir hesap oluşturun (register).
2. `/admin` sayfasına gidin.
3. "Admin Olarak Ata" butonuna tıklayın (sistemde admin yoksa çalışır).
4. Admin panelinden kullanıcı rollerini ve kategorileri yönetebilirsiniz.

---

## ⚙️ Ortam Değişkenleri

### Backend (`backend/.env`)

```env
# Veritabanı
DATABASE_URL=postgresql://ainote_user:password@localhost:5432/ainote_db

# JWT
SECRET_KEY=your-64-char-hex-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 gün

# AI API Anahtarları
GEMINI_API_KEY=your-gemini-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key  # Opsiyonel

# Sunucu & CORS
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Dosya Depolama
UPLOAD_DIR=uploads
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🧠 Mimari Detaylar

### RAG & Hybrid Context Strategy

Sistem, doküman boyutuna göre iki farklı bağlam modu kullanır:

1. **Full Document Mode** (Küçük dokümanlar): Tüm metin bağlam olarak AI'a gönderilir. DeepSeek için prefix caching ile maliyet optimize edilir.
2. **RAG Mode** (Büyük dokümanlar): Kullanıcı sorusu vektörel embedding'e dönüştürülür, pgvector'da cosine similarity ile en yakın 5 chunk getirilir.

| Model | Token Eşiği (Tekli) | Token Eşiği (Çoklu) |
|-------|---------------------|---------------------|
| DeepSeek | 25.000 | 37.500 |
| Gemini | 100.000 | 150.000 |

### AI Servis Katmanı

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AI Service    │────▶│  DeepSeekService │     │  GeminiService  │
│   (Router)      │     │  (Cache Optimized│────▶│  (Fallback)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

- **DeepSeek**: Varsayılan model. Ucuz, hızlı. Prefix caching destekler.
- **Gemini**: Fallback ve embedding için kullanılır. 1M token context penceresi.

### Embedding Pipeline

```
PDF Upload → pypdf metin çıkarma → (Yetersizse OCR: DeepSeek Vision → Gemini Vision)
    ↓
Metin chunk'lara bölünür → Gemini Embedding-001 (768-dim) → pgvector
```

### Auth Akışı

```
Register/Login → bcrypt hash → JWT (HS256, 7 gün)
    ↓
Frontend: localStorage + Cookie (SameSite=Lax)
    ↓
Protected endpoints: HTTP Bearer token → verify_token → get_current_user
```

---

## 📡 API Özeti

Tüm API'ler `/api/v1` prefix'i altındadır.

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/auth/register` | Yeni hesap oluştur |
| POST | `/auth/login` | Giriş yap, JWT al |
| GET | `/auth/me` | Mevcut kullanıcı bilgisi |

### Dokümanlar
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/documents/upload` | Dosya yükle (FormData) |
| POST | `/documents/` | Doküman metadata oluştur |
| GET | `/documents/` | Kendi dokümanlarını listele |
| GET | `/documents/public` | Onaylı public dokümanlar |
| GET | `/documents/courses` | Ders listesi |
| GET | `/documents/{id}` | Doküman detayı |
| DELETE | `/documents/{id}` | Doküman sil |

### Chat
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/chat/message` | Tekli dokümana mesaj gönder |
| GET | `/chat/history/{doc_id}` | Chat geçmişi |
| POST | `/chat/multi-document/session` | Çoklu çalışma oturumu oluştur |
| GET | `/chat/multi-document/sessions` | Oturumları listele |
| POST | `/chat/multi-document/session/{id}/message` | Oturuma mesaj gönder |

### Admin (Admin rolü gerektirir)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/admin/stats` | Dashboard istatistikleri |
| GET | `/admin/documents/pending` | Onay bekleyen dokümanlar |
| PUT | `/admin/documents/{id}/approve` | Doküman onayla |
| PUT | `/admin/documents/{id}/reject` | Doküman reddet |
| GET | `/admin/users` | Kullanıcı listesi |
| PUT | `/admin/users/{id}/role` | Rol güncelle |
| CRUD | `/admin/categories` | Kategori yönetimi |

---

## 🖥️ Ekran Görüntüleri

> *(Ekran görüntüleri buraya eklenebilir)*

| Landing Page | Dashboard | Multi-Chat |
|--------------|-----------|------------|
| ![Landing](screenshots/landing.png) | ![Dashboard](screenshots/dashboard.png) | ![MultiChat](screenshots/multichat.png) |

| Library | Admin Panel | Login |
|---------|-------------|-------|
| ![Library](screenshots/library.png) | ![Admin](screenshots/admin.png) | ![Login](screenshots/login.png) |

---

## 🗺️ Yol Haritası (Ideas)

- [ ] Ödeme sistemi (Stripe) ile premium planlar
- [ ] Favori dokümanlar & kişisel koleksiyonlar
- [ ] AI üretken çalışma kartları (flashcard) oluşturma
- [ ] Doküman içi referans gösterme (hangi sayfadan cevap verdiğini belirtme)
- [ ] WebSocket desteği ile gerçek zamanlı yazma animasyonu
- [ ] Redis cache katmanı
- [ ] Sentry / LogRocket ile hata izleme

---

## 🤝 Katkıda Bulunma

1. Bu repoyu fork edin.
2. Yeni bir branch oluşturun: `git checkout -b feature/amazing-feature`
3. Değişikliklerinizi commit edin: `git commit -m 'feat: add amazing feature'`
4. Push edin: `git push origin feature/amazing-feature`
5. Bir Pull Request açın.

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.

---

<div align="center">
  <p><strong>Bitig</strong> — Yapay Zeka ile Daha Akıllı Çalışın 🎓</p>
</div>
