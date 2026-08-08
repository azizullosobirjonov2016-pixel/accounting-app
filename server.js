const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { randomUUID } = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const BASE_CURRENCY = process.env.BASE_CURRENCY || 'UZS';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Database initialization
const db = new sqlite3.Database('./accounting.db', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to SQLite database');
});

// Promise helpers around sqlite3's callback API
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err); else resolve(this);
    });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

const addColumnIfNotExists = (table, columnName, columnDef) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) return console.error('PRAGMA error', err);
        const exists = rows && rows.some(r => r.name === columnName);
        if (!exists) {
            db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`, (err) => {
                if (err) console.error(`Could not add column ${columnName} to ${table}:`, err.message);
            });
        }
    });
};

// Initialize database schema
const initializeDatabase = () => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            stir TEXT,
            phone TEXT,
            address TEXT,
            bankAccount TEXT,
            mfo TEXT,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            stir TEXT,
            phone TEXT,
            address TEXT,
            productType TEXT,
            bankAccount TEXT,
            mfo TEXT,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            unit TEXT,
            purchasePrice REAL,
            sellingPrice REAL,
            stock INTEGER DEFAULT 0,
            minStock INTEGER DEFAULT 0,
            default_currency TEXT,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS inventory_movements (
            id TEXT PRIMARY KEY,
            productId TEXT NOT NULL,
            type TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            newStock INTEGER,
            date TEXT NOT NULL,
            description TEXT,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            clientId TEXT,
            supplierId TEXT,
            payrollRecordId TEXT,
            type TEXT NOT NULL,
            category TEXT,
            description TEXT,
            amount REAL NOT NULL,
            status TEXT,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS production_recipes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            finishedProductId TEXT NOT NULL,
            materials TEXT,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS production_orders (
            id TEXT PRIMARY KEY,
            finishedProductId TEXT NOT NULL,
            producedQuantity INTEGER,
            materials TEXT,
            date TEXT NOT NULL,
            description TEXT,
            recipeId TEXT,
            productionCost REAL,
            materialCostPerUnit REAL,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            number TEXT UNIQUE,
            clientId TEXT,
            description TEXT,
            lines TEXT,
            subtotal REAL,
            vatRate REAL,
            vatAmount REAL,
            total REAL,
            date TEXT NOT NULL,
            status TEXT,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            position TEXT,
            salary REAL,
            taxRate REAL,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS payroll_records (
            id TEXT PRIMARY KEY,
            employeeId TEXT NOT NULL,
            period TEXT NOT NULL,
            gross REAL,
            tax REAL,
            socialTax REAL,
            deductions REAL,
            net REAL,
            date TEXT NOT NULL,
            createdAt TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS currencies (
            code TEXT PRIMARY KEY,
            name TEXT,
            symbol TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS exchange_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_currency TEXT,
            to_currency TEXT,
            rate REAL,
            date TEXT,
            source TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            number TEXT,
            date TEXT,
            clientId TEXT,
            supplierId TEXT,
            status TEXT DEFAULT 'created',
            html TEXT,
            meta TEXT,
            createdAt TEXT NOT NULL
        )`);

        // Sayt harakatlari tarixi — har bir muvaffaqiyatli yozuv/o'zgartirish/o'chirish avtomatik qayd etiladi
        db.run(`CREATE TABLE IF NOT EXISTS activity_log (
            id TEXT PRIMARY KEY,
            userId TEXT,
            username TEXT,
            displayName TEXT,
            method TEXT NOT NULL,
            path TEXT NOT NULL,
            description TEXT NOT NULL,
            createdAt TEXT NOT NULL
        )`);

        // Legacy DB migration: add columns that may be missing on an older accounting.db
        addColumnIfNotExists('products', 'category', 'category TEXT');
        addColumnIfNotExists('products', 'unit', 'unit TEXT');
        addColumnIfNotExists('products', 'sellingPrice', 'sellingPrice REAL');
        addColumnIfNotExists('products', 'default_currency', 'default_currency TEXT');
        addColumnIfNotExists('transactions', 'clientId', 'clientId TEXT');
        addColumnIfNotExists('transactions', 'supplierId', 'supplierId TEXT');
        addColumnIfNotExists('documents', 'supplierId', 'supplierId TEXT');
        addColumnIfNotExists('clients', 'bankAccount', 'bankAccount TEXT');
        addColumnIfNotExists('clients', 'mfo', 'mfo TEXT');
        addColumnIfNotExists('suppliers', 'bankAccount', 'bankAccount TEXT');
        addColumnIfNotExists('suppliers', 'mfo', 'mfo TEXT');
        addColumnIfNotExists('documents', 'status', "status TEXT DEFAULT 'created'");
        addColumnIfNotExists('transactions', 'payrollRecordId', 'payrollRecordId TEXT');
        addColumnIfNotExists('transactions', 'currency', 'currency TEXT');
        addColumnIfNotExists('transactions', 'amount_base', 'amount_base REAL');
        addColumnIfNotExists('transactions', 'rate', 'rate REAL');
        addColumnIfNotExists('transactions', 'rate_date', 'rate_date TEXT');
        addColumnIfNotExists('invoices', 'subtotal', 'subtotal REAL');
        addColumnIfNotExists('invoices', 'vatRate', 'vatRate REAL');
        addColumnIfNotExists('invoices', 'vatAmount', 'vatAmount REAL');
        addColumnIfNotExists('payroll_records', 'socialTax', 'socialTax REAL');
        addColumnIfNotExists('documents', 'meta', 'meta TEXT');
        addColumnIfNotExists('transactions', 'debitAccount', 'debitAccount TEXT');
        addColumnIfNotExists('transactions', 'creditAccount', 'creditAccount TEXT');
        addColumnIfNotExists('production_orders', 'overheadCost', 'overheadCost REAL DEFAULT 0');

        console.log('Database schema initialized');
    });
};

