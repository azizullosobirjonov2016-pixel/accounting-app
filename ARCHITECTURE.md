# Accounting App — Architecture & Data Model

## Maqsad
Web-ilova prototipi: ombor + ishlab chiqarish + savdo + buxgalteriya hisobotlari (faza 1). Hozirgi saqlash: `localStorage`/JSON. Keyingi bosqich: server + DB.

## Funksional bloklar
- Authentication & Roles: Admin, Manager, Accountant, Worker
- Dashboard: tezkor ko'rsatkichlar va so'ngi tranzaksiyalar
- Inventory: mahsulotlar, zahira, kirim/chiqim, zahira tuzatish
- Production: retseptlar (BOM), buyurtmalar, material iste'moli, xarajat hisoblash
- Sales / Invoicing: invoice yaratish, eksport, zapas kamaytirish
- Transactions / Accounting: daromad/chiqim, avtomatik jurnal yozuvlari
- Payroll: xodimlar, ish haqi yozuvlari, soliqlar (keyingi bosqich)
- Reporting: P&L, Balance, Cash Flow, Production cost reports
- Backup/Restore: JSON eksport/import
- API layer (future): REST endpoints for sync and multi-user

## Asosiy ekranlar
- Bosh sahifa (Dashboard)
- Ombor (Products list, Stock movements)
- Ishlab chiqarish (BOM, Orders)
- Savdo (Invoices, Lines)
- Tranzaksiyalar (Journal)
- Hisobotlar (P&L, Balance, Cash Flow, Production)
- Sozlamalar (Soliq stavkalari, Backup)
- Foydalanuvchilar (Auth & roles)

## Ma'lumotlar modeli (ER — asosiy entitiyalar)
- User { id, name, email, passwordHash, roleId, createdAt }
- Role { id, name, permissions }
- Client { id, name, stir, phone, address }
- Supplier { id, name, stir, phone, address, productType }
- Product { id, name, category, unit, minStock, purchasePrice, sellingPrice, stock, createdAt }
- InventoryMovement { id, productId -> Product.id, type(in/out/adjust), quantity, date, description }
- ProductionRecipe { id, name, finishedProductId -> Product.id, materials: [{ productId, qtyPerUnit }] }
- ProductionOrder { id, recipeId?, finishedProductId -> Product.id, producedQuantity, materials:[{productId, quantity}], productionCost, date, description }
- Invoice { id, number, date, clientId -> Client.id, lineItems:[{productId, quantity, price}], total, status }
- Transaction { id, date, clientId?, supplierId?, type(income/expense), category, amount, description }
- Employee { id, name, position, salary, taxInfo }
- PayrollRecord { id, employeeId -> Employee.id, periodFrom, periodTo, gross, deductions, net, date }
- Settings { key, value }

Relations:
- User.roleId -> Role.id
- Product.stock is computed & updated by InventoryMovement/Production/Invoices
- ProductionRecipe.finishedProductId -> Product.id
- ProductionOrder.materials[].productId -> Product.id
- Invoice.lineItems[].productId -> Product.id
- Transaction may reference Invoice or ProductionOrder via description/id

ER diagram (simplified, text):

  [User]-<roleId>- [Role]

  [Client]  [Supplier]
     |         |
  [Invoice]  [Transaction]
     |            |
  [Invoice.lineItems] -> [Product] <- [InventoryMovement]
                                   ^
                                   |\
                                  /  \
                      [ProductionOrder] - [ProductionRecipe]

## Arxitektura tavsifi
- Frontend: plain HTML/CSS/Vanilla JS (hozirgi loyiha)
- Storage (phase 1): `localStorage` + JSON backup/restore
- Server (phase 2): Node.js + Express + SQLite (prototype) yoki PostgreSQL (production)
- API: REST endpoints for CRUD on Products, Invoices, ProductionOrders, Transactions, Users
- Auth: JWT for API; local dev: simple mock or static admin

Suggested API endpoints (example):
- GET /api/products, POST /api/products
- GET /api/invoices, POST /api/invoices
- GET /api/production/recipes, POST /api/production/recipes
- POST /auth/login, POST /auth/register

## Hisobotlar (minimal set)
- P&L (daromad - chiqim - soliqlar)
- Balance (aktiva = passiva simplified)
- Cash flow (operatsion, investitsion, moliyaviy)
- Production cost report (by recipe, by period)

## Taklif: dastlabki prototip yo'nalishi
1. Phase 1 (hozir): Browser-only prototip — Inventory, Production (BOM), Sales, Reports. (all implemented in `accounting-app`)
2. Phase 2: Add Payroll module and Employee DB (localStorage) — implement payroll calculation UI and tax deductions
3. Phase 3: Migrate storage to server — Node.js + SQLite, add auth and roles, enable multi-user
4. Phase 4: Harden reports, add export to Excel, periodic backups, data migration tools

## Key next steps (men bajaraman)
- [x] Create architecture doc (this file)
- [ ] Scaffold `employee` and `payroll` modules in UI and storage
- [ ] Add server scaffold (Express + SQLite) with basic sync endpoints


---
Generated on: 