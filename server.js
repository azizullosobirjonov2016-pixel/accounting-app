const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// Initialize database schema
const initializeDatabase = () => {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            createdAt TEXT NOT NULL
        )`);

        // Clients
        db.run(`CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            createdAt TEXT NOT NULL
        )`);

        // Products
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT UNIQUE,
            purchasePrice REAL,
            salePrice REAL,
            stock INTEGER,
            minStock INTEGER,
            productType TEXT,
            createdAt TEXT NOT NULL
        )`);

        // Transactions
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            category TEXT,
            description TEXT,
            amount REAL NOT NULL,
            status TEXT,
            createdAt TEXT NOT NULL
        )`);

        // Production recipes
        db.run(`CREATE TABLE IF NOT EXISTS production_recipes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            finishedProductId TEXT NOT NULL,
            materials TEXT,
            createdAt TEXT NOT NULL
        )`);

        // Production orders
        db.run(`CREATE TABLE IF NOT EXISTS production_orders (
            id TEXT PRIMARY KEY,
            finishedProductId TEXT NOT NULL,
            producedQuantity INTEGER,
            materials TEXT,
            date TEXT NOT NULL,
            cost REAL,
            createdAt TEXT NOT NULL
        )`);

        // Invoices
        db.run(`CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            number TEXT UNIQUE,
            clientId TEXT,
            lines TEXT,
            total REAL,
            date TEXT NOT NULL,
            status TEXT,
            createdAt TEXT NOT NULL
        )`);

        // Employees
        db.run(`CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            position TEXT,
            salary REAL,
            taxRate REAL,
            createdAt TEXT NOT NULL
        )`);

        // Payroll records
        db.run(`CREATE TABLE IF NOT EXISTS payroll_records (
            id TEXT PRIMARY KEY,
            employeeId TEXT NOT NULL,
            period TEXT NOT NULL,
            gross REAL,
            tax REAL,
            deductions REAL,
            net REAL,
            date TEXT NOT NULL,
            createdAt TEXT NOT NULL
        )`);

        console.log('Database schema initialized');
    });
};

initializeDatabase();

// Authentication middleware
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

// ==================== AUTH ENDPOINTS ====================

// Register user
app.post('/api/auth/register', (req, res) => {
    const { username, password, name, role } = req.body;

    if (!username || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = Date.now().toString();

    db.run(
        'INSERT INTO users (id, username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, username, hashedPassword, name, role || 'user', new Date().toISOString()],
        function (err) {
            if (err) {
                console.error('Registration error:', err);
                return res.status(400).json({ error: 'User already exists or invalid data' });
            }
            res.json({ message: 'User registered successfully', userId });
        }
    );
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

// ==================== CLIENTS ENDPOINTS ====================

// Get all clients
app.get('/api/clients', authenticate, (req, res) => {
    db.all('SELECT * FROM clients', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Add client
app.post('/api/clients', authenticate, (req, res) => {
    const { name, phone, email, address } = req.body;
    const clientId = Date.now().toString();

    db.run(
        'INSERT INTO clients (id, name, phone, email, address, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [clientId, name, phone, email, address, new Date().toISOString()],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: clientId, name, phone, email, address });
        }
    );
});

// Delete client
app.delete('/api/clients/:id', authenticate, (req, res) => {
    if (!['manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only managers and admins can delete' });
    }

    db.run('DELETE FROM clients WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Client deleted' });
    });
});

// ==================== PRODUCTS ENDPOINTS ====================

// Get all products
app.get('/api/products', authenticate, (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Add product
app.post('/api/products', authenticate, (req, res) => {
    const { name, code, purchasePrice, salePrice, stock, minStock, productType } = req.body;
    const productId = Date.now().toString();

    db.run(
        'INSERT INTO products (id, name, code, purchasePrice, salePrice, stock, minStock, productType, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, name, code, purchasePrice, salePrice, stock, minStock, productType, new Date().toISOString()],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: productId, name, code, purchasePrice, salePrice, stock, minStock, productType });
        }
    );
});

// Delete product
app.delete('/api/products/:id', authenticate, (req, res) => {
    if (!['manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only managers and admins can delete' });
    }

    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Product deleted' });
    });
});

// ==================== TRANSACTIONS ENDPOINTS ====================

// Get transactions
app.get('/api/transactions', authenticate, (req, res) => {
    db.all('SELECT * FROM transactions ORDER BY date DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Add transaction
app.post('/api/transactions', authenticate, (req, res) => {
    const { date, type, category, description, amount, status } = req.body;
    const transId = Date.now().toString();

    db.run(
        'INSERT INTO transactions (id, date, type, category, description, amount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [transId, date, type, category, description, amount, status, new Date().toISOString()],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: transId, date, type, category, description, amount, status });
        }
    );
});

// Delete transaction
app.delete('/api/transactions/:id', authenticate, (req, res) => {
    if (!['manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only managers and admins can delete' });
    }

    db.run('DELETE FROM transactions WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Transaction deleted' });
    });
});

// ==================== PAYROLL ENDPOINTS ====================

// Get employees
app.get('/api/employees', authenticate, (req, res) => {
    db.all('SELECT * FROM employees', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Add employee
app.post('/api/employees', authenticate, (req, res) => {
    const { name, position, salary, taxRate } = req.body;
    const empId = Date.now().toString();

    db.run(
        'INSERT INTO employees (id, name, position, salary, taxRate, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [empId, name, position, salary, taxRate, new Date().toISOString()],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: empId, name, position, salary, taxRate });
        }
    );
});

// Get payroll records
app.get('/api/payroll', authenticate, (req, res) => {
    db.all('SELECT * FROM payroll_records ORDER BY date DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Add payroll record
app.post('/api/payroll', authenticate, (req, res) => {
    const { employeeId, period, gross, tax, deductions, net } = req.body;
    const recordId = Date.now().toString();
    const date = new Date().toISOString();

    db.run(
        'INSERT INTO payroll_records (id, employeeId, period, gross, tax, deductions, net, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [recordId, employeeId, period, gross, tax, deductions, net, date, date],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Auto-create transaction
            const transId = Date.now().toString() + 'tx';
            const employee_name = 'Employee'; // Would fetch real name from DB
            db.run(
                'INSERT INTO transactions (id, date, type, category, description, amount, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [transId, date, 'expense', 'salary', `Salary: ${employee_name} (${period})`, net, 'completed', date],
                (err) => {
                    res.json({ id: recordId, employeeId, period, gross, tax, deductions, net });
                }
            );
        }
    );
});

// Delete employee
app.delete('/api/employees/:id', authenticate, (req, res) => {
    if (!['manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only managers and admins can delete' });
    }

    db.run('DELETE FROM employees WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Employee deleted' });
    });
});

// ==================== STATISTICS ENDPOINTS ====================

// Get statistics
app.get('/api/statistics', authenticate, (req, res) => {
    db.all('SELECT * FROM transactions', [], (err, transactions) => {
        if (err) return res.status(500).json({ error: err.message });

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const taxRate = 0.15; // 15%
        const totalTax = totalIncome * taxRate;

        res.json({
            totalIncome,
            totalExpense,
            totalTax,
            netProfit: totalIncome - totalExpense - totalTax
        });
    });
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
    console.log(`\n📚 API Documentation:`);
    console.log(`  POST   /api/auth/login              - Login with credentials`);
    console.log(`  POST   /api/auth/register           - Register new user`);
    console.log(`  GET    /api/clients                 - Get all clients`);
    console.log(`  POST   /api/clients                 - Add client`);
    console.log(`  DELETE /api/clients/:id             - Delete client`);
    console.log(`  GET    /api/products                - Get all products`);
    console.log(`  POST   /api/products                - Add product`);
    console.log(`  DELETE /api/products/:id            - Delete product`);
    console.log(`  GET    /api/transactions            - Get transactions`);
    console.log(`  POST   /api/transactions            - Add transaction`);
    console.log(`  DELETE /api/transactions/:id        - Delete transaction`);
    console.log(`  GET    /api/employees               - Get employees`);
    console.log(`  POST   /api/employees               - Add employee`);
    console.log(`  DELETE /api/employees/:id           - Delete employee`);
    console.log(`  GET    /api/payroll                 - Get payroll records`);
    console.log(`  POST   /api/payroll                 - Add payroll record`);
    console.log(`  GET    /api/statistics              - Get financial statistics\n`);
});
