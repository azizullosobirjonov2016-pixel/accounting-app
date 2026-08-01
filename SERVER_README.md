# 🏢 Ombor Boshqaruv Tizimi (Accounting & Warehouse Management System)

## Complete Accounting System with Production, Sales, Payroll & Multi-User Support

---

## 📋 Project Overview

A full-featured accounting and warehouse management system built with HTML/CSS/Vanilla JS frontend and Node.js/Express backend.

**Features:**
- ✅ Inventory Management (products, stock tracking)
- ✅ Production Module (BOM, recipes, production orders, cost calculation)
- ✅ Sales Module (invoices, automatic stock adjustment)
- ✅ Payroll & HR (employees, salary calculation, automatic expense transactions)
- ✅ Accounting (transactions, income/expense tracking, tax calculation)
- ✅ Multi-User Support with Role-Based Access Control
- ✅ JWT Authentication
- ✅ SQLite Database

---

## 🚀 Quick Start (Frontend Only - No Server)

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Any text editor or VS Code

### How to Run
1. Open `index.html` in your browser
2. App uses browser localStorage (data persists locally)
3. All features work without a server

**Test Accounts (localStorage mode):**
- Username: `user` / Password: `pass` / Role: `user`
- Username: `manager` / Password: `pass` / Role: `manager`
- Username: `admin` / Password: `pass` / Role: `admin`

---

## 🔧 Setup with Node.js Server (Production)

