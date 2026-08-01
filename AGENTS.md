# AGENTS.md

## Project Overview

Ushbu loyiha — O'zbekiston uchun mo'ljallangan ombor va buxgalteriya boshqaruv tizimi. U ikki rejimda ishlaydi:
- **Frontend-only**: `index.html` + `js/` + `css/` orqali brauzerda ishga tushadi.
- **Server mode**: `server.js` orqali Node.js + Express + SQLite backend bilan ko'p foydalanuvchi rejimi.

## Muhiym Ma'lumotlar

### Asosiy funksiyalar
- Ombor boshqaruvi: mahsulotlar, kirim/chiqim, zahira tuzatish
- Yetkazib beruvchilar va mijozlar bazasi
- Ishlab chiqarish: BOM (Bill of Materials), buyurtmalar, material sarfi
- Savdo va invoice yaratish, zahira avtomatik kamayishi
- Tranzaksiyalar va hisobotlar
- Ish haqi hisoblash
- LocalStorage saqlash va JSON backup/import
- Server API: Express + SQLite + JWT authentication

### Texnologiyalar
- HTML, CSS, Vanilla JavaScript
- Browser LocalStorage
- Node.js
- Express.js
- SQLite
- JSON
- JWT (`jsonwebtoken`)
- bcrypt (`bcryptjs`)
- `dotenv`
- `body-parser`
- CORS

## Loyiha Tuzilishi

```
accounting-app/
├── index.html
├── package.json
├── server.js
├── sample-data.json
├── README.md
├── ARCHITECTURE.md
├── IMPLEMENTATION_SUMMARY.md
├── SERVER_README.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── api-client.js
│   └── storage.js
└── ishlar/
    ├── TASKS.md
    ├── STATUS.md
    └── DEBUGGING.md
```

## Task Management Model

Ushbu loyiha AI agent bilan boshqariladi. Vazifalar va holat quyidagicha tashkil qilingan:

- `ishlar/TASKS.md` — har bir ishning batafsil tavsifi, status, va bajarilishi kerak bo'lgan talablar.
- `ishlar/STATUS.md` — task'larning umumiy ro'yxati, prioriteti va progress foizlari.
- `ishlar/DEBUGGING.md` — umumiy xatoliklar, yechimlar va debugging qo'llanmasi.

AI agent har bir taskni alohida ko'rishi kerak. Har bir taskni bajarishda:
1. `TASKS.md` ni o'qish
2. kerakli faylga kiritish
3. `STATUS.md` ni yangilash
4. agar kerak bo'lsa `DEBUGGING.md` ga qo'shimcha yozish

### Task birligi
Har bir task mustaqil bo'lishi kerak. Bitta task ichidagi o'zgarishlar quyidagi vazifani bajaradi:
- backend schema yaratish
- API endpoint qo'shish
- frontend integration
- xavfsizlik va validatsiya

### Prioritetlar
- **HIGH**: server schema, API, frontend server integratsiyasi
- **MEDIUM**: authentication, validation, role-based access
- **LOW**: testlar, Docker, deploy, advanced reporting, real-time funksiyalar

## Agent uchun ishlash qoidalari

1. Avvalo `ishlar/TASKS.md` ni o'qib chiqing.
2. Har bir taskni bajarishdan oldin `STATUS.md` ga qarab eng yuqori prioritetni tanlang.
3. `CLAUDE.md` fayliga murojaat qilmang; u qisqaroq hujjat va AGENTS.md ni referens sifatida ishlatadi.
4. Kod o'zgartirishlaridan keyin har doim `STATUS.md` ni yangilang.
5. Agar task bajarilsa, `TASKS.md` ichidagi statusni mos ravishda yangilang.

## Qaysi fayllarda nima bor

- `README.md` — loyihaning boshlang'ich foydalanuvchi dokumentatsiyasi
- `ARCHITECTURE.md` — arxitektura va ma'lumot modeli
- `IMPLEMENTATION_SUMMARY.md` — umumiy bajarilgan ishlarning xulosasi
- `SERVER_README.md` — serverni ishga tushirish bo'yicha qo'llanma
- `ishlar/TASKS.md` — vazifalar to'plami va bajarilish tavsifi
- `ishlar/STATUS.md` — task status jadvali
- `ishlar/DEBUGGING.md` — muammolar va yechimlar

## Chetga chiqmaslik uchun eslatma

- `AGENTS.md` loyihaning to'liq ma'lumotlar to'plamini beradi.
- `CLAUDE.md` esa Claude agent uchun aniq, qisqaroq yo'riqnomadir.
- `CLAUDE.md` ning maqsadi: AGENTS.md ni referensga olib, agentni tezkor ravishda yo'naltirish.

---

## Qo'shimcha

Agar yangi funktsiya yoki technology qo'shilsachi, avvalo `AGENTS.md` va `ishlar/TASKS.md` ga yozing.
