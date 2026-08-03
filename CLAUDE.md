# CLAUDE.md — Quick Reference va Workflow Guide

## Maqsad

Bu fayl Claude agent uchun mo'ljallangan qisqaroq hujjatdir. U loyihaning vazifalari, umumiy arxitekturasi va task boshqaruv modelini tushuntiradi. **Bu fayl tezkor orientatsiya beradi; batafsil ma'lumot AGENTS.md da bor.**

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

## 🎯 Ustuvor Vazifalar

### 1. Backend to'liq tayyorlash (TASK-1, TASK-2)
- `server.js` ichida SQLite schema va API endpointlari
- `JWT` authentication va `bcrypt` password hashing
- `dotenv` orqali sekretlar saqlash

### 2. Frontend/server integratsiyasi (TASK-3, TASK-4)
- `js/api-client.js` orqali serverga fetch so'rovlar
- `js/app.js` ichida localStorage bilan server mode orasida qo'llab-quvvatlash
- Settings bo'limiga server statusi va mode almashish

### 3. Security va validation (TASK-5, TASK-6, TASK-7)
- Input validatsiyasi
- Role-based access control
- Error handling

## 📋 Task Management Model

Loyihada vazifalar quyidagicha boshqariladi:

- `ishlar/TASKS.md` — batafsil task ta'rifi va bajarilishi kerak bo'lgan har bir bosqich.
- `ishlar/STATUS.md` — tasklar jadvallangan, prioritet va progress foizi ko'rsatilgan.
- `ishlar/DEBUGGING.md` — umumiy xatoliklar va ularni qayerda hal qilish kerakligi.

### Task Modelining Tamoyillari
- Har bir task bitta aniq ishni ifodalaydi.
- Tasklar `HIGH` (25%), `MEDIUM`, `LOW` prioritetlarga bo'lingan.
- **Eng birinchi bajarilishi kerak bo'lganlar**: TASK-1 → TASK-2 → TASK-3 → TASK-4
- Har bir task bajarilgandan keyin `STATUS.md` ni 10-15% ko'tarish kerak
- Agent har doim `ishlar/TASKS.md` ga asoslanib ishlashi kerak.

## 🚀 Har bir Task'ni Bajarish Qadamlari

### 1. Task'ni O'qish
```
→ ishlar/TASKS.md ni oching
→ TASK-1 (yoki kerakli task raqami) ni toping
→ Tavsif, Status, Kerakli changes'ni o'qing
```

### 2. Fayllarni Tekshirish
```
→ TASK tavsifida aytilgan fayllarni oching
→ Joriy code'ni o'qib chiqing
→ Nima qo'shish yoki o'zgartirilishi kerakligi aniqlang
```

### 3. Kod Yozish
```javascript
// TASK-1 uchun: Database schema
db.run(`CREATE TABLE IF NOT EXISTS products (...)`);

// TASK-2 uchun: API endpoints
app.get('/api/products', (req, res) => { ... });
app.post('/api/products', (req, res) => { ... });

// TASK-3, TASK-4 uchun: Frontend integration
const products = await apiClient.getProducts();
```

### 4. Testing (Kodni Tekshirish)
```bash
# Terminal da
npm start                 # Server ishga tushadi

# Browser da (F12 Console)
curl http://localhost:5000/api/products   # API test
# Yoki: Network tab'dan response tekshiring
```

### 5. Status Update
```
→ ishlar/STATUS.md ni oching
→ Bajargan TASK'ni toping
→ Progress % ni ko'tarish (50% → 70% → 100%)
→ Status'ni yangilash (Chala qilingan → Tugallandi)
```

### 6. Muammo bo'lsa
```
→ ishlar/DEBUGGING.md ni oching
→ Shunga o'xshash error qidirilsin
→ Yechim bo'lsa, tadbiq qiling
→ Yangi muammo bo'lsa, qo'shimcha qus
```

## 📂 Fayl Referenslari

| Fayl | Maqsad |
|------|--------|
| `AGENTS.md` | Batafsil agent yo'riqnomasi va code patterns |
| `ishlar/TASKS.md` | Har bir task'ning batafsil tavsifi |
| `ishlar/STATUS.md` | Tasks holati, prioritet, progress foizi |
| `ishlar/DEBUGGING.md` | Umumiy errors va yechimlar |
| `README.md` | Foydalanuvchi uchun boshlang'ich ko'rsatma |
| `ARCHITECTURE.md` | Loyihaning arxitekturasi va data model |
| `SERVER_README.md` | Server deployment qo'llanmasi |

## 🔧 Tezkor Checks (Task'dan keyin)

```
✓ Syntax xatolari yo'qmi? (npm start, Console F12)
✓ API/Database error yo'qmi? (Response status 200/201?)
✓ Frontend data to'g'ri render bo'ladimi?
✓ Eski features ishlayotgan holda qolidimi?
✓ STATUS.md yangilanganmi?
```

## 💡 Eslatmalar

1. **Birinchi qadamlar**: 
   - Avvalo `.env` fayli yarating (TASK-8)
   - Keyin database schema (TASK-1)
   - Keyin API endpoints (TASK-2)

2. **Testing**:
   - Har bir task'dan keyin `npm start` bilan test qiling
   - Browser console'da errors tekshiring
   - cURL yoki Postman bilan API test qiling

3. **File dependencies**:
   - `server.js` ← `.env` ga bog'langan
   - `js/api-client.js` ← `server.js`ga bog'langan
   - `js/app.js` ← `js/api-client.js` va `js/storage.js`

4. **Status tracking**:
   - Har bir task tugagach, `STATUS.md`ni SHULAMAM update qiling
   - Progress foiti 15% ko'tarsh kerak (0% → 15% → 30% → ...)

## 🎓 Keyingi Qadamlar

1. AGENTS.md ni o'qib, file structure va dependencies'ni tusuning
2. ishlar/TASKS.md dan TASK-1'ni o'qing (Database Schema)
3. DEBUGGING.md da common errors ko'rib olting (server connection issues)
4. Terminal'da `npm install` va `npm start` bilan serverini test qiling
5. Browser'da `http://localhost:5000` ochib, API response tekshiring

---

**Eslatma**: Bu fayl tezkor yo'riqnoma. Agar boshqa savollar bo'lsa, `AGENTS.md` va `ARCHITECTURE.md` fayllarini o'qib chiqing.