initializeDatabase();

// ==================== CHART OF ACCOUNTS (soddalashtirilgan schyotlar rejasi, NAS asosida) ====================
// 1C:Buxgalteriya andazasidagi kabi har bir tranzaksiya ikki tomonlama (Debet/Kredit) yoziladi.
// Bu ro'yxat to'liq schyotlar rejasi emas, balki loyiha ehtiyoji uchun soddalashtirilgan variant.
const CHART_OF_ACCOUNTS = {
    '5010': { name: 'Kassa va bank hisob-kitoblari', nature: 'debit' },
    '4010': { name: 'Xaridorlar bilan hisob-kitoblar (debitorlik qarzi)', nature: 'debit' },
    '2710': { name: 'Tovar-moddiy zaxiralar (ombor)', nature: 'debit' },
    '6010': { name: "Ta'minotchilar bilan hisob-kitoblar (kreditorlik qarzi)", nature: 'credit' },
    '6410': { name: "Byudjetga soliqlar bo'yicha qarz", nature: 'credit' },
    '6520': { name: "Ijtimoiy sug'urta bo'yicha qarz (ISHV)", nature: 'credit' },
    '6710': { name: "Mehnatga haq to'lash bo'yicha xodimlar bilan hisob-kitoblar", nature: 'credit' },
    '9010': { name: 'Mahsulot/xizmatlarni sotishdan daromad', nature: 'credit' },
    '9020': { name: 'Sotilgan mahsulot/xizmat tannarxi (COGS)', nature: 'debit' },
    '9030': { name: 'Davr xarajatlari', nature: 'debit' }
};

// Tranzaksiya turi va kategoriyasi asosida Debet/Kredit schyotlarni avtomatik aniqlaydi
// (1C'dagi "tezkor provodka shabloni" mantig'iga o'xshash soddalashtirilgan qoida).
function resolveAccounts(type, category) {
    const cat = (category || '').toLowerCase();
    if (type === 'income') {
        if (cat === 'sales' || cat === 'services') return { debitAccount: '4010', creditAccount: '9010' };
        return { debitAccount: '5010', creditAccount: '9010' };
    }
    if (cat === 'cogs') return { debitAccount: '9020', creditAccount: '2710' };
    if (cat === 'salaries') return { debitAccount: '9030', creditAccount: '6710' };
    if (cat === 'social_tax') return { debitAccount: '9030', creditAccount: '6520' };
    if (cat === 'materials') return { debitAccount: '2710', creditAccount: '6010' };
    if (['tax', 'vat', 'qqs', 'turnover_tax', 'income_tax'].includes(cat)) return { debitAccount: '9030', creditAccount: '6410' };
    // Boshqa davriy xarajatlar (ijara, kommunal, transport va h.k.) odatda kassa/bankdan to'lanadi
    return { debitAccount: '9030', creditAccount: '5010' };
}

// Default tax/business settings - seeded into the settings table on first run only
const DEFAULT_SETTINGS = {
    taxRegime: 'umumiy',
    taxVAT: '12',
    taxIncome: '15',
    taxTurnover: '4',
    taxSSV: '12',
    taxNDFL: '12',
    defaultCurrency: BASE_CURRENCY,
    productionMarkup: '20'
};

const COMPANY_INFO_KEYS = ['companyName', 'companyLegalForm', 'companyStir', 'companyOked', 'companyAddress',
    'companyPhone', 'companyBankName', 'companyBankAccount', 'companyMfo', 'companyDirector', 'companyAccountant'];
const DEFAULT_COMPANY_INFO = {
    companyName: '', companyLegalForm: 'MChJ', companyStir: '', companyOked: '', companyAddress: '',
    companyPhone: '', companyBankName: '', companyBankAccount: '', companyMfo: '', companyDirector: '', companyAccountant: ''
};

const seedDefaultSettings = async () => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await dbRun('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
};
setTimeout(() => { seedDefaultSettings().catch(err => console.error('Settings seed error:', err)); }, 300);

const getSettingsObject = async () => {
    const rows = await dbAll('SELECT key, value FROM settings');
    const settings = { ...DEFAULT_SETTINGS };
    rows.forEach(r => { settings[r.key] = r.value; });
    return settings;
};

// ==================== AUTH MIDDLEWARE ====================

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

// ==================== ACTIVITY LOG (Sayt harakatlari tarixi) ====================
// Har bir muvaffaqiyatli yozuv/o'zgartirish/o'chirish (/api/... ostidagi POST/PUT/DELETE)
// avtomatik ravishda activity_log jadvaliga yoziladi — har bir endpointni alohida o'zgartirmaslik uchun.

