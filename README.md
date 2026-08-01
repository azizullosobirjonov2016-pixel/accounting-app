# � Ombor Boshqaruv Tizimi
## Mukammal Buxgalteriya va Ombor Boshqaruvi - O'zbekiston uchun

### ⭐ YANGI: Server va Multi-User Qo'llabi! 

**Endi tizim ikki usulda ishlasa bo'ladi:**
1. **Oddiy ishlash** (bu faylni brauzerde oching) - shaxsiy ishlantirish
2. **Server orqali** (Node.js + Express + SQLite) - ko'p foydalanuvchi uchun
   - Batafsil ko'rsatma: [SERVER_README.md](SERVER_README.md)
   
---

### 🎯 Tizim haqida
Bu tizim O'zbekiston Respublikasining soliq qoidalariga asosan buxgalteriya hisobini yuritish va ombor boshqaruvini birlashtirib, korxonalarga mo'ljallangan kompleks yechim.

**Asosiy imkoniyatlar:**
- ✅ **Ombor boshqaruvi**: Mahsulotlar, zahira, kirim/chiqim
- ✅ Mijozlar va Faol Shaxslarni boshqarish (SHXK, LChJ, OOJ)
- ✅ **Yetkazib Beruvchilarni boshqarish** (material, uskunalar, xizmatlar)
- ✅ Daromad va Chiqimlarni kuzatish
- ✅ Avtomatik soliq hisoblash
- ✅ **Ishlab Chiqarish** (BOM, retseptlar, xarajat hisob-kitoblari)
- ✅ **Savdo va Invoice** (avtomatik zahira kamayish)
- ✅ **Ish Haqi** (xodimlar, oylik hisob-kitob, avtomatik xarajat yozuvi)
- ✅ **Ko'p foydalanuvchi** (multi-user server tayyorlangan)
- ✅ Turli davr uchun hisobotlar yaratish
- ✅ Ma'lumotlarni zaxiraga olish va qaytarish
- ✅ Excel/HTML formatida eksport qilish
- ✅ Mobil va kompyuter uchun responsiv dizayn

---

### 🚀 Ishga tushirish

1. **Faylni ochish:**
   - `index.html` faylini brauzerde oching
   - Firefox, Chrome, Safari yoki Edge brauzerlari bilan ishlaydi

2. **Dastlang'ich sozlamalar:**
   - "Sozlamalar" tab'ini oching
   - Soliq stavkalarini O'zbekiston qonuniga muvofiq o'rnating
   - "Saqlash" tugmachasini bosing

### 📋 Foydalanish bo'yicha ko'rsatmalar

#### 1. **Bosh Sahifa**
- Jami daromad, chiqim, soliq va toza foydani ko'ring
- Omborning umumiy qiymatini va past zahira mahsulotlarini ko'ring
- So'ngi 5 ta tranzaksiyani ko'rib chiqing
- Hozirgi holat haqida tezkor ma'lumot olish

#### 2. **Ombor**
- **Mahsulot qo'shish:**
  - `Yangi Mahsulot Qo'shish` tugmasini bosing
  - Nomi, kategoriyasi, birligi, minimal zahira, narxlarni kiriting
- **Kirim:** `Kirim (Ombor Kirimi)` - yetkazib beruvchilardan mahsulot qabul qilish
- **Chiqim:** `Chiqim (Ombor Chiqimi)` - mijozlarga mahsulot sotish
- **Tuzatish:** `Zahira Tuzatish` - inventarizatsiya uchun
- **Filtrlash:** Nomi, kategoriyasi yoki zahira holati bo'yicha qidirish

