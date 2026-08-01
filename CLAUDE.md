# CLAUDE.md

## Maqsad

Bu fayl Claude agent uchun mo'ljallangan qisqaroq hujjatdir. U loyihaning vazifalari, umumiy arxitekturasi va task boshqaruv modelini tushuntiradi.

## Asosiy ma'lumotlar

- Loyiha: **Ombor va Buxgalteriya Boshqaruv Tizimi**
- Rejimlar:
  - `index.html` orqali brauzerda ishlaydigan local frontend
  - `server.js` orqali Node.js + Express + SQLite backend
- Texnologiyalar:
  - HTML, CSS, Vanilla JavaScript
  - Browser LocalStorage
  - Node.js, Express.js
  - SQLite
  - JWT (`jsonwebtoken`)
  - bcrypt (`bcryptjs`)
  - `dotenv`, `body-parser`, `cors`

## Ustuvor vazifalar

### 1. Backend to'liq tayyorlash
- `server.js` ichida SQLite schema va API endpointlari
- `JWT` authentication va `bcrypt` password hashing
- `dotenv` orqali sekretlar saqlash

### 2. Frontend/server integratsiyasi
- `js/api-client.js` orqali serverga fetch so'rovlar
- `js/app.js` ichida localStorage bilan server mode orasida qo'llab-quvvatlash
- Settings bo'limiga server statusi va mode almashish

### 3. Security va validation
- Input validatsiyasi
- Role-based access control
- Error handling

## Task Management Model

Loyihada vazifalar quyidagicha boshqariladi:

- `ishlar/TASKS.md` — batafsil task ta'rifi va bajarilishi kerak bo'lgan har bir bosqich.
- `ishlar/STATUS.md` — tasklar jadvallangan, prioritet va progress foizi ko'rsatilgan.
- `ishlar/DEBUGGING.md` — umumiy xatoliklar va ularni qayerda hal qilish kerakligi.

### Task modelining tamoyillari
- Har bir task bitta aniq ishni ifodalaydi.
- Tasklar `HIGH`, `MEDIUM`, `LOW` prioritetlarga bo'lingan.
- Eng birinchi bajarilishi kerak bo'lganlar `HIGH` prioritetli backend va frontend integratsiya tasklari.
- Har bir task bajarilgandan keyin `STATUS.md` va kerak bo'lsa `TASKS.md` yangilanadi.
- Agent har doim `TASKS.md` ga bog'lanib ishlashi kerak.

## Fayl referenslari

- Batafsil hujjat: `AGENTS.md`
- Ish boshqaruvi: `ishlar/TASKS.md` va `ishlar/STATUS.md`
- Debug: `ishlar/DEBUGGING.md`
- Loyihaning asosiy foydalanuvchi dokumentatsiyasi: `README.md`
- Arxitektura: `ARCHITECTURE.md`
- Server qo'llanmasi: `SERVER_README.md`

## Agent uchun yo'riqnomalar

1. `AGENTS.md` ni boshlang'ich hujjat sifatida qabul qiling.
2. Task bajarishdan oldin `ishlar/TASKS.md` dan qaysi ish kerakligini aniqlang.
3. Kodni o'zgartirgandan so'ng `ishlar/STATUS.md` ni yangilang.
4. Yangi task yoki muammo paydo bo'lsa, `ishlar/DEBUGGING.md` ga yozing.

## AGENTS.md ga havola

Batafsilroq ma'lumot uchun qarang:
- [`AGENTS.md`](./AGENTS.md)

## Eslatmalar

- Bu fayl `AGENTS.md` ni takrorlamaydi; u faqat tezkor orientatsiya beradi.
- Claude agent faqat birinchi navbatda `AGENTS.md` va `ishlar/TASKS.md` ga asoslanishi kerak.
