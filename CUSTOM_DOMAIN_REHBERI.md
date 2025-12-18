# 🌐 Custom Domain Bağlama Rehberi (Natro)

Bu rehber, Natro'dan aldığınız domain'i Vercel (Frontend) ve Railway (Backend) platformlarına nasıl bağlayacağınızı adım adım açıklar.

> ⚠️ **Natro'da sadece NS (Nameserver) değiştirebildiğiniz için**, DNS yönetimini Vercel'e devrediyoruz.

---

## 🎯 Sonuçta Olacak Yapı

| Servis | Adres |
|--------|-------|
| **Frontend** (Vercel) | `https://yiriknote.com` |
| **Backend** (Railway) | `https://api.yiriknote.com` |

---

# ADIM 1: NATRO'DA NAMESERVER DEĞİŞTİRME

## 1.1 Natro Paneline Giriş
1. [natro.com](https://natro.com) → Müşteri paneline giriş yapın
2. **Domain Yönetimi** veya **Domainlerim** bölümüne gidin
3. Domain'inizi seçin

## 1.2 Nameserver Değiştirme
1. **Nameserver Ayarları** veya **NS Değiştir** bölümünü bulun
2. Mevcut nameserver'ları **silin**
3. Şu değerleri girin:

| Nameserver |
|------------|
| `ns1.vercel-dns.com` |
| `ns2.vercel-dns.com` |

4. **Kaydet** butonuna tıklayın

> ⏳ **Önemli:** NS değişikliği 24-48 saat sürebilir. Bu sürede sabırlı olun.

---

# ADIM 2: VERCEL'DE DOMAIN EKLEME

## 2.1 Domain Ekleme
1. [vercel.com](https://vercel.com) → Giriş yapın
2. Frontend projenizi seçin
3. **Settings** → **Domains** → **Add**
4. Domain yazın: `yiriknote.com`
5. **Add** butonuna tıklayın

## 2.2 Vercel Otomatik Yapılandırma
Nameserver'ları Vercel'e yönlendirdiğiniz için:
- ✅ Ana domain (`yiriknote.com`) otomatik çalışacak
- ✅ www subdomain otomatik eklenecek
- ✅ SSL sertifikası otomatik verilecek

---

# ADIM 3: RAILWAY İÇİN SUBDOMAİN EKLEME

## 3.1 Railway'de Custom Domain Alma
1. [railway.app](https://railway.app) → Giriş yapın
2. Backend projenizi seçin
3. **Settings** → **Networking** → **Public Networking**
4. **+ Add Custom Domain** tıklayın
5. Yazın: `api.yiriknote.com`
6. **Add** tıklayın

> 📋 Railway size bir **CNAME değeri** verecek. Bu değeri kopyalayın!
> Örnek: `abc123.up.railway.app`

## 3.2 Vercel'de Subdomain DNS Kaydı Ekleme

Şimdi **Vercel**'den bu subdomain için DNS kaydı ekliyoruz:

1. Vercel → Projeniz → **Settings** → **Domains**
2. Sayfanın altında **DNS Records** veya **Manage DNS** bölümü var
3. Veya direkt: `vercel.com/[kullanıcı-adınız]/[proje-adınız]/settings/domains`

**Eğer DNS yönetimi görünmüyorsa:**
1. [vercel.com/dashboard](https://vercel.com/dashboard) → Sol menüde **Domains** 
2. Domain'inizi seçin
3. **DNS Records** sekmesine gidin

4. **Add Record** butonuna tıklayın:

| Alan | Değer |
|------|-------|
| **Type** | `CNAME` |
| **Name** | `api` |
| **Value** | Railway'in verdiği değer (örn: `abc123.up.railway.app`) |

5. **Add** ile kaydedin

```
Sonuç: api.yiriknote.com → Railway backend'inize yönlenir ✅
```

---

# ADIM 4: ENVIRONMENT VARIABLES GÜNCELLEME

## 4.1 Vercel'de (Frontend)
1. Vercel → Projeniz → **Settings** → **Environment Variables**
2. Ekleyin veya güncelleyin:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.yiriknote.com` |

3. **Save** tıklayın

## 4.2 Railway'de (Backend)
1. Railway → Projeniz → **Variables** sekmesi
2. Ekleyin veya güncelleyin:

| Key | Value |
|-----|-------|
| `CORS_ORIGINS` | `https://yiriknote.com,https://www.yiriknote.com` |
| `FRONTEND_URL` | `https://yiriknote.com` |

---

# ADIM 5: REDEPLOY

## Vercel:
1. **Deployments** sekmesi
2. Son deployment → **...** → **Redeploy**

## Railway:
- Otomatik yapar, bir şey yapmanıza gerek yok

---

# ADIM 6: TEST

NS yayılması tamamlandıktan sonra (24-48 saat):

- [ ] `https://yiriknote.com` açılıyor mu?
- [ ] `https://api.yiriknote.com/docs` açılıyor mu?
- [ ] Giriş yapabiliyor musunuz?
- [ ] Dosya yükleyebiliyor musunuz?
- [ ] Chat çalışıyor mu?

---

# 🔍 DNS Yayılmasını Kontrol Etme

[whatsmydns.net](https://www.whatsmydns.net) sitesinden:
1. Domain'inizi yazın
2. Kayıt türü olarak **NS** seçin
3. Tüm dünyada `ns1.vercel-dns.com` görünüyorsa hazır!

---

# ✅ Özet Kontrol Listesi

| Adım | Durum |
|------|-------|
| Natro'da NS'ler Vercel'e yönlendirildi | [ ] |
| NS yayılması tamamlandı (24-48 saat) | [ ] |
| Vercel'de ana domain eklendi | [ ] |
| Railway'de api subdomain eklendi | [ ] |
| Vercel DNS'de api CNAME kaydı eklendi | [ ] |
| Vercel env var güncellendi | [ ] |
| Railway env vars güncellendi | [ ] |
| Redeploy yapıldı | [ ] |
| Test edildi | [ ] |

---

🎉 **Tamamlandı!** Domain'iniz artık profesyonel şekilde çalışıyor!