#### 3. **Mijozlar Menyu**
- `+ Yangi Mijoz Qo'shish` - yangi faol shaxs/kompaniyani ro'yxatga olish
- **Kerakli ma'lumotlar:**
  - Nomi/Kompaniya (SHXK, LChJ, OOJ nomi)
  - STIR (12 raqamli Soliq To'lovchisi ID)
  - Telefon raqami
  - To'liq manzil

#### 4. **Yetkazib Beruvchilar**
- Yetkazib beruvchilarni ro'yxatdan o'tkazish
- Mahsulot turlari va kontakt ma'lumotlari

#### 5. **Tranzaksiyalar**
- `+ Yangi Tranzaksiya Qo'shish` - daromad yoki chiqimni kiritish
- **Maydonlar:**
  - Sana: Tranzaksiya sodir bo'lgan kun
  - Mijoz: Avval qo'shilgan mijozni tanlang
  - Turi: Daromad yoki Chiqim
  - Kategoriya:
    - **Daromad:** Sotuvlar, Xizmatlar
    - **Chiqim:** Materiallar, Ish haqi, Ijara, Kommunal, Transport, Boshqa
  - Summa: Pul miqdori (butun sonlar)
  - Tavsifi: Qisqacha ma'lumot

**Filtrlash:**
- Sana oraligi bo'yicha (dan - gacha)
- Turi bo'yicha (Daromad/Chiqim)
- "Filtrlash" tugmachasini bosing

**O'chirish:**
- Xato tranzaksiyani o'chirish uchun "O'chirish" tugmasini bosing

#### 4. **Hisobotlar**
- **Davr tanlang:**
  - Oy bo'yicha
  - Chorak bo'yicha
  - Yil bo'yicha
  - Maxsus davr (o'zingiz kiritish)

- `Hisobot Yaratish` - HTML formatida hisobot chiqarish
- `Excelga Chiqarish` - HTML faylni kompyuteringizga saqlash

**Hisobotda:**
- Jami daromad va chiqim
- Soliq hisoblari
- Kategoriya bo'yicha taqsimot
- Soliq qoida va muddatlari

#### 5. **Sozlamalar**
- **Soliq stavkalari** (O'zbekiston 2024-2026):
  - Madaniyat tori: 1%
  - QQS: 12%
  - Daromad soliq: 15%
  - Ishchi birligi: 5%
- **Avtomatik hisoblash** - soliqlarni o'zi hisoblash
- **Ogohlantirish** - ahamiyatli muddatlar
- **Backup/Restore** - ma'lumotlarni saqlash/qaytarish

---

### 💾 Ma'lumotlarni Boshqarish

#### Zaxiraga Olingan Faylni Yuklash (Backup)
1. "Sozlamalar" tab'iga oching
2. "Zaxiraga Olingan Faylni Yuklash" tugmasini bosing
3. JSON faylni kompyuteringizga saqlang
4. Shu faylni boshqa joyda saqlashingiz mumkin (Gmail, Dropbox va h.k.)

#### Fayldan Qaytarish (Restore)
1. "Sozlamalar" tab'iga oching
2. "Fayldan Qaytarish" tugmasini bosing
3. Avval saqlab qo'ygan JSON faylni tanlang
4. Ma'lumotlar avtomatik qaytariladi

#### Barcha Ma'lumotlarni O'chirish
> ⚠️ **DIQQAT:** Bu amaldan keyin hamma ma'lumotlar o'chib ketadi!
1. "Sozlamalar" tab'iga oching
2. "Barcha Ma'lumotlarni O'chirish" tugmasini bosing
3. Tasdiqlab "OK" bosing

---

### 📱 Mobil Foydalanish
- Dastur barcha mobil qurilmalarda ishlaydi
- FontSize va tablitsalar avtomatik moslanadi
- Shumda ishini davom ettira olasiz

---

### 🔒 Xavfsizlik va Mahfiyligi
- ✅ Barcha ma'lumotlar **faqat brauzerdagi LocalStorage'da** saqlanadi
- ✅ **Serverga jo'natilmaydi**
- ✅ Ko'p foydalanuvchi bo'lsa, har birida o'z brauzeri va profilida ishlay oladi
- ✅ Brauzerni tozalash = ma'lumotlarni o'chirish

### 📌 Muhim Qoidalar (O'zbekiston Soliq Kodeksi)
1. **Daromad soliq:** 15% (jismoniy shaxs/SHXK uchun)
2. **QQS:** 12% (amalda)
3. **Deklaratsiya:** Har 15-kunida topshirish

---

### ⚙️ Texnik Jihati
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Saqlash:** LocalStorage (offline ishlaydi)
- **Brauzerlar:** Chrome, Firefox, Safari, Edge, Opera
- **Talablar:** Hech nima o'rnatish kerak emas

---

### 🆘 Xato Tuzatish
1. **Dastur ko'rinmayotgan bo'lsa:**
   - Brauzerni yangilang (F5 yoki Ctrl+R)
   - Cache-ni tozalang (Ctrl+Shift+Delete)

2. **Ma'lumotlarni qayta kiritmani yo'q bolgan bo'lsa:**
   - Zaxira faylni qayta ishlating (Restore)

3. **JavaScript xatoglari bo'lsa:**
   - Brauzerni yangilang
   - JavaScriptti o'chirmaslikka ishonch hosil qiling

---

### 📞 Aloqa
- Dastur O'zbekistonda buxgalteriya uchun maxsus ishlab chiqilgan
- Foydalanishda tushunarsizliklar bo'lsa - bu ko'rsatmani o'qib chiqing

---

### 📅 Versiya: 1.0
**O'zbekiston Respublikasi Soliq Siyosatiga muvofiq**
Barcha huquqlar himoyalangan © 2024-2026

---

**Sizga omad tilaymiz! Buxgalteriya hisobini muvaffaqiyatli yurita boshlang!** 🎉
