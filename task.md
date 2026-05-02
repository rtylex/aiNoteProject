# aiNoteProject — Supabase'den VPS'e Taşıma Görev Listesi

> Bu dosya, projeyi Supabase bağımlılığından tamamen kurtarıp kendi VPS'ine taşımak için
> yapılacak tüm görevleri adım adım listeler. Her görev tamamlandığında `[x]` ile işaretlenecek.

---

## 🖥️ BÖLÜM A: VPS KURULUMU (Sunucu hazır olduğunda yapılacak)

- [x] **A1.** VPS'e SSH ile bağlanma ✅
- [x] **A2.** Sistem güncelleme (`apt update && apt upgrade`) ✅
- [x] **A3.** Docker ve Docker Compose kurulumu ✅
- [x] **A4.** PostgreSQL + pgvector Docker container'ı başlatma ✅
- [x] **A5.** Node.js 20 ve PM2 kurulumu ✅
- [x] **A6.** Python 3, pip ve venv kurulumu ✅
- [x] **A7.** Nginx kurulumu ✅
- [ ] **A8.** Projeyi sunucuya klonlama (`/var/www/aiNoteProject`)
- [ ] **A9.** Backend: venv oluştur, `pip install`, `.env` ayarla
- [ ] **A10.** Backend: `alembic upgrade head` ile veritabanı tablolarını oluştur
- [ ] **A11.** Backend: Systemd servisi oluştur (Gunicorn + Uvicorn worker)
- [ ] **A12.** Frontend: `npm install`, `.env` ayarla, `npm run build`
- [ ] **A13.** Frontend: PM2 ile başlat
- [ ] **A14.** Nginx reverse proxy ayarları (frontend → :3000, backend → :8000)
- [ ] **A15.** (Opsiyonel) Domain varsa SSL sertifikası kur (certbot)

---

## 🔐 BÖLÜM B: BACKEND — Kendi Auth Sistemimizi Yazma ✅ TAMAMLANDI

- [x] **B1.** `requirements.txt`'ye yeni bağımlılıklar eklendi: `passlib[bcrypt]`, `python-jose[cryptography]`
- [x] **B2.** `requirements.txt`'den `supabase` kütüphanesi silindi
- [x] **B3.** `backend/app/models/user.py` → `hashed_password` eklendi, `user_id` → `id` property olarak backward compat sağlandı
- [ ] **B4.** Yeni Alembic migration oluştur (users tablosu güncellemesi) — *VPS'te DB kurulunca yapılacak*
- [x] **B5.** `backend/app/core/config.py` → `SUPABASE_*` ayarları silindi, `SECRET_KEY`, `UPLOAD_DIR` eklendi
- [x] **B6.** `backend/app/services/auth.py` → JWT tabanlı auth sistemi yazıldı (hash, verify, create_token, get_current_user)
- [x] **B7.** `backend/app/api/endpoints/auth.py` → YENİ: `/register`, `/login`, `/me` endpoint'leri oluşturuldu
- [x] **B8.** `backend/app/api/api.py` → Auth router eklendi
- [x] **B9.** `backend/app/api/endpoints/documents.py` → `sync_user_profile()` silindi, `storage_security` importu kaldırıldı, `UserProfile.user_id` → `UserProfile.id`
- [x] **B10.** `backend/app/api/endpoints/admin.py` → Supabase metadata referansları temizlendi, `UserProfile.user_id` → `UserProfile.id`
- [x] **B11.** `backend/app/api/endpoints/setup.py` → `UserProfile.user_id` → `UserProfile.id`
- [x] **B11b.** `backend/app/api/endpoints/chat.py` → Tüm `UserProfile.user_id` → `UserProfile.id` güncellendi
- [x] **B11c.** `backend/app/db/session.py` → Supabase yorumları temizlendi

---

## 📁 BÖLÜM C: BACKEND — Dosya Depolama (Storage) Yerelleştirme ✅ TAMAMLANDI

- [x] **C1.** `backend/app/main.py` → FastAPI `StaticFiles` eklendi: `/uploads` yolu dışarıya sunuluyor
- [x] **C2.** `backend/app/api/endpoints/documents.py` → `upload_document()` dosyayı diske kaydediyor, gerçek URL dönüyor
- [x] **C3.** `backend/app/api/endpoints/documents.py` → `ensure_allowed_storage_url()` Supabase kontrolü kaldırıldı
- [x] **C4.** `backend/app/services/storage_security.py` → Yerel URL doğrulaması yazıldı
- [x] **C5.** `backend/app/services/pdf_service.py` → Yerel dosya yolu, HTTP URL ve /uploads/ path hepsi destekleniyor
- [ ] **C6.** `backend/app/api/endpoints/documents.py` → `delete_document()` fiziksel dosya silme — *opsiyonel, sonra eklenecek*

---

## 🖼️ BÖLÜM D: FRONTEND — Supabase Kütüphanesini Kaldırma ✅ TAMAMLANDI

- [x] **D1.** `npm uninstall @supabase/supabase-js @supabase/ssr` çalıştırıldı ✅
- [x] **D2.** `frontend/src/lib/supabase/client.ts` → Dosya ve klasör silindi
- [x] **D3.** `frontend/src/lib/auth-context.tsx` → JWT + localStorage tabanlı yeniden yazıldı (login, register, logout, me)
- [x] **D4.** `frontend/src/proxy.ts` (middleware) → Supabase SSR kaldırıldı, basit JWT token kontrolüne çevrildi
- [x] **D5.** `frontend/src/components/auth/login-form.tsx` → Kendi `/auth/login` ve `/auth/register` API'sine bağlandı
- [x] **D6.** `frontend/src/components/navbar.tsx` → `supabase.auth.signOut()` → `logout()`, `user_metadata` → `user.full_name`
- [x] **D7.** `frontend/src/components/documents/upload-modal.tsx` → Supabase Storage → FormData ile kendi backend'e upload
- [x] **D8.** `frontend/next.config.ts` → Supabase image remote pattern silindi
- [x] **D9.** `frontend/.env.example` ve `backend/.env.example` → Supabase ayarları silindi, yeni ayarlar eklendi
- [x] **D10.** `npm uninstall` çalıştırıldı — 12 paket kaldırıldı ✅

---

## ✅ BÖLÜM E: TEST VE DOĞRULAMA

- [ ] **E1.** Backend'i lokalde çalıştır, `/api/v1/auth/register` ve `/api/v1/auth/login` test et
- [ ] **E2.** Frontend'i lokalde çalıştır, kayıt ol / giriş yap akışını test et
- [ ] **E3.** PDF yükleme (upload) akışını test et (dosya diske kaydedilmeli)
- [ ] **E4.** Chat (AI soru-cevap) akışını test et
- [ ] **E5.** Admin paneli işlevlerini test et
- [ ] **E6.** Tüm testler geçtikten sonra VPS'e deploy et

---

## 📊 İLERLEME

| Bölüm | Toplam | Tamamlanan | Durum |
|-------|--------|-----------|-------|
| A — VPS Kurulumu | 15 | 0 | ⏳ Beklemede |
| B — Backend Auth | 13 | 12 | ✅ Tamamlandı (B4 DB'de yapılacak) |
| C — Backend Storage | 6 | 5 | ✅ Tamamlandı (C6 opsiyonel) |
| D — Frontend Supabase Kaldırma | 10 | 10 | ✅ Tamamlandı |
| E — Test | 6 | 0 | ⏳ Beklemede |
| **TOPLAM** | **50** | **27** | **%54 Tamamlandı** |
