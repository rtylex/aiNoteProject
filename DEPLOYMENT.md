# YirikAI - Windows Server Deployment Guide

## Hızlı Başlangıç

### 1. Gereksinimler
- Python 3.11+
- Node.js 18+
- Git

### 2. Kurulum

```powershell
# Projeyi klonla
git clone https://github.com/kullanici/yirik-ai.git
cd yirik-ai

# Backend kurulumu
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Frontend kurulumu
cd ..\frontend
npm install
```

### 3. Environment Ayarları

**Backend** (`backend\.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-key
GEMINI_API_KEY=your-gemini-key
DATABASE_URL=postgresql://user:pass@host:5432/db
ALLOWED_ORIGINS=http://232.32.32:3000,http://localhost:3000
```

**Frontend** (`frontend\.env.local`):
```env
NEXT_PUBLIC_API_URL=http://232.32.32:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Başlatma

Çift tıkla: `start-all.bat`

Veya ayrı ayrı:
- `start-backend.bat` → API (port 8000)
- `start-frontend.bat` → Web (port 3000)

### 5. Firewall

Windows Firewall'da şu portları aç:
- **3000** (Frontend)
- **8000** (Backend)

---

## Production İpuçları

1. `--reload` flag'ini `start-backend.bat`'tan kaldır
2. Frontend için `npm run build && npm start` kullan
3. NSSM ile Windows servisi oluştur