### Prerequisites
- Node.js 14+ ([download](https://nodejs.org/))
- NPM (comes with Node.js)

### Installation

1. **Clone/navigate to project folder:**
   ```bash
   cd "path/to/accounting-app"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create .env file from template:**
   ```bash
   copy .env.example .env
   ```

4. **Edit .env with production settings:**
   ```
   PORT=5000
   JWT_SECRET=your-super-secret-key-change-this
   NODE_ENV=production
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

   Server runs at `http://localhost:5000`

### Development Mode with Auto-Reload
```bash
npm run dev
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

**POST /auth/login** - User login
```json
{
    "username": "admin",
    "password": "pass"
}
```
Response: `{ token, user: { id, username, name, role } }`

**POST /auth/register** - Register new user
```json
{
    "username": "newuser",
    "password": "newpass",
    "name": "Foydalanuvchi Name",
    "role": "user"
}
```

### Clients API

**GET /clients** - Get all clients (requires auth)

**POST /clients** - Create client
```json
{
    "name": "ABC Corporation",
    "phone": "+998901234567",
    "email": "info@abc.uz",
    "address": "Tashkent, Uzbekistan"
}
```

**DELETE /clients/:id** - Delete client (manager/admin only)

### Products API

**GET /products** - Get all products

**POST /products** - Create product
```json
{
    "name": "Laptop",
    "code": "LAP-001",
    "purchasePrice": 800,
    "salePrice": 1200,
    "stock": 10,
    "minStock": 2,
    "productType": "good"
}
```

**DELETE /products/:id** - Delete product (manager/admin only)

### Transactions API

**GET /transactions** - Get all transactions

**POST /transactions** - Create transaction
```json
{
    "date": "2026-07-20",
    "type": "income",
    "category": "sales",
    "description": "Product sale",
    "amount": 5000,
    "status": "completed"
}
```

**DELETE /transactions/:id** - Delete transaction (manager/admin only)

### Employees API

**GET /employees** - Get all employees

**POST /employees** - Create employee
```json
{
    "name": "A'zamjon O'zakov",
    "position": "Bosh bukhgalter",
    "salary": 5000000,
    "taxRate": 15
}
```

**DELETE /employees/:id** - Delete employee (manager/admin only)

### Payroll API

**GET /payroll** - Get payroll records

**POST /payroll** - Create payroll record
```json
{
    "employeeId": "123456",
    "period": "2026-07",
    "gross": 5000000,
    "tax": 750000,
    "deductions": 0,
    "net": 4250000
}
```

### Statistics API

**GET /statistics** - Get financial statistics
```json
{
    "totalIncome": 50000000,
    "totalExpense": 10000000,
    "totalTax": 7500000,
    "netProfit": 32500000
}
```

---

## 🗄️ Database Schema

### SQLite Tables

**users** - Users and authentication
- id, username (unique), password (hashed), name, role, createdAt

**clients** - Customer information
- id, name, phone, email, address, createdAt

**products** - Inventory items
- id, name, code (unique), purchasePrice, salePrice, stock, minStock, productType, createdAt

**transactions** - Financial records
- id, date, type, category, description, amount, status, createdAt

**production_recipes** - BOM and recipes
- id, name, finishedProductId, materials (JSON), createdAt

**production_orders** - Production history
- id, finishedProductId, producedQuantity, materials (JSON), date, cost, createdAt

**invoices** - Sales invoices
- id, number (unique), clientId, lines (JSON), total, date, status, createdAt

**employees** - HR records
- id, name, position, salary, taxRate, createdAt

**payroll_records** - Salary records
- id, employeeId, period, gross, tax, deductions, net, date, createdAt

---

## 🔐 Role-Based Access Control

### User Roles

| Role | Permissions |
|------|------------|
| **user** | View data only, cannot delete |
| **manager** | View, create, edit, delete data |
| **admin** | Full system access, user management, settings |

### Delete Restrictions
- Only `manager` and `admin` roles can delete records
- All other operations require authentication
- Role validation enforced on server side

---

## 📦 Deploying to Production

### Using Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t accounting-app .
docker run -p 5000:5000 accounting-app
```

### Using Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment variable:
   ```bash
   heroku config:set JWT_SECRET=your-production-secret
   ```
5. Deploy:
   ```bash
   git push heroku main
   ```

### Using DigitalOcean App Platform

1. Connect GitHub repository
2. Select Node.js main file: `server.js`
3. Set environment variables in dashboard
4. Deploy

---

## 💾 Data Management

### Export/Import Data

**Frontend Storage:**
- Settings → Backup → Export Data (downloads JSON)
- Settings → Restore → Import Data (uploads JSON)

**Server API:**
Endpoint: `GET /api/backup` (admin only)
Downloads full database as JSON

---

## 🔧 Troubleshooting

### "npm: command not found"
- Install Node.js from https://nodejs.org/
- Restart terminal after installation

### "Port 5000 already in use"
- Change PORT in .env file
- Or kill existing process:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  ```

### Database locked error
- Stop server, delete `accounting.db`, restart server
- Fresh database will be created

### Authentication fails
- Verify JWT_SECRET in .env matches client expectations
- Check token expiry: 24 hours by default
- See browser console for detailed errors

---

## 📝 System Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (HTML/CSS/Vanilla JS)         │
│  - Login & User Management              │
│  - Inventory, Production, Sales, Payroll│
│  - LocalStorage (dev) or API Client     │
└────────────────┬────────────────────────┘
                 │ HTTPS/REST API
                 ▼
┌─────────────────────────────────────────┐
│  Express.js Server                      │
│  - JWT Authentication                   │
│  - Role-Based Access Control            │
│  - API Endpoints                        │
└────────────────┬────────────────────────┘
                 │ SQL Queries
                 ▼
┌─────────────────────────────────────────┐
│  SQLite Database                        │
│  - Users, Clients, Products             │
│  - Transactions, Payroll, Invoices      │
│  - Production recipes & orders          │
└─────────────────────────────────────────┘
```

---

## 📞 Support & Documentation

### File Structure
```
accounting-app/
├── index.html              # Main frontend
├── css/styles.css          # Styling
├── js/
│   ├── app.js             # Main application logic
│   ├── storage.js         # LocalStorage manager
│   └── api-client.js      # API client layer
├── server.js              # Express server
├── package.json           # Node.js dependencies
├── .env.example           # Environment template
├── ARCHITECTURE.md        # System design
└── accounting.db          # SQLite database (auto-created)
```

---

## 🎯 Features Implemented

✅ **Inventory Management**
- Product CRUD operations
- Stock tracking and adjustments
- Low stock alerts
- Product categorization

✅ **Production Module**
- BOM (Bill of Materials) creation
- Production recipes management
- Production order creation
- Automatic cost calculation
- Material stock deduction

✅ **Sales Module**
- Invoice creation and management
- Line item handling
- Automatic stock decrement
- Invoice export to HTML
- Transaction auto-creation

✅ **Payroll Module**
- Employee database
- Salary calculation with deductions
- Tax computation
- Automatic salary expense tracking
- Payroll summary reporting

✅ **Accounting**
- Transaction logging
- Income/expense categorization
- Financial statistics
- Tax calculation
- Period-based reporting

✅ **Multi-User Support**
- User authentication (JWT)
- Three role levels (user, manager, admin)
- Permission-based operations
- Session management
- Password hashing (bcryptjs)

---

## 🚀 Next Steps

1. **Deploy to Production**
   - Follow deployment guide above
   - Set strong JWT_SECRET
   - Enable HTTPS

2. **Enhance Features**
   - Add PDF report generation
   - Implement email notifications
   - Add mobile app API
   - Create analytics dashboard

3. **Security**
   - Add rate limiting
   - Implement CSRF protection
   - Add input validation layer
   - Enable database encryption

4. **Scalability**
   - Migrate to PostgreSQL
   - Implement caching (Redis)
   - Add background job queue
   - Create microservices architecture

---

## 📄 License

ISC License - Your Company 2024-2026

---

## 👨‍💼 Author

Built for small to medium businesses in Uzbekistan.
Supports Uzbek language interface and UZS currency.

---

**Version:** 1.0.0  
**Last Updated:** July 2026  
**Status:** Production Ready ✅