const ACTIVITY_ENTITY_LABELS = {
    clients: 'Mijoz', suppliers: 'Yetkazib beruvchi', products: 'Mahsulot',
    'inventory-movements': 'Ombor harakati', currencies: 'Valyuta', 'exchange-rates': 'Valyuta kursi',
    transactions: 'Tranzaksiya', invoices: 'Savdo hisob-fakturasi',
    'production/recipes': 'Ishlab chiqarish kalkulyatsiyasi (retsept)', 'production/orders': 'Ishlab chiqarish buyurtmasi',
    employees: 'Xodim', payroll: 'Ish haqi yozuvi', settings: 'Sozlamalar', 'company-info': "Tashkilot ma'lumotlari",
    documents: 'Hujjat', users: 'Foydalanuvchi'
};

const ACTIVITY_ACTION_WORDS = { POST: "qo'shildi", PUT: 'yangilandi', DELETE: "o'chirildi" };

function describeActivity(req, resBody) {
    const cleanPath = req.path.replace(/^\/api\//, '');
    const parts = cleanPath.split('/').filter(Boolean);
    const entityKey = (parts[0] === 'production' && parts[1]) ? `production/${parts[1]}` : parts[0];
    const label = ACTIVITY_ENTITY_LABELS[entityKey] || entityKey;

    if (entityKey === 'documents' && parts[2] === 'status') {
        return `${label} holati "${(req.body && req.body.status) || ''}" ga o'zgartirildi`;
    }

    const actionWord = ACTIVITY_ACTION_WORDS[req.method] || req.method;
    const idPart = entityKey === parts[0] ? parts[1] : parts[2];
    const nameSource = (req.body && (req.body.name || req.body.title || req.body.number)) ||
        (resBody && (resBody.name || resBody.title || resBody.number)) ||
        (req.body && req.body.description) ||
        (idPart ? `#${idPart.slice(0, 8)}` : '');

    return `${label} ${actionWord}${nameSource ? `: "${nameSource}"` : ''}`;
}

app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (['POST', 'PUT', 'DELETE'].includes(req.method) && req.path.startsWith('/api/')
            && !req.path.startsWith('/api/auth/') && req.path !== '/api/activity-log' && res.statusCode < 400) {
            const description = describeActivity(req, body);
            const user = req.user || {};
            dbRun(
                'INSERT INTO activity_log (id, userId, username, displayName, method, path, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [randomUUID(), user.userId || '', user.username || '', user.name || '', req.method, req.path, description, new Date().toISOString()]
            ).catch(err => console.error('Activity log error:', err.message));
        }
        return originalJson(body);
    };
    next();
});

// ==================== AUTH ENDPOINTS ====================

// Register user. Bootstrap: if no users exist yet, the first call is unauthenticated
// and always creates an admin. After that, only an authenticated admin may register users.
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, name } = req.body;
        let { role } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
        const isBootstrap = userCount.count === 0;

        if (isBootstrap) {
            role = 'admin';
        } else {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) return res.status(401).json({ error: 'No token provided' });
            let decoded;
            try {
                decoded = jwt.verify(token, JWT_SECRET);
            } catch (e) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            if (decoded.role !== 'admin') {
                return res.status(403).json({ error: 'Only admins can register new users' });
            }
            role = role || 'user';
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const userId = randomUUID();

        await dbRun(
            'INSERT INTO users (id, username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, username, hashedPassword, name, role, new Date().toISOString()]
        );
        res.json({ message: 'User registered successfully', userId, role, bootstrap: isBootstrap });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(400).json({ error: 'User already exists or invalid data' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
    });
});

