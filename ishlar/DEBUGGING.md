# 🛠️ Debugging & Troubleshooting Guide

Bu fayl common muammolar va ularning yechimlarini o'z ichiga oladi.

---

## ❌ Kerakli Dependencies Ko'chiriladimi?

```bash
# Tekshirilgan version'lar
npm list
```

**Agar qandaydir packages bo'lmasa**:
```bash
npm install express cors bcryptjs jsonwebtoken sqlite3 dotenv body-parser
```

---

## 🔌 Server Ishga Tushmasligi

### Problem: `npm start` qo'ng'oq
**Sabablar va yechimlar**:

1. **Port already in use**
   - Server boshqa process'da ishlamoqda
   - Yechim: `netstat -ano | findstr :5000` (Windows)
   - Process kill: `taskkill /PID <PID> /F`
   - Yoki boshqa PORT'dan boshlang: `PORT=5001 npm start`

2. **Database file muammosi**
   - `accounting.db` corrupted bo'lsa
   - Yechim: Fayl o'chirib korasiz, yangi boshlanadi
   - `del accounting.db` (Windows)

3. **Module not found**
   - Dependencies o'rnatilmagan
   - Yechim: `npm install` qayta run qiling

---

## 🔐 JWT Token Muammolari

### Problem: "Invalid token" 
```
error: jwt malformed
```
**Yechim**:
- Token header'da to'g'ri formatda yuborilganmi?
- `Authorization: Bearer <token>` bo'lishi kerak
- Token expired'mi? (set ta'minni .env dan)

---

## 💾 SQLite Query Xatolari

### Problem: "FOREIGN KEY constraint failed"
**Sabablar**:
- Referenced table'da yang'i key yo'q
- Yechim: Parent record avval insert qiling

### Problem: "no such table"
**Yechim**:
- Database schema'si yarat ilmagan
- `initializeDatabase()` ishga tushishiga ishonch hosil qiling

---

## 🌐 CORS Muammolari

### Problem: "Access to XMLHttpRequest blocked"
**Yechim**:
- CORS middleware'da origin'ni qo'shish:
  ```javascript
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
  ```

---

## 📡 API Response Xatolari

### Problem: `res.json()` error
- Response avval send bo'lgan bo'lsa
- Yechim: `if (res.headersSent) return;` check qiling

### Problem: Undefined response
- Database callback'i chaqirilmagan
- Yechim: `db.run()` callback'ini to'g'ri qo'shish

---

## 🔄 Frontend-Server Communication

### Problem: Server data frontend'da ko'rinmaydi
1. Browser console'da error ko'rib chiqing (F12)
2. Network tab'da request va response tekshiring
3. Server status code'ini check qiling
4. API endpoint'ning manzili to'g'rimi?

```javascript
// Debug helper
console.log('API Call:', method, url, data);
fetch(url)
  .then(r => {
    console.log('Response status:', r.status);
    return r.json();
  })
  .catch(e => console.error('Fetch error:', e));
```

---

## 🧪 Testing API with cURL

### GET request
```bash
curl http://localhost:5000/api/products
```

### POST with token
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Product","category":"Cat"}'
```

---

## 📋 Logs va Debugging

### Server logs qo'shish
```javascript
console.log('[INFO]', new Date().toISOString(), message);
console.error('[ERROR]', new Date().toISOString(), error);
```

### File'ga log yozish
```javascript
const fs = require('fs');
function logToFile(message) {
  fs.appendFileSync('server.log', `${new Date().toISOString()} ${message}\n`);
}
```

---

## 🚀 Performance Issues

### Slow database queries
- Index add qiling ko'p used fields'ga
- Large result set uchun pagination qo'shish:
  ```javascript
  const limit = 20;
  const offset = (page - 1) * limit;
  `SELECT * FROM products LIMIT ${limit} OFFSET ${offset}`
  ```

### Memory leak prevention
- Database connection'ni hamma joyda close qilamiz
- Timers va intervals'ni clear qilamiz

---

## ✅ Success Indicators

### Server muvaffaqiyatli ishga tushgan ✓
```
Connected to SQLite database
Server running on port 5000
```

### API muvaffaqiyatli ishlagan ✓
```json
{
  "success": true,
  "data": { /* results */ }
}
```

### Frontend server bilan integrated ✓
- Data backend'dan load bo'ladigan
- API calls console'da success response beradi

---

## 📚 Useful Links

- SQLite3 docs: https://www.sqlite.org/docs.html
- Express.js: https://expressjs.com/
- JWT: https://jwt.io/
- bcract.js: https://github.com/dcodeIO/bcrypt.js

---

## 🎯 Quick Checklist

Agar server ishlatmasa, avval butalrini check qiling:

- [ ] `npm install` qilingan
- [ ] `server.js` fayli bor
- [ ] `.env` file'da PORT o'rnatilgan
- [ ] Database initialisatsiya qilingan
- [ ] No other process port 5000'da ishlamayapti
- [ ] Browser console'da CORS error yo'q
- [ ] API response status 200 yoki 201
- [ ] LocalStorage mode'da test qiling

---

**Last Updated**: 2026-08-01
