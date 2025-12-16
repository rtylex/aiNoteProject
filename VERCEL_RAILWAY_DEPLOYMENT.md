# YirikAI - Vercel + Railway Deployment Rehberi

Bu rehber, YirikAI projesini **Vercel** (frontend) ve **Railway** (backend) üzerinde yayınlamak için adım adım açıklamalar içerir.

---

## 📋 Genel Bakış

| Bileşen | Platform | URL Formatı |
|---------|----------|-------------|
| Frontend | Vercel | `https://yirikai-xxx.vercel.app` |
| Backend | Railway | `https://yirikai-backend-xxx.up.railway.app` |

---

## AŞAMA 1: Backend'i Railway'e Deploy Etme

### 1.1 Projeyi GitHub'a Yükle
```bash
cd aiNoteProject
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 1.2 Railway'de Yeni Proje Oluştur
1. [railway.app](https://railway.app) → Dashboard
2. **"New Project"** tıkla
3. **"Deploy from GitHub repo"** seç
4. GitHub hesabını bağla ve **aiNoteProject** repo'sunu seç

### 1.3 Backend Servisini Yapılandır
1. Proje oluştuktan sonra **"Add Service"** → **"GitHub Repo"**
2. Aynı repo'yu seç
3. ⚠️ **ÖNEMLİ:** Settings → **Root Directory** = `backend` yap

### 1.4 Environment Variables Ekle
Railway proje sayfasında **Variables** sekmesine git:

```
SUPABASE_URL=https://uqlnbzvslabbdprveiju.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:6543/postgres
GEMINI_API_KEY=AIzaSy...
ALLOWED_ORIGINS=http://localhost:3000
```

> 💡 **Not:** ALLOWED_ORIGINS'e Vercel URL'ini ekleyeceğiz (frontend deploy olduktan sonra)

### 1.5 Deploy Et
Railway otomatik olarak deploy edecek. Logs sekmesinden takip edebilirsin.

### 1.6 Backend URL'ini Kopyala
Deploy tamamlanınca **Settings** → **Domains** bölümünden URL'i kopyala:
```
https://xxx.up.railway.app
```

---

## AŞAMA 2: Frontend'i Vercel'e Deploy Etme

### 2.1 Vercel'e Git
1. [vercel.com](https://vercel.com) → Sign Up (GitHub ile)
2. **"Add New Project"** tıkla
3. GitHub'dan **aiNoteProject** repo'sunu seç

### 2.2 Frontend'i Yapılandır
1. **Root Directory** = `frontend` yap
2. **Framework Preset** = Next.js (otomatik algılar)

### 2.3 Environment Variables Ekle
```
NEXT_PUBLIC_API_URL=https://xxx.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://uqlnbzvslabbdprveiju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **`NEXT_PUBLIC_API_URL`** = Railway'den aldığın backend URL'i

### 2.4 Deploy Et
**"Deploy"** butonuna tıkla. 2-3 dakika içinde tamamlanır.

### 2.5 Frontend URL'ini Kopyala
```
https://xxx.vercel.app
```

---

## AŞAMA 3: CORS Ayarını Güncelle

Frontend deploy olduktan sonra, backend'in CORS ayarını güncelle:

1. Railway → Backend servisi → **Variables**
2. `ALLOWED_ORIGINS` değişkenini güncelle:
```
ALLOWED_ORIGINS=http://localhost:3000,https://xxx.vercel.app
```
3. Railway otomatik redeploy yapacak

---

## ✅ Test Etme

### Backend Test
Tarayıcıda aç:
```
https://xxx.up.railway.app/
```
Görmen gereken:
```json
{"message": "Welcome to YirikAI API", "version": "1.0.0"}
```

### Frontend Test
```
https://xxx.vercel.app/
```
- Ana sayfa yüklenmeli
- Login/Register çalışmalı
- Doküman yükleme çalışmalı

---

## 🔧 Sorun Giderme

### "CORS Error"
- Railway'de `ALLOWED_ORIGINS` doğru mu kontrol et
- Vercel URL'i `https://` ile başlamalı

### "Failed to fetch"
- Backend çalışıyor mu? Railway logs'ları kontrol et
- `NEXT_PUBLIC_API_URL` doğru mu?

### "Build Failed" (Vercel)
- Root Directory = `frontend` mi?
- `npm run build` lokalde çalışıyor mu?

### "Build Failed" (Railway)
- Root Directory = `backend` mi?
- `requirements.txt` güncel mi?

---

## 📝 Ortam Değişkenleri Özeti

### Railway (Backend)
| Değişken | Açıklama |
|----------|----------|
| `SUPABASE_URL` | Supabase proje URL'i |
| `SUPABASE_KEY` | Supabase service role key |
| `DATABASE_URL` | PostgreSQL bağlantı string'i |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ALLOWED_ORIGINS` | İzin verilen frontend URL'leri |

### Vercel (Frontend)
| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | Railway backend URL'i |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

---

*Son güncelleme: Aralık 2024*
