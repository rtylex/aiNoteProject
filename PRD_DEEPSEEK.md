# DeepSeek Entegrasyonu - Ekonomik AI Modu

PDF sohbetlerinde maliyet tasarrufu sağlamak için DeepSeek alternatifinin eklenmesi. Embedding ve OCR işlemleri Gemini'de kalırken, chat/soru-cevap kısmında kullanıcıya model seçimi sunulacak.

## Mevcut Durum Analizi

| İşlem | Mevcut Model | Değişiklik |
|-------|-------------|------------|
| Metin çıkarma (normal PDF) | PyPDF | Değişmeyecek |
| OCR (taranmış PDF) | Gemini 2.5 Flash | Değişmeyecek |
| Embedding | Gemini text-embedding-004 | Değişmeyecek |
| **Chat/Soru-Cevap** | **Gemini 2.5 Flash** | **DeepSeek seçeneği eklenecek** |

## Kullanıcı Deneyimi

Kullanıcılar chat arayüzünde mesaj gönderme butonunun yanında bir toggle ile model seçebilecek.

- **Varsayılan Model:** DeepSeek (Ekonomik)
- **DeepSeek Model:** `deepseek-chat` (V3.2)

---

## Proposed Changes

### Backend

#### [MODIFY] config.py
- `DEEPSEEK_API_KEY` environment variable eklenmesi
- Opsiyonel olarak tanımlanacak (mevcut sistemin çalışmasını bozmamak için)

#### [NEW] deepseek_service.py
Yeni DeepSeek servis dosyası - OpenAI SDK uyumlu API kullanılacak

#### [NEW] ai_service.py
Model seçimini yöneten wrapper servis

#### [MODIFY] chat.py
Request schema'larına `model` parametresi eklenmesi

### Frontend

#### [MODIFY] chat-interface.tsx
- Model seçim toggle'ı (mesaj gönderme butonunun yanında)
- LocalStorage'da kullanıcı tercihinin saklanması

#### [MODIFY] multi-chat/page.tsx
- Aynı model seçim toggle'ı eklenmesi

---

## Deployment (Railway & Vercel)

### Railway (Backend)

1. Railway Dashboard'a gidin: https://railway.app/dashboard
2. Backend projenizi seçin
3. **Variables** sekmesine gidin
4. **New Variable** butonuna tıklayın
5. Ekleyin:
   ```
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
   ```
6. Deploy otomatik başlayacaktır

### Vercel (Frontend)

Frontend için environment variable eklemeye **GEREK YOK** çünkü:
- Model seçimi frontend'de yapılıyor
- API key backend'de kalıyor
- Frontend sadece `model: "deepseek"` parametresini gönderiyor

---

## Implementation Order

1. Backend: `config.py` - DEEPSEEK_API_KEY ekleme
2. Backend: `deepseek_service.py` - Yeni servis oluşturma
3. Backend: `ai_service.py` - Wrapper servis oluşturma
4. Backend: `chat.py` - Model parametresi ekleme
5. Frontend: `chat-interface.tsx` - Toggle ve API entegrasyonu
6. Frontend: `multi-chat/page.tsx` - Toggle ve API entegrasyonu
7. Test ve doğrulama
