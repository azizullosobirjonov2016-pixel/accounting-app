# Qilinmagan / Chala Qilingan Ishlar

Bu fayl AI Agent uchun tayyor dasturdagi tugallanmagan va chala qilingan vazifalarni o'z ichiga oladi.

---

## 🔴 URXALI ISHLAR (HIGH PRIORITY)

### TASK-1: Server Backend - SQLite Database Schema Tugallash
**Status**: Chala qilingan (50%)
**Fayl**: `server.js`

**Tavsif**:
`server.js` faylidagi `initializeDatabase()` funktsiyasida faqat `users` va `clients` tablelar yaratilgan. Qolgan barcha zarur tablelarni qo'shish kerak.

**Kerakli Tablelar**:
1. `suppliers` - Yetkazib beruvchilar
2. `products` - Mahsulotlar
3. `inventory_movements` - Ombor harakatlanishlari
4. `production_recipes` - Ishlab chiqarish retseptlari (BOM)
5. `production_orders` - Ishlab chiqarish buyurtmalari
6. `invoices` - Invoicelar
7. `invoice_items` - Invoice qatorlari
8. `transactions` - Buxgalteriya tranzaksiyalari
9. `employees` - Xodimlar
10. `payroll_records` - Ish haqi yozuvlari
11. `settings` - Sistemani sozlamalar

**Har bir table uchun kerakli ustunlar**:

```
suppliers:
  id (PRIMARY KEY)
  name (TEXT NOT NULL)
  phone (TEXT)
  email (TEXT)
  address (TEXT)
  createdAt (TEXT NOT NULL)

products:
  id (PRIMARY KEY)
  name (TEXT NOT NULL)
  category (TEXT)
  unit (TEXT)
  minStock (INTEGER)
  purchasePrice (REAL)
  sellingPrice (REAL)
  stock (INTEGER DEFAULT 0)
  createdAt (TEXT NOT NULL)

inventory_movements:
  id (PRIMARY KEY)
  productId (TEXT NOT NULL FOREIGN KEY -> products.id)
  type (TEXT NOT NULL) -- 'in', 'out', 'adjust'
  quantity (INTEGER)
  date (TEXT NOT NULL)
  description (TEXT)

production_recipes:
  id (PRIMARY KEY)
  name (TEXT NOT NULL)
  finishedProductId (TEXT NOT NULL FOREIGN KEY -> products.id)
  materials (TEXT) -- JSON array
  createdAt (TEXT NOT NULL)

production_orders:
  id (PRIMARY KEY)
  recipeId (TEXT)
  finishedProductId (TEXT NOT NULL FOREIGN KEY -> products.id)
  producedQuantity (INTEGER)
  materials (TEXT) -- JSON array
  productionCost (REAL)
  date (TEXT NOT NULL)
  description (TEXT)

invoices:
  id (PRIMARY KEY)
  number (TEXT UNIQUE)
  date (TEXT NOT NULL)
  clientId (TEXT NOT NULL FOREIGN KEY -> clients.id)
  lineItems (TEXT) -- JSON array
  total (REAL)
  status (TEXT) -- 'draft', 'issued', 'paid'
  createdAt (TEXT NOT NULL)

invoice_items:
  id (PRIMARY KEY)
  invoiceId (TEXT NOT NULL FOREIGN KEY -> invoices.id)
  productId (TEXT NOT NULL FOREIGN KEY -> products.id)
  quantity (INTEGER)
  price (REAL)

transactions:
  id (PRIMARY KEY)
  date (TEXT NOT NULL)
  clientId (TEXT)
  supplierId (TEXT)
  type (TEXT NOT NULL) -- 'income', 'expense'
  category (TEXT)
  amount (REAL)
  description (TEXT)

employees:
  id (PRIMARY KEY)
  name (TEXT NOT NULL)
  position (TEXT)
  salary (REAL)
  taxInfo (TEXT) -- JSON
  createdAt (TEXT NOT NULL)

payroll_records:
  id (PRIMARY KEY)
  employeeId (TEXT NOT NULL FOREIGN KEY -> employees.id)
  periodFrom (TEXT)
  periodTo (TEXT)
  gross (REAL)
  deductions (REAL)
  net (REAL)
  date (TEXT NOT NULL)

settings:
  key (TEXT PRIMARY KEY)
  value (TEXT)
```

