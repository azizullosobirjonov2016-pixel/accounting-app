// Storage Manager - LocalStorage boshqarish
class StorageManager {
    constructor() {
        this.storagePrefix = 'accounting_';
        this.initializeDefaults();
    }

    initializeDefaults() {
        // Agar ma'lumotlar mavjud bo'lmasa, boshlang'ich qiymatlar o'rnatish
        if (!this.get('clients')) {
            this.set('clients', []);
        }
        if (!this.get('suppliers')) {
            this.set('suppliers', []);
        }
        if (!this.get('transactions')) {
            this.set('transactions', []);
        }
        if (!this.get('products')) {
            this.set('products', []);
        }
        if (!this.get('inventoryMovements')) {
            this.set('inventoryMovements', []);
        }
        if (!this.get('productionOrders')) {
            this.set('productionOrders', []);
        }
        if (!this.get('productionRecipes')) {
            this.set('productionRecipes', []);
        }
        if (!this.get('invoices')) {
            this.set('invoices', []);
        }
        if (!this.get('employees')) {
            this.set('employees', []);
        }
        if (!this.get('payrollRecords')) {
            this.set('payrollRecords', []);
        }
        if (!this.get('users')) {
            this.set('users', [
                { id: '1', username: 'user', password: 'pass', role: 'user', name: 'Oddiy Foydalanuvchi', createdAt: new Date().toISOString() },
                { id: '2', username: 'manager', password: 'pass', role: 'manager', name: 'Menejeri', createdAt: new Date().toISOString() },
                { id: '3', username: 'admin', password: 'pass', role: 'admin', name: 'Administrator', createdAt: new Date().toISOString() }
            ]);
        }
        if (!this.get('currentSession')) {
            this.set('currentSession', null);
        }
            this.set('settings', {
                taxCulture: 1,
                taxVAT: 12,
                taxIncome: 15,
                taxSSV: 5,
                autoCalculateTax: true,
                notifications: true
            });
        }
    }

    set(key, value) {
        try {
            localStorage.setItem(this.storagePrefix + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage xatosi:', e);
            return false;
        }
    }

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.storagePrefix + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage o\'qish xatosi:', e);
            return defaultValue;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(this.storagePrefix + key);
            return true;
        } catch (e) {
            console.error('Storage o\'chirish xatosi:', e);
            return false;
        }
    }

    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.storagePrefix)) {
                    localStorage.removeItem(key);
                }
            });
            this.initializeDefaults();
            return true;
        } catch (e) {
            console.error('Storage tozalash xatosi:', e);
            return false;
        }
    }

    // Clients ma'lumotlari
    addClient(client) {
        const clients = this.get('clients', []);
        client.id = Date.now().toString();
        client.createdAt = new Date().toISOString();
        clients.push(client);
        this.set('clients', clients);
        return client;
    }

    getClients() {
        return this.get('clients', []);
    }

    getClientById(id) {
        const clients = this.get('clients', []);
        return clients.find(c => c.id === id);
    }

    updateClient(id, updates) {
        const clients = this.get('clients', []);
        const index = clients.findIndex(c => c.id === id);
        if (index !== -1) {
            clients[index] = { ...clients[index], ...updates };
            this.set('clients', clients);
            return clients[index];
        }
        return null;
    }

    deleteClient(id) {
        const clients = this.get('clients', []);
        const filtered = clients.filter(c => c.id !== id);
        this.set('clients', filtered);
        return true;
    }

    // Suppliers ma'lumotlari
    addSupplier(supplier) {
        const suppliers = this.get('suppliers', []);
        supplier.id = Date.now().toString();
        supplier.createdAt = new Date().toISOString();
        suppliers.push(supplier);
        this.set('suppliers', suppliers);
        return supplier;
    }

    getSuppliers() {
        return this.get('suppliers', []);
    }

    getSupplierById(id) {
        const suppliers = this.get('suppliers', []);
        return suppliers.find(s => s.id === id);
    }

    updateSupplier(id, updates) {
        const suppliers = this.get('suppliers', []);
        const index = suppliers.findIndex(s => s.id === id);
        if (index !== -1) {
            suppliers[index] = { ...suppliers[index], ...updates };
            this.set('suppliers', suppliers);
            return suppliers[index];
        }
        return null;
    }

    deleteSupplier(id) {
        const suppliers = this.get('suppliers', []);
        const filtered = suppliers.filter(s => s.id !== id);
        this.set('suppliers', filtered);
        return true;
    }

    // Transactions ma'lumotlari
    addTransaction(transaction) {
        const transactions = this.get('transactions', []);
        transaction.id = Date.now().toString();
        transaction.createdAt = new Date().toISOString();
        transactions.push(transaction);
        this.set('transactions', transactions);
        return transaction;
    }

    getTransactions() {
        return this.get('transactions', []);
    }

    getTransactionById(id) {
        const transactions = this.get('transactions', []);
        return transactions.find(t => t.id === id);
    }

    getTransactionsByPeriod(fromDate, toDate) {
        const transactions = this.get('transactions', []);
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= new Date(fromDate) && tDate <= new Date(toDate);
        });
    }

    getTransactionsByType(type) {
        const transactions = this.get('transactions', []);
        return transactions.filter(t => t.type === type);
    }

    deleteTransaction(id) {
        const transactions = this.get('transactions', []);
        const filtered = transactions.filter(t => t.id !== id);
        this.set('transactions', filtered);
        return true;
    }

    // Settings
    getSettings() {
        return this.get('settings', {
            taxCulture: 1,
            taxVAT: 12,
            taxIncome: 15,
            taxSSV: 5,
            autoCalculateTax: true,
            notifications: true
        });
    }

    updateSettings(settings) {
        const current = this.getSettings();
        const updated = { ...current, ...settings };
        this.set('settings', updated);
        return updated;
    }

    // Backup va Restore
    exportData() {
        const data = {
            clients: this.get('clients', []),
            suppliers: this.get('suppliers', []),
            transactions: this.get('transactions', []),
            products: this.get('products', []),
            inventoryMovements: this.get('inventoryMovements', []),
            productionOrders: this.get('productionOrders', []),
            productionRecipes: this.get('productionRecipes', []),
            invoices: this.get('invoices', []),
            employees: this.get('employees', []),
            payrollRecords: this.get('payrollRecords', []),
            users: this.get('users', []),
            settings: this.get('settings', {}),
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    }

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.clients) this.set('clients', data.clients);
            if (data.suppliers) this.set('suppliers', data.suppliers);
            if (data.transactions) this.set('transactions', data.transactions);
            if (data.products) this.set('products', data.products);
            if (data.inventoryMovements) this.set('inventoryMovements', data.inventoryMovements);
            if (data.productionOrders) this.set('productionOrders', data.productionOrders);
            if (data.productionRecipes) this.set('productionRecipes', data.productionRecipes);
            if (data.invoices) this.set('invoices', data.invoices);
            if (data.employees) this.set('employees', data.employees);
            if (data.payrollRecords) this.set('payrollRecords', data.payrollRecords);
            if (data.users) this.set('users', data.users);
            if (data.settings) this.set('settings', data.settings);
            return true;
        } catch (e) {
            console.error('Import xatosi:', e);
            return false;
        }
    }

    // Products ma'lumotlari
    addProduct(product) {
        const products = this.get('products', []);
        products.push(product);
        this.set('products', products);
        return product;
    }

    getProducts() {
        return this.get('products', []);
    }

    getProductById(id) {
        const products = this.get('products', []);
        return products.find(p => p.id === id);
    }

    updateProduct(id, updatedProduct) {
        const products = this.get('products', []);
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = { ...products[index], ...updatedProduct };
            this.set('products', products);
            return true;
        }
        return false;
    }

    deleteProduct(id) {
        const products = this.get('products', []);
        const filtered = products.filter(p => p.id !== id);
        this.set('products', filtered);
        return true;
    }

    // Inventory movements
    addInventoryMovement(movement) {
        const movements = this.get('inventoryMovements', []);
        movements.push(movement);
        
        // Update product stock
        const products = this.get('products', []);
        const product = products.find(p => p.id === movement.productId);
        if (product) {
            if (movement.type === 'adjust' && movement.newStock !== null) {
                // For adjustments, set stock to the new amount
                product.stock = movement.newStock;
            } else {
                // For in/out movements, add/subtract quantity
                product.stock += movement.quantity;
                if (product.stock < 0) product.stock = 0; // Prevent negative stock
            }
            this.set('products', products);
        }
        
        this.set('inventoryMovements', movements);
        return movement;
    }

    getInventoryMovements() {
        return this.get('inventoryMovements', []);
    }

    getInventoryMovementsByProduct(productId) {
        const movements = this.get('inventoryMovements', []);
        return movements.filter(m => m.productId === productId);
    }

    // Production orders
    addProductionOrder(order) {
        const orders = this.get('productionOrders', []);
        order.id = Date.now().toString();
        order.createdAt = new Date().toISOString();
        orders.push(order);

        const products = this.get('products', []);
        const finishedProduct = products.find(p => p.id === order.finishedProductId);
        if (finishedProduct) {
            finishedProduct.stock += order.producedQuantity;
        }

        order.materials.forEach(item => {
            const material = products.find(p => p.id === item.productId);
            if (material) {
                material.stock -= item.quantity;
                if (material.stock < 0) {
                    material.stock = 0;
                }
            }
        });

        this.set('products', products);
        this.set('productionOrders', orders);
        return order;
    }

    getProductionOrders() {
        return this.get('productionOrders', []);
    }

    getProductionOrderById(id) {
        const orders = this.get('productionOrders', []);
        return orders.find(o => o.id === id);
    }

    deleteProductionOrder(id) {
        const orders = this.get('productionOrders', []);
        const filtered = orders.filter(o => o.id !== id);
        this.set('productionOrders', filtered);
        return true;
    }

    getProductionOrdersByPeriod(fromDate, toDate) {
        const orders = this.get('productionOrders', []);
        return orders.filter(o => {
            const orderDate = new Date(o.date);
            return orderDate >= new Date(fromDate) && orderDate <= new Date(toDate);
        });
    }

    // Invoices
    addInvoice(invoice) {
        const invoices = this.get('invoices', []);
        invoices.push(invoice);
        this.set('invoices', invoices);
        return invoice;
    }

    getInvoices() {
        return this.get('invoices', []);
    }

    getInvoiceById(id) {
        const invoices = this.get('invoices', []);
        return invoices.find(inv => inv.id === id);
    }

    deleteInvoice(id) {
        const invoices = this.get('invoices', []);
        const filtered = invoices.filter(inv => inv.id !== id);
        this.set('invoices', filtered);
        return true;
    }

    // Employees & Payroll
    addEmployee(emp) {
        const employees = this.get('employees', []);
        emp.id = emp.id || Date.now().toString();
        emp.createdAt = emp.createdAt || new Date().toISOString();
        employees.push(emp);
        this.set('employees', employees);
        return emp;
    }

    getEmployees() {
        return this.get('employees', []);
    }

    getEmployeeById(id) {
        const employees = this.get('employees', []);
        return employees.find(e => e.id === id) || null;
    }

    deleteEmployee(id) {
        const employees = this.get('employees', []);
        const filtered = employees.filter(e => e.id !== id);
        this.set('employees', filtered);
        return true;
    }

    addPayrollRecord(record) {
        const records = this.get('payrollRecords', []);
        record.id = record.id || Date.now().toString();
        record.createdAt = record.createdAt || new Date().toISOString();
        records.push(record);
        this.set('payrollRecords', records);
        return record;
    }

    getPayrollRecords() {
        return this.get('payrollRecords', []);
    }

    getPayrollRecordsByPeriod(from, to) {
        const records = this.get('payrollRecords', []);
        return records.filter(r => {
            const d = new Date(r.date || r.createdAt || r.created_at || r.timestamp);
            return d >= new Date(from) && d <= new Date(to);
        });
    }

    deletePayrollRecord(id) {
        const records = this.get('payrollRecords', []);
        const filtered = records.filter(r => r.id !== id);
        this.set('payrollRecords', filtered);
        return true;
    }

    // Production recipes
    addProductionRecipe(recipe) {
        const recipes = this.get('productionRecipes', []);
        recipe.id = Date.now().toString();
        recipe.createdAt = new Date().toISOString();
        recipes.push(recipe);
        this.set('productionRecipes', recipes);
        return recipe;
    }

    getProductionRecipes() {
        return this.get('productionRecipes', []);
    }

    getProductionRecipeById(id) {
        const recipes = this.get('productionRecipes', []);
        return recipes.find(r => r.id === id);
    }

    deleteProductionRecipe(id) {
        const recipes = this.get('productionRecipes', []);
        const filtered = recipes.filter(r => r.id !== id);
        this.set('productionRecipes', filtered);
        return true;
    }

    // Statistikalar
    getStatistics() {
        const transactions = this.get('transactions', []);
        
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        const settings = this.getSettings();
        const totalTax = totalIncome * (settings.taxIncome / 100);
        
        return {
            totalIncome,
            totalExpense,
            totalTax,
            netProfit: totalIncome - totalExpense - totalTax
        };
    }

    getRecentTransactions(limit = 5) {
        const transactions = this.get('transactions', [])
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        return transactions.slice(0, limit);
    }

    // AUTHENTICATION & SESSIONS
    login(username, password, role) {
        const users = this.get('users', []);
        const user = users.find(u => u.username === username && u.password === password && u.role === role);
        if (!user) return null;
        
        const session = {
            userId: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            loginAt: new Date().toISOString(),
            token: 'token_' + Date.now()
        };
        this.set('currentSession', session);
        return session;
    }

    logout() {
        this.set('currentSession', null);
    }

    getCurrentSession() {
        return this.get('currentSession', null);
    }

    isAuthenticated() {
        return this.get('currentSession', null) !== null;
    }

    canAccess(requiredRole) {
        const session = this.getCurrentSession();
        if (!session) return false;
        
        const roleHierarchy = { 'user': 1, 'manager': 2, 'admin': 3 };
        return (roleHierarchy[session.role] || 0) >= (roleHierarchy[requiredRole] || 0);
    }

    canDelete(action) {
        const session = this.getCurrentSession();
        if (!session) return false;
        // Only manager and admin can delete
        return session.role === 'manager' || session.role === 'admin';
    }

    canEditSettings() {
        const session = this.getCurrentSession();
        if (!session) return false;
        // Only admin can edit settings
        return session.role === 'admin';
    }
}

// Global instance
const storage = new StorageManager();
window.storageReady = true;
console.log('StorageManager initialized');