// Restore session info from a stored token (used on page reload)
app.get('/api/auth/me', authenticate, async (req, res) => {
    const user = await dbGet('SELECT id, username, name, role FROM users WHERE id = ?', [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
});

// ==================== CLIENTS ====================

app.get('/api/clients', authenticate, async (req, res) => {
    try { res.json(await dbAll('SELECT * FROM clients ORDER BY name')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/clients/:id', authenticate, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Client not found' });
        res.json(row);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clients', authenticate, async (req, res) => {
    try {
        const { name, stir, phone, address, bankAccount, mfo } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        await dbRun('INSERT INTO clients (id, name, stir, phone, address, bankAccount, mfo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, stir || '', phone || '', address || '', bankAccount || '', mfo || '', createdAt]);
        res.json({ id, name, stir, phone, address, bankAccount, mfo, createdAt });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/clients/:id', authenticate, async (req, res) => {
    try {
        const { name, stir, phone, address, bankAccount, mfo } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        await dbRun('UPDATE clients SET name = ?, stir = ?, phone = ?, address = ?, bankAccount = ?, mfo = ? WHERE id = ?',
            [name, stir || '', phone || '', address || '', bankAccount || '', mfo || '', req.params.id]);
        res.json({ id: req.params.id, name, stir, phone, address, bankAccount, mfo });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clients/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM clients WHERE id = ?', [req.params.id]);
        res.json({ message: 'Client deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== SUPPLIERS ====================

app.get('/api/suppliers', authenticate, async (req, res) => {
    try { res.json(await dbAll('SELECT * FROM suppliers ORDER BY name')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/suppliers/:id', authenticate, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Supplier not found' });
        res.json(row);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/suppliers', authenticate, async (req, res) => {
    try {
        const { name, stir, phone, address, productType, bankAccount, mfo } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        await dbRun('INSERT INTO suppliers (id, name, stir, phone, address, productType, bankAccount, mfo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, stir || '', phone || '', address || '', productType || '', bankAccount || '', mfo || '', createdAt]);
        res.json({ id, name, stir, phone, address, productType, bankAccount, mfo, createdAt });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/suppliers/:id', authenticate, async (req, res) => {
    try {
        const { name, stir, phone, address, productType, bankAccount, mfo } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        await dbRun('UPDATE suppliers SET name = ?, stir = ?, phone = ?, address = ?, productType = ?, bankAccount = ?, mfo = ? WHERE id = ?',
            [name, stir || '', phone || '', address || '', productType || '', bankAccount || '', mfo || '', req.params.id]);
        res.json({ id: req.params.id, name, stir, phone, address, productType, bankAccount, mfo });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/suppliers/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
        res.json({ message: 'Supplier deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== PRODUCTS ====================

app.get('/api/products', authenticate, async (req, res) => {
    try { res.json(await dbAll('SELECT * FROM products ORDER BY name')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/products/:id', authenticate, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Product not found' });
        res.json(row);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', authenticate, async (req, res) => {
    try {
        const { name, category, unit, purchasePrice, sellingPrice, minStock, default_currency } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        await dbRun(
            `INSERT INTO products (id, name, category, unit, purchasePrice, sellingPrice, stock, minStock, default_currency, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
            [id, name, category || '', unit || 'dona', purchasePrice || 0, sellingPrice || 0, minStock || 0, default_currency || BASE_CURRENCY, createdAt]
        );
        res.json({ id, name, category, unit, purchasePrice, sellingPrice, stock: 0, minStock, default_currency, createdAt });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', authenticate, async (req, res) => {
    try {
        const { name, category, unit, purchasePrice, sellingPrice, minStock, default_currency } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        await dbRun(
            `UPDATE products SET name = ?, category = ?, unit = ?, purchasePrice = ?, sellingPrice = ?, minStock = ?, default_currency = ? WHERE id = ?`,
            [name, category || '', unit || 'dona', purchasePrice || 0, sellingPrice || 0, minStock || 0, default_currency || BASE_CURRENCY, req.params.id]
        );
        const row = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json(row);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== INVENTORY MOVEMENTS ====================

app.get('/api/inventory-movements', authenticate, async (req, res) => {
    try {
        const { productId } = req.query;
        const rows = productId
            ? await dbAll('SELECT * FROM inventory_movements WHERE productId = ? ORDER BY date DESC', [productId])
            : await dbAll('SELECT * FROM inventory_movements ORDER BY date DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// type: 'in' | 'out' | 'adjust'. quantity is always a positive number from the client;
// the sign/semantics are resolved here, mirroring the previous localStorage logic.
// For 'in' movements an optional unitCost recomputes the product's purchasePrice as a
// weighted-average cost (1C-style o'rtacha o'lchangan tannarx), instead of overwriting it.
app.post('/api/inventory-movements', authenticate, async (req, res) => {
    try {
        const { productId, type, quantity, date, description, unitCost } = req.body;
        if (!productId || !type || quantity === undefined || isNaN(parseInt(quantity, 10))) {
            return res.status(400).json({ error: 'productId, type and quantity are required' });
        }
        const product = await dbGet('SELECT * FROM products WHERE id = ?', [productId]);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const qty = parseInt(quantity, 10);
        let signedQuantity = 0;
        let newStock = null;

        if (type === 'adjust') {
            newStock = qty;
            await dbRun('UPDATE products SET stock = ? WHERE id = ?', [newStock, productId]);
        } else if (type === 'in') {
            signedQuantity = qty;
            const updatedStock = (product.stock || 0) + signedQuantity;
            const incomingCost = unitCost !== undefined && unitCost !== null && unitCost !== '' && !isNaN(parseFloat(unitCost))
                ? parseFloat(unitCost) : null;
            if (incomingCost !== null) {
                const oldStock = product.stock || 0;
                const oldPrice = product.purchasePrice || 0;
                // O'rtacha o'lchangan tannarx: (eski_zahira*eski_narx + kirim_soni*kirim_narxi) / yangi_jami_zahira
                const newAvgPrice = updatedStock > 0 ? ((oldStock * oldPrice) + (signedQuantity * incomingCost)) / updatedStock : incomingCost;
                await dbRun('UPDATE products SET stock = ?, purchasePrice = ? WHERE id = ?', [updatedStock, newAvgPrice, productId]);
            } else {
                await dbRun('UPDATE products SET stock = ? WHERE id = ?', [updatedStock, productId]);
            }
        } else {
            signedQuantity = -qty;
            const updatedStock = Math.max(0, (product.stock || 0) + signedQuantity);
            await dbRun('UPDATE products SET stock = ? WHERE id = ?', [updatedStock, productId]);
        }

        const id = randomUUID();
        const createdAt = new Date().toISOString();
        await dbRun(
            'INSERT INTO inventory_movements (id, productId, type, quantity, newStock, date, description, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, productId, type, signedQuantity, newStock, date || createdAt, description || '', createdAt]
        );
        const updatedProduct = await dbGet('SELECT * FROM products WHERE id = ?', [productId]);
        res.json({ movement: { id, productId, type, quantity: signedQuantity, newStock, date, description }, product: updatedProduct });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== CURRENCIES & EXCHANGE RATES ====================

app.get('/api/currencies', authenticate, (req, res) => {
    db.all('SELECT * FROM currencies', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/currencies', authenticate, requireRole('admin', 'manager'), (req, res) => {
    const { code, name, symbol } = req.body;
    if (!code) return res.status(400).json({ error: 'Currency code required' });
    db.run('INSERT OR REPLACE INTO currencies (code, name, symbol) VALUES (?, ?, ?)', [code, name, symbol], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ code, name, symbol });
    });
});

app.get('/api/exchange-rates', authenticate, (req, res) => {
    const { from, to } = req.query;
    let { date } = req.query;

    if (!from || !to) {
        // No pair specified - return the full rate history (used by the admin rates list)
        db.all('SELECT * FROM exchange_rates ORDER BY date DESC', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        });
        return;
    }

    if (date) {
        db.get('SELECT * FROM exchange_rates WHERE from_currency = ? AND to_currency = ? AND date <= ? ORDER BY date DESC LIMIT 1', [from, to, date], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Rate not found for the given date' });
            res.json(row);
        });
    } else {
        db.get('SELECT * FROM exchange_rates WHERE from_currency = ? AND to_currency = ? ORDER BY date DESC LIMIT 1', [from, to], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row) return res.status(404).json({ error: 'Rate not found' });
            res.json(row);
        });
    }
});

app.post('/api/exchange-rates', authenticate, requireRole('admin', 'manager'), (req, res) => {
    const { from_currency, to_currency, rate, date, source } = req.body;
    if (!from_currency || !to_currency || !rate) return res.status(400).json({ error: 'from_currency, to_currency and rate are required' });
    const d = date || new Date().toISOString();
    db.run('INSERT INTO exchange_rates (from_currency, to_currency, rate, date, source) VALUES (?, ?, ?, ?, ?)', [from_currency, to_currency, rate, d, source || 'manual'], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, from_currency, to_currency, rate, date: d, source: source || 'manual' });
    });
});

// ==================== TRANSACTIONS ====================

app.get('/api/transactions', authenticate, async (req, res) => {
    try { res.json(await dbAll('SELECT * FROM transactions ORDER BY date DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/transactions/:id', authenticate, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Transaction not found' });
        res.json(row);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const insertTransaction = async ({ date, clientId, supplierId, payrollRecordId, type, category, description, amount, status, currency, rate, rateDate, debitAccount, creditAccount }) => {
    const usedCurrency = currency || BASE_CURRENCY;
    const createdAt = new Date().toISOString();
    let appliedRate = 1;
    let appliedRateDate = rateDate || date || createdAt;
    const accounts = resolveAccounts(type, category);
    const finalDebitAccount = debitAccount || accounts.debitAccount;
    const finalCreditAccount = creditAccount || accounts.creditAccount;

    if (usedCurrency !== BASE_CURRENCY) {
        if (rate && !isNaN(parseFloat(rate))) {
            appliedRate = parseFloat(rate);
        } else {
            const row = await dbGet(
                'SELECT rate, date FROM exchange_rates WHERE from_currency = ? AND to_currency = ? ORDER BY date DESC LIMIT 1',
                [usedCurrency, BASE_CURRENCY]
            );
            if (row && row.rate) {
                appliedRate = row.rate;
                appliedRateDate = row.date || appliedRateDate;
            }
        }
    }

    const id = randomUUID();
    const amountBase = amount * appliedRate;
    await dbRun(
        `INSERT INTO transactions (id, date, clientId, supplierId, payrollRecordId, type, category, description, amount, status, currency, rate, amount_base, rate_date, debitAccount, creditAccount, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, date || createdAt, clientId || '', supplierId || '', payrollRecordId || '', type, category || '', description || '', amount, status || 'completed', usedCurrency, appliedRate, amountBase, appliedRateDate, finalDebitAccount, finalCreditAccount, createdAt]
    );
    return { id, date, clientId, supplierId, payrollRecordId, type, category, description, amount, status, currency: usedCurrency, rate: appliedRate, amount_base: amountBase, rate_date: appliedRateDate, debitAccount: finalDebitAccount, creditAccount: finalCreditAccount, createdAt };
};

app.post('/api/transactions', authenticate, async (req, res) => {
    try {
        const { date, clientId, supplierId, type, category, description, amount, status, currency, rate } = req.body;
        if (!type || amount === undefined || isNaN(parseFloat(amount))) {
            return res.status(400).json({ error: 'type and amount are required' });
        }
        const result = await insertTransaction({ date, clientId, supplierId, type, category, description, amount: parseFloat(amount), status, currency, rate });
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/transactions/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM transactions WHERE id = ?', [req.params.id]);
        res.json({ message: 'Transaction deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== INVOICES (Savdo hujjatlari) ====================

app.get('/api/invoices', authenticate, async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM invoices ORDER BY date DESC');
        res.json(rows.map(r => ({ ...r, lineItems: JSON.parse(r.lines || '[]') })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/invoices/:id', authenticate, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Invoice not found' });
        res.json({ ...row, lineItems: JSON.parse(row.lines || '[]') });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Creates the invoice, recomputes VAT server-side from settings (never trusts client totals),
// decrements stock for each line item, and books the matching income transaction.
app.post('/api/invoices', authenticate, async (req, res) => {
    try {
        const { number, date, clientId, description, lineItems, currency } = req.body;
        if (!Array.isArray(lineItems) || lineItems.length === 0) {
            return res.status(400).json({ error: 'lineItems must be a non-empty array' });
        }

        let subtotal = 0;
        let cogsTotal = 0;
        for (const item of lineItems) {
            if (!item.productId || !item.quantity || item.quantity <= 0 || item.price === undefined || item.price < 0) {
                return res.status(400).json({ error: 'Each line item needs productId, quantity > 0 and price >= 0' });
            }
            const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.productId]);
            if (!product) return res.status(400).json({ error: `Product not found: ${item.productId}` });
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Not enough stock for "${product.name}". Available: ${product.stock}` });
            }
            subtotal += item.quantity * item.price;
            // Sotilgan mahsulot tannarxi (COGS) — sotish paytidagi joriy o'rtacha o'lchangan tannarxda hisoblanadi
            cogsTotal += item.quantity * (product.purchasePrice || 0);
        }

        const settings = await getSettingsObject();
        const isSimplified = settings.taxRegime === 'soddalashtirilgan';
        const vatRate = isSimplified ? 0 : parseFloat(settings.taxVAT) || 0;
        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;

        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const invoiceNumber = number || `INV-${Date.now()}`;

        await dbRun(
            `INSERT INTO invoices (id, number, clientId, description, lines, subtotal, vatRate, vatAmount, total, date, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, invoiceNumber, clientId || '', description || '', JSON.stringify(lineItems), subtotal, vatRate, vatAmount, total, date || createdAt, 'Yaratildi', createdAt]
        );

        for (const item of lineItems) {
            await dbRun('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
        }

        const transaction = await insertTransaction({
            date: date || createdAt, clientId, type: 'income', category: 'sales',
            description: `Invoice ${invoiceNumber}: ${description || ''}`, amount: total, currency
        });

        // Daromad bilan bir vaqtda sotilgan mahsulot tannarxini (COGS) ham xarajat sifatida bosh kitobga yozamiz —
        // 1C andazasida realizatsiya bitta hujjatda ikkita provodkani (daromad + tannarx) hosil qiladi.
        let cogsTransaction = null;
        if (cogsTotal > 0) {
            cogsTransaction = await insertTransaction({
                date: date || createdAt, type: 'expense', category: 'cogs',
                description: `Sotilgan mahsulot tannarxi (COGS): ${invoiceNumber}`, amount: cogsTotal
            });
        }

        res.json({ id, number: invoiceNumber, clientId, description, lineItems, subtotal, vatRate, vatAmount, total, date, status: 'Yaratildi', createdAt, transaction, cogsTransaction });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/invoices/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM invoices WHERE id = ?', [req.params.id]);
        res.json({ message: 'Invoice deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== PRODUCTION RECIPES (BOM) ====================

app.get('/api/production/recipes', authenticate, async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM production_recipes ORDER BY name');
        res.json(rows.map(r => ({ ...r, materials: JSON.parse(r.materials || '[]') })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/production/recipes', authenticate, async (req, res) => {
    try {
        const { name, finishedProductId, materials } = req.body;
        if (!name || !finishedProductId || !Array.isArray(materials)) {
            return res.status(400).json({ error: 'name, finishedProductId and materials are required' });
        }
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        await dbRun('INSERT INTO production_recipes (id, name, finishedProductId, materials, createdAt) VALUES (?, ?, ?, ?, ?)',
            [id, name, finishedProductId, JSON.stringify(materials), createdAt]);
        res.json({ id, name, finishedProductId, materials, createdAt });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/production/recipes/:id', authenticate, async (req, res) => {
    try {
        const { name, finishedProductId, materials } = req.body;
        if (!name || !finishedProductId || !Array.isArray(materials)) {
            return res.status(400).json({ error: 'name, finishedProductId and materials are required' });
        }
        await dbRun('UPDATE production_recipes SET name = ?, finishedProductId = ?, materials = ? WHERE id = ?',
            [name, finishedProductId, JSON.stringify(materials), req.params.id]);
        res.json({ id: req.params.id, name, finishedProductId, materials });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/production/recipes/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM production_recipes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Recipe deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== PRODUCTION ORDERS ====================

app.get('/api/production/orders', authenticate, async (req, res) => {
    try {
        const rows = await dbAll('SELECT * FROM production_orders ORDER BY date DESC');
        res.json(rows.map(r => ({ ...r, materials: JSON.parse(r.materials || '[]') })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Consumes material stock, produces finished-product stock, mirrors the previous
// localStorage addProductionOrder logic (js/storage.js). An optional overheadCost
// (bilvosita xarajatlar: elektr, ijara va h.k.) is added on top of material cost, and the
// finished product's purchasePrice is recomputed as a weighted-average cost, matching the
// same 1C-style logic used for inventory stock-in.
app.post('/api/production/orders', authenticate, async (req, res) => {
    try {
        const { finishedProductId, producedQuantity, materials, date, description, recipeId, overheadCost } = req.body;
        if (!finishedProductId || !producedQuantity || producedQuantity <= 0 || !Array.isArray(materials) || materials.length === 0) {
            return res.status(400).json({ error: 'finishedProductId, producedQuantity and materials are required' });
        }

        let materialCost = 0;
        for (const item of materials) {
            const product = await dbGet('SELECT * FROM products WHERE id = ?', [item.productId]);
            if (!product) return res.status(400).json({ error: `Material product not found: ${item.productId}` });
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Not enough stock for material "${product.name}". Available: ${product.stock}` });
            }
            materialCost += (product.purchasePrice || 0) * item.quantity;
        }

        const finishedProduct = await dbGet('SELECT * FROM products WHERE id = ?', [finishedProductId]);
        if (!finishedProduct) return res.status(400).json({ error: `Finished product not found: ${finishedProductId}` });

        const overhead = parseFloat(overheadCost) || 0;
        const productionCost = materialCost + overhead;

        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const materialCostPerUnit = producedQuantity > 0 ? productionCost / producedQuantity : 0;

        await dbRun(
            `INSERT INTO production_orders (id, finishedProductId, producedQuantity, materials, date, description, recipeId, productionCost, materialCostPerUnit, overheadCost, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, finishedProductId, producedQuantity, JSON.stringify(materials), date || createdAt, description || '', recipeId || '', productionCost, materialCostPerUnit, overhead, createdAt]
        );

        for (const item of materials) {
            await dbRun('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
        }

        const oldStock = finishedProduct.stock || 0;
        const oldPrice = finishedProduct.purchasePrice || 0;
        const newTotalStock = oldStock + producedQuantity;
        const newAvgPrice = newTotalStock > 0 ? ((oldStock * oldPrice) + (producedQuantity * materialCostPerUnit)) / newTotalStock : materialCostPerUnit;
        await dbRun('UPDATE products SET stock = ?, purchasePrice = ? WHERE id = ?', [newTotalStock, newAvgPrice, finishedProductId]);

        res.json({ id, finishedProductId, producedQuantity, materials, date, description, recipeId, productionCost, materialCostPerUnit, overheadCost: overhead, createdAt });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/production/orders/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
    try {
        const order = await dbGet('SELECT * FROM production_orders WHERE id = ?', [req.params.id]);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        const materials = JSON.parse(order.materials || '[]');

        // Reverse the stock effect, matching the previous deleteProductionOrder behaviour
        await dbRun('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [order.producedQuantity, order.finishedProductId]);
        for (const item of materials) {
            await dbRun('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.productId]);
        }
        await dbRun('DELETE FROM production_orders WHERE id = ?', [req.params.id]);
        res.json({ message: 'Production order deleted, stock reverted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== EMPLOYEES ====================

app.get('/api/employees', authenticate, async (req, res) => {
    try { res.json(await dbAll('SELECT * FROM employees ORDER BY name')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/employees', authenticate, async (req, res) => {
    try {
        const { name, position, salary, taxRate } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const settings = await getSettingsObject();
        const resolvedTaxRate = taxRate !== undefined && taxRate !== '' ? taxRate : parseFloat(settings.taxNDFL);
        await dbRun('INSERT INTO employees (id, name, position, salary, taxRate, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, position || '', salary || 0, resolvedTaxRate, createdAt]);
        res.json({ id, name, position, salary, taxRate: resolvedTaxRate, createdAt });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/employees/:id', authenticate, async (req, res) => {
    try {
        const { name, position, salary, taxRate } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        await dbRun('UPDATE employees SET name = ?, position = ?, salary = ?, taxRate = ? WHERE id = ?',
            [name, position || '', salary || 0, taxRate || 0, req.params.id]);
        res.json({ id: req.params.id, name, position, salary, taxRate });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/employees/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM employees WHERE id = ?', [req.params.id]);
        res.json({ message: 'Employee deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== PAYROLL ====================

app.get('/api/payroll', authenticate, async (req, res) => {
    try { res.json(await dbAll('SELECT * FROM payroll_records ORDER BY date DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Splits JShDS (withheld from the employee) from ISHV/social tax (paid by the employer on
// top of gross salary) and books them as two separate expense transactions - mirrors the
// previous handleAddPayrollRecord logic in js/app.js.
app.post('/api/payroll', authenticate, async (req, res) => {
    try {
        const { employeeId, period, bonus, deductions } = req.body;
        if (!employeeId || !period) return res.status(400).json({ error: 'employeeId and period are required' });

        const employee = await dbGet('SELECT * FROM employees WHERE id = ?', [employeeId]);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const settings = await getSettingsObject();
        const gross = (parseFloat(employee.salary) || 0) + (parseFloat(bonus) || 0);
        const ndflRate = parseFloat(employee.taxRate) || 0;
        const tax = gross * (ndflRate / 100);
        const socialTaxRate = parseFloat(settings.taxSSV) || 0;
        const socialTax = gross * (socialTaxRate / 100);
        const ded = parseFloat(deductions) || 0;
        const net = Math.max(0, gross - tax - ded);

        const id = randomUUID();
        const date = new Date().toISOString();
        await dbRun(
            `INSERT INTO payroll_records (id, employeeId, period, gross, tax, socialTax, deductions, net, date, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, employeeId, period, gross, tax, socialTax, ded, net, date, date]
        );

        const salaryTx = await insertTransaction({
            date, type: 'expense', category: 'salaries',
            description: `Ish haqi (netto): ${employee.name} (${period})`, amount: net, payrollRecordId: id
        });

        let socialTaxTx = null;
        if (socialTax > 0) {
            socialTaxTx = await insertTransaction({
                date, type: 'expense', category: 'social_tax',
                description: `Ijtimoiy soliq - ISHV (${socialTaxRate}%): ${employee.name} (${period})`, amount: socialTax, payrollRecordId: id
            });
        }

        res.json({ id, employeeId, period, gross, tax, socialTax, deductions: ded, net, date, salaryTx, socialTaxTx });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/payroll/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM payroll_records WHERE id = ?', [req.params.id]);
        await dbRun('DELETE FROM transactions WHERE payrollRecordId = ?', [req.params.id]);
        res.json({ message: 'Payroll record deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== SETTINGS ====================

app.get('/api/settings', authenticate, async (req, res) => {
    try { res.json(await getSettingsObject()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/settings', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const entries = Object.entries(req.body || {});
        for (const [key, value] of entries) {
            await dbRun('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value)]);
        }
        res.json(await getSettingsObject());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== COMPANY INFO (Hujjatlar uchun rekvizitlar) ====================
// Korxona rekvizitlari ham `settings` jadvalida saqlanadi (bir xil global-konfiguratsiya jadvali)

app.get('/api/company-info', authenticate, async (req, res) => {
    try {
        const rows = await dbAll('SELECT key, value FROM settings WHERE key IN (' + COMPANY_INFO_KEYS.map(() => '?').join(',') + ')', COMPANY_INFO_KEYS);
        const info = { ...DEFAULT_COMPANY_INFO };
        rows.forEach(r => { info[r.key] = r.value; });
        res.json(info);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/company-info', authenticate, async (req, res) => {
    try {
        for (const key of COMPANY_INFO_KEYS) {
            if (req.body[key] !== undefined) {
                await dbRun('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(req.body[key])]);
            }
        }
        const rows = await dbAll('SELECT key, value FROM settings WHERE key IN (' + COMPANY_INFO_KEYS.map(() => '?').join(',') + ')', COMPANY_INFO_KEYS);
        const info = { ...DEFAULT_COMPANY_INFO };
        rows.forEach(r => { info[r.key] = r.value; });
        res.json(info);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== DOCUMENTS (shartnoma, akt, ishonchnoma, kassa order) ====================

app.get('/api/documents', authenticate, async (req, res) => {
    try { res.json(await dbAll('SELECT * FROM documents ORDER BY createdAt DESC')); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/documents/:id', authenticate, async (req, res) => {
    try {
        const row = await dbGet('SELECT * FROM documents WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Document not found' });
        res.json(row);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/documents', authenticate, async (req, res) => {
    try {
        const { type, number, date, clientId, supplierId, html, meta } = req.body;
        if (!type || !html) return res.status(400).json({ error: 'type and html are required' });
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const metaStr = meta && typeof meta === 'object' ? JSON.stringify(meta) : (meta || '');
        await dbRun('INSERT INTO documents (id, type, number, date, clientId, supplierId, status, html, meta, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, type, number || '', date || createdAt, clientId || '', supplierId || '', 'created', html, metaStr, createdAt]);
        res.json({ id, type, number, date, clientId, supplierId, status: 'created', html, meta: metaStr, createdAt });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const DOCUMENT_STATUSES = ['created', 'sent', 'signed', 'rejected'];

app.put('/api/documents/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        if (!DOCUMENT_STATUSES.includes(status)) {
            return res.status(400).json({ error: `status quyidagilardan biri bo'lishi kerak: ${DOCUMENT_STATUSES.join(', ')}` });
        }
        await dbRun('UPDATE documents SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ id: req.params.id, status });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/documents/:id', authenticate, async (req, res) => {
    try {
        await dbRun('DELETE FROM documents WHERE id = ?', [req.params.id]);
        res.json({ message: 'Document deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== CHART OF ACCOUNTS (Schyotlar rejasi) ====================

app.get('/api/chart-of-accounts', authenticate, (req, res) => {
    res.json(Object.entries(CHART_OF_ACCOUNTS).map(([code, v]) => ({ code, ...v })));
});

// ==================== STATISTICS ====================

app.get('/api/statistics', authenticate, async (req, res) => {
    try {
        const transactions = await dbAll('SELECT * FROM transactions');
        const settings = await getSettingsObject();

        const amountOf = (t) => (t.amount_base !== null && t.amount_base !== undefined ? t.amount_base : t.amount) || 0;
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + amountOf(t), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + amountOf(t), 0);
        const grossProfit = totalIncome - totalExpense;

        const isSimplified = settings.taxRegime === 'soddalashtirilgan';
        const totalTax = isSimplified
            ? totalIncome * ((parseFloat(settings.taxTurnover) || 0) / 100)
            : (grossProfit > 0 ? grossProfit * ((parseFloat(settings.taxIncome) || 0) / 100) : 0);

        res.json({ totalIncome, totalExpense, totalTax, netProfit: grossProfit - totalTax });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== ACTIVITY LOG (Sayt harakatlari tarixi) ====================

app.get('/api/activity-log', authenticate, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
        const rows = await dbAll('SELECT * FROM activity_log ORDER BY createdAt DESC LIMIT ?', [limit]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`\n📊 Accounting Server running on http://localhost:${PORT}`);
    console.log(`\n📚 API: /api/auth, /api/clients, /api/suppliers, /api/products, /api/inventory-movements,`);
    console.log(`  /api/transactions, /api/invoices, /api/production/recipes, /api/production/orders,`);
    console.log(`  /api/employees, /api/payroll, /api/settings, /api/statistics, /api/currencies, /api/exchange-rates\n`);
});