**Qanday qilish**:
- `initializeDatabase()` funktsiyasi ichida qolgan tablelar uchun `db.run(CREATE TABLE...)` statementlarini qo'shish
- Xorijiy kalitlar (FOREIGN KEY) ni to'g'ri sozlash
- AUTOINCREMENT va DEFAULT qiymatlarni to'g'ri set qilish

---

### TASK-2: API Endpoints - Asosiy CRUD Operatsiyalari Tayyorlash
**Status**: Boshlanmagan (0%)
**Fayl**: `server.js`

**Tavsif**:
Hozirgi `server.js` faylida faqat middleware va database tayyorlash bor. Asliy API endpointlarini yozish kerak.

**Kerakli API Endpoints**:

#### Authentication
- `POST /api/auth/login` - Foydalanuvchi kirish
  - Input: `{ username, password }`
  - Output: `{ token, user: { id, name, role } }`
  
- `POST /api/auth/register` - Yangi foydalanuvchi ro'yxatdan o'tish (admin uchun)
  - Input: `{ username, password, name, role }`
  - Output: `{ id, username, name, role }`

#### Products (Mahsulotlar)
- `GET /api/products` - Barcha mahsulotlarni olish
- `POST /api/products` - Yangi mahsulot qo'shish
- `GET /api/products/:id` - Bitta mahsulotni olish
- `PUT /api/products/:id` - Mahsulotni tahrirlash
- `DELETE /api/products/:id` - Mahsulotni o'chirish (admin ruxsat kerak)

#### Clients (Mijozlar)
- `GET /api/clients` - Barcha mijozlarni olish
- `POST /api/clients` - Yangi mijoz qo'shish
- `PUT /api/clients/:id` - Mijozni tahrirlash
- `DELETE /api/clients/:id` - Mijozni o'chirish

#### Suppliers (Yetkazib beruvchilar)
- `GET /api/suppliers` - Barcha yetkazib beruvchilarni olish
- `POST /api/suppliers` - Yangi yetkazib beruvchi qo'shish
- `PUT /api/suppliers/:id` - Yetkazib beruvchini tahrirlash
- `DELETE /api/suppliers/:id` - Yetkazib beruvchini o'chirish

#### Invoices (Invoicelar)
- `GET /api/invoices` - Barcha invoicelarni olish
- `POST /api/invoices` - Yangi invoice yaratish
  - Input: `{ number, date, clientId, lineItems: [{productId, quantity, price}], status }`
  - Output: Created invoice with id
- `GET /api/invoices/:id` - Bitta invoiceni olish
- `PUT /api/invoices/:id` - Invoiceni tahrirlash
- `DELETE /api/invoices/:id` - Invoiceni o'chirish

#### Production Recipes (Ishlab chiqarish retseptlari)
- `GET /api/production/recipes` - Barcha retseptlarni olish
- `POST /api/production/recipes` - Yangi retsept yaratish
- `PUT /api/production/recipes/:id` - Retseptni tahrirlash
- `DELETE /api/production/recipes/:id` - Retseptni o'chirish

#### Production Orders (Ishlab chiqarish buyurtmalari)
- `GET /api/production/orders` - Barcha buyurtmalarni olish
- `POST /api/production/orders` - Yangi buyurtma yaratish
- `PUT /api/production/orders/:id` - Buyurtmani tahrirlash

#### Transactions (Buxgalteriya tranzaksiyalari)
- `GET /api/transactions` - Barcha tranzaksiyalarni olish
- `POST /api/transactions` - Yangi tranzaksiya qo'shish
- `DELETE /api/transactions/:id` - Tranzaksiyani o'chirish

#### Employees (Xodimlar)
- `GET /api/employees` - Barcha xodimlarni olish
- `POST /api/employees` - Yangi xodim qo'shish
- `PUT /api/employees/:id` - Xodimni tahrirlash

#### Payroll (Ish haqi)
- `GET /api/payroll` - Barcha ish haqi yozuvlarini olish
- `POST /api/payroll` - Yangi ish haqi yozuvi yaratish
- `GET /api/payroll/:id` - Bitta ish haqi yozuvini olish

#### Settings (Sozlamalar)
- `GET /api/settings` - Barcha sozlamalarni olish
- `POST /api/settings` - Sozlamani save qilish
  - Input: `{ key, value }`

