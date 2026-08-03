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

### Boshlash
1. `ishlar/TASKS.md` ni diqqat bilan o'qib chiqing — har bir taskda nima qilish kerakligi aytilgan
2. `ishlar/STATUS.md` dan eng yuqori prioritetli va saqari bajarilmagan taskni tanlang
3. CLAUDE.md dan loyihaning tezkor overview'ini ko'rib olishingiz mumkin

### Har bir task bajarishda
1. **O'qish**: TASKS.md da task tavsifi, qaysi fayl o'zgartiriladi, nima kerak bo'lganini o'qing
2. **Tayyorlash**: Kerakli fayllarni o'qib, joriy holat'ni tushuning
3. **Kod yozish**: `server.js`, `js/app.js`, `js/api-client.js` kabi fayllarni o'zgartiring
4. **Test qilish**: O'zgarishlarni browser yoki terminal'da test qiling (error/warning tekshiring)
5. **Yangilash**: `ishlar/STATUS.md` dagi progress %'ni o'zgartiring, STATUS'ni update qiling
6. **Yozish**: Agar yangi muammo paydo bo'lsa, `ishlar/DEBUGGING.md` ga qo'shimcha yozish

### Kodni o'zgartirganda
- `server.js`: Express API routes, database queries, middleware
- `js/app.js`: Frontend logic, UI event handlers, data rendering
- `js/api-client.js`: API calls (fetch), localStorage fallback
- `js/storage.js`: LocalStorage va auth management
- `.env` yoki `.env.example`: Sekretlar, JWT_SECRET, PORT, DATABASE_PATH

### Natija tekshirish
- Kod syntax xatolari yo'qmi? (F12 Console, terminal logs)
- API response 200/201 status'i berishi kerak (error bo'lsa ne?)
- Frontend'da data to'g'ri render bo'ladimi?
- Eski fayllar ishlayotgan holda qoladi (backward compatibility)?

### Agar xato bo'lsa
- `ishlar/DEBUGGING.md` da shunga o'xshash muammo yozmama? O'qib chiqing
- Terminal/Console da error message nima deyapti?
- Qaysi database query yoki API endpoint xato?

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

## Fayl Dependencies va Patterns

### Environment Setup
```bash
# Avval .env fayli yaratilishi kerak (TASK-8)
PORT=5000
DATABASE_PATH=./accounting.db
JWT_SECRET=your-secret-key-here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Database Connection Pattern
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./accounting.db');

// Query execution
db.run("SQL QUERY", [params], function(err) {
  if (err) console.error('DB Error:', err);
  res.json({ success: true, data: {...} });
});

// Querying multiple rows
db.all("SELECT * FROM users", [], (err, rows) => {
  if (err) return res.status(500).json({ error: err.message });
  res.json({ success: true, data: rows });
});
```

### API Response Format
```javascript
// Success response
res.status(200).json({
  success: true,
  data: { /* entity data */ }
});

// Error response
res.status(400).json({
  success: false,
  error: "Error description"
});
```

### Frontend API Call Pattern
```javascript
// Using api-client.js
const data = await apiClient.getProducts();
if (data.success) {
  // Render data
} else {
  console.error(data.error);
}
```

### LocalStorage Pattern (Offline Mode)
```javascript
// Storage.js yordamida
const storage = new LocalStorageManager();
storage.addItem('products', productData);
const items = storage.getItems('products');
```

---

## File Dependencies

```
server.js
├── Requires: package.json (dependencies)
├── Reads: .env (configuration)
└── Creates: accounting.db (SQLite database)

js/api-client.js
├── Requires: express server running OR localStorage fallback
└── Calls: /api/products, /api/invoices, /api/production/*

js/app.js
├── Requires: index.html (DOM elements)
├── Calls: api-client.js methods
├── Calls: storage.js methods
└── Renders: Dashboard, Inventory, Invoices, Payroll, Reports

js/storage.js
├── Uses: Browser localStorage
└── Provides: Data persistence, authentication

index.html
├── Imports: js/storage.js, js/api-client.js, js/app.js
├── Imports: css/styles.css
└── Contains: Tab structure, form templates
```

---

## Qo'shimcha

Agar yangi funktsiya yoki technology qo'shilsachi, avvalo `AGENTS.md` va `ishlar/TASKS.md` ga yozing.
