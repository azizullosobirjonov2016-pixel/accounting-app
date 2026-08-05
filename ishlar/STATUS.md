# 📊 Task Status Overview

## Holat Xulosa (Summary)

| Task | Nomi | Status | Priority | Tugallash % |
|------|------|--------|----------|------------|
| TASK-1 | Database Schema | ✅ Tugallandi | 🔴 HIGH | 100% |
| TASK-2 | API Endpoints | ✅ Tugallandi | 🔴 HIGH | 100% |
| TASK-3 | api-client.js | ✅ Tugallandi | 🔴 HIGH | 100% |
| TASK-4 | app.js Server Mode | ✅ Tugallandi | 🔴 HIGH | 100% |
| TASK-5 | Password Encryption | ✅ Tugallandi | 🟡 MEDIUM | 100% |
| TASK-6 | Error Handling | 🟡 Chala | 🟡 MEDIUM | 60% |
| TASK-7 | RBAC | ✅ Tugallandi | 🟡 MEDIUM | 90% |
| TASK-8 | .env Config | 🟡 Chala | 🟡 MEDIUM | 50% |
| TASK-9 | Settings UI | ✅ Tugallandi | 🟡 MEDIUM | 90% |
| TASK-10 | Unit Tests | 🔴 Boshlanmagan | 🟢 LOW | 0% |
| TASK-11 | Reporting | 🔴 Boshlanmagan | 🟢 LOW | 0% |
| TASK-12 | WebSocket | 🔴 Boshlanmagan | 🟢 LOW | 0% |
| TASK-13 | Mobile UI | 🟡 Chala | 🟢 LOW | 70% |
| TASK-14 | Docker | 🔴 Boshlanmagan | 🟢 LOW | 0% |
| TASK-15 | Deployment | 🔴 Boshlanmagan | 🟢 LOW | 0% |

---

## 🎯 Tavsiy Ishlash Davomi (Recommended Sequence)

### 1️⃣ Phase: Core Backend Completion (1-2 soat)
```
→ TASK-1: Database Schema tugallash
→ TASK-2: API Endpoints yozish  
→ TASK-8: .env file sozlash
```
**Natijaviy**: Server ishga tushadi va API bilan ishlaydi

### 2️⃣ Phase: Frontend Integration (1 soat)
```
→ TASK-3: api-client.js tugallash
→ TASK-4: app.js server mode'ga o'tkazish
→ TASK-9: Settings UI qo'shish
```
**Natijaviy**: Frontend server bilan integrated ishlaydi

### 3️⃣ Phase: Security & Validation (30 minut)
```
→ TASK-5: Password encryption
→ TASK-6: Error handling
→ TASK-7: RBAC
```
**Natijaviy**: System secure va production-ready

### 4️⃣ Phase: Testing & Deployment (1-2 soat)
```
→ TASK-10: Unit tests
→ TASK-14: Docker
→ TASK-15: Deployment guide
```
**Natijaviy**: Production'ga deploy qilishga tayyar

### 5️⃣ Phase: Advanced Features (Keyingi vaqt)
```
→ TASK-11: Advanced reporting
→ TASK-12: WebSocket real-time
→ TASK-13: Mobile UI optimization
```

---

## 🚀 Per AI Agent Instructions

### Har bir task'ni shunday amalga oshiring:

1. **UNDERSTAND** - TASKS.md-dan task tavsifini o'qing
2. **PLAN** - Kerakli fayl va o'zgarishlarni aniqlang
3. **IMPLEMENT** - Code yozing yoki tayyorlangan template'dan foydalaning
4. **TEST** - O'zgarishlari test qiling (agar mumkin bo'lsa)
5. **REPORT** - Natijani va o'zgarishlarni tavsiflab bergan

### Code Style

- **Language**: JavaScript (Vanilla)
- **Naming**: camelCase (variables, functions)
- **Formatting**: 2-space indentation
- **Comments**: O'zbekcha va Englishcha
- **Error handling**: Try-catch + meaningful messages

### Database Connection

```javascript
// SQLite connection patterns
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./accounting.db');

// Query execution
db.run("INSERT INTO users ...", [params], function(err) {
  if (err) console.error(err);
});

db.all("SELECT * FROM users", [], (err, rows) => {
  if (err) console.error(err);
});
```

### API Response Format

```javascript
// Success
res.json({
  success: true,
  data: { /* result */ }
})

// Error
res.status(400).json({
  success: false,
  error: "Error message"
})
```

### JWT Token Handling

```javascript
// Header uchun
Authorization: Bearer <token>

// Verification
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, JWT_SECRET);
```

---

## 📂 Fayl Struktуrasi

```
accounting-app/
├── server.js              ← Main server file (TASKS-1,2 uchun)
├── package.json           ← Dependencies (TASK-8)
├── .env                   ← Config file (TASK-8 - Create)
├── test.js                ← Tests (TASK-10 - Create)
├── Dockerfile             ← Container (TASK-14 - Create)
├── docker-compose.yml     ← Compose (TASK-14 - Create)
│
├── js/
│   ├── app.js            ← Main app (TASK-4 uchun)
│   ├── api-client.js     ← API client (TASK-3 uchun)
│   └── storage.js        ← LocalStorage manager
│
├── css/
│   └── styles.css        ← Styles
│
├── ishlar/               ← Tasks folder
│   ├── TASKS.md          ← This file
│   └── STATUS.md         ← Status overview
│
└── index.html            ← Main UI
```

---

## 🔧 Quick Commands

```bash
# Start server (development)
npm run dev

# Start server (production)
npm start

# Run tests
npm test

# Check status
curl http://localhost:5000

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## ⚠️ Important Notes

1. **SQLite Path**: `./accounting.db` - server.js bilan bir katalogda
2. **JWT Secret**: Production'da environment'dan o'qing
3. **CORS**: Frontend va backend boshqa port'da bo'lsa, CORS sozlang
4. **Password Hashing**: Hech qachon plain-text password saqlamang
5. **Error Logs**: Console va file'ga log qilish implement qiling

---

## 🔄 2026-08-05 yangilanishi: to'liq dinamik (SQLite) rejimga o'tildi

Loyiha localStorage'dan butunlay voz kechib, faqat serverga (Express + SQLite) tayanadigan qilib qayta qurildi:
- `server.js`: barcha entity uchun to'liq CRUD (suppliers, invoices+QQS, production, inventory-movements, settings, company-info, documents), bootstrap-admin, `crypto.randomUUID()` ID'lar
- `js/api-client.js`: `js/storage.js`dagi barcha metodlarga mos keluvchi to'liq client
- `js/app.js`: 3000+ qatorning deyarli barchasi asinxron `api.*` chaqiruvlariga o'tkazildi, `js/storage.js` butunlay o'chirildi
- Ko'p-foydalanuvchili (bir vaqtda ikki sessiya bir xil ma'lumotni ko'radi) Playwright orqali tasdiqlandi
- Zaxira olish/qaytarish (backup/restore) ID moslashtirish bilan qayta yozildi

## 📞 Support

Agar qandaydir savollar bo'lsa, bu task file'ni referans qilib ishni davom ettirib chiqing.
Har bir task natijasida server va frontend test qilib chiqing.

---

**Created**: 2026-08-01
**Format**: Markdown (AI-Agent readable)
**Encoding**: UTF-8