**Qanday qilish**:
1. Har bir endpoint uchun router.get(), router.post(), router.put(), router.delete() qo'shish
2. Database operatsiyalariga SQL querylarni yozish
3. JWT token verifikatsiyasini qo'shish
4. Error handling va response formatting qo'shish

---

### TASK-3: Frontend api-client.js - Server Integratsiyasi
**Status**: Chala qilingan (30%)
**Fayl**: `js/api-client.js`

**Tavsif**:
`api-client.js` faylidagi API clienti qisman yozilgan. U server mode va localStorage mode ni ikkalasida ishlashi kerak.

**Kerakli o'zgarishlar**:
1. Barcha CRUD operatsiyalari uchun method'larni yozish
2. Server bilan muloqot (fetch API orqali) to'g'ri sozlash
3. localStorage fallback uchun logic qo'shish
4. Error handling qo'shish
5. JWT token management qo'shish

**Method'lar**:
```javascript
// Auth
login(username, password)
logout()
register(username, password, name, role)

// Products
getProducts()
postProduct(data)
updateProduct(id, data)
deleteProduct(id)

// Clients
getClients()
postClient(data)
updateClient(id, data)
deleteClient(id)

// Suppliers
getSuppliers()
postSupplier(data)
updateSupplier(id, data)
deleteSupplier(id)

// Invoices
getInvoices()
postInvoice(data)
updateInvoice(id, data)
deleteInvoice(id)

// Production
getRecipes()
postRecipe(data)
getOrders()
postOrder(data)

// Transactions
getTransactions()
postTransaction(data)

// Employees & Payroll
getEmployees()
postEmployee(data)
getPayroll()
postPayroll(data)

// Settings
getSettings()
updateSettings(key, value)
```

---

### TASK-4: Frontend app.js - Server Mode'ga O'tkazish
**Status**: Chala qilingan (40%)
**Fayl**: `js/app.js`

**Tavsif**:
`app.js` hozirda faqat localStorage bilan ishlaydi. U server mode'da ham ishlashi kerak.

**Kerakli o'zgarishlar**:
1. App initialization'da server connection tekshirilsin
2. Agar server aktiv bo'lsa, API client'dan data olsin
3. Agar server o'chiqliq bo'lsa, localStorage dan olsin
4. Server va localStorage o'rtasida sync qo'shish
5. Offline/Online status'ni kuzatish

**Mode switching logic**:
```
if (serverAvailable) {
  useApiClient()
} else {
  useLocalStorage()
}
```

---

## 🟡 O'RTACHA MUHIM ISHLAR (MEDIUM PRIORITY)

### TASK-5: Password Encryption va Security
**Status**: Boshlanmagan (0%)
**Fayl**: `server.js`

**Tavsif**:
Hozirda login sistemasida bcrypt ishlatilmagan. Parol shifrlash to'g'ri amalga oshirilishi kerak.

**Kerakli o'zgarishlar**:
1. User ro'yxatdan o'tishda parolni bcrypt bilan shifrlash
2. Login qilishda parolni verify qilish
3. Password hashing salt qo'shish
4. Environment variable'da JWT secret ni saqlash

---

### TASK-6: Error Handling va Validation
**Status**: Boshlanmagan (0%)
**Fayl**: `server.js`

**Tavsif**:
API endpointlarida input validation va comprehensive error handling shaklflantirilishi kerak.

**Qanday qilish**:
1. Input validation qo'shish (req.body, req.params)
2. Database error handling qo'shish
3. Try-catch blocks qo'shish
4. HTTP status code'larini to'g'ri berish
5. Error messages ni standardizatsiya qilish

---

### TASK-7: Role-Based Access Control (RBAC)
**Status**: Chala qilingan (20%)
**Fayl**: `server.js`

**Tavsif**:
Middleware'da role tekshirilishi kerak.

