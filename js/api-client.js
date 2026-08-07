/**
 * API Client - butun ilova ma'lumotlari shu orqali Express + SQLite backendga boradi.
 * localStorage endi faqat JWT tokenni saqlash uchun ishlatiladi.
 */
class APIClient {
    constructor() {
        this.baseURL = localStorage.getItem('API_URL') || '/api';
        this.token = localStorage.getItem('auth_token');
    }

    async request(method, endpoint, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        if (data !== null && data !== undefined) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, options);
        let body = null;
        try { body = await response.json(); } catch (e) { /* no JSON body */ }

        if (!response.ok) {
            const error = new Error((body && body.error) || `API xatosi: ${response.status}`);
            error.status = response.status;
            error.body = body;
            throw error;
        }
        return body;
    }

    // ==================== AUTH ====================

    async login(username, password) {
        const result = await this.request('POST', '/auth/login', { username, password });
        if (result.token) {
            this.token = result.token;
            localStorage.setItem('auth_token', result.token);
        }
        return result;
    }

    async register(username, password, name, role) {
        return await this.request('POST', '/auth/register', { username, password, name, role });
    }

    async getMe() {
        return await this.request('GET', '/auth/me');
    }

    logout() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    isAuthenticated() {
        return !!this.token;
    }

    // ==================== CLIENTS ====================

    getClients() { return this.request('GET', '/clients'); }
    getClientById(id) { return this.request('GET', `/clients/${id}`); }
    addClient(client) { return this.request('POST', '/clients', client); }
    updateClient(id, updates) { return this.request('PUT', `/clients/${id}`, updates); }
    deleteClient(id) { return this.request('DELETE', `/clients/${id}`); }

    // ==================== SUPPLIERS ====================

    getSuppliers() { return this.request('GET', '/suppliers'); }
    getSupplierById(id) { return this.request('GET', `/suppliers/${id}`); }
    addSupplier(supplier) { return this.request('POST', '/suppliers', supplier); }
    updateSupplier(id, updates) { return this.request('PUT', `/suppliers/${id}`, updates); }
    deleteSupplier(id) { return this.request('DELETE', `/suppliers/${id}`); }

    // ==================== PRODUCTS ====================

    getProducts() { return this.request('GET', '/products'); }
    getProductById(id) { return this.request('GET', `/products/${id}`); }
    addProduct(product) { return this.request('POST', '/products', product); }
    updateProduct(id, updates) { return this.request('PUT', `/products/${id}`, updates); }
    deleteProduct(id) { return this.request('DELETE', `/products/${id}`); }

    // ==================== INVENTORY MOVEMENTS ====================

    getInventoryMovements(productId) {
        return this.request('GET', productId ? `/inventory-movements?productId=${encodeURIComponent(productId)}` : '/inventory-movements');
    }
    addInventoryMovement(movement) { return this.request('POST', '/inventory-movements', movement); }

    // ==================== TRANSACTIONS ====================

    getTransactions() { return this.request('GET', '/transactions'); }
    getTransactionById(id) { return this.request('GET', `/transactions/${id}`); }
    addTransaction(transaction) { return this.request('POST', '/transactions', transaction); }
    deleteTransaction(id) { return this.request('DELETE', `/transactions/${id}`); }

    // ==================== INVOICES ====================

    getInvoices() { return this.request('GET', '/invoices'); }
    getInvoiceById(id) { return this.request('GET', `/invoices/${id}`); }
    addInvoice(invoice) { return this.request('POST', '/invoices', invoice); }
    deleteInvoice(id) { return this.request('DELETE', `/invoices/${id}`); }

    // ==================== PRODUCTION RECIPES (BOM) ====================

    getProductionRecipes() { return this.request('GET', '/production/recipes'); }
    addProductionRecipe(recipe) { return this.request('POST', '/production/recipes', recipe); }
    updateProductionRecipe(id, updates) { return this.request('PUT', `/production/recipes/${id}`, updates); }
    deleteProductionRecipe(id) { return this.request('DELETE', `/production/recipes/${id}`); }

    // ==================== PRODUCTION ORDERS ====================

    getProductionOrders() { return this.request('GET', '/production/orders'); }
    addProductionOrder(order) { return this.request('POST', '/production/orders', order); }
    deleteProductionOrder(id) { return this.request('DELETE', `/production/orders/${id}`); }

    // ==================== EMPLOYEES ====================

    getEmployees() { return this.request('GET', '/employees'); }
    addEmployee(employee) { return this.request('POST', '/employees', employee); }
    updateEmployee(id, updates) { return this.request('PUT', `/employees/${id}`, updates); }
    deleteEmployee(id) { return this.request('DELETE', `/employees/${id}`); }

    // ==================== PAYROLL ====================

    getPayroll() { return this.request('GET', '/payroll'); }
    addPayrollRecord(record) { return this.request('POST', '/payroll', record); }
    deletePayrollRecord(id) { return this.request('DELETE', `/payroll/${id}`); }

    // ==================== SETTINGS ====================

    getSettings() { return this.request('GET', '/settings'); }
    updateSettings(settings) { return this.request('PUT', '/settings', settings); }

    // ==================== COMPANY INFO & DOCUMENTS ====================

    getCompanyInfo() { return this.request('GET', '/company-info'); }
    updateCompanyInfo(info) { return this.request('PUT', '/company-info', info); }

    getDocuments() { return this.request('GET', '/documents'); }
    getDocumentById(id) { return this.request('GET', `/documents/${id}`); }
    addDocument(doc) { return this.request('POST', '/documents', doc); }
    updateDocumentStatus(id, status) { return this.request('PUT', `/documents/${id}/status`, { status }); }
    deleteDocument(id) { return this.request('DELETE', `/documents/${id}`); }

    // ==================== STATISTICS ====================

    getStatistics() { return this.request('GET', '/statistics'); }

    // ==================== ACTIVITY LOG ====================

    getActivityLog(limit = 200) { return this.request('GET', `/activity-log?limit=${limit}`); }

    // ==================== CURRENCIES & RATES ====================

    getCurrencies() { return this.request('GET', '/currencies'); }
    addCurrency(currency) { return this.request('POST', '/currencies', currency); }

    getExchangeRates() { return this.request('GET', '/exchange-rates'); }

    getExchangeRate(from, to, date = null) {
        let endpoint = `/exchange-rates?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        if (date) endpoint += `&date=${encodeURIComponent(date)}`;
        return this.request('GET', endpoint);
    }
    addExchangeRate(rate) { return this.request('POST', '/exchange-rates', rate); }
}

// Global instance
const api = new APIClient();
