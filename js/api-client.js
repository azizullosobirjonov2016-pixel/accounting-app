/**
 * API Client - Bridges frontend to Express backend
 * Can work with either localStorage (dev) or server API (production)
 */
class APIClient {
    constructor() {
        this.baseURL = localStorage.getItem('API_URL') || 'http://localhost:5000/api';
        this.token = localStorage.getItem('auth_token');
        this.useServer = localStorage.getItem('USE_SERVER_API') === 'true';
    }

    async request(method, endpoint, data = null) {
        if (!this.useServer) {
            return this.fallbackToStorage(method, endpoint, data);
        }

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
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

    // ==================== CLIENTS ====================

    async getClients() {
        return await this.request('GET', '/clients');
    }

    async addClient(client) {
        return await this.request('POST', '/clients', client);
    }

    async deleteClient(clientId) {
        return await this.request('DELETE', `/clients/${clientId}`);
    }

    // ==================== PRODUCTS ====================

    async getProducts() {
        return await this.request('GET', '/products');
    }

    async addProduct(product) {
        return await this.request('POST', '/products', product);
    }

    async deleteProduct(productId) {
        return await this.request('DELETE', `/products/${productId}`);
    }

    // ==================== TRANSACTIONS ====================

    async getTransactions() {
        return await this.request('GET', '/transactions');
    }

    async addTransaction(transaction) {
        return await this.request('POST', '/transactions', transaction);
    }

    // ==================== CURRENCIES & RATES ====================

    async getCurrencies() {
        return await this.request('GET', '/currencies');
    }

    async addCurrency(currency) {
        return await this.request('POST', '/currencies', currency);
    }

    async getExchangeRate(from, to, date = null) {
        let endpoint = `/exchange-rates?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        if (date) endpoint += `&date=${encodeURIComponent(date)}`;
        return await this.request('GET', endpoint);
    }

    async addExchangeRate(rate) {
        return await this.request('POST', '/exchange-rates', rate);
    }

    async deleteTransaction(transactionId) {
        return await this.request('DELETE', `/transactions/${transactionId}`);
    }

    // ==================== EMPLOYEES ====================

    async getEmployees() {
        return await this.request('GET', '/employees');
    }

    async addEmployee(employee) {
        return await this.request('POST', '/employees', employee);
    }

    async deleteEmployee(employeeId) {
        return await this.request('DELETE', `/employees/${employeeId}`);
    }

    // ==================== PAYROLL ====================

    async getPayroll() {
        return await this.request('GET', '/payroll');
    }

    async addPayrollRecord(record) {
        return await this.request('POST', '/payroll', record);
    }

    // ==================== STATISTICS ====================

    async getStatistics() {
        return await this.request('GET', '/statistics');
    }

    // ==================== FALLBACK (Storage) ====================

    fallbackToStorage(method, endpoint, data) {
        // This would fall back to the existing StorageManager implementation
        console.log(`Fallback: ${method} ${endpoint}`, data);
        return Promise.resolve({});
    }
}

// Global instance
const api = new APIClient();
