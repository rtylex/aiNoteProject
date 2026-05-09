# 🚀 DeepSeek (Basic) + Gemma (Premium) Global Model Seçimi Planı

## Genel Bakış

**Amaç:** Kullanıcıya tüm sistem genelinde (chat, flashcard, test, OCR) geçerli olacak **global bir model seçimi** sunmak.
- 🔵 **Basic (DeepSeek)** — mevcut sistem, default model.
- ✨ **Premium (Gemma-4-31b-it)** — yeni ekleniyor, chat, flashcard, test ve OCR için kullanılacak.
- 📊 **Embedding** → `models/gemini-embedding-001` kalacak (değişiklik yok).
- ⚙️ **Seçim Yeri** → Artık her modalda veya sayfada toggle yok. Kullanıcı modeli **sağ üstteki profil menüsünden (veya ayarlar panelinden)** seçecek ve bu seçim veritabanında/local storage'da tutulup her API isteğinde kullanılacak.

---

## 📦 Etkilenen Dosyalar

### Backend

| Dosya | Değişiklik | Açıklama |
|---|---|---|
| `backend/requirements.txt` | MODIFY | `google-genai` paketi eklenir. |
| `backend/app/services/gemini_service.py` | MODIFY | `google-genai` SDK'ya geçiş, OCR, Chat, Flashcard, Test için Gemma-4 entegrasyonu. (Embedding korunur). |
| `backend/app/services/ai_service.py` | MODIFY | Global `"gemma"` yönlendirmesi eklenecek. |
| `backend/app/services/flashcard_service.py` | MODIFY | `model` parametresi ve `"gemma"` desteği eklenecek. |
| `backend/app/services/test_service.py` | MODIFY | `model` parametresi ve `"gemma"` desteği eklenecek. |
| `backend/app/api/endpoints/flashcard.py` | MODIFY | İsteklerde (Request) model bilgisi `Literal["deepseek", "gemma"]` olarak alınacak. |
| `backend/app/api/endpoints/test.py` | MODIFY | İsteklerde model bilgisi `Literal["deepseek", "gemma"]` olarak alınacak. |
| `backend/app/api/endpoints/chat.py` | MODIFY | Chat isteklerinde (`ChatRequest`, `MultiDocumentChatRequest`, vb.) model bilgisi `"gemini"` yerine `"gemma"` destekleyecek şekilde güncellenecek. |

### Frontend

| Dosya | Değişiklik | Açıklama |
|---|---|---|
| `frontend/src/lib/auth-context.tsx` | MODIFY | Global model seçimini (`preferredModel`) saklamak için context state ve localStorage entegrasyonu. |
| `frontend/src/components/navbar.tsx` | MODIFY | Sağ üstteki profil menüsüne model seçimi (DeepSeek / Gemma) eklenecek. Shadcn DropdownMenu içinde seçimin menüyü kapatmaması için gerekli prevent default işlemleri eklenecek. |
| `frontend/src/components/chat/chat-interface.tsx` | MODIFY | Lokal olarak tanımlı `const selectedModel = 'deepseek'` silinerek `useAuth()`'tan gelen global `preferredModel` API çağrılarına eklenecek. |
| `frontend/src/app/multi-chat/page.tsx` | MODIFY | Lokal model seçimi kaldırılarak global `preferredModel` eklenecek. |
| `frontend/src/components/flashcard/create-flashcard-modal.tsx` ve diğer modallar | MODIFY | Statik model seçimleri ya da lokal toggle'lar varsa temizlenecek; doğrudan `preferredModel` fetch request'e geçirilecek. |

### Değişmeyen Dosyalar

| Dosya | Neden Değişmiyor |
|---|---|
| `backend/app/services/deepseek_service.py` | Basic model olarak aynen korunuyor. |
| `backend/app/core/config.py` | Keyler değişmiyor. |
| `backend/.env` | Mevcut `GEMINI_API_KEY` Gemma API için de geçerli. |
| Tüm embedding kodları | `gemini-embedding-001` hiç değişmiyor. |