**Kerakli o'zgarishlar**:
1. Har bir endpoint uchun role tekshiruvi qo'shish
2. Admin uchun: barcha operatsiyalar
3. Manager uchun: read, create operatsiyalari
4. User uchun: faqat read operatsiyalari (invoice ko'rish)

---

### TASK-8: Environment Variables Konfiguratsiyasi
**Status**: Boshlanmagan (0%)
**Fayl**: `.env` (yaratilishi kerak)

**Tavsif**:
`.env` fayli yaratilishi va sozlamalar unda saqlanishi kerak.

**Kerakli o'zgarishlar**:
1. `.env` fayli yaratish
2. Qolgan sozlamalarni qo'shish

**Tarkibi**:
```
PORT=5000
DATABASE_PATH=./accounting.db
JWT_SECRET=your-secret-key-here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

---

### TASK-9: Frontend - Settings Tab'i Server Integrations'ni Qo'shish
**Status**: Chala qilingan (30%)
**Fayl**: `js/app.js`, `index.html`

**Tavsif**:
Settings tab'ida server connection status'ini ko'rsatish va server sozlamalarini ta'minlash kerak.

**Kerakli o'zgarishlar**:
1. Server connection indikatori qo'shish
2. Server URL input field qo'shish
3. Server test button qo'shish
4. SQLite/Server mode ni almashtiruvchi switch qo'shish

---

## 🟢 PAST MUHIM ISHLAR (LOW PRIORITY)

### TASK-10: Unit Tests va Integration Tests
**Status**: Boshlanmagan (0%)
**Fayl**: `test.js` (yaratilishi kerak)

**Tavsif**:
API endpointlari uchun testlar yozilishi kerak.

**Test cases**:
1. Auth testlari (login, register)
2. CRUD operation testlari
3. Role-based access testlari
4. Error handling testlari

---

### TASK-11: Advanced Reporting
**Status**: Boshlanmagan (0%)
**Fayl**: `js/app.js`, `index.html`

**Tavsif**:
Hozirda faqat asosiy hisobotlar. Quyidagi feature'lar qo'shilishi kerak:
1. PDF eksport
2. Scheduled reports
3. Custom date range
4. Multiple format export (CSV, Excel)

---

### TASK-12: Real-time Multi-user Collaboration
**Status**: Boshlanmagan (0%)
**Fayl**: `server.js`, `js/app.js`

**Tavsif**:
WebSocket orqali real-time data synchronization qo'shish kerak.

**Features**:
1. WebSocket server qo'shish
2. Client-server real-time sync
3. Concurrent edit handling
4. Conflict resolution

---

### TASK-13: Mobile Responsiveness Improvement
**Status**: Chala qilingan (70%)
**Fayl**: `css/styles.css`

**Tavsif**:
Mobil qurilmalar uchun UI yaxshilanishi kerak.

**Kerakli o'zgarishlar**:
1. Tablet layout optimization
2. Mobile menu improvement
3. Touch-friendly buttons
4. Responsive tables

---

### TASK-14: Docker Containerization
**Status**: Boshlanmagan (0%)
**Fayl**: `Dockerfile`, `docker-compose.yml` (yaratilishi kerak)

**Tavsif**:
Loyihani Docker container'da ishga tushirish uchun fayl yaratish kerak.

**Tarkibi**:
- Node.js image
- SQLite setup
- Environment variables
- Port expose

---

### TASK-15: Deployment va Production Setup
**Status**: Boshlanmagan (0%)
**Fayl**: `SERVER_README.md` (yaxshilanishi kerak)

**Tavsif**:
Production'ga deploy qilish bo'yicha qo'llanma yaratilishi kerak.

**Tarkibi**:
- Hosting options
- Database backup strategy
- SSL/HTTPS setup
- Monitoring va logging

---

## 📋 ISHLASH TARTIBI

AI Agent uchun tavsiflar:

1. **Avval TASK-1'dan boshlang** - Database schema tugallanishi kerak
2. **Keyin TASK-2'ga o'ting** - API endpoints quriladi
3. **TASK-3 va TASK-4** - Frontend integrations'i
4. **TASK-5, TASK-6, TASK-7** - Security va validation
5. **Qolgan ishlar** - Priority tartibida

Har bir task tugagan after'da, frontend'da test qilib chiqing va proper response borligini tekshiring.

---

## 📝 NOTES

- Barcha API responses `{ success: true/false, data: ..., error: ... }` formatida bo'lishi kerak
- Timestamp'larni ISO 8601 formatida saqlash: `new Date().toISOString()`
- ID'larni UUID yoki random string bilan generate qilish (auto-increment emas)
- Database connection'ni proper close qilish server shut down'da

---

**Last Updated**: 2026-08-01
**Project Status**: Production Readiness - 45%
