// Main Application Logic
class AccountingApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.init();
    }

    init() {
        // Skip auth if storage is not available (for development/debugging)
        if (typeof window.storage === 'undefined') {
            console.warn('Storage not available, skipping auth');
            document.getElementById('loginModal').style.display = 'none';
            this.showMainApp();
        } else if (!storage.isAuthenticated()) {
            this.setupLoginPage();
            return;
        } else {
            this.showMainApp();
        }
        this.setupEventListeners();
        this.loadCurrencies();
        this.loadDashboard();
        this.updateClientDropdowns();
        this.updateSupplierDropdowns();
        if (typeof window.storage !== 'undefined') {
            this.updateUserDisplay();
        }
    }

    async loadCurrencies() {
        // Try server first, fallback to basic list
        let list = [];
        try {
            if (api.useServer) {
                const res = await api.getCurrencies();
                if (Array.isArray(res)) list = res;
            }
        } catch (e) {
            console.warn('Could not load currencies from server, falling back');
        }

        if (list.length === 0) {
            // fallback to local storage currencies
            list = storage.getCurrencies();
            if (!list || list.length === 0) {
                list = [
                    { code: 'UZS', name: 'Uzbekistani Som', symbol: "so'" },
                    { code: 'USD', name: 'US Dollar', symbol: '$' },
                    { code: 'EUR', name: 'Euro', symbol: '€' }
                ];
            }
        }

        // Populate selects if present
        const transCurrency = document.getElementById('transCurrency');
        if (transCurrency) {
            const cur = transCurrency.value;
            transCurrency.innerHTML = '<option value="">-- Tanlang --</option>';
            list.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.code} — ${c.name}`;
                transCurrency.appendChild(opt);
            });
            transCurrency.value = cur;
            transCurrency.addEventListener('change', () => this.updateTransactionAmountPreview());
        }

        const productCurrency = document.getElementById('productCurrency');
        if (productCurrency) {
            const cur = productCurrency.value;
            productCurrency.innerHTML = '<option value="">-- Tanlang --</option>';
            list.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.code} — ${c.name}`;
                productCurrency.appendChild(opt);
            });
            productCurrency.value = cur;
        }

        const invoiceCurrency = document.getElementById('invoiceCurrency');
        if (invoiceCurrency) {
            const cur = invoiceCurrency.value;
            invoiceCurrency.innerHTML = '<option value="">-- Tanlang --</option>';
            list.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.code} — ${c.name}`;
                invoiceCurrency.appendChild(opt);
            });
            invoiceCurrency.value = cur || (list[0] && list[0].code);
        }

        const baseCurrencySelect = document.getElementById('baseCurrency');
        if (baseCurrencySelect) {
            const cur = baseCurrencySelect.value;
            baseCurrencySelect.innerHTML = '';
            list.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.code} — ${c.name}`;
                baseCurrencySelect.appendChild(opt);
            });
            baseCurrencySelect.value = cur || (list[0] && list[0].code);
        }

        const displayCurrencySelect = document.getElementById('displayCurrency');
        if (displayCurrencySelect) {
            const cur = displayCurrencySelect.value;
            displayCurrencySelect.innerHTML = '';
            list.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.code} — ${c.name}`;
                displayCurrencySelect.appendChild(opt);
            });
            displayCurrencySelect.value = cur || (list[0] && list[0].code);
        }

        // Load admin lists (currencies & rates) if settings UI present
        const settings = storage.getSettings();
        const defaultCurrency = settings.defaultCurrency || (list[0] && list[0].code);

        if (transCurrency && !transCurrency.value && defaultCurrency) {
            transCurrency.value = defaultCurrency;
        }
        if (invoiceCurrency && !invoiceCurrency.value && defaultCurrency) {
            invoiceCurrency.value = defaultCurrency;
        }
        if (productCurrency && !productCurrency.value && defaultCurrency) {
            productCurrency.value = defaultCurrency;
        }

        const defaultCurrencySelect = document.getElementById('defaultCurrency');
        if (defaultCurrencySelect) {
            const cur = defaultCurrencySelect.value;
            defaultCurrencySelect.innerHTML = '<option value="">-- Tanlang --</option>';
            list.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.code} — ${c.name}`;
                defaultCurrencySelect.appendChild(opt);
            });
            defaultCurrencySelect.value = cur || defaultCurrency;
        }

        // Load admin lists (currencies & rates) if settings UI present
        this.loadAdminLists?.();
    }

    getCurrencySymbol(code) {
        const currency = storage.getCurrencies().find(c => c.code === code);
        return currency?.symbol || code;
    }

    formatCurrency(amount, code) {
        const settings = storage.getSettings();
        const showSymbol = settings.showCurrencySymbol !== false;
        const currencyText = showSymbol ? this.getCurrencySymbol(code) : (code || "so'");
        return `${this.formatNumber(amount)} ${currencyText}`;
    }

    async updateTransactionAmountPreview() {
        const amountEl = document.getElementById('transAmount');
        const currencyEl = document.getElementById('transCurrency');
        const previewEl = document.getElementById('transAmountBasePreview');
        if (!amountEl || !currencyEl || !previewEl) return;

        const amount = parseFloat(amountEl.value) || 0;
        const currency = currencyEl.value;
        if (!currency || !api.useServer) {
            previewEl.textContent = `${this.formatNumber(amount)} ${currency || ''}`;
            return;
        }

        try {
            const rateObj = await api.getExchangeRate(currency, (localStorage.getItem('BASE_CURRENCY') || 'UZS'));
            const rate = rateObj.rate || 1;
            const base = amount * rate;
            previewEl.textContent = `${this.formatNumber(base)} so'm (rate ${rate})`;
        } catch (e) {
            previewEl.textContent = '—';
        }
    }

    // Admin: load and render currencies & rates
    async loadAdminLists() {
        const list = api.useServer ? (await api.getCurrencies().catch(() => storage.getCurrencies())) : storage.getCurrencies();
        const container = document.getElementById('adminCurrenciesList');
        const rateFrom = document.getElementById('rateFrom');
        const rateTo = document.getElementById('rateTo');
        const ratesContainer = document.getElementById('adminRatesList');

        if (rateFrom) {
            rateFrom.innerHTML = '<option value="">-- From --</option>';
            list.forEach(c => rateFrom.appendChild(Object.assign(document.createElement('option'), { value: c.code, textContent: `${c.code} — ${c.name}` })));
        }
        if (rateTo) {
            rateTo.innerHTML = '<option value="">-- To --</option>';
            list.forEach(c => rateTo.appendChild(Object.assign(document.createElement('option'), { value: c.code, textContent: `${c.code} — ${c.name}` })));
        }

        if (container) {
            container.innerHTML = '';
            list.forEach(c => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `<strong>${c.code}</strong> — ${c.name} <span style="margin-left:8px;color:#666">${c.symbol || ''}</span>`;
                container.appendChild(item);
            });
        }

        // Render exchange rates from local storage (server rates can be added via API)
        if (ratesContainer) {
            const rates = storage.getExchangeRates();
            ratesContainer.innerHTML = '';
            if (!rates || rates.length === 0) {
                ratesContainer.innerHTML = '<div class="empty-state"><p>Hali kurs yozuvlari mavjud emas</p></div>';
            } else {
                const table = document.createElement('table');
                table.className = 'transactions-table';
                table.innerHTML = '<thead><tr><th>From</th><th>To</th><th>Rate</th><th>Date</th></tr></thead>';
                const tbody = document.createElement('tbody');
                rates.forEach(r => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${r.from_currency || r.from}</td><td>${r.to_currency || r.to}</td><td>${r.rate}</td><td>${r.date}</td>`;
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                ratesContainer.appendChild(table);
            }
        }
    }

    async handleAddCurrency(e) {
        e.preventDefault();
        const code = document.getElementById('currencyCode').value.trim().toUpperCase();
        const name = document.getElementById('currencyName').value.trim();
        const symbol = document.getElementById('currencySymbol').value.trim();
        if (!code) return this.showMessage('Currency code required', 'error');
        const payload = { code, name, symbol };
        try {
            if (api.useServer) {
                await api.addCurrency(payload);
            } else {
                storage.addCurrency(payload);
            }
            this.showMessage('Currency saved', 'success');
            this.loadCurrencies();
            this.loadAdminLists();
            document.getElementById('currencyForm').reset();
        } catch (err) {
            console.error(err);
            this.showMessage('Could not save currency', 'error');
        }
    }

    async handleAddExchangeRate(e) {
        e.preventDefault();
        const from = document.getElementById('rateFrom').value;
        const to = document.getElementById('rateTo').value;
        const rate = parseFloat(document.getElementById('rateValue').value);
        const date = document.getElementById('rateDate').value || new Date().toISOString().split('T')[0];
        if (!from || !to || !rate) return this.showMessage('From, to and rate are required', 'error');
        const payloadLocal = { from_currency: from, to_currency: to, rate, date, source: 'admin' };
        try {
            if (api.useServer) {
                await api.addExchangeRate(payloadLocal);
            }
            // Always add to local storage for offline visibility
            storage.addExchangeRate({ from_currency: from, to_currency: to, rate, date, source: 'admin' });
            this.showMessage('Exchange rate added', 'success');
            this.loadAdminLists();
            document.getElementById('exchangeRateForm').reset();
        } catch (err) {
            console.error(err);
            this.showMessage('Could not add rate', 'error');
        }
    }

    setupLoginPage() {"}]}
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const role = document.getElementById('loginRole').value;
        
        const session = storage.login(username, password, role);
        if (!session) {
            alert('Noto\'g\'ri foydalanuvchi nomi, parol yoki rol!');
            return;
        }
        
        // Hide login modal and show main app
        document.getElementById('loginModal').classList.remove('active');
        this.showMainApp();
        this.setupEventListeners();
        this.loadDashboard();
        this.updateClientDropdowns();
        this.updateSupplierDropdowns();
        this.updateUserDisplay();
    }

    showMainApp() {
        document.getElementById('mainApp').style.display = '';
    }

    updateUserDisplay() {
        const session = storage.getCurrentSession();
        if (session) {
            const userDisplay = document.getElementById('userDisplay');
            const logoutBtn = document.getElementById('logoutBtn');
            if (userDisplay) {
                userDisplay.innerHTML = `👤 ${session.name} (${session.role})`;
            }
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
        }
    }

    handleLogout() {
        if (confirm('Tizimdan chiqishni xohlaysizmi?')) {
            storage.logout();
            location.reload();
        }
    }

    // Tab Navigation
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Forms
        document.getElementById('clientForm').addEventListener('submit', (e) => this.handleAddClient(e));
        document.getElementById('supplierForm').addEventListener('submit', (e) => this.handleAddSupplier(e));
        document.getElementById('transactionForm').addEventListener('submit', (e) => this.handleAddTransaction(e));
        document.getElementById('settingsForm').addEventListener('submit', (e) => this.handleSaveSettings(e));
        // Currency admin forms (if present)
        if (document.getElementById('currencyForm')) {
            document.getElementById('currencyForm').addEventListener('submit', (e) => this.handleAddCurrency(e));
        }
        if (document.getElementById('exchangeRateForm')) {
            document.getElementById('exchangeRateForm').addEventListener('submit', (e) => this.handleAddExchangeRate(e));
        }

        // Inventory forms
        document.getElementById('productForm').addEventListener('submit', (e) => this.handleAddProduct(e));
        document.getElementById('stockMovementForm').addEventListener('submit', (e) => this.handleStockMovement(e));

        // Inventory buttons
        document.getElementById('addProductBtn').addEventListener('click', () => this.showAddProductModal());
        document.getElementById('stockInBtn').addEventListener('click', () => this.showStockMovementModal('in'));
        document.getElementById('stockOutBtn').addEventListener('click', () => this.showStockMovementModal('out'));
        document.getElementById('adjustStockBtn').addEventListener('click', () => this.showStockMovementModal('adjust'));

        // Inventory filters
        document.getElementById('productSearch').addEventListener('input', () => this.filterProducts());
        document.getElementById('categoryFilter').addEventListener('change', () => this.filterProducts());
        document.getElementById('stockFilter').addEventListener('change', () => this.filterProducts());

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                document.getElementById('addProductModal').style.display = 'none';
                document.getElementById('stockMovementModal').style.display = 'none';
            });
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Transaction filters
        document.getElementById('applyFilter').addEventListener('click', () => this.filterTransactions());
        document.getElementById('filterSearch')?.addEventListener('input', () => this.filterTransactions());
        document.getElementById('clearFilter')?.addEventListener('click', () => this.clearTransactionFilters());
        document.getElementById('transAmount')?.addEventListener('input', () => this.updateTransactionAmountPreview());
        document.getElementById('invoiceCurrency')?.addEventListener('change', () => this.updateInvoiceTotalPreview());

        // Production actions
        document.getElementById('productionForm').addEventListener('submit', (e) => this.handleAddProductionOrder(e));
        document.getElementById('addMaterialRowBtn').addEventListener('click', () => this.addProductionMaterialRow());
        document.getElementById('productionRecipeSelect').addEventListener('change', () => this.applySelectedRecipe());
        document.getElementById('loadRecipeBtn').addEventListener('click', () => this.applySelectedRecipe());
        document.getElementById('productionQuantity').addEventListener('input', () => {
            const recipeId = document.getElementById('productionRecipeSelect').value;
            if (recipeId) {
                this.applySelectedRecipe();
            } else {
                this.updateProductionCostPreview();
            }
        });
        document.getElementById('recipeForm').addEventListener('submit', (e) => this.handleSaveRecipe(e));
        document.getElementById('addRecipeMaterialRowBtn').addEventListener('click', () => this.addRecipeMaterialRow());

        // Report period selector
        document.querySelectorAll('input[name="period"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handlePeriodChange(e));
        });

        document.getElementById('generateReport').addEventListener('click', () => this.generateReport());
        document.getElementById('exportReport').addEventListener('click', () => this.exportReport());

        // Backup/Restore
        document.getElementById('backupData').addEventListener('click', () => this.backupData());
        document.getElementById('restoreData').addEventListener('click', () => {
            document.getElementById('restoreInput').click();
        });
        document.getElementById('restoreInput').addEventListener('change', (e) => this.restoreData(e));
        document.getElementById('clearData').addEventListener('click', () => this.clearAllData());

        // Set today's date for date inputs
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transDate').value = today;
        document.getElementById('invoiceDate').value = today;

        document.getElementById('invoiceForm').addEventListener('submit', (e) => this.handleAddInvoice(e));
        document.getElementById('addInvoiceLineBtn').addEventListener('click', () => this.addInvoiceLineRow());
        document.getElementById('employeeForm').addEventListener('submit', (e) => this.handleAddEmployee(e));
        document.getElementById('payrollForm').addEventListener('submit', (e) => this.handleAddPayrollRecord(e));
        // Set up payroll controls
        document.getElementById('addEmployeeBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('employeeForm').requestSubmit();
        });
    }

    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Update active button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        this.currentTab = tabName;

        // Load content for tab
        if (tabName === 'dashboard') {
            this.loadDashboard();
        } else if (tabName === 'inventory') {
            this.loadInventory();
        } else if (tabName === 'clients') {
            this.displayClients();
        } else if (tabName === 'suppliers') {
            this.displaySuppliers();
        } else if (tabName === 'transactions') {
            this.displayTransactions();
        } else if (tabName === 'sales') {
            this.loadSales();
        } else if (tabName === 'payroll') {
            this.loadPayroll();
        } else if (tabName === 'production') {
            this.loadProduction();
        } else if (tabName === 'settings') {
            this.loadSettings();
        }
    }

    // PAYROLL
    loadPayroll() {
        // initialize forms and lists
        const invoiceDate = new Date().toISOString().split('T')[0];
        const payrollPeriod = new Date().toISOString().slice(0,7);
        document.getElementById('payrollPeriod').value = payrollPeriod;
        document.getElementById('employeeForm').reset();
        document.getElementById('payrollForm').reset();
        document.getElementById('employeesList').innerHTML = '';
        document.getElementById('payrollTableBody').innerHTML = '';
        this.displayEmployees();
        this.displayPayrollRecords();
        this.updateEmployeeDropdowns();
    }

    handleAddEmployee(e) {
        e.preventDefault();
        const emp = {
            id: Date.now().toString(),
            name: document.getElementById('employeeName').value.trim(),
            position: document.getElementById('employeePosition').value.trim(),
            salary: parseFloat(document.getElementById('employeeSalary').value) || 0,
            taxRate: parseFloat(document.getElementById('employeeTaxRate').value) || 0,
            createdAt: new Date().toISOString()
        };
        storage.addEmployee(emp);
        document.getElementById('employeeForm').reset();
        this.displayEmployees();
        this.updateEmployeeDropdowns();
        this.showMessage('Xodim qo\'shildi', 'success');
    }

    displayEmployees() {
        const employees = storage.getEmployees();
        const container = document.getElementById('employeesList');
        container.innerHTML = '';
        if (employees.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Hali xodim qo\'shilmagan</p></div>';
            return;
        }
        employees.forEach(emp => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <h4>${emp.name}</h4>
                <p><strong>Lavozim:</strong> ${emp.position || '-'} </p>
                <p><strong>Oyma-oy maosh:</strong> ${this.formatNumber(emp.salary)} so'm</p>
                <div class="list-item-actions">
                    <button class="btn btn-danger" onclick="app.deleteEmployee('${emp.id}')">O'chirish</button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateEmployeeDropdowns() {
        const employees = storage.getEmployees();
        const select = document.getElementById('payrollEmployee');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">-- Tanlang --</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.name} — ${emp.position || ''}`;
            select.appendChild(option);
        });
        select.value = current;
    }

    handleAddPayrollRecord(e) {
        e.preventDefault();
        const employeeId = document.getElementById('payrollEmployee').value;
        const period = document.getElementById('payrollPeriod').value;
        const bonus = parseFloat(document.getElementById('payrollBonus').value) || 0;
        const deductions = parseFloat(document.getElementById('payrollDeductions').value) || 0;
        if (!employeeId) { this.showMessage('Iltimos, xodimni tanlang', 'error'); return; }
        const emp = storage.getEmployeeById(employeeId);
        if (!emp) { this.showMessage('Xodim topilmadi', 'error'); return; }
        const gross = (parseFloat(emp.salary) || 0) + bonus;
        const tax = gross * ((parseFloat(emp.taxRate) || 0) / 100);
        const net = Math.max(0, gross - tax - deductions);

        const record = {
            id: Date.now().toString(),
            employeeId,
            period,
            gross,
            tax,
            deductions,
            net,
            date: new Date().toISOString()
        };
        storage.addPayrollRecord(record);
        
        // Create automatic expense transaction for salary payment
        const transaction = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            type: 'expense',
            category: 'salary',
            description: `Ish haqi: ${emp.name} (${period})`,
            amount: net,
            payrollRecordId: record.id,
            status: 'completed'
        };
        storage.addTransaction(transaction);
        
        document.getElementById('payrollForm').reset();
        this.displayPayrollRecords();
        this.showMessage('Ish haqi yozuvi va xarajat tranzaksiyasi saqlandi', 'success');
    }

    displayPayrollRecords() {
        const records = storage.getPayrollRecords().sort((a,b) => new Date(b.date) - new Date(a.date));
        const tbody = document.getElementById('payrollTableBody');
        tbody.innerHTML = '';
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Hali yozuv mavjud emas</td></tr>';
            return;
        }
        records.forEach(r => {
            const emp = storage.getEmployeeById(r.employeeId);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(r.date).toLocaleDateString('uz-UZ')}</td>
                <td>${emp ? emp.name : 'Noma\'lum'}</td>
                <td>${r.period}</td>
                <td>${this.formatNumber(r.gross)} so'm</td>
                <td>${this.formatNumber(r.deductions + r.tax)} so'm</td>
                <td><strong>${this.formatNumber(r.net)} so'm</strong></td>
                <td><button class="btn btn-danger" onclick="app.deletePayrollRecord('${r.id}')">O'chirish</button></td>
            `;
            tbody.appendChild(row);
        });
        // Display payroll summary
        this.displayPayrollSummary();
    }

    displayPayrollSummary() {
        const records = storage.getPayrollRecords();
        if (records.length === 0) return;
        
        const totalGross = records.reduce((s, r) => s + (r.gross || 0), 0);
        const totalTax = records.reduce((s, r) => s + (r.tax || 0), 0);
        const totalDeductions = records.reduce((s, r) => s + (r.deductions || 0), 0);
        const totalNet = records.reduce((s, r) => s + (r.net || 0), 0);
        
        let summaryHTML = `
            <div class="summary-box">
                <h4>Итоги ишчи хақи:</h4>
                <p>Ҳамма: ${this.formatNumber(totalGross)} so'm</p>
                <p>Солиқ: ${this.formatNumber(totalTax)} so'm</p>
                <p>Чегириш: ${this.formatNumber(totalDeductions)} so'm</p>
                <p><strong>Тўлаш: ${this.formatNumber(totalNet)} so'm</strong></p>
            </div>
        `;
        
        const summaryContainer = document.getElementById('payrollSummary');
        if (summaryContainer) {
            summaryContainer.innerHTML = summaryHTML;
        }
    }

    deleteEmployee(empId) {
        if (!storage.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Xodimni o\'chirishni xohlaysizmi?')) return;
        storage.deleteEmployee(empId);
        this.displayEmployees();
        this.updateEmployeeDropdowns();
        this.showMessage('Xodim o\'chirildi', 'success');
    }

    deletePayrollRecord(id) {
        if (!storage.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Yozuvni o\'chirishni xohlaysizmi?')) return;
        storage.deletePayrollRecord(id);
        this.displayPayrollRecords();
        this.showMessage('Yozuv o\'chirildi', 'success');
    }

    // DASHBOARD
    loadDashboard() {
        const stats = storage.getStatistics();
        
        document.getElementById('totalIncome').textContent = this.formatNumber(stats.totalIncome);
        document.getElementById('totalExpense').textContent = this.formatNumber(stats.totalExpense);
        document.getElementById('totalTax').textContent = this.formatNumber(stats.totalTax);
        document.getElementById('netProfit').textContent = this.formatNumber(stats.netProfit);

        // Inventory stats
        const products = storage.getProducts();
        const totalValue = products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);
        const lowStockItems = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;

        document.getElementById('dashboardInventoryValue').textContent = this.formatNumber(totalValue);
        document.getElementById('dashboardLowStock').textContent = lowStockItems;

        this.displayRecentTransactions();
    }

    displayRecentTransactions() {
        const recent = storage.getRecentTransactions(5);
        const tbody = document.getElementById('recentTableBody');
        tbody.innerHTML = '';

        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Hali tranzaksiya mavjud emas</td></tr>';
            return;
        }

        recent.forEach(trans => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(trans.date).toLocaleDateString('uz-UZ')}</td>
                <td>${trans.description}</td>
                <td><span style="background: ${trans.type === 'income' ? '#10b981' : '#ef4444'}; color: white; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.8rem;">
                    ${trans.type === 'income' ? 'Daromad' : 'Chiqim'}
                </span></td>
                <td>
                    <strong>${this.formatNumber(trans.amount)}${trans.currency ? ' ' + trans.currency : ' so\'m'}</strong>
                    ${trans.amount_base ? `<div style="font-size:0.85rem;color:#666;">(${this.formatNumber(trans.amount_base)} so'm bazada)</div>` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // CLIENTS
    handleAddClient(e) {
        e.preventDefault();

        const client = {
            name: document.getElementById('clientName').value,
            stir: document.getElementById('clientSTIR').value,
            phone: document.getElementById('clientPhone').value,
            address: document.getElementById('clientAddress').value
        };

        storage.addClient(client);
        
        // Form ni tozalash
        document.getElementById('clientForm').reset();
        
        // Clientlarni yangilash
        this.displayClients();
        this.updateClientDropdowns();
        this.updateSupplierDropdowns();
        
        this.showMessage('Mijoz muvaffaqiyatli qo\'shildi', 'success');
    }

    displayClients() {
        const clients = storage.getClients();
        const container = document.getElementById('clientsList');
        container.innerHTML = '';

        if (clients.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Hali mijoz qo\'shilmagan</p></div>';
            return;
        }

        clients.forEach(client => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <h4>${client.name}</h4>
                <p><strong>STIR:</strong> ${client.stir || 'Belgilanmagan'}</p>
                <p><strong>Telefon:</strong> ${client.phone || 'Belgilanmagan'}</p>
                <p><strong>Manzil:</strong> ${client.address || 'Belgilanmagan'}</p>
                <div class="list-item-actions">
                    <button class="btn btn-secondary" onclick="app.editClient('${client.id}')">Tahrirlash</button>
                    <button class="btn btn-danger" onclick="app.deleteClient('${client.id}')">O'chirish</button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateClientDropdowns() {
        const clients = storage.getClients();
        const transSelect = document.getElementById('transClient');
        const invoiceSelect = document.getElementById('invoiceClient');
        const transValue = transSelect ? transSelect.value : '';
        const invoiceValue = invoiceSelect ? invoiceSelect.value : '';

        if (transSelect) {
            transSelect.innerHTML = '<option value="">-- Tanlang --</option>';
        }
        if (invoiceSelect) {
            invoiceSelect.innerHTML = '<option value="">-- Tanlang --</option>';
        }

        clients.forEach(client => {
            const option1 = document.createElement('option');
            option1.value = client.id;
            option1.textContent = client.name;
            if (transSelect) transSelect.appendChild(option1.cloneNode(true));

            if (invoiceSelect) {
                const option2 = document.createElement('option');
                option2.value = client.id;
                option2.textContent = client.name;
                invoiceSelect.appendChild(option2);
            }
        });

        if (transSelect) transSelect.value = transValue;
        if (invoiceSelect) invoiceSelect.value = invoiceValue;
    }

    deleteClient(clientId) {
        if (!storage.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (confirm('Ushbu mijozni o\'chirishga ishonch hosil qildingizmi?')) {
            storage.deleteClient(clientId);
            this.displayClients();
            this.updateClientDropdowns();
            this.showMessage('Mijoz muvaffaqiyatli o\'chirildi', 'success');
        }
    }

    editClient(clientId) {
        const client = storage.getClientById(clientId);
        if (client) {
            alert('Tahrirlash funktsiyasi tez orada qo\'shilinadi');
        }
    }

    // SUPPLIERS
    handleAddSupplier(e) {
        e.preventDefault();

        const supplier = {
            name: document.getElementById('supplierName').value,
            stir: document.getElementById('supplierSTIR').value,
            phone: document.getElementById('supplierPhone').value,
            address: document.getElementById('supplierAddress').value,
            productType: document.getElementById('supplierProductType').value
        };

        storage.addSupplier(supplier);
        
        // Form ni tozalash
        document.getElementById('supplierForm').reset();
        
        // Supplierlarni yangilash
        this.displaySuppliers();
        this.updateSupplierDropdowns();
        
        this.showMessage('Yetkazib beruvchi muvaffaqiyatli qo\'shildi', 'success');
    }

    displaySuppliers() {
        const suppliers = storage.getSuppliers();
        const container = document.getElementById('suppliersList');
        container.innerHTML = '';

        if (suppliers.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Hali yetkazib beruvchi qo\'shilmagan</p></div>';
            return;
        }

        suppliers.forEach(supplier => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <h4>${supplier.name}</h4>
                <p><strong>STIR:</strong> ${supplier.stir || 'Belgilanmagan'}</p>
                <p><strong>Telefon:</strong> ${supplier.phone || 'Belgilanmagan'}</p>
                <p><strong>Mahsulot turi:</strong> ${this.getProductTypeLabel(supplier.productType)}</p>
                <p><strong>Manzil:</strong> ${supplier.address || 'Belgilanmagan'}</p>
                <div class="list-item-actions">
                    <button class="btn btn-secondary" onclick="app.editSupplier('${supplier.id}')">Tahrirlash</button>
                    <button class="btn btn-danger" onclick="app.deleteSupplier('${supplier.id}')">O'chirish</button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateSupplierDropdowns() {
        const suppliers = storage.getSuppliers();
        const select = document.getElementById('transSupplier');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">-- Tanlang --</option>';
        
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    }

    deleteSupplier(supplierId) {
        if (!storage.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (confirm('Ushbu yetkazib beruvchini o\'chirishga ishonch hosil qildingizmi?')) {
            storage.deleteSupplier(supplierId);
            this.displaySuppliers();
            this.updateSupplierDropdowns();
            this.showMessage('Yetkazib beruvchi muvaffaqiyatli o\'chirildi', 'success');
        }
    }

    editSupplier(supplierId) {
        const supplier = storage.getSupplierById(supplierId);
        if (supplier) {
            alert('Tahrirlash funktsiyasi tez orada qo\'shilinadi');
        }
    }

    // PRODUCTION
    loadProduction() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('productionForm').reset();
        document.getElementById('productionDate').value = today;
        document.getElementById('materialUsageRows').innerHTML = '';
        this.addProductionMaterialRow();
        this.updateProductionDropdowns();
        this.loadRecipeManagement();
        this.displayProductionOrders();
        this.updateProductionCostPreview();
    }

    updateProductionDropdowns() {
        const products = storage.getProducts();

        const productionSelect = document.getElementById('productionProduct');
        const recipeSelect = document.getElementById('productionRecipeSelect');
        const recipeProductSelect = document.getElementById('recipeProductSelect');

        [productionSelect, recipeProductSelect].forEach(select => {
            if (!select) return;
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Tanlang --</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.stock || 0} ${product.unit})`;
                select.appendChild(option);
            });
            select.value = currentValue;
        });

        if (recipeSelect) {
            const currentValue = recipeSelect.value;
            recipeSelect.innerHTML = '<option value="">-- Tanlang --</option>';
            const recipes = storage.getProductionRecipes();
            recipes.forEach(recipe => {
                const option = document.createElement('option');
                option.value = recipe.id;
                const product = products.find(p => p.id === recipe.finishedProductId);
                option.textContent = `${recipe.name} — ${product ? product.name : 'Noma\'lum'}`;
                recipeSelect.appendChild(option);
            });
            recipeSelect.value = currentValue;
        }

        const materialSelects = document.querySelectorAll('.material-product-select');
        materialSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Tanlang --</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.stock || 0} ${product.unit})`;
                select.appendChild(option);
            });
            select.value = currentValue;
        });

        const recipeMaterialSelects = document.querySelectorAll('.recipe-material-product-select');
        recipeMaterialSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Tanlang --</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.unit})`;
                select.appendChild(option);
            });
            select.value = currentValue;
        });
    }

    loadRecipeManagement() {
        const recipeForm = document.getElementById('recipeForm');
        if (recipeForm) {
            recipeForm.reset();
        }
        const container = document.getElementById('recipeMaterialRows');
        if (container) {
            container.innerHTML = '';
        }
        this.addRecipeMaterialRow();
        this.displayProductionRecipes();
        this.updateProductionDropdowns();
    }

    applySelectedRecipe() {
        const recipeId = document.getElementById('productionRecipeSelect').value;
        if (!recipeId) {
            this.updateProductionCostPreview();
            return;
        }

        const recipe = storage.getProductionRecipeById(recipeId);
        if (!recipe) {
            this.showMessage('Tanlangan retsept topilmadi', 'error');
            return;
        }

        this.loadRecipeIntoProductionForm(recipe);
    }

    loadRecipeIntoProductionForm(recipe) {
        const producedQuantity = parseInt(document.getElementById('productionQuantity').value, 10) || 1;
        const container = document.getElementById('materialUsageRows');
        container.innerHTML = '';

        const productionProduct = document.getElementById('productionProduct');
        if (productionProduct) {
            productionProduct.value = recipe.finishedProductId;
        }

        recipe.materials.forEach(material => {
            this.addProductionMaterialRow({
                productId: material.productId,
                quantity: material.qtyPerUnit * producedQuantity
            });
        });

        this.updateProductionCostPreview();
    }

    updateProductionCostPreview() {
        const rows = Array.from(document.querySelectorAll('#materialUsageRows .material-row'));
        let totalCost = 0;

        rows.forEach(row => {
            const productId = row.querySelector('.material-product-select').value;
            const quantity = parseFloat(row.querySelector('.material-quantity').value) || 0;
            const product = storage.getProductById(productId);
            totalCost += (product ? product.purchasePrice : 0) * quantity;
        });

        const producedQuantity = parseFloat(document.getElementById('productionQuantity').value) || 1;
        const unitCost = producedQuantity > 0 ? totalCost / producedQuantity : 0;

        document.getElementById('productionCostPreview').textContent = this.formatNumber(totalCost) + ' so\'m';
        document.getElementById('productionUnitCostPreview').textContent = this.formatNumber(unitCost) + ' so\'m';
    }

    addRecipeMaterialRow(item = {}) {
        const container = document.getElementById('recipeMaterialRows');
        const row = document.createElement('div');
        row.className = 'material-row';
        row.innerHTML = `
            <div class="form-grid material-row-grid">
                <div>
                    <label>Material:</label>
                    <select class="recipe-material-product-select" required>
                        <option value="">-- Tanlang --</option>
                    </select>
                </div>
                <div>
                    <label>Bir birlik uchun miqdor:</label>
                    <input type="number" class="recipe-material-quantity" min="1" value="${item.quantity || 1}" required>
                </div>
                <div class="material-row-actions">
                    <button type="button" class="btn btn-danger remove-material-row">O'chirish</button>
                </div>
            </div>
        `;

        container.appendChild(row);
        this.updateProductionDropdowns();

        const productSelect = row.querySelector('.recipe-material-product-select');
        if (productSelect && item.productId) {
            productSelect.value = item.productId;
        }

        row.querySelector('.remove-material-row').addEventListener('click', () => {
            row.remove();
        });
    }

    handleSaveRecipe(e) {
        e.preventDefault();

        const finishedProductId = document.getElementById('recipeProductSelect').value;
        const recipeName = document.getElementById('recipeName').value.trim();
        const rows = Array.from(document.querySelectorAll('#recipeMaterialRows .material-row'));

        if (!finishedProductId) {
            this.showMessage('Iltimos, retsept uchun mahsulotni tanlang', 'error');
            return;
        }

        if (!recipeName) {
            this.showMessage('Iltimos, retsept nomini kiriting', 'error');
            return;
        }

        const materials = [];
        for (const row of rows) {
            const productId = row.querySelector('.recipe-material-product-select').value;
            const quantity = parseFloat(row.querySelector('.recipe-material-quantity').value);
            if (!productId || !quantity || quantity <= 0) {
                this.showMessage('Iltimos, retsept materiallarini to\'liq kiriting', 'error');
                return;
            }
            materials.push({ productId, qtyPerUnit: quantity });
        }

        if (materials.length === 0) {
            this.showMessage('Iltimos, kamida bitta material qo\'shing', 'error');
            return;
        }

        const recipe = {
            finishedProductId,
            name: recipeName,
            materials
        };

        storage.addProductionRecipe(recipe);
        this.showMessage('Retsept saqlandi', 'success');
        this.loadRecipeManagement();
        this.applySelectedRecipe();
    }

    displayProductionRecipes() {
        const recipes = storage.getProductionRecipes();
        const products = storage.getProducts();
        const tbody = document.getElementById('recipeTableBody');
        tbody.innerHTML = '';

        if (recipes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Hali retsept mavjud emas</td></tr>';
            return;
        }

        recipes.forEach(recipe => {
            const finishedProduct = products.find(p => p.id === recipe.finishedProductId);
            const materialSummary = recipe.materials.map(item => {
                const product = products.find(p => p.id === item.productId);
                return `${product ? product.name : 'Noma\'lum'} (${item.qtyPerUnit})`;
            }).join(', ');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${finishedProduct ? finishedProduct.name : 'Noma\'lum'}</td>
                <td>${recipe.name}</td>
                <td>${materialSummary}</td>
                <td>
                    <button class="btn btn-danger" onclick="app.deleteProductionRecipe('${recipe.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">O'chirish</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    deleteProductionRecipe(recipeId) {
        if (!storage.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Ushbu retseptni o\'chirishga ishonchingiz komilmi?')) {
            return;
        }

        storage.deleteProductionRecipe(recipeId);
        this.loadRecipeManagement();
        this.showMessage('Retsept o\'chirildi', 'success');
    }

    handleAddProductionOrder(e) {
        e.preventDefault();

        const finishedProductId = document.getElementById('productionProduct').value;
        const producedQuantity = parseInt(document.getElementById('productionQuantity').value, 10);
        const date = document.getElementById('productionDate').value;
        const description = document.getElementById('productionDescription').value;
        const rows = Array.from(document.querySelectorAll('.material-row'));

        if (!finishedProductId) {
            this.showMessage('Iltimos, ishlab chiqariladigan mahsulotni tanlang', 'error');
            return;
        }

        if (!producedQuantity || producedQuantity <= 0) {
            this.showMessage('Iltimos, ishlab chiqarish miqdorini to\'g\'ri kiriting', 'error');
            return;
        }

        const materials = [];
        for (const row of rows) {
            const productId = row.querySelector('.material-product-select').value;
            const quantity = parseInt(row.querySelector('.material-quantity').value, 10);
            if (!productId || !quantity || quantity <= 0) {
                this.showMessage('Iltimos, material va miqdorni to\'g\'ri belgilang', 'error');
                return;
            }
            materials.push({ productId, quantity });
        }

        if (materials.length === 0) {
            this.showMessage('Iltimos, ishlab chiqarishda ishlatiladigan kamida bitta material kiriting', 'error');
            return;
        }

        const productMap = storage.getProducts().reduce((map, product) => {
            map[product.id] = product;
            return map;
        }, {});

        for (const material of materials) {
            const product = productMap[material.productId];
            if (!product) {
                this.showMessage('Materiallar ro\'yxatidagi mahsulot topilmadi', 'error');
                return;
            }
            if (product.stock < material.quantity) {
                this.showMessage(`Material "${product.name}" uchun zahira yetarli emas. Hozirgi zahira: ${product.stock}`, 'error');
                return;
            }
        }

        const recipeId = document.getElementById('productionRecipeSelect').value;
        const productionCost = this.getProductionCost({ materials });
        const unitCost = producedQuantity > 0 ? productionCost / producedQuantity : 0;

        const order = {
            finishedProductId,
            producedQuantity,
            materials,
            date,
            description,
            recipeId,
            productionCost,
            materialCostPerUnit: unitCost
        };

        const result = storage.addProductionOrder(order);
        if (!result) {
            this.showMessage('Ishlab chiqarish buyurtmasini saqlashda xato yuz berdi', 'error');
            return;
        }

        document.getElementById('productionForm').reset();
        document.getElementById('materialUsageRows').innerHTML = '';
        this.loadProduction();
        this.loadInventory();
        this.loadDashboard();

        this.showMessage('Ishlab chiqarish buyurtmasi muvaffaqiyatli qo\'shildi', 'success');
    }

    displayProductionOrders() {
        const orders = storage.getProductionOrders().sort((a, b) => new Date(b.date) - new Date(a.date));
        const tbody = document.getElementById('productionTableBody');
        tbody.innerHTML = '';

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Hali ishlab chiqarish buyurtmasi mavjud emas</td></tr>';
            return;
        }

        orders.forEach(order => {
            const finishedProduct = storage.getProductById(order.finishedProductId);
            const productName = finishedProduct ? finishedProduct.name : 'Noma\'lum';
            const cost = parseFloat(order.productionCost || this.getProductionCost(order));
            const materialSummary = order.materials.map(item => {
                const product = storage.getProductById(item.productId);
                return `${product ? product.name : 'Noma\'lum'} (${item.quantity})`;
            }).join(', ');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(order.date).toLocaleDateString('uz-UZ')}</td>
                <td>${productName}</td>
                <td>${order.producedQuantity}</td>
                <td>${materialSummary}</td>
                <td><strong>${this.formatNumber(cost)} so'm</strong></td>
                <td>
                    <button class="btn btn-danger" onclick="app.deleteProductionOrder('${order.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">O'chirish</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getProductionCost(order) {
        return order.materials.reduce((sum, item) => {
            const product = storage.getProductById(item.productId);
            return sum + ((product ? product.purchasePrice : 0) * item.quantity);
        }, 0);
    }

    deleteProductionOrder(orderId) {
        if (!storage.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Ishlab chiqarish buyurtmasini o\'chirish zahira miqdorlarini tiklaydi. Davom etilsinmi?')) {
            return;
        }

        const order = storage.getProductionOrderById(orderId);
        if (!order) {
            this.showMessage('Buyurtma topilmadi', 'error');
            return;
        }

        const products = storage.getProducts();
        const finishedProduct = products.find(p => p.id === order.finishedProductId);
        if (finishedProduct) {
            finishedProduct.stock = Math.max(0, finishedProduct.stock - order.producedQuantity);
        }
        order.materials.forEach(item => {
            const material = products.find(p => p.id === item.productId);
            if (material) {
                material.stock += item.quantity;
            }
        });
        storage.set('products', products);
        storage.deleteProductionOrder(orderId);

        this.loadProduction();
        this.loadInventory();
        this.loadDashboard();
        this.showMessage('Ishlab chiqarish buyurtmasi o\'chirildi va zahira tiklandi', 'success');
    }

    // TRANSACTIONS
    handleAddTransaction(e) {
        e.preventDefault();
        const date = document.getElementById('transDate').value;
        const clientId = document.getElementById('transClient').value;
        const supplierId = document.getElementById('transSupplier').value;
        const type = document.getElementById('transType').value;
        const category = document.getElementById('transCategory').value;
        const amount = parseFloat(document.getElementById('transAmount').value) || 0;
        const description = document.getElementById('transDescription').value;
        const currency = document.getElementById('transCurrency')?.value || '';

        if (!clientId) {
            alert('Iltimos, mijozni tanlang');
            return;
        }

        const submitLocal = async () => {
            // If server API is enabled, call it
            if (api.useServer) {
                try {
                    // Try to fetch rate if currency set and not base
                    let rate = null;
                    if (currency) {
                        try {
                            const base = localStorage.getItem('BASE_CURRENCY') || 'UZS';
                            const rateObj = await api.getExchangeRate(currency, base);
                            rate = rateObj?.rate || 1;
                        } catch (e) {
                            rate = 1;
                        }
                    } else {
                        rate = 1;
                    }

                    const payload = { date, clientId, supplierId, type, category, amount, description, currency: currency || undefined, rate };
                    await api.addTransaction(payload);
                } catch (err) {
                    console.error('Server transaction error:', err);
                    this.showMessage('Serverga yuborishda xato yuz berdi, offline saqlanmoqda', 'error');
                    storage.addTransaction({ date, clientId, supplierId, type, category, amount, description, currency, rate: rate || 1, amount_base: (amount * (rate || 1)), createdAt: new Date().toISOString() });
                }
            } else {
                // Offline/localstorage path: compute amount_base if possible
                let rate = 1;
                if (currency && api.useServer) {
                    try {
                        const base = localStorage.getItem('BASE_CURRENCY') || 'UZS';
                        const rateObj = await api.getExchangeRate(currency, base);
                        rate = rateObj?.rate || 1;
                    } catch (e) {
                        rate = 1;
                    }
                }
                storage.addTransaction({ id: Date.now().toString(), date, clientId, supplierId, type, category, amount, description, currency, rate, amount_base: amount * rate, createdAt: new Date().toISOString() });
            }

            // Reset form and update UI
            document.getElementById('transactionForm').reset();
            document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
            this.displayTransactions();
            this.loadDashboard();
            this.showMessage('Tranzaksiya muvaffaqiyatli qo\'shildi', 'success');
        };

        submitLocal();
    }

    displayTransactions() {
        const transactions = storage.getTransactions()
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Hali tranzaksiya mavjud emas</td></tr>';
            return;
        }

        transactions.forEach(trans => {
            const client = storage.getClientById(trans.clientId);
            const supplier = storage.getSupplierById(trans.supplierId);
            const row = document.createElement('tr');
            
            const typeLabel = trans.type === 'income' ? 'Daromad' : 'Chiqim';
            const typeColor = trans.type === 'income' ? '#10b981' : '#ef4444';
            const amountDisplay = trans.currency ? this.formatCurrency(trans.amount, trans.currency) : `${this.formatNumber(trans.amount)} so'm`;
            const baseDisplay = trans.amount_base ? `<div style="font-size:0.8rem;color:#666;">(${this.formatNumber(trans.amount_base)} so'm bazada)</div>` : '';
            
            row.innerHTML = `
                <td>${new Date(trans.date).toLocaleDateString('uz-UZ')}</td>
                <td>${client ? client.name : 'Noma\'lum'}</td>
                <td>${supplier ? supplier.name : '-'}</td>
                <td>${this.getCategoryLabel(trans.category)}</td>
                <td><span style="background: ${typeColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.8rem;">${typeLabel}</span></td>
                <td><strong>${amountDisplay}</strong>${baseDisplay}</td>
                <td>
                    <button class="btn btn-danger" onclick="app.deleteTransaction('${trans.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">O'chirish</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterTransactions() {
        const fromDate = document.getElementById('filterFromDate').value;
        const toDate = document.getElementById('filterToDate').value;
        const type = document.getElementById('filterType').value;
        const search = document.getElementById('filterSearch').value.trim().toLowerCase();

        let transactions = storage.getTransactions();

        if (fromDate) {
            transactions = transactions.filter(t => new Date(t.date) >= new Date(fromDate));
        }
        if (toDate) {
            transactions = transactions.filter(t => new Date(t.date) <= new Date(toDate));
        }
        if (type) {
            transactions = transactions.filter(t => t.type === type);
        }
        if (search) {
            transactions = transactions.filter(t => {
                const clientName = storage.getClientById(t.clientId)?.name || '';
                const supplierName = storage.getSupplierById(t.supplierId)?.name || '';
                const description = (t.description || '').toLowerCase();
                const currency = (t.currency || '').toLowerCase();
                return clientName.toLowerCase().includes(search)
                    || supplierName.toLowerCase().includes(search)
                    || description.includes(search)
                    || currency.includes(search);
            });
        }

        transactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Shartga mos tranzaksiya topilmadi</td></tr>';
            return;
        }

        transactions.forEach(trans => {
            const client = storage.getClientById(trans.clientId);
            const supplier = storage.getSupplierById(trans.supplierId);
            const row = document.createElement('tr');
            
            const typeLabel = trans.type === 'income' ? 'Daromad' : 'Chiqim';
            const typeColor = trans.type === 'income' ? '#10b981' : '#ef4444';
            const amountDisplay = trans.currency ? this.formatCurrency(trans.amount, trans.currency) : `${this.formatNumber(trans.amount)} so'm`;
            const baseDisplay = trans.amount_base ? `<div style="font-size:0.8rem;color:#666;">(${this.formatNumber(trans.amount_base)} so'm bazada)</div>` : '';
            
            row.innerHTML = `
                <td>${new Date(trans.date).toLocaleDateString('uz-UZ')}</td>
                <td>${client ? client.name : 'Noma\'lum'}</td>
                <td>${supplier ? supplier.name : '-'}</td>
                <td>${this.getCategoryLabel(trans.category)}</td>
                <td><span style="background: ${typeColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.8rem;">${typeLabel}</span></td>
                <td><strong>${amountDisplay}</strong>${baseDisplay}</td>
                <td>
                    <button class="btn btn-danger" onclick="app.deleteTransaction('${trans.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">O'chirish</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    deleteTransaction(transId) {
        if (!storage.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (confirm('Ushbu tranzaksiyani o\'chirishga ishonch hosil qildingizmi?')) {
            storage.deleteTransaction(transId);
            this.displayTransactions();
            this.loadDashboard();
            this.showMessage('Tranzaksiya muvaffaqiyatli o\'chirildi', 'success');
        }
    }

    // SALES
    loadSales() {
        const invoiceNumberField = document.getElementById('invoiceNumber');
        if (invoiceNumberField) {
            invoiceNumberField.value = `INV-${Date.now()}`;
        }

        const today = new Date().toISOString().split('T')[0];
        const invoiceDate = document.getElementById('invoiceDate');
        if (invoiceDate) {
            invoiceDate.value = today;
        }

        const settings = storage.getSettings();
        const defaultCurrency = settings.defaultCurrency || 'UZS';
        const invoiceCurrency = document.getElementById('invoiceCurrency');
        if (invoiceCurrency) {
            invoiceCurrency.value = defaultCurrency;
        }

        const rowContainer = document.getElementById('invoiceLineRows');
        if (rowContainer) {
            rowContainer.innerHTML = '';
        }
        this.addInvoiceLineRow();
        this.updateClientDropdowns();
        this.updateInvoiceDropdowns();
        this.displayInvoices();
        this.updateInvoiceTotalPreview();
    }

    updateInvoiceDropdowns() {
        const products = storage.getProducts();
        const selects = document.querySelectorAll('.invoice-product-select');

        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Tanlang --</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.unit}) - ${this.formatNumber(product.sellingPrice)} so'm`;
                select.appendChild(option);
            });
            select.value = currentValue;
        });
    }

    addInvoiceLineRow(item = {}) {
        const container = document.getElementById('invoiceLineRows');
        const row = document.createElement('div');
        row.className = 'material-row';
        row.innerHTML = `
            <div class="form-grid material-row-grid">
                <div>
                    <label>Mahsulot:</label>
                    <select class="invoice-product-select" required>
                        <option value="">-- Tanlang --</option>
                    </select>
                </div>
                <div>
                    <label>Soni:</label>
                    <input type="number" class="invoice-product-quantity" min="1" value="${item.quantity || 1}" required>
                </div>
                <div>
                    <label>Birim narx:</label>
                    <input type="number" class="invoice-product-price" min="0" value="${item.price || 0}" required>
                </div>
                <div class="material-row-actions">
                    <button type="button" class="btn btn-danger remove-material-row">O'chirish</button>
                </div>
            </div>
        `;
        container.appendChild(row);
        this.updateInvoiceDropdowns();

        const productSelect = row.querySelector('.invoice-product-select');
        const quantityInput = row.querySelector('.invoice-product-quantity');
        const priceInput = row.querySelector('.invoice-product-price');

        if (productSelect && item.productId) {
            productSelect.value = item.productId;
        }
        if (priceInput && item.price) {
            priceInput.value = item.price;
        }

        const updatePreview = () => this.updateInvoiceTotalPreview();
        productSelect.addEventListener('change', () => {
            const product = storage.getProductById(productSelect.value);
            if (product) {
                priceInput.value = product.sellingPrice || 0;
            }
            updatePreview();
        });
        quantityInput.addEventListener('input', updatePreview);
        priceInput.addEventListener('input', updatePreview);

        row.querySelector('.remove-material-row').addEventListener('click', () => {
            row.remove();
            this.updateInvoiceTotalPreview();
        });
    }

    updateInvoiceTotalPreview() {
        const rows = Array.from(document.querySelectorAll('#invoiceLineRows .material-row'));
        let total = 0;
        rows.forEach(row => {
            const qty = parseFloat(row.querySelector('.invoice-product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.invoice-product-price').value) || 0;
            total += qty * price;
        });
        const invoiceCurrency = document.getElementById('invoiceCurrency')?.value;
        document.getElementById('invoiceTotalPreview').textContent = invoiceCurrency ? this.formatCurrency(total, invoiceCurrency) : this.formatNumber(total) + ' so\'m';
    }

    handleAddInvoice(e) {
        e.preventDefault();

        const number = document.getElementById('invoiceNumber').value;
        const date = document.getElementById('invoiceDate').value;
        const clientId = document.getElementById('invoiceClient').value;
        const description = document.getElementById('invoiceDescription').value;
        const rows = Array.from(document.querySelectorAll('#invoiceLineRows .material-row'));

        if (!clientId) {
            this.showMessage('Iltimos, mijozni tanlang', 'error');
            return;
        }

        const lineItems = [];
        let total = 0;
        const products = storage.getProducts();

        for (const row of rows) {
            const productId = row.querySelector('.invoice-product-select').value;
            const quantity = parseFloat(row.querySelector('.invoice-product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.invoice-product-price').value) || 0;
            if (!productId || quantity <= 0 || price < 0) {
                this.showMessage('Iltimos, barcha mahsulot sarlavhalarini to\'ldiring', 'error');
                return;
            }
            const product = products.find(p => p.id === productId);
            if (!product) {
                this.showMessage('Tanlangan mahsulot topilmadi', 'error');
                return;
            }
            if (product.stock < quantity) {
                this.showMessage(`${product.name} uchun zahira yetarli emas. Hozirgi zahira: ${product.stock}`, 'error');
                return;
            }
            lineItems.push({ productId, quantity, price });
            total += quantity * price;
        }

        const invoiceCurrency = document.getElementById('invoiceCurrency')?.value || '';

        const invoice = {
            id: Date.now().toString(),
            number,
            date,
            clientId,
            description,
            lineItems,
            total,
            currency: invoiceCurrency || undefined,
            status: 'Yaratildi'
        };

        storage.addInvoice(invoice);

        // Prepare transaction payload including currency and base amount
        (async () => {
            let rate = 1;
            const base = localStorage.getItem('BASE_CURRENCY') || 'UZS';
            if (invoiceCurrency && invoiceCurrency !== base) {
                if (api.useServer) {
                    try {
                        const rateObj = await api.getExchangeRate(invoiceCurrency, base);
                        rate = rateObj?.rate || 1;
                    } catch (e) {
                        rate = 1;
                    }
                } else {
                    // try local storage rates
                    const rates = storage.getExchangeRates();
                    const found = (rates || []).slice().reverse().find(r => (r.from_currency === invoiceCurrency || r.from === invoiceCurrency) && (r.to_currency === base || r.to === base));
                    if (found) rate = found.rate;
                }
            }

            const transPayload = {
                date,
                clientId,
                supplierId: '',
                type: 'income',
                category: 'sales',
                amount: total,
                currency: invoiceCurrency || undefined,
                rate,
                amount_base: total * (rate || 1),
                description: `Invoice ${number}: ${description}`
            };

            if (api.useServer) {
                try {
                    await api.addTransaction(transPayload);
                } catch (err) {
                    console.warn('Server transaction failed, saving local copy', err);
                    storage.addTransaction(Object.assign({ id: Date.now().toString(), createdAt: new Date().toISOString() }, transPayload));
                }
            } else {
                storage.addTransaction(Object.assign({ id: Date.now().toString(), createdAt: new Date().toISOString() }, transPayload));
            }
        })();

        const productsToUpdate = storage.getProducts();
        lineItems.forEach(item => {
            const product = productsToUpdate.find(p => p.id === item.productId);
            if (product) {
                product.stock = Math.max(0, product.stock - item.quantity);
            }
        });
        storage.set('products', productsToUpdate);

        document.getElementById('invoiceForm').reset();
        document.getElementById('invoiceLineRows').innerHTML = '';
        this.addInvoiceLineRow();
        this.loadDashboard();
        this.loadInventory();
        this.displayInvoices();
        this.updateClientDropdowns();
        this.showMessage('Invoice muvaffaqiyatli yaratildi', 'success');
    }

    displayInvoices() {
        const invoices = storage.getInvoices().sort((a, b) => new Date(b.date) - new Date(a.date));
        const tbody = document.getElementById('invoiceTableBody');
        tbody.innerHTML = '';

        if (invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Hali invoice mavjud emas</td></tr>';
            return;
        }

        invoices.forEach(invoice => {
            const client = storage.getClientById(invoice.clientId);
            const totalDisplay = invoice.currency ? this.formatCurrency(invoice.total, invoice.currency) : `${this.formatNumber(invoice.total)} so'm`;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${invoice.number}</td>
                <td>${new Date(invoice.date).toLocaleDateString('uz-UZ')}</td>
                <td>${client ? client.name : 'Noma\'lum'}</td>
                <td><strong>${totalDisplay}</strong></td>
                <td>${invoice.status}</td>
                <td>
                    <button class="btn btn-secondary" onclick="app.exportInvoice('${invoice.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Chop etish</button>
                    <button class="btn btn-danger" onclick="app.deleteInvoice('${invoice.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">O'chirish</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    exportInvoice(invoiceId) {
        const invoice = storage.getInvoiceById(invoiceId);
        if (!invoice) {
            this.showMessage('Invoice topilmadi', 'error');
            return;
        }

        const client = storage.getClientById(invoice.clientId);
        const linesHtml = invoice.lineItems.map(item => {
            const product = storage.getProductById(item.productId);
            return `<tr><td>${product ? product.name : 'Noma\'lum'}</td><td>${item.quantity}</td><td>${this.formatNumber(item.price)} so'm</td><td>${this.formatNumber(item.quantity * item.price)} so'm</td></tr>`;
        }).join('');

        const totalDisplay = invoice.currency ? this.formatCurrency(invoice.total, invoice.currency) : `${this.formatNumber(invoice.total)} so'm`;
        const htmlContent = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${invoice.number}</title>
<style>body{font-family:Arial,sans-serif;margin:2rem;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:0.75rem;text-align:left;}th{background:#0f766e;color:#fff;}</style>
</head>
<body>
<h1>Invoice ${invoice.number}</h1>
<p><strong>Sana:</strong> ${new Date(invoice.date).toLocaleDateString('uz-UZ')}</p>
<p><strong>Mijoz:</strong> ${client ? client.name : 'Noma\'lum'}</p>
<p><strong>Izoh:</strong> ${invoice.description}</p>
<table><thead><tr><th>Mahsulot</th><th>Soni</th><th>Birim narx</th><th>Jami</th></tr></thead><tbody>${linesHtml}</tbody></table>
<p><strong>Jami summa:</strong> ${totalDisplay}</p>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoice.number}.html`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showMessage('Invoice eksport qilindi', 'success');
    }

    deleteInvoice(invoiceId) {
        if (!storage.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Ushbu invoice o\'chirilsinmi?')) {
            return;
        }
        storage.deleteInvoice(invoiceId);
        this.displayInvoices();
        this.showMessage('Invoice o\'chirildi', 'success');
    }

    clearTransactionFilters() {
        document.getElementById('filterFromDate').value = '';
        document.getElementById('filterToDate').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterSearch').value = '';
        this.filterTransactions();
    }

    // REPORTS
    handlePeriodChange(e) {
        const customDiv = document.getElementById('customPeriod');
        if (e.target.value === 'custom') {
            customDiv.style.display = 'block';
        } else {
            customDiv.style.display = 'none';
        }
    }

    generateReport() {
        const period = document.querySelector('input[name="period"]:checked').value;
        let fromDate, toDate;

        const today = new Date();

        if (period === 'month') {
            fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
            toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (period === 'quarter') {
            const quarter = Math.floor(today.getMonth() / 3);
            fromDate = new Date(today.getFullYear(), quarter * 3, 1);
            toDate = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        } else if (period === 'year') {
            fromDate = new Date(today.getFullYear(), 0, 1);
            toDate = new Date(today.getFullYear(), 11, 31);
        } else {
            fromDate = new Date(document.getElementById('reportFromDate').value);
            toDate = new Date(document.getElementById('reportToDate').value);
        }

        const transactions = storage.getTransactionsByPeriod(
            fromDate.toISOString().split('T')[0],
            toDate.toISOString().split('T')[0]
        );

        const settings = storage.getSettings();

        // Hisoblashlar
        const incomeTransactions = transactions.filter(t => t.type === 'income');
        const expenseTransactions = transactions.filter(t => t.type === 'expense');

        const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const totalExpense = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const grossProfit = totalIncome - totalExpense;
        const taxIncome = totalIncome * (settings.taxIncome / 100);
        const netProfit = grossProfit - taxIncome;

        // Income kategoriya bo'yicha
        const incomeByCategory = {};
        incomeTransactions.forEach(t => {
            const cat = t.category;
            incomeByCategory[cat] = (incomeByCategory[cat] || 0) + parseFloat(t.amount || 0);
        });

        // Expense kategoriya bo'yicha
        const expenseByCategory = {};
        expenseTransactions.forEach(t => {
            const cat = t.category;
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + parseFloat(t.amount || 0);
        });

        // HTML hisobot
        let html = `
            <div class="report-summary">
                <h4>📊 DAROMAD VA CHIQIM HISOBOTI</h4>
                <p><strong>Davr:</strong> ${fromDate.toLocaleDateString('uz-UZ')} - ${toDate.toLocaleDateString('uz-UZ')}</p>
                <p><strong>Tayyorlandi:</strong> ${new Date().toLocaleDateString('uz-UZ')} ${new Date().toLocaleTimeString('uz-UZ')}</p>
            </div>

            <h4>ASOSIY KOEFFITSIENTLAR</h4>
            <table class="report-table">
                <tr>
                    <td>Jami Daromad:</td>
                    <td><strong>${this.formatNumber(totalIncome)} so'm</strong></td>
                </tr>
                <tr>
                    <td>Jami Chiqim:</td>
                    <td><strong>${this.formatNumber(totalExpense)} so'm</strong></td>
                </tr>
                <tr>
                    <td>Jami Foyda:</td>
                    <td><strong>${this.formatNumber(grossProfit)} so'm</strong></td>
                </tr>
                <tr style="background: #fff3cd;">
                    <td><strong>Daromad Soliq (${settings.taxIncome}%):</strong></td>
                    <td><strong style="color: #ff6b6b;">${this.formatNumber(taxIncome)} so'm</strong></td>
                </tr>
                <tr style="background: #d1ecf1;">
                    <td><strong>Toza Foyda:</strong></td>
                    <td><strong style="color: #0c5460;">${this.formatNumber(netProfit)} so'm</strong></td>
                </tr>
            </table>

            <h4>DAROMAD KATEGORIYA BO'YICHA</h4>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Kategoriya</th>
                        <th>Summa</th>
                        <th>Foiz</th>
                    </tr>
                </thead>
        `;

        Object.entries(incomeByCategory).forEach(([cat, amount]) => {
            const percentage = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(2) : 0;
            html += `
                <tr>
                    <td>${this.getCategoryLabel(cat)}</td>
                    <td>${this.formatNumber(amount)} so'm</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });

        html += `
            </table>

            <h4>CHIQIM KATEGORIYA BO'YICHA</h4>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Kategoriya</th>
                        <th>Summa</th>
                        <th>Foiz</th>
                    </tr>
                </thead>
        `;

        Object.entries(expenseByCategory).forEach(([cat, amount]) => {
            const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(2) : 0;
            html += `
                <tr>
                    <td>${this.getCategoryLabel(cat)}</td>
                    <td>${this.formatNumber(amount)} so'm</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });

        const productionOrders = storage.getProductionOrdersByPeriod(
            fromDate.toISOString().split('T')[0],
            toDate.toISOString().split('T')[0]
        );
        const totalProductionCost = productionOrders.reduce((sum, order) => sum + parseFloat(order.productionCost || 0), 0);
        const totalAfterProduction = netProfit - totalProductionCost;

        html += `
            </table>

            <h4>ISHLAB CHIQARISH HISOBOTI</h4>
            <table class="report-table">
                <tr>
                    <td>Buyurtmalar soni:</td>
                    <td><strong>${productionOrders.length}</strong></td>
                </tr>
                <tr>
                    <td>Jami ishlab chiqarish xaraji:</td>
                    <td><strong>${this.formatNumber(totalProductionCost)} so'm</strong></td>
                </tr>
                <tr style="background: #d1ecf1;">
                    <td><strong>Toza foyda (ishlab chiqarish xarajatlari hisobga olinganda):</strong></td>
                    <td><strong style="color: #0c5460;">${this.formatNumber(totalAfterProduction)} so'm</strong></td>
                </tr>
            </table>

            <table class="report-table">
                <thead>
                    <tr>
                        <th>Sana</th>
                        <th>Mahsulot</th>
                        <th>Soni</th>
                        <th>Xarajat</th>
                    </tr>
                </thead>
        `;

        productionOrders.forEach(order => {
            const product = storage.getProductById(order.finishedProductId);
            html += `
                <tr>
                    <td>${new Date(order.date).toLocaleDateString('uz-UZ')}</td>
                    <td>${product ? product.name : 'Noma\'lum'}</td>
                    <td>${order.producedQuantity}</td>
                    <td>${this.formatNumber(order.productionCost || 0)} so'm</td>
                </tr>
            `;
        });

        html += `
            </table>

            <h4>SOLIQ VA IJRO HUJJATLARI</h4>
            <div class="report-summary">
                <p><strong>Daromad soliq stavkasi:</strong> ${settings.taxIncome}%</p>
                <p><strong>Qo'shilgan qiymat soliq:</strong> ${settings.taxVAT}%</p>
                <p><strong>Madaniyat tori:</strong> ${settings.taxCulture}%</p>
                <p><strong>Ijro havfsizlik vadaslari:</strong> Har 15-kunida deklaratsiya topshirish kerak</p>
            </div>
        `;

        document.getElementById('reportContent').innerHTML = html;
    }

    exportReport() {
        const reportContent = document.getElementById('reportContent').innerHTML;
        
        if (!reportContent) {
            alert('Iltimos, avval hisobot yarating');
            return;
        }

        const period = document.querySelector('input[name="period"]:checked').value;
        const fileName = `Hisobot_${period}_${new Date().toISOString().split('T')[0]}.html`;

        const htmlContent = `
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buxgalteriya Hisoboti</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; }
        h1, h2, h3, h4 { color: #0f766e; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th, td { border: 1px solid #ddd; padding: 0.75rem; text-align: left; }
        th { background: #0f766e; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .report-summary { background: #f0f9ff; padding: 1rem; border-left: 4px solid #0f766e; margin: 1rem 0; }
    </style>
</head>
<body>
    <h1>📊 Buxgalteriya Hisoboti</h1>
    ${reportContent}
    <footer style="margin-top: 3rem; text-align: center; color: #999; border-top: 1px solid #ddd; padding-top: 1rem;">
        <p>O'zbekiston Respublikasi Soliq Siyosatiga muvofiq tayyorlandi</p>
        <p>Tayyorlandi: ${new Date().toLocaleString('uz-UZ')}</p>
    </footer>
</body>
</html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showMessage('Hisobot HTML formatida chiqarildi', 'success');
    }

    // SETTINGS
    loadSettings() {
        const settings = storage.getSettings();
        const currencies = storage.getCurrencies();
        const defaultCurrencySelect = document.getElementById('defaultCurrency');

        document.getElementById('taxCulture').value = settings.taxCulture;
        document.getElementById('taxVAT').value = settings.taxVAT;
        document.getElementById('taxIncome').value = settings.taxIncome;
        document.getElementById('taxSSV').value = settings.taxSSV;
        document.getElementById('autoCalculateTax').checked = settings.autoCalculateTax;
        document.getElementById('notifications').checked = settings.notifications;
        document.getElementById('showCurrencySymbol').checked = settings.showCurrencySymbol !== false;

        if (defaultCurrencySelect) {
            defaultCurrencySelect.innerHTML = '<option value="">-- Tanlang --</option>';
            currencies.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.code} — ${c.name}`;
                defaultCurrencySelect.appendChild(opt);
            });
            defaultCurrencySelect.value = settings.defaultCurrency || (currencies[0] && currencies[0].code) || '';
        }
    }

    handleSaveSettings(e) {
        e.preventDefault();

        const settings = {
            taxCulture: parseFloat(document.getElementById('taxCulture').value),
            taxVAT: parseFloat(document.getElementById('taxVAT').value),
            taxIncome: parseFloat(document.getElementById('taxIncome').value),
            taxSSV: parseFloat(document.getElementById('taxSSV').value),
            autoCalculateTax: document.getElementById('autoCalculateTax').checked,
            notifications: document.getElementById('notifications').checked,
            defaultCurrency: document.getElementById('defaultCurrency')?.value || 'UZS',
            showCurrencySymbol: document.getElementById('showCurrencySymbol')?.checked
        };

        storage.updateSettings(settings);
        this.loadCurrencies();
        if (this.currentTab === 'sales') {
            this.updateInvoiceTotalPreview();
        }
        this.showMessage('Sozlamalar muvaffaqiyatli saqlandi', 'success');
    }

    // BACKUP & RESTORE
    backupData() {
        const data = storage.exportData();
        const fileName = `Backup_${new Date().toISOString().split('T')[0]}.json`;
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showMessage('Ma\'lumotlar zaxiraga olingan faylga saqlandi', 'success');
    }

    restoreData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonString = event.target.result;
                if (storage.importData(jsonString)) {
                    alert('Ma\'lumotlar muvaffaqiyatli qaytarildi. Sahifa yangilanadi...');
                    window.location.reload();
                } else {
                    this.showMessage('Faylni o\'qishda xato', 'error');
                }
            } catch (error) {
                this.showMessage('Faylni qayta ishlashda xato: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    clearAllData() {
        storage.clear();
        this.showMessage('Barcha ma\'lumotlar o\'chirildi', 'success');
        setTimeout(() => window.location.reload(), 1500);
    }

    // INVENTORY METHODS
    loadInventory() {
        this.updateInventoryStats();
        this.displayProducts();
        this.updateProductDropdowns();
    }

    updateInventoryStats() {
        const products = storage.getProducts();
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);
        const lowStockItems = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
        const outOfStockItems = products.filter(p => p.stock === 0).length;

        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('totalInventoryValue').textContent = this.formatNumber(totalValue);
        document.getElementById('lowStockItems').textContent = lowStockItems;
        document.getElementById('outOfStockItems').textContent = outOfStockItems;
    }

    showAddProductModal() {
        document.getElementById('addProductModal').style.display = 'block';
        document.getElementById('productForm').reset();
    }

    handleAddProduct(e) {
        e.preventDefault();

        const defaultCurrency = storage.getSettings().defaultCurrency || 'UZS';
        const selectedCurrency = document.getElementById('productCurrency')?.value;
        const product = {
            id: Date.now().toString(),
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            unit: document.getElementById('productUnit').value,
            minStock: parseInt(document.getElementById('minStock').value) || 10,
            purchasePrice: parseFloat(document.getElementById('purchasePrice').value) || 0,
            sellingPrice: parseFloat(document.getElementById('sellingPrice').value) || 0,
            default_currency: selectedCurrency || defaultCurrency,
            stock: 0
        };

        storage.addProduct(product);
        document.getElementById('addProductModal').style.display = 'none';
        this.loadInventory();
        this.showMessage('Mahsulot muvaffaqiyatli qo\'shildi', 'success');
    }

    showStockMovementModal(type) {
        const modal = document.getElementById('stockMovementModal');
        const title = document.getElementById('stockMovementTitle');
        const submitBtn = document.getElementById('movementSubmitBtn');
        const quantityLabel = document.querySelector('label[for="movementQuantity"]');

        if (type === 'in') {
            title.textContent = 'Ombor Kirimi';
            submitBtn.textContent = 'Kirim qilish';
            quantityLabel.textContent = 'Miqdor:';
        } else if (type === 'out') {
            title.textContent = 'Ombor Chiqimi';
            submitBtn.textContent = 'Chiqim qilish';
            quantityLabel.textContent = 'Miqdor:';
        } else {
            title.textContent = 'Zahira Tuzatish';
            submitBtn.textContent = 'Tuzatish';
            quantityLabel.textContent = 'Yangi zahira miqdori:';
        }

        this.currentMovementType = type;
        modal.style.display = 'block';
        document.getElementById('stockMovementForm').reset();
        document.getElementById('movementDate').value = new Date().toISOString().split('T')[0];
        this.updateProductDropdowns();
    }

    handleStockMovement(e) {
        e.preventDefault();

        const productId = document.getElementById('movementProduct').value;
        const quantity = parseInt(document.getElementById('movementQuantity').value);
        const date = document.getElementById('movementDate').value;
        const description = document.getElementById('movementDescription').value;

        if (!productId || isNaN(quantity)) {
            this.showMessage('Mahsulot va miqdorni to\'g\'ri kiriting', 'error');
            return;
        }

        const movement = {
            id: Date.now().toString(),
            productId,
            type: this.currentMovementType,
            quantity: this.currentMovementType === 'adjust' ? 0 : (this.currentMovementType === 'out' ? -quantity : quantity),
            newStock: this.currentMovementType === 'adjust' ? quantity : null,
            date,
            description
        };

        storage.addInventoryMovement(movement);
        document.getElementById('stockMovementModal').style.display = 'none';
        this.loadInventory();
        this.showMessage('Harakat muvaffaqiyatli amalga oshirildi', 'success');
    }

    displayProducts() {
        const products = storage.getProducts();
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = '';

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Hali mahsulot qo\'shilmagan</td></tr>';
            return;
        }

        products.forEach(product => {
            const totalValue = product.stock * product.purchasePrice;
            const rowClass = product.stock === 0 ? 'out-of-stock' : (product.stock <= product.minStock ? 'low-stock' : '');

            const row = document.createElement('tr');
            row.className = rowClass;
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${this.getCategoryLabel(product.category)}</td>
                <td>${product.unit}</td>
                <td><strong>${product.stock}</strong></td>
                <td>${product.minStock}</td>
                <td>${this.formatNumber(product.purchasePrice)} so'm</td>
                <td>${this.formatNumber(product.sellingPrice)} so'm</td>
                <td><strong>${this.formatNumber(totalValue)} so'm</strong></td>
                <td>
                    <button class="action-btn edit" onclick="app.editProduct('${product.id}')">Tahrirlash</button>
                    <button class="action-btn delete" onclick="app.deleteProduct('${product.id}')">O'chirish</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterProducts() {
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        const stockFilter = document.getElementById('stockFilter').value;

        let products = storage.getProducts();

        if (searchTerm) {
            products = products.filter(p => p.name.toLowerCase().includes(searchTerm));
        }

        if (categoryFilter) {
            products = products.filter(p => p.category === categoryFilter);
        }

        if (stockFilter) {
            if (stockFilter === 'low') {
                products = products.filter(p => p.stock <= p.minStock && p.stock > 0);
            } else if (stockFilter === 'out') {
                products = products.filter(p => p.stock === 0);
            } else if (stockFilter === 'normal') {
                products = products.filter(p => p.stock > p.minStock);
            }
        }

        // Update table with filtered products
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = '';

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Shartga mos mahsulot topilmadi</td></tr>';
            return;
        }

        products.forEach(product => {
            const totalValue = product.stock * product.purchasePrice;
            const rowClass = product.stock === 0 ? 'out-of-stock' : (product.stock <= product.minStock ? 'low-stock' : '');

            const row = document.createElement('tr');
            row.className = rowClass;
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${this.getCategoryLabel(product.category)}</td>
                <td>${product.unit}</td>
                <td><strong>${product.stock}</strong></td>
                <td>${product.minStock}</td>
                <td>${this.formatNumber(product.purchasePrice)} so'm</td>
                <td>${this.formatNumber(product.sellingPrice)} so'm</td>
                <td><strong>${this.formatNumber(totalValue)} so'm</strong></td>
                <td>
                    <button class="action-btn edit" onclick="app.editProduct('${product.id}')">Tahrirlash</button>
                    <button class="action-btn delete" onclick="app.deleteProduct('${product.id}')">O'chirish</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateProductDropdowns() {
        const products = storage.getProducts();
        const selects = document.querySelectorAll('#movementProduct');

        selects.forEach(select => {
            select.innerHTML = '<option value="">-- Tanlang --</option>';
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} (${product.stock} ${product.unit})`;
                select.appendChild(option);
            });
        });
    }

    editProduct(productId) {
        const product = storage.getProductById(productId);
        if (!product) return;

        // For now, just show a message. Could implement full edit modal later
        this.showMessage('Tahrirlash funksiyasi tez orada qo\'shiladi', 'warning');
    }

    deleteProduct(productId) {
        if (!storage.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Mahsulotni o\'chirishni xohlaysizmi? Bu harakatni bekor qilib bo\'lmaydi.')) return;

        storage.deleteProduct(productId);
        this.loadInventory();
        this.showMessage('Mahsulot o\'chirildi', 'success');
    }

    // UTILITIES
    showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        const className = type === 'success' ? 'success-message' : type === 'warning' ? 'warning-message' : 'error-message';
        messageDiv.className = className;
        messageDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    formatNumber(number) {
        return new Intl.NumberFormat('uz-UZ', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    }

    getCategoryLabel(category) {
        const transactionLabels = {
            'sales': '📦 Sotuvlar',
            'services': '🔧 Xizmatlar',
            'materials': '📋 Materiallar xaridi',
            'salaries': '👥 Ishchilarga ish haqi',
            'rent': '🏢 Ijaraga to\'lov',
            'utilities': '💡 Kommunal xarajlar',
            'transport': '🚚 Transport xarajlari',
            'other': '📝 Boshqa'
        };

        const productLabels = {
            'electronics': '📱 Elektronika',
            'clothing': '👕 Kiyim',
            'food': '🍎 Oziq-ovqat',
            'furniture': '🪑 Mebel',
            'materials': '📋 Materiallar',
            'other': '📦 Boshqa'
        };

        return transactionLabels[category] || productLabels[category] || category;
    }

    getProductTypeLabel(productType) {
        const labels = {
            'materials': '📋 Materiallar',
            'equipment': '🔧 Uskunalar',
            'services': '🔨 Xizmatlar',
            'transport': '🚚 Transport',
            'other': '📦 Boshqa'
        };
        return labels[productType] || productType || 'Belgilanmagan';
    }
}

// Ilova ishga tushinadi
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AccountingApp();
});