---

## 🔧 Detaylı Değişiklikler

---

### 1. Backend: `gemini_service.py` (Artık Gemma Service gibi çalışacak)

```python
from google import genai
from google.genai import types

class GeminiService:
    def __init__(self):
        # Embedding için eski SDK kullanımı korunur
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
        self.embedding_model = "models/gemini-embedding-001"
        
        # Yeni SDK: Chat, OCR, Test, Flashcard için
        self.genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.gemma_model = "gemma-4-31b-it" # Tüm AI işlemleri için
        
    async def generate_chat_answer(self, question: str, context: str) -> str:
        # Gemma 4 için chat yanıtı üretimi
        config = types.GenerateContentConfig(
            temperature=0.7,
            # Gerekli parametreler eklenebilir
        )
        contents = [f"DOKÜMAN İÇERİĞİ:\n\n{context}\n\nSORU: {question}"]
        response = self.genai_client.models.generate_content(
            model=self.gemma_model,
            contents=contents,
            config=config
        )
        return response.text

    async def generate_chat_answer_simple(self, prompt: str) -> str:
        # Gemma ile basit prompt yanıtı
        response = self.genai_client.models.generate_content(
            model=self.gemma_model,
            contents=[prompt]
        )
        return response.text

    async def generate_chat_answer_multi_doc(self, question: str, combined_context: str) -> str:
        # Gemma ile çoklu döküman chat
        prompt = f"Kaynak Materyalleri:\n{combined_context}\n\nKullanıcı Sorusu: {question}\n\nYanıt:"
        return await self.generate_chat_answer_simple(prompt)

    async def generate_structured_content(self, system_prompt: str, user_prompt: str, max_tokens: int = 8192) -> str:
        # Test ve Flashcard için JSON üreten metod
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens
        )
        response = self.genai_client.models.generate_content(
            model=self.gemma_model,
            contents=[user_prompt],
            config=config
        )
        return response.text

    async def ocr_pdf_file(self, pdf_bytes: bytes) -> str:
        # Gemma-4 ile multimodal OCR işlemi
        import fitz  # PyMuPDF
        
        pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        all_text_parts = []
        
        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            mat = fitz.Matrix(200/72, 200/72)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            
            response = self.genai_client.models.generate_content(
                model=self.gemma_model,
                contents=[
                    types.Part.from_bytes(data=img_bytes, mime_type="image/png"),
                    "Bu PDF sayfasındaki TÜM metni oku ve yaz. Metni olduğu gibi oku, yorum ekleme."
                ]
            )
            
            if response.text:
                all_text_parts.append(response.text.strip())
        
        return "\n\n".join(all_text_parts)
        
    # generate_embedding, extract_text_with_vision ve generate_query_embedding metodları AYNEN KALACAK
```

---

### 2. Backend: `ai_service.py` ve Diğer Servisler Yönlendirmeleri

```python
    async def generate_answer(self, question: str, context: str, model: str = "deepseek") -> str:
        if model == "gemma" or model == "gemini":  
            return await self.gemini.generate_chat_answer(question, context)
        # DeepSeek çağrısı aynen kalır...
```

`flashcard_service.py` ve `test_service.py` metodlarına parametre eklenecek:
```python
from app.services.gemini_service import gemini_service

async def generate_test_questions(document_content: str, question_count: int, model: str = "deepseek") -> dict:
    if model == "gemma" or model == "gemini":
        result = await gemini_service.generate_structured_content(TEST_SYSTEM_PROMPT, user_prompt, max_tokens)
    else:
        # DeepSeek çağrısı
```

---

### 3. Backend: Endpoints (Test, Flashcard, Chat Request Class'ları)

Tüm Pydantic şemalarında model validasyonu "gemma" ve "deepseek" olarak güncellenecek:

```python
from typing import Literal

# backend/app/api/endpoints/flashcard.py
class FlashcardGenerateRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    card_count: int = Field(default=20, ge=5, le=50)
    model: Literal["deepseek", "gemma"] = "deepseek"

# backend/app/api/endpoints/chat.py
class ChatRequest(BaseModel):
    document_id: str
    message: str
    session_id: str | None = None
    model: Literal["deepseek", "gemma"] = "deepseek"
```

---

### 4. Frontend: Global Model Seçimi (Auth Context)

`frontend/src/lib/auth-context.tsx` güncelleniyor:

```tsx
export type AiModel = 'deepseek' | 'gemma'

interface AuthContextValue {
    // ... diğer değerler
    preferredModel: AiModel
    setPreferredModel: (model: AiModel) => void
}

// ... Provider içinde:
const [preferredModel, setPreferredModel] = useState<AiModel>('deepseek')

useEffect(() => {
    const saved = localStorage.getItem('preferredModel') as AiModel
    if (saved === 'deepseek' || saved === 'gemma') {
        setPreferredModel(saved)
    }
}, [])

const handleSetModel = useCallback((model: AiModel) => {
    setPreferredModel(model)
    localStorage.setItem('preferredModel', model)
}, [])
```

---

### 5. Frontend: Profil Menüsüne Dropdown Seçeneği Ekleme

`frontend/src/components/navbar.tsx` (Profil DropdownMenu içine entegrasyon):
*(Shadcn UI'ın tıklama ile kapanmasını engellemek için e.preventDefault eklendi)*

```tsx
<DropdownMenuSeparator />
<div className="px-4 py-2 border-b border-gray-100">
    <p className="text-xs font-semibold text-gray-500 mb-2">AI Modeli</p>
    <div className="flex bg-gray-100 rounded-lg p-1">
        <button 
            type="button"
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${preferredModel === 'deepseek' ? 'bg-white shadow-sm font-medium text-[#011133]' : 'text-gray-500 hover:bg-gray-200/50'}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreferredModel('deepseek'); }}
        >
            🔵 Basic
        </button>
        <button 
            type="button"
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${preferredModel === 'gemma' ? 'bg-white shadow-sm font-medium text-purple-600' : 'text-gray-500 hover:bg-gray-200/50'}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreferredModel('gemma'); }}
        >
            ✨ Premium
        </button>
    </div>
</div>
```

---

### 6. Frontend: API İstekleri İçin Model Bilgisini İletme

Artık sistemde gereksiz model seçim ekranları kaldırıldı. Kullanıcı döküman üzerinde ne işlem yaparsa yapsın arka planda `preferredModel` iletilecek.

**Örnek (Flashcard Modal Fetch):**
```tsx
const { accessToken, preferredModel } = useAuth()

body: JSON.stringify({
    document_id: documentId,
    card_count: cardCount,
    model: preferredModel // Dinamik model kullanımı
})
```

**Örnek (Chat - `chat-interface.tsx`):**
```tsx
// const selectedModel = 'deepseek' ibaresi tamamen SİLİNDİ.
const { preferredModel } = useAuth()

// Giden fetch gövdesinde
body: JSON.stringify({
    session_id: sessionId,
    message: input,
    model: preferredModel
})

// Ekrandaki Badge Güncellemesi:
<span className="hidden sm:inline">
    {preferredModel === 'deepseek' ? 'DeepSeek' : 'Gemma ✨'}
</span>
```

---

## ✅ Doğrulama Planı
1. `google-genai` kütüphanesini kur.
2. `gemini_service.py` dosyasını `gemma-4-31b-it` ve yeni SDK yapısıyla güncelle.
3. Backend pydantic validasyonlarındaki "gemini" ibarelerini "gemma" ile değiştir.
4. Frontend tarafında `auth-context.tsx` dosyasında `preferredModel` yapısını kur.
5. Navbar profil menüsüne tıklayıp kapanmayan Dropdown AI Model Seçicisi'ni ekle.
6. Chat, Test ve Flashcard sayfalarında sabit "deepseek" model kullanımlarını `preferredModel` ile dinamik hale getir.
7. Testleri çalıştır ve işlemlerin seçilen modele göre değiştiğini doğrula.
