// Main Application Logic
class AccountingApp {
    constructor() {
        this.currentTab = 'dashboard';
        this.init();
    }

    async init() {
        this.currentUser = null;

        if (!api.isAuthenticated()) {
            this.setupLoginPage();
            return;
        }

        try {
            const { user } = await api.getMe();
            this.currentUser = user;
        } catch (err) {
            // Token expired/invalid - back to login
            api.logout();
            this.setupLoginPage();
            return;
        }

        document.getElementById('loginModal').classList.remove('active');
        this.showMainApp();
        this.setupEventListeners();
        this.updateUserDisplay();
        await this.loadCurrencies();
        await this.loadDashboard();
        await this.updateClientDropdowns();
        await this.updateSupplierDropdowns();
    }

    // Role-based UI checks - based on the JWT session restored via /api/auth/me
    canAccess(requiredRole) {
        if (!this.currentUser) return false;
        const roleHierarchy = { user: 1, manager: 2, admin: 3 };
        return (roleHierarchy[this.currentUser.role] || 0) >= (roleHierarchy[requiredRole] || 0);
    }

    canDelete() {
        return !!this.currentUser && ['manager', 'admin'].includes(this.currentUser.role);
    }

    canEditSettings() {
        return !!this.currentUser && this.currentUser.role === 'admin';
    }

    async loadCurrencies() {
        let list = [];
        try {
            const res = await api.getCurrencies();
            if (Array.isArray(res)) list = res;
        } catch (e) {
            console.warn('Could not load currencies from server', e);
        }

        if (list.length === 0) {
            list = [
                { code: 'UZS', name: 'Uzbekistani Som', symbol: "so'" },
                { code: 'USD', name: 'US Dollar', symbol: '$' },
                { code: 'EUR', name: 'Euro', symbol: '€' }
            ];
        }
        this.currencies = list;

        try {
            this.settings = await api.getSettings();
        } catch (e) {
            console.warn('Could not load settings from server', e);
            this.settings = this.settings || {};
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
        const defaultCurrency = this.settings.defaultCurrency || (list[0] && list[0].code);

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
        const currency = (this.currencies || []).find(c => c.code === code);
        return currency?.symbol || code;
    }

    formatCurrency(amount, code) {
        const showSymbol = (this.settings && this.settings.showCurrencySymbol) !== false;
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
        const base = (this.settings && this.settings.defaultCurrency) || 'UZS';
        if (!currency || currency === base) {
            previewEl.textContent = `${this.formatNumber(amount)} ${currency || ''}`;
            return;
        }

        try {
            const rateObj = await api.getExchangeRate(currency, base);
            const rate = rateObj.rate || 1;
            const converted = amount * rate;
            previewEl.textContent = `${this.formatNumber(converted)} so'm (kurs ${rate})`;
        } catch (e) {
            previewEl.textContent = '—';
        }
    }

    // Admin: load and render currencies & rates
    async loadAdminLists() {
        const list = this.currencies || [];
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

        // Render exchange rate history
        if (ratesContainer) {
            const rates = await api.getExchangeRates().catch(() => []);
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
            await api.addCurrency(payload);
            this.showMessage('Currency saved', 'success');
            await this.loadCurrencies();
            await this.loadAdminLists();
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
        try {
            await api.addExchangeRate({ from_currency: from, to_currency: to, rate, date, source: 'admin' });
            this.showMessage('Exchange rate added', 'success');
            await this.loadAdminLists();
            document.getElementById('exchangeRateForm').reset();
        } catch (err) {
            console.error(err);
            this.showMessage('Could not add rate', 'error');
        }
    }

    setupLoginPage() {
        const loginForm = document.getElementById('loginForm');
        const bootstrapForm = document.getElementById('bootstrapForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (bootstrapForm) {
            bootstrapForm.addEventListener('submit', (e) => this.handleBootstrapRegister(e));
        }
        document.getElementById('showBootstrapLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            bootstrapForm.style.display = '';
        });
        document.getElementById('showLoginLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            bootstrapForm.style.display = 'none';
            loginForm.style.display = '';
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const result = await api.login(username, password);
            this.currentUser = result.user;
        } catch (err) {
            alert('Noto\'g\'ri foydalanuvchi nomi yoki parol!');
            return;
        }

        document.getElementById('loginModal').classList.remove('active');
        this.showMainApp();
        this.setupEventListeners();
        this.updateUserDisplay();
        await this.loadCurrencies();
        await this.loadDashboard();
        await this.updateClientDropdowns();
        await this.updateSupplierDropdowns();
    }

    async handleBootstrapRegister(e) {
        e.preventDefault();
        const name = document.getElementById('bootstrapName').value.trim();
        const username = document.getElementById('bootstrapUsername').value.trim();
        const password = document.getElementById('bootstrapPassword').value;

        try {
            await api.register(username, password, name);
        } catch (err) {
            alert(err.body?.error || 'Administrator yaratib bo\'lmadi (balki foydalanuvchilar allaqachon mavjud)');
            return;
        }

        try {
            const result = await api.login(username, password);
            this.currentUser = result.user;
        } catch (err) {
            alert('Administrator yaratildi, lekin avtomatik kirish muvaffaqiyatsiz. Iltimos, qo\'lda kiring.');
            document.getElementById('bootstrapForm').style.display = 'none';
            document.getElementById('loginForm').style.display = '';
            return;
        }

        document.getElementById('loginModal').classList.remove('active');
        this.showMainApp();
        this.setupEventListeners();
        this.updateUserDisplay();
        await this.loadCurrencies();
        await this.loadDashboard();
        await this.updateClientDropdowns();
        await this.updateSupplierDropdowns();
    }

    showMainApp() {
        document.getElementById('mainApp').style.display = '';
    }

    updateUserDisplay() {
        if (this.currentUser) {
            const userDisplay = document.getElementById('userDisplay');
            const logoutBtn = document.getElementById('logoutBtn');
            if (userDisplay) {
                userDisplay.innerHTML = `👤 ${this.currentUser.name} (${this.currentUser.role})`;
            }
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
        }
    }

    handleLogout() {
        if (confirm('Tizimdan chiqishni xohlaysizmi?')) {
            api.logout();
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

        // Excel import/export
        this.setupExcelToolbar('products', this.exportProductsToExcel, this.importProductsFromExcel);
        this.setupExcelToolbar('clients', this.exportClientsToExcel, this.importClientsFromExcel);
        this.setupExcelToolbar('suppliers', this.exportSuppliersToExcel, this.importSuppliersFromExcel);
        this.setupExcelToolbar('transactions', this.exportTransactionsToExcel, this.importTransactionsFromExcel);
        this.setupExcelToolbar('employees', this.exportEmployeesToExcel, this.importEmployeesFromExcel);
        document.getElementById('invoicesExportBtn')?.addEventListener('click', () => this.exportInvoicesToExcel());

        // Documents (Hujjatlar)
        document.getElementById('companyInfoForm')?.addEventListener('submit', (e) => this.handleSaveCompanyInfo(e));
        document.getElementById('documentType')?.addEventListener('change', () => this.renderDocumentDynamicFields());
        document.getElementById('documentForm')?.addEventListener('submit', (e) => this.handleGenerateDocument(e));
        document.getElementById('printDocumentBtn')?.addEventListener('click', () => window.print());
        document.getElementById('saveDocumentBtn')?.addEventListener('click', () => this.handleSaveDocument());
    }

    // entityPrefix mos keladi HTML id'lariga: <entityPrefix>TemplateBtn/ExportBtn/ImportBtn/ImportInput
    setupExcelToolbar(entityPrefix, exportFn, importFn) {
        const templateBtn = document.getElementById(`${entityPrefix}TemplateBtn`);
        const exportBtn = document.getElementById(`${entityPrefix}ExportBtn`);
        const importBtn = document.getElementById(`${entityPrefix}ImportBtn`);
        const importInput = document.getElementById(`${entityPrefix}ImportInput`);

        templateBtn?.addEventListener('click', () => excelManager.downloadTemplate(entityPrefix));
        exportBtn?.addEventListener('click', () => exportFn.call(this));
        importBtn?.addEventListener('click', () => importInput?.click());
        importInput?.addEventListener('change', (e) => importFn.call(this, e));
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
        } else if (tabName === 'documents') {
            this.loadDocuments();
        }
    }

    // DOCUMENTS (Hujjatlar)
    async loadDocuments() {
        await this.loadCompanyInfoForm();
        await this.updateDocumentClientDropdown();
        await this.updateDocumentInvoiceDropdown();
        const dateField = document.getElementById('documentDate');
        if (dateField && !dateField.value) {
            dateField.value = new Date().toISOString().split('T')[0];
        }
        this.renderDocumentDynamicFields();
        await this.displaySavedDocuments();
        document.getElementById('documentPreviewSection').style.display = 'none';
    }

    async loadCompanyInfoForm() {
        const info = await api.getCompanyInfo();
        document.getElementById('companyLegalForm').value = info.companyLegalForm || 'MChJ';
        document.getElementById('companyName').value = info.companyName || '';
        document.getElementById('companyStir').value = info.companyStir || '';
        document.getElementById('companyOked').value = info.companyOked || '';
        document.getElementById('companyAddress').value = info.companyAddress || '';
        document.getElementById('companyPhone').value = info.companyPhone || '';
        document.getElementById('companyBankName').value = info.companyBankName || '';
        document.getElementById('companyBankAccount').value = info.companyBankAccount || '';
        document.getElementById('companyMfo').value = info.companyMfo || '';
        document.getElementById('companyDirector').value = info.companyDirector || '';
        document.getElementById('companyAccountant').value = info.companyAccountant || '';
    }

    async handleSaveCompanyInfo(e) {
        e.preventDefault();
        const info = {
            companyLegalForm: document.getElementById('companyLegalForm').value,
            companyName: document.getElementById('companyName').value.trim(),
            companyStir: document.getElementById('companyStir').value.trim(),
            companyOked: document.getElementById('companyOked').value.trim(),
            companyAddress: document.getElementById('companyAddress').value.trim(),
            companyPhone: document.getElementById('companyPhone').value.trim(),
            companyBankName: document.getElementById('companyBankName').value.trim(),
            companyBankAccount: document.getElementById('companyBankAccount').value.trim(),
            companyMfo: document.getElementById('companyMfo').value.trim(),
            companyDirector: document.getElementById('companyDirector').value.trim(),
            companyAccountant: document.getElementById('companyAccountant').value.trim()
        };
        try {
            await api.updateCompanyInfo(info);
        } catch (err) {
            this.showMessage('Saqlashda xato: ' + err.message, 'error');
            return;
        }
        this.showMessage('Korxona rekvizitlari saqlandi', 'success');
    }

    async updateDocumentClientDropdown() {
        const select = document.getElementById('documentClient');
        if (!select) return;
        const clients = await api.getClients();
        const cur = select.value;
        select.innerHTML = '<option value="">-- Tanlang --</option>';
        clients.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });
        select.value = cur;
    }

    async updateDocumentInvoiceDropdown() {
        const select = document.getElementById('documentInvoice');
        if (!select) return;
        const [invoices, clients] = await Promise.all([api.getInvoices(), api.getClients()]);
        const clientMap = new Map(clients.map(c => [c.id, c]));
        const cur = select.value;
        select.innerHTML = '<option value="">-- Tanlang --</option>';
        invoices.forEach(inv => {
            const client = clientMap.get(inv.clientId);
            const opt = document.createElement('option');
            opt.value = inv.id;
            opt.textContent = `${inv.number} — ${client ? client.name : ''} (${this.formatNumber(inv.total)} ${inv.currency || "so'm"})`;
            select.appendChild(opt);
        });
        select.value = cur;
    }

    renderDocumentDynamicFields() {
        const type = document.getElementById('documentType').value;
        const container = document.getElementById('documentDynamicFields');
        const invoiceFieldWrap = document.getElementById('documentInvoiceField');
        const clientFieldWrap = document.getElementById('documentClientField');
        container.innerHTML = '';

        if (!type) {
            invoiceFieldWrap.style.display = 'none';
            clientFieldWrap.style.display = 'none';
            return;
        }

        const config = documentManager.fieldConfigs[type];
        invoiceFieldWrap.style.display = config.needsInvoice ? '' : 'none';
        clientFieldWrap.style.display = config.needsClient ? '' : 'none';

        if (config.fields.length > 0) {
            const grid = document.createElement('div');
            grid.className = 'form-grid';
            config.fields.forEach(f => {
                const wrap = document.createElement('div');
                const placeholderAttr = f.placeholder ? ` placeholder="${f.placeholder}"` : '';
                wrap.innerHTML = `<label>${f.label}:</label><input type="${f.type}" id="${f.id}"${placeholderAttr}>`;
                grid.appendChild(wrap);
            });
            container.appendChild(grid);
        }
    }

    async handleGenerateDocument(e) {
        e.preventDefault();
        const type = document.getElementById('documentType').value;
        if (!type) {
            this.showMessage('Hujjat turini tanlang', 'error');
            return;
        }

        const companyInfo = await api.getCompanyInfo();
        const company = {
            legalForm: companyInfo.companyLegalForm, name: companyInfo.companyName, stir: companyInfo.companyStir,
            oked: companyInfo.companyOked, address: companyInfo.companyAddress, phone: companyInfo.companyPhone,
            bankName: companyInfo.companyBankName, bankAccount: companyInfo.companyBankAccount, mfo: companyInfo.companyMfo,
            director: companyInfo.companyDirector, accountant: companyInfo.companyAccountant
        };
        if (!company.name) {
            this.showMessage("Avval korxona rekvizitlarini to'ldiring", 'error');
            return;
        }

        const date = document.getElementById('documentDate').value || new Date().toISOString().split('T')[0];
        const clientId = document.getElementById('documentClient').value;
        const invoiceId = document.getElementById('documentInvoice').value;
        const [clientById, invoice, products] = await Promise.all([
            clientId ? api.getClientById(clientId).catch(() => null) : null,
            invoiceId ? api.getInvoiceById(invoiceId).catch(() => null) : null,
            api.getProducts()
        ]);
        let effectiveClient = clientById;
        const productMap = new Map(products.map(p => [p.id, p]));

        let items = null;
        let currency = null;
        if (invoice) {
            items = (invoice.lineItems || []).map(li => {
                const product = productMap.get(li.productId);
                return { name: product ? product.name : li.productId, quantity: li.quantity, price: li.price };
            });
            currency = invoice.currency;
            if (!effectiveClient && invoice.clientId) effectiveClient = await api.getClientById(invoice.clientId).catch(() => null);
        }

        const number = `${type.toUpperCase()}-${Date.now()}`;
        const contractAmountField = document.getElementById('docContractAmount');
        const cashAmountField = document.getElementById('docCashAmount');

        const data = {
            company,
            client: effectiveClient,
            date,
            number,
            items,
            currency,
            vatRate: (this.settings && this.settings.taxVAT) || 12,
            subject: document.getElementById('docContractSubject')?.value.trim(),
            amount: parseFloat(contractAmountField?.value) || parseFloat(cashAmountField?.value) || 0,
            term: document.getElementById('docContractTerm')?.value.trim(),
            party: document.getElementById('docCashParty')?.value.trim(),
            basis: document.getElementById('docCashBasis')?.value.trim(),
            poaName: document.getElementById('docPoaName')?.value.trim(),
            poaPassport: document.getElementById('docPoaPassport')?.value.trim(),
            poaValidUntil: document.getElementById('docPoaValidUntil')?.value,
            poaAuthority: document.getElementById('docPoaAuthority')?.value.trim()
        };

        const html = documentManager.build(type, data);
        document.getElementById('documentPreview').innerHTML = html;
        const previewSection = document.getElementById('documentPreviewSection');
        previewSection.style.display = '';
        previewSection.scrollIntoView({ behavior: 'smooth' });

        this.currentGeneratedDocument = {
            type, number, date,
            clientId: effectiveClient ? effectiveClient.id : null,
            html
        };
    }

    async handleSaveDocument() {
        if (!this.currentGeneratedDocument) {
            this.showMessage('Avval hujjatni shakllantiring', 'error');
            return;
        }
        try {
            await api.addDocument(this.currentGeneratedDocument);
        } catch (err) {
            this.showMessage('Saqlashda xato: ' + err.message, 'error');
            return;
        }
        this.showMessage('Hujjat saqlandi', 'success');
        await this.displaySavedDocuments();
    }

    async displaySavedDocuments() {
        const container = document.getElementById('savedDocumentsList');
        if (!container) return;
        const [documents, clients] = await Promise.all([api.getDocuments(), api.getClients()]);
        documents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const clientMap = new Map(clients.map(c => [c.id, c]));
        container.innerHTML = '';
        if (documents.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Hali hujjat saqlanmagan</p></div>';
            return;
        }
        documents.forEach(doc => {
            const client = doc.clientId ? clientMap.get(doc.clientId) : null;
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <h4>${documentManager.typeLabels[doc.type] || doc.type}</h4>
                <p><strong>№</strong> ${doc.number}</p>
                <p>Sana: ${documentManager.formatDate(doc.date)}${client ? ' | Mijoz: ' + client.name : ''}</p>
                <div class="list-item-actions">
                    <button class="btn btn-secondary" onclick="app.viewSavedDocument('${doc.id}')">Ko'rish</button>
                    <button class="btn btn-danger" onclick="app.deleteSavedDocument('${doc.id}')">O'chirish</button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    async viewSavedDocument(id) {
        const doc = await api.getDocumentById(id).catch(() => null);
        if (!doc) return;
        document.getElementById('documentPreview').innerHTML = doc.html;
        const previewSection = document.getElementById('documentPreviewSection');
        previewSection.style.display = '';
        previewSection.scrollIntoView({ behavior: 'smooth' });
        this.currentGeneratedDocument = doc;
    }

    async deleteSavedDocument(id) {
        if (!confirm("Hujjatni o'chirishni tasdiqlaysizmi?")) return;
        try {
            await api.deleteDocument(id);
        } catch (err) {
            this.showMessage('O\'chirishda xato: ' + err.message, 'error');
            return;
        }
        await this.displaySavedDocuments();
    }

    // PAYROLL
    async loadPayroll() {
        // initialize forms and lists
        document.getElementById('employeeForm').reset();
        document.getElementById('payrollForm').reset();
        document.getElementById('payrollPeriod').value = new Date().toISOString().slice(0, 7);
        document.getElementById('employeesList').innerHTML = '';
        document.getElementById('payrollTableBody').innerHTML = '';
        await this.displayEmployees();
        await this.displayPayrollRecords();
        await this.updateEmployeeDropdowns();
    }

    async handleAddEmployee(e) {
        e.preventDefault();
        const emp = {
            name: document.getElementById('employeeName').value.trim(),
            position: document.getElementById('employeePosition').value.trim(),
            salary: parseFloat(document.getElementById('employeeSalary').value) || 0,
            taxRate: parseFloat(document.getElementById('employeeTaxRate').value) || 0
        };
        try {
            await api.addEmployee(emp);
        } catch (err) {
            this.showMessage('Xodim qo\'shishda xato: ' + err.message, 'error');
            return;
        }
        document.getElementById('employeeForm').reset();
        await this.displayEmployees();
        await this.updateEmployeeDropdowns();
        this.showMessage('Xodim qo\'shildi', 'success');
    }

    async displayEmployees() {
        const employees = await api.getEmployees();
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

    async updateEmployeeDropdowns() {
        const employees = await api.getEmployees();
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

    async handleAddPayrollRecord(e) {
        e.preventDefault();
        const employeeId = document.getElementById('payrollEmployee').value;
        const period = document.getElementById('payrollPeriod').value;
        const bonus = parseFloat(document.getElementById('payrollBonus').value) || 0;
        const deductions = parseFloat(document.getElementById('payrollDeductions').value) || 0;
        if (!employeeId) { this.showMessage('Iltimos, xodimni tanlang', 'error'); return; }

        // JShDS/ISHV ajratish, netto hisoblash va ikkita xarajat tranzaksiyasini yaratish serverda amalga oshadi
        try {
            await api.addPayrollRecord({ employeeId, period, bonus, deductions });
        } catch (err) {
            this.showMessage('Ish haqi yozuvida xato: ' + err.message, 'error');
            return;
        }

        document.getElementById('payrollForm').reset();
        document.getElementById('payrollPeriod').value = period;
        await this.displayPayrollRecords();
        this.showMessage('Ish haqi yozuvi va xarajat tranzaksiyasi saqlandi', 'success');
    }

    async displayPayrollRecords() {
        const [records, employees] = await Promise.all([api.getPayroll(), api.getEmployees()]);
        records.sort((a,b) => new Date(b.date) - new Date(a.date));
        const empMap = new Map(employees.map(e => [e.id, e]));
        const tbody = document.getElementById('payrollTableBody');
        tbody.innerHTML = '';
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Hali yozuv mavjud emas</td></tr>';
            this.displayPayrollSummary([]);
            return;
        }
        records.forEach(r => {
            const emp = empMap.get(r.employeeId);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(r.date).toLocaleDateString('uz-UZ')}</td>
                <td>${emp ? emp.name : 'Noma\'lum'}</td>
                <td>${r.period}</td>
                <td>${this.formatNumber(r.gross)} so'm</td>
                <td>${this.formatNumber((r.deductions || 0) + (r.tax || 0))} so'm</td>
                <td><strong>${this.formatNumber(r.net)} so'm</strong></td>
                <td><button class="btn btn-danger" onclick="app.deletePayrollRecord('${r.id}')">O'chirish</button></td>
            `;
            tbody.appendChild(row);
        });
        // Display payroll summary
        this.displayPayrollSummary(records);
    }

    displayPayrollSummary(records) {
        if (!records || records.length === 0) return;
        
        const totalGross = records.reduce((s, r) => s + (r.gross || 0), 0);
        const totalTax = records.reduce((s, r) => s + (r.tax || 0), 0);
        const totalSocialTax = records.reduce((s, r) => s + (r.socialTax || 0), 0);
        const totalDeductions = records.reduce((s, r) => s + (r.deductions || 0), 0);
        const totalNet = records.reduce((s, r) => s + (r.net || 0), 0);

        let summaryHTML = `
            <div class="summary-box">
                <h4>Ish haqi bo'yicha yakun:</h4>
                <p>Jami (bruto): ${this.formatNumber(totalGross)} so'm</p>
                <p>JShDS (xodimdan ushlangan): ${this.formatNumber(totalTax)} so'm</p>
                <p>Ijtimoiy soliq - ISHV (ish beruvchi to'laydi): ${this.formatNumber(totalSocialTax)} so'm</p>
                <p>Boshqa ajratmalar: ${this.formatNumber(totalDeductions)} so'm</p>
                <p><strong>Xodimlarga to'lanadigan (netto): ${this.formatNumber(totalNet)} so'm</strong></p>
                <p><strong>Ish beruvchi uchun jami xarajat: ${this.formatNumber(totalNet + totalSocialTax)} so'm</strong></p>
            </div>
        `;
        
        const summaryContainer = document.getElementById('payrollSummary');
        if (summaryContainer) {
            summaryContainer.innerHTML = summaryHTML;
        }
    }

    async deleteEmployee(empId) {
        if (!this.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Xodimni o\'chirishni xohlaysizmi?')) return;
        try {
            await api.deleteEmployee(empId);
        } catch (err) {
            this.showMessage('O\'chirishda xato: ' + err.message, 'error');
            return;
        }
        await this.displayEmployees();
        await this.updateEmployeeDropdowns();
        this.showMessage('Xodim o\'chirildi', 'success');
    }

    async deletePayrollRecord(id) {
        if (!this.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Yozuvni o\'chirishni xohlaysizmi?')) return;
        try {
            await api.deletePayrollRecord(id);
        } catch (err) {
            this.showMessage('O\'chirishda xato: ' + err.message, 'error');
            return;
        }
        await this.displayPayrollRecords();
        this.showMessage('Yozuv o\'chirildi', 'success');
    }

    // DASHBOARD
    async loadDashboard() {
        const [stats, products] = await Promise.all([api.getStatistics(), api.getProducts()]);

        document.getElementById('totalIncome').textContent = this.formatNumber(stats.totalIncome);
        document.getElementById('totalExpense').textContent = this.formatNumber(stats.totalExpense);
        document.getElementById('totalTax').textContent = this.formatNumber(stats.totalTax);
        document.getElementById('netProfit').textContent = this.formatNumber(stats.netProfit);

        // Inventory stats
        const totalValue = products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0);
        const lowStockItems = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;

        document.getElementById('dashboardInventoryValue').textContent = this.formatNumber(totalValue);
        document.getElementById('dashboardLowStock').textContent = lowStockItems;

        await this.displayRecentTransactions();
    }

    async displayRecentTransactions() {
        const all = await api.getTransactions();
        const recent = all.slice(0, 5);
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
    async handleAddClient(e) {
        e.preventDefault();

        const client = {
            name: document.getElementById('clientName').value,
            stir: document.getElementById('clientSTIR').value,
            phone: document.getElementById('clientPhone').value,
            address: document.getElementById('clientAddress').value
        };

        try {
            await api.addClient(client);
        } catch (err) {
            this.showMessage('Mijoz qo\'shishda xato: ' + err.message, 'error');
            return;
        }

        document.getElementById('clientForm').reset();

        await this.displayClients();
        await this.updateClientDropdowns();
        await this.updateSupplierDropdowns();

        this.showMessage('Mijoz muvaffaqiyatli qo\'shildi', 'success');
    }

    async displayClients() {
        const clients = await api.getClients();
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

    async updateClientDropdowns() {
        const clients = await api.getClients();
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

    async deleteClient(clientId) {
        if (!this.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (confirm('Ushbu mijozni o\'chirishga ishonch hosil qildingizmi?')) {
            try {
                await api.deleteClient(clientId);
            } catch (err) {
                this.showMessage('O\'chirishda xato: ' + err.message, 'error');
                return;
            }
            await this.displayClients();
            await this.updateClientDropdowns();
            this.showMessage('Mijoz muvaffaqiyatli o\'chirildi', 'success');
        }
    }

    async editClient(clientId) {
        const client = await api.getClientById(clientId);
        if (client) {
            alert('Tahrirlash funktsiyasi tez orada qo\'shilinadi');
        }
    }

    // SUPPLIERS
    async handleAddSupplier(e) {
        e.preventDefault();

        const supplier = {
            name: document.getElementById('supplierName').value,
            stir: document.getElementById('supplierSTIR').value,
            phone: document.getElementById('supplierPhone').value,
            address: document.getElementById('supplierAddress').value,
            productType: document.getElementById('supplierProductType').value
        };

        try {
            await api.addSupplier(supplier);
        } catch (err) {
            this.showMessage('Yetkazib beruvchi qo\'shishda xato: ' + err.message, 'error');
            return;
        }

        document.getElementById('supplierForm').reset();

        await this.displaySuppliers();
        await this.updateSupplierDropdowns();

        this.showMessage('Yetkazib beruvchi muvaffaqiyatli qo\'shildi', 'success');
    }

    async displaySuppliers() {
        const suppliers = await api.getSuppliers();
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

    async updateSupplierDropdowns() {
        const suppliers = await api.getSuppliers();
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

    async deleteSupplier(supplierId) {
        if (!this.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (confirm('Ushbu yetkazib beruvchini o\'chirishga ishonch hosil qildingizmi?')) {
            try {
                await api.deleteSupplier(supplierId);
            } catch (err) {
                this.showMessage('O\'chirishda xato: ' + err.message, 'error');
                return;
            }
            await this.displaySuppliers();
            await this.updateSupplierDropdowns();
            this.showMessage('Yetkazib beruvchi muvaffaqiyatli o\'chirildi', 'success');
        }
    }

    async editSupplier(supplierId) {
        const supplier = await api.getSupplierById(supplierId);
        if (supplier) {
            alert('Tahrirlash funktsiyasi tez orada qo\'shilinadi');
        }
    }

    // PRODUCTION
    async loadProduction() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('productionForm').reset();
        document.getElementById('productionDate').value = today;
        document.getElementById('materialUsageRows').innerHTML = '';
        await this.addProductionMaterialRow();
        await this.updateProductionDropdowns();
        await this.loadRecipeManagement();
        await this.displayProductionOrders();
        await this.updateProductionCostPreview();
    }

    async updateProductionDropdowns() {
        const products = await api.getProducts();

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
            const recipes = await api.getProductionRecipes();
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

    async loadRecipeManagement() {
        const recipeForm = document.getElementById('recipeForm');
        if (recipeForm) {
            recipeForm.reset();
        }
        const container = document.getElementById('recipeMaterialRows');
        if (container) {
            container.innerHTML = '';
        }
        await this.addRecipeMaterialRow();
        await this.displayProductionRecipes();
        await this.updateProductionDropdowns();
    }

    async applySelectedRecipe() {
        const recipeId = document.getElementById('productionRecipeSelect').value;
        if (!recipeId) {
            await this.updateProductionCostPreview();
            return;
        }

        const recipes = await api.getProductionRecipes();
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) {
            this.showMessage('Tanlangan retsept topilmadi', 'error');
            return;
        }

        await this.loadRecipeIntoProductionForm(recipe);
    }

    async loadRecipeIntoProductionForm(recipe) {
        const producedQuantity = parseInt(document.getElementById('productionQuantity').value, 10) || 1;
        const container = document.getElementById('materialUsageRows');
        container.innerHTML = '';

        const productionProduct = document.getElementById('productionProduct');
        if (productionProduct) {
            productionProduct.value = recipe.finishedProductId;
        }

        for (const material of recipe.materials) {
            await this.addProductionMaterialRow({
                productId: material.productId,
                quantity: material.qtyPerUnit * producedQuantity
            });
        }

        await this.updateProductionCostPreview();
    }

    async updateProductionCostPreview() {
        const rows = Array.from(document.querySelectorAll('#materialUsageRows .material-row'));
        const products = await api.getProducts();
        const productMap = new Map(products.map(p => [p.id, p]));
        let totalCost = 0;

        rows.forEach(row => {
            const productId = row.querySelector('.material-product-select').value;
            const quantity = parseFloat(row.querySelector('.material-quantity').value) || 0;
            const product = productMap.get(productId);
            totalCost += (product ? product.purchasePrice : 0) * quantity;
        });

        const producedQuantity = parseFloat(document.getElementById('productionQuantity').value) || 1;
        const unitCost = producedQuantity > 0 ? totalCost / producedQuantity : 0;

        document.getElementById('productionCostPreview').textContent = this.formatNumber(totalCost) + ' so\'m';
        document.getElementById('productionUnitCostPreview').textContent = this.formatNumber(unitCost) + ' so\'m';
    }

    async addProductionMaterialRow(item = {}) {
        const container = document.getElementById('materialUsageRows');
        const row = document.createElement('div');
        row.className = 'material-row';
        row.innerHTML = `
            <div class="form-grid material-row-grid">
                <div>
                    <label>Material:</label>
                    <select class="material-product-select" required>
                        <option value="">-- Tanlang --</option>
                    </select>
                </div>
                <div>
                    <label>Miqdor:</label>
                    <input type="number" class="material-quantity" min="1" value="${item.quantity || 1}" required>
                </div>
                <div class="material-row-actions">
                    <button type="button" class="btn btn-danger remove-material-row">O'chirish</button>
                </div>
            </div>
        `;

        container.appendChild(row);
        await this.updateProductionDropdowns();

        const productSelect = row.querySelector('.material-product-select');
        const quantityInput = row.querySelector('.material-quantity');
        if (productSelect && item.productId) {
            productSelect.value = item.productId;
        }

        const updatePreview = () => this.updateProductionCostPreview();
        productSelect.addEventListener('change', updatePreview);
        quantityInput.addEventListener('input', updatePreview);

        row.querySelector('.remove-material-row').addEventListener('click', () => {
            row.remove();
            this.updateProductionCostPreview();
        });
    }

    async addRecipeMaterialRow(item = {}) {
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
        await this.updateProductionDropdowns();

        const productSelect = row.querySelector('.recipe-material-product-select');
        if (productSelect && item.productId) {
            productSelect.value = item.productId;
        }

        row.querySelector('.remove-material-row').addEventListener('click', () => {
            row.remove();
        });
    }

    async handleSaveRecipe(e) {
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

        try {
            await api.addProductionRecipe({ finishedProductId, name: recipeName, materials });
        } catch (err) {
            this.showMessage('Retseptni saqlashda xato: ' + err.message, 'error');
            return;
        }

        this.showMessage('Retsept saqlandi', 'success');
        await this.loadRecipeManagement();
        await this.applySelectedRecipe();
    }

    async displayProductionRecipes() {
        const [recipes, products] = await Promise.all([api.getProductionRecipes(), api.getProducts()]);
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

    async deleteProductionRecipe(recipeId) {
        if (!this.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Ushbu retseptni o\'chirishga ishonchingiz komilmi?')) {
            return;
        }

        try {
            await api.deleteProductionRecipe(recipeId);
        } catch (err) {
            this.showMessage('O\'chirishda xato: ' + err.message, 'error');
            return;
        }
        await this.loadRecipeManagement();
        this.showMessage('Retsept o\'chirildi', 'success');
    }

    async handleAddProductionOrder(e) {
        e.preventDefault();

        const finishedProductId = document.getElementById('productionProduct').value;
        const producedQuantity = parseInt(document.getElementById('productionQuantity').value, 10);
        const date = document.getElementById('productionDate').value;
        const description = document.getElementById('productionDescription').value;
        const rows = Array.from(document.querySelectorAll('#materialUsageRows .material-row'));

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

        const recipeId = document.getElementById('productionRecipeSelect').value;

        // Zahira tekshiruvi, tannarx hisoblash va materiallar/mahsulot zahirasini yangilash serverda amalga oshadi
        try {
            await api.addProductionOrder({ finishedProductId, producedQuantity, materials, date, description, recipeId });
        } catch (err) {
            this.showMessage('Ishlab chiqarish buyurtmasini saqlashda xato: ' + err.message, 'error');
            return;
        }

        document.getElementById('productionForm').reset();
        document.getElementById('materialUsageRows').innerHTML = '';
        await this.loadProduction();
        await this.loadInventory();
        await this.loadDashboard();

        this.showMessage('Ishlab chiqarish buyurtmasi muvaffaqiyatli qo\'shildi', 'success');
    }

    async displayProductionOrders() {
        const [orders, products] = await Promise.all([api.getProductionOrders(), api.getProducts()]);
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));
        const productMap = new Map(products.map(p => [p.id, p]));
        const tbody = document.getElementById('productionTableBody');
        tbody.innerHTML = '';

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Hali ishlab chiqarish buyurtmasi mavjud emas</td></tr>';
            return;
        }

        orders.forEach(order => {
            const finishedProduct = productMap.get(order.finishedProductId);
            const productName = finishedProduct ? finishedProduct.name : 'Noma\'lum';
            const cost = parseFloat(order.productionCost || 0);
            const materialSummary = order.materials.map(item => {
                const product = productMap.get(item.productId);
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

    async deleteProductionOrder(orderId) {
        if (!this.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Ishlab chiqarish buyurtmasini o\'chirish zahira miqdorlarini tiklaydi. Davom etilsinmi?')) {
            return;
        }

        // Materiallar/mahsulot zahirasini tiklash serverda amalga oshadi
        try {
            await api.deleteProductionOrder(orderId);
        } catch (err) {
            this.showMessage('O\'chirishda xato: ' + err.message, 'error');
            return;
        }

        await this.loadProduction();
        await this.loadInventory();
        await this.loadDashboard();
        this.showMessage('Ishlab chiqarish buyurtmasi o\'chirildi va zahira tiklandi', 'success');
    }

    // TRANSACTIONS
    async handleAddTransaction(e) {
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

        try {
            await api.addTransaction({ date, clientId, supplierId, type, category, amount, description, currency: currency || undefined });
        } catch (err) {
            this.showMessage('Tranzaksiya qo\'shishda xato: ' + err.message, 'error');
            return;
        }

        document.getElementById('transactionForm').reset();
        document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
        await this.displayTransactions();
        await this.loadDashboard();
        this.showMessage('Tranzaksiya muvaffaqiyatli qo\'shildi', 'success');
    }

    // clients/suppliers ro'yxatini bir marta olib, xaridor/yetkazib beruvchi nomini tez qidirish uchun lug'at yasaydi
    async buildPartyLookup() {
        const [clients, suppliers] = await Promise.all([api.getClients(), api.getSuppliers()]);
        const clientMap = new Map(clients.map(c => [c.id, c]));
        const supplierMap = new Map(suppliers.map(s => [s.id, s]));
        return { clientMap, supplierMap };
    }

    renderTransactionRows(transactions, clientMap, supplierMap, emptyMessage) {
        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state">${emptyMessage}</td></tr>`;
            return;
        }

        transactions.forEach(trans => {
            const client = clientMap.get(trans.clientId);
            const supplier = supplierMap.get(trans.supplierId);
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

    async displayTransactions() {
        const [transactions, { clientMap, supplierMap }] = await Promise.all([api.getTransactions(), this.buildPartyLookup()]);
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.renderTransactionRows(transactions, clientMap, supplierMap, 'Hali tranzaksiya mavjud emas');
    }

    async filterTransactions() {
        const fromDate = document.getElementById('filterFromDate').value;
        const toDate = document.getElementById('filterToDate').value;
        const type = document.getElementById('filterType').value;
        const search = document.getElementById('filterSearch').value.trim().toLowerCase();

        const [allTransactions, { clientMap, supplierMap }] = await Promise.all([api.getTransactions(), this.buildPartyLookup()]);
        let transactions = allTransactions;

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
                const clientName = clientMap.get(t.clientId)?.name || '';
                const supplierName = supplierMap.get(t.supplierId)?.name || '';
                const description = (t.description || '').toLowerCase();
                const currency = (t.currency || '').toLowerCase();
                return clientName.toLowerCase().includes(search)
                    || supplierName.toLowerCase().includes(search)
                    || description.includes(search)
                    || currency.includes(search);
            });
        }

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.renderTransactionRows(transactions, clientMap, supplierMap, 'Shartga mos tranzaksiya topilmadi');
    }

    async deleteTransaction(transId) {
        if (!this.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (confirm('Ushbu tranzaksiyani o\'chirishga ishonch hosil qildingizmi?')) {
            try {
                await api.deleteTransaction(transId);
            } catch (err) {
                this.showMessage('O\'chirishda xato: ' + err.message, 'error');
                return;
            }
            await this.displayTransactions();
            await this.loadDashboard();
            this.showMessage('Tranzaksiya muvaffaqiyatli o\'chirildi', 'success');
        }
    }

    // SALES
    async loadSales() {
        const invoiceNumberField = document.getElementById('invoiceNumber');
        if (invoiceNumberField) {
            invoiceNumberField.value = `INV-${Date.now()}`;
        }

        const today = new Date().toISOString().split('T')[0];
        const invoiceDate = document.getElementById('invoiceDate');
        if (invoiceDate) {
            invoiceDate.value = today;
        }

        const defaultCurrency = (this.settings && this.settings.defaultCurrency) || 'UZS';
        const invoiceCurrency = document.getElementById('invoiceCurrency');
        if (invoiceCurrency) {
            invoiceCurrency.value = defaultCurrency;
        }

        const rowContainer = document.getElementById('invoiceLineRows');
        if (rowContainer) {
            rowContainer.innerHTML = '';
        }
        await this.addInvoiceLineRow();
        await this.updateClientDropdowns();
        await this.displayInvoices();
        this.updateInvoiceTotalPreview();
    }

    async updateInvoiceDropdowns() {
        const products = await api.getProducts();
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

    async addInvoiceLineRow(item = {}) {
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
        await this.updateInvoiceDropdowns();

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
        productSelect.addEventListener('change', async () => {
            const product = await api.getProductById(productSelect.value).catch(() => null);
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

    // Soddalashtirilgan rejimdagi korxonalar QQS to'lovchisi emas
    getInvoiceVatRate() {
        const settings = this.settings || {};
        return settings.taxRegime === 'soddalashtirilgan' ? 0 : (parseFloat(settings.taxVAT) || 0);
    }

    updateInvoiceTotalPreview() {
        const rows = Array.from(document.querySelectorAll('#invoiceLineRows .material-row'));
        let subtotal = 0;
        rows.forEach(row => {
            const qty = parseFloat(row.querySelector('.invoice-product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.invoice-product-price').value) || 0;
            subtotal += qty * price;
        });
        const vatRate = this.getInvoiceVatRate();
        const vatAmount = subtotal * (vatRate / 100);
        const total = subtotal + vatAmount;
        const invoiceCurrency = document.getElementById('invoiceCurrency')?.value;
        const fmt = (v) => invoiceCurrency ? this.formatCurrency(v, invoiceCurrency) : this.formatNumber(v) + ' so\'m';
        document.getElementById('invoiceTotalPreview').textContent = vatRate > 0
            ? `${fmt(subtotal)} + QQS ${vatRate}% (${fmt(vatAmount)}) = ${fmt(total)}`
            : fmt(total);
    }

    async handleAddInvoice(e) {
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
        for (const row of rows) {
            const productId = row.querySelector('.invoice-product-select').value;
            const quantity = parseFloat(row.querySelector('.invoice-product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.invoice-product-price').value) || 0;
            if (!productId || quantity <= 0 || price < 0) {
                this.showMessage('Iltimos, barcha mahsulot sarlavhalarini to\'ldiring', 'error');
                return;
            }
            lineItems.push({ productId, quantity, price });
        }
        if (lineItems.length === 0) {
            this.showMessage('Iltimos, kamida bitta mahsulot qo\'shing', 'error');
            return;
        }

        const invoiceCurrency = document.getElementById('invoiceCurrency')?.value || '';

        // QQS hisoblash, zahirani kamaytirish va daromad tranzaksiyasini yaratish serverda amalga oshadi
        try {
            await api.addInvoice({ number, date, clientId, description, lineItems, currency: invoiceCurrency || undefined });
        } catch (err) {
            this.showMessage('Invoice yaratishda xato: ' + err.message, 'error');
            return;
        }

        document.getElementById('invoiceForm').reset();
        document.getElementById('invoiceLineRows').innerHTML = '';
        await this.addInvoiceLineRow();
        await this.loadDashboard();
        await this.loadInventory();
        await this.displayInvoices();
        await this.updateClientDropdowns();
        this.showMessage('Invoice muvaffaqiyatli yaratildi', 'success');
    }

    async displayInvoices() {
        const [invoices, clients] = await Promise.all([api.getInvoices(), api.getClients()]);
        invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
        const clientMap = new Map(clients.map(c => [c.id, c]));
        const tbody = document.getElementById('invoiceTableBody');
        tbody.innerHTML = '';

        if (invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Hali invoice mavjud emas</td></tr>';
            return;
        }

        invoices.forEach(invoice => {
            const client = clientMap.get(invoice.clientId);
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

    async exportInvoice(invoiceId) {
        const invoice = await api.getInvoiceById(invoiceId).catch(() => null);
        if (!invoice) {
            this.showMessage('Invoice topilmadi', 'error');
            return;
        }

        const [client, products] = await Promise.all([
            invoice.clientId ? api.getClientById(invoice.clientId).catch(() => null) : null,
            api.getProducts()
        ]);
        const productMap = new Map(products.map(p => [p.id, p]));
        const linesHtml = invoice.lineItems.map(item => {
            const product = productMap.get(item.productId);
            return `<tr><td>${product ? product.name : 'Noma\'lum'}</td><td>${item.quantity}</td><td>${this.formatNumber(item.price)} so'm</td><td>${this.formatNumber(item.quantity * item.price)} so'm</td></tr>`;
        }).join('');

        const fmt = (v) => invoice.currency ? this.formatCurrency(v, invoice.currency) : `${this.formatNumber(v)} so'm`;
        const hasVat = invoice.vatRate > 0;
        const subtotalDisplay = fmt(invoice.subtotal !== undefined ? invoice.subtotal : invoice.total);
        const totalDisplay = fmt(invoice.total);
        const vatRows = hasVat ? `
<p><strong>Summa (QQSsiz):</strong> ${subtotalDisplay}</p>
<p><strong>QQS (${invoice.vatRate}%):</strong> ${fmt(invoice.vatAmount || 0)}</p>` : '';
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
${vatRows}
<p><strong>Jami summa (to'lanadigan):</strong> ${totalDisplay}</p>
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

    async deleteInvoice(invoiceId) {
        if (!this.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Ushbu invoice o\'chirilsinmi?')) {
            return;
        }
        try {
            await api.deleteInvoice(invoiceId);
        } catch (err) {
            this.showMessage('O\'chirishda xato: ' + err.message, 'error');
            return;
        }
        await this.displayInvoices();
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

    async generateReport() {
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

        const inPeriod = (dateStr) => {
            const d = new Date(dateStr);
            return d >= fromDate && d <= toDate;
        };

        const [allTransactions, allProductionOrders, settings] = await Promise.all([
            api.getTransactions(), api.getProductionOrders(), api.getSettings()
        ]);
        const transactions = allTransactions.filter(t => inPeriod(t.date));
        this.settings = settings;

        // Hisoblashlar
        const incomeTransactions = transactions.filter(t => t.type === 'income');
        const expenseTransactions = transactions.filter(t => t.type === 'expense');

        const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const totalExpense = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const grossProfit = totalIncome - totalExpense;

        const isSimplified = settings.taxRegime === 'soddalashtirilgan';
        // Foyda solig'i faqat foyda bo'lganda hisoblanadi (zararga soliq solinmaydi);
        // soddalashtirilgan rejimda esa Aylanma solig'i jami daromaddan olinadi (QQS/Foyda solig'i o'rniga)
        const turnoverTax = isSimplified ? totalIncome * ((settings.taxTurnover || 0) / 100) : 0;
        const taxIncome = !isSimplified && grossProfit > 0 ? grossProfit * ((settings.taxIncome || 0) / 100) : 0;
        const totalTax = isSimplified ? turnoverTax : taxIncome;
        const netProfit = grossProfit - totalTax;

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
                    <td><strong>${isSimplified ? `Aylanma solig'i (${settings.taxTurnover}%)` : `Foyda solig'i (${settings.taxIncome}%)`}:</strong></td>
                    <td><strong style="color: #ff6b6b;">${this.formatNumber(totalTax)} so'm</strong></td>
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

        const productionOrders = allProductionOrders.filter(o => inPeriod(o.date));
        const productsForOrders = await api.getProducts();
        const productMapForOrders = new Map(productsForOrders.map(p => [p.id, p]));
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
            const product = productMapForOrders.get(order.finishedProductId);
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
                <p><strong>Soliq rejimi:</strong> ${isSimplified ? "Soddalashtirilgan (Aylanma solig'i)" : 'Umumbelgilangan (QQS + Foyda solig\'i)'}</p>
                ${isSimplified
                    ? `<p><strong>Aylanma solig'i stavkasi:</strong> ${settings.taxTurnover}%</p>`
                    : `<p><strong>Foyda solig'i stavkasi:</strong> ${settings.taxIncome}%</p>
                <p><strong>QQS stavkasi:</strong> ${settings.taxVAT}%</p>`}
                <p><strong>Ijtimoiy soliq (ISHV) stavkasi:</strong> ${settings.taxSSV}%</p>
                <p><strong>JShDS (xodimlar uchun) stavkasi:</strong> ${settings.taxNDFL}%</p>
                <p><strong>Deklaratsiya topshirish:</strong> QQS — har oy, Foyda solig'i — har chorak, JShDS/ISHV — har oy (soliq.uz orqali)</p>
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
    async loadSettings() {
        const [settings, currencies] = await Promise.all([api.getSettings(), api.getCurrencies()]);
        this.settings = settings;
        const defaultCurrencySelect = document.getElementById('defaultCurrency');

        document.getElementById('taxRegime').value = settings.taxRegime || 'umumiy';
        document.getElementById('taxVAT').value = settings.taxVAT;
        document.getElementById('taxIncome').value = settings.taxIncome;
        document.getElementById('taxTurnover').value = settings.taxTurnover;
        document.getElementById('taxSSV').value = settings.taxSSV;
        document.getElementById('taxNDFL').value = settings.taxNDFL;
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

    async handleSaveSettings(e) {
        e.preventDefault();

        if (!this.canEditSettings()) {
            this.showMessage('Faqat administrator sozlamalarni o\'zgartira oladi', 'error');
            return;
        }

        const settings = {
            taxRegime: document.getElementById('taxRegime').value,
            taxVAT: parseFloat(document.getElementById('taxVAT').value),
            taxIncome: parseFloat(document.getElementById('taxIncome').value),
            taxTurnover: parseFloat(document.getElementById('taxTurnover').value),
            taxSSV: parseFloat(document.getElementById('taxSSV').value),
            taxNDFL: parseFloat(document.getElementById('taxNDFL').value),
            autoCalculateTax: document.getElementById('autoCalculateTax').checked,
            notifications: document.getElementById('notifications').checked,
            defaultCurrency: document.getElementById('defaultCurrency')?.value || 'UZS',
            showCurrencySymbol: document.getElementById('showCurrencySymbol')?.checked
        };

        try {
            await api.updateSettings(settings);
        } catch (err) {
            this.showMessage('Sozlamalarni saqlashda xato: ' + err.message, 'error');
            return;
        }
        await this.loadCurrencies();
        if (this.currentTab === 'sales') {
            this.updateInvoiceTotalPreview();
        }
        this.showMessage('Sozlamalar muvaffaqiyatli saqlandi', 'success');
    }

    // BACKUP & RESTORE
    async backupData() {
        const [clients, suppliers, products, transactions, invoices, employees, payrollRecords,
            productionRecipes, productionOrders, documents, companyInfo, settings, currencies] = await Promise.all([
            api.getClients(), api.getSuppliers(), api.getProducts(), api.getTransactions(), api.getInvoices(),
            api.getEmployees(), api.getPayroll(), api.getProductionRecipes(), api.getProductionOrders(),
            api.getDocuments(), api.getCompanyInfo(), api.getSettings(), api.getCurrencies()
        ]);

        const data = {
            clients, suppliers, products, transactions, invoices, employees, payrollRecords,
            productionRecipes, productionOrders, documents, companyInfo, settings, currencies,
            exportedAt: new Date().toISOString()
        };

        const fileName = `Backup_${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);

        this.showMessage('Ma\'lumotlar zaxiraga olingan faylga saqlandi', 'success');
    }

    async restoreData(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!this.canEditSettings()) {
            this.showMessage('Faqat administrator ma\'lumotlarni qaytara oladi', 'error');
            e.target.value = '';
            return;
        }
        if (!confirm('Fayldagi ma\'lumotlar joriy serverdagi mavjud ma\'lumotlarga QO\'SHILADI (o\'rnini bosmaydi). Davom etilsinmi?')) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);

                // Eski ID -> yangi (server) ID moslashtiruvchi lug'atlar
                const productIdMap = new Map();
                const clientIdMap = new Map();
                const supplierIdMap = new Map();
                const employeeIdMap = new Map();

                for (const p of data.products || []) {
                    const { id: oldId, ...rest } = p;
                    const created = await api.addProduct(rest);
                    productIdMap.set(oldId, created.id);
                    // addProduct har doim stock=0 bilan yaratadi - zahirani zaxiradagi holatga moslashtiramiz
                    if (p.stock) {
                        await api.addInventoryMovement({ productId: created.id, type: 'adjust', quantity: p.stock, description: 'Backup\'dan tiklandi' });
                    }
                }
                for (const c of data.clients || []) {
                    const { id: oldId, ...rest } = c;
                    const created = await api.addClient(rest);
                    clientIdMap.set(oldId, created.id);
                }
                for (const s of data.suppliers || []) {
                    const { id: oldId, ...rest } = s;
                    const created = await api.addSupplier(rest);
                    supplierIdMap.set(oldId, created.id);
                }
                for (const emp of data.employees || []) {
                    const { id: oldId, ...rest } = emp;
                    const created = await api.addEmployee(rest);
                    employeeIdMap.set(oldId, created.id);
                }
                for (const t of data.transactions || []) {
                    await api.addTransaction({
                        date: t.date, type: t.type, category: t.category, description: t.description,
                        amount: t.amount, currency: t.currency,
                        clientId: clientIdMap.get(t.clientId) || '', supplierId: supplierIdMap.get(t.supplierId) || ''
                    });
                }
                for (const inv of data.invoices || []) {
                    const lineItems = (inv.lineItems || []).map(li => ({ ...li, productId: productIdMap.get(li.productId) || li.productId }));
                    // Raqam berilmaydi - additiv restore bir xil invoice raqamini takrorlamasligi kerak (server o'zi yangi raqam beradi)
                    await api.addInvoice({
                        date: inv.date, description: inv.description, currency: inv.currency,
                        clientId: clientIdMap.get(inv.clientId) || '', lineItems
                    });
                }
                for (const rec of data.productionRecipes || []) {
                    const materials = (rec.materials || []).map(m => ({ ...m, productId: productIdMap.get(m.productId) || m.productId }));
                    await api.addProductionRecipe({ name: rec.name, finishedProductId: productIdMap.get(rec.finishedProductId) || rec.finishedProductId, materials });
                }
                for (const order of data.productionOrders || []) {
                    const materials = (order.materials || []).map(m => ({ ...m, productId: productIdMap.get(m.productId) || m.productId }));
                    await api.addProductionOrder({
                        finishedProductId: productIdMap.get(order.finishedProductId) || order.finishedProductId,
                        producedQuantity: order.producedQuantity, materials, date: order.date, description: order.description
                    });
                }
                for (const doc of data.documents || []) {
                    await api.addDocument({ type: doc.type, number: doc.number, date: doc.date, clientId: clientIdMap.get(doc.clientId) || '', html: doc.html });
                }
                if (data.companyInfo) await api.updateCompanyInfo(data.companyInfo);
                if (data.settings) await api.updateSettings(data.settings);

                alert('Ma\'lumotlar muvaffaqiyatli qaytarildi. Sahifa yangilanadi...');
                window.location.reload();
            } catch (error) {
                this.showMessage('Faylni qayta ishlashda xato: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    async clearAllData() {
        if (!this.canEditSettings()) {
            this.showMessage('Faqat administrator barcha ma\'lumotlarni o\'chira oladi', 'error');
            return;
        }
        if (!confirm('DIQQAT: bu serverdagi umumiy (barcha foydalanuvchilar ko\'radigan) ma\'lumotlarni butunlay o\'chiradi. Davom etilsinmi?')) {
            return;
        }
        if (!confirm('Ishonchingiz komilmi? Bu amalni orqaga qaytarib bo\'lmaydi.')) {
            return;
        }

        try {
            const [clients, suppliers, products, transactions, invoices, employees,
                productionRecipes, productionOrders, documents] = await Promise.all([
                api.getClients(), api.getSuppliers(), api.getProducts(), api.getTransactions(), api.getInvoices(),
                api.getEmployees(), api.getProductionRecipes(), api.getProductionOrders(), api.getDocuments()
            ]);
            await Promise.all(documents.map(d => api.deleteDocument(d.id)));
            await Promise.all(invoices.map(i => api.deleteInvoice(i.id)));
            await Promise.all(productionOrders.map(o => api.deleteProductionOrder(o.id)));
            await Promise.all(productionRecipes.map(r => api.deleteProductionRecipe(r.id)));
            await Promise.all(transactions.map(t => api.deleteTransaction(t.id)));
            await Promise.all(employees.map(e => api.deleteEmployee(e.id)));
            await Promise.all(products.map(p => api.deleteProduct(p.id)));
            await Promise.all(clients.map(c => api.deleteClient(c.id)));
            await Promise.all(suppliers.map(s => api.deleteSupplier(s.id)));
        } catch (err) {
            this.showMessage('Tozalashda xato: ' + err.message, 'error');
            return;
        }

        this.showMessage('Barcha ma\'lumotlar o\'chirildi', 'success');
        setTimeout(() => window.location.reload(), 1500);
    }

    // ==================== EXCEL IMPORT/EXPORT ====================

    reportImportResult(label, imported, errors, extraMsg) {
        const base = extraMsg || `${label}: ${imported} ta qator import qilindi`;
        if (errors && errors.length) {
            const preview = errors.slice(0, 5).join('\n');
            const more = errors.length > 5 ? `\n... yana ${errors.length - 5} ta xato` : '';
            this.showMessage(`${base}. ${errors.length} ta qatorda xato bor.`, imported > 0 ? 'success' : 'error');
            alert(`Import xatolari:\n${preview}${more}`);
        } else {
            this.showMessage(base, 'success');
        }
    }

    resolveProductCategory(value) {
        const keys = ['electronics', 'clothing', 'food', 'furniture', 'materials', 'other'];
        if (!value) return 'other';
        const v = String(value).toLowerCase().trim();
        if (keys.includes(v)) return v;
        const found = keys.find(k => v.includes(k) || this.getCategoryLabel(k).toLowerCase().includes(v));
        return found || 'other';
    }

    resolveSupplierProductType(value) {
        const keys = ['materials', 'equipment', 'services', 'transport', 'other'];
        if (!value) return '';
        const v = String(value).toLowerCase().trim();
        if (keys.includes(v)) return v;
        const found = keys.find(k => v.includes(k) || this.getProductTypeLabel(k).toLowerCase().includes(v));
        return found || '';
    }

    // Products
    async exportProductsToExcel() {
        const products = await api.getProducts();
        const rows = products.map(p => ({
            name: p.name, category: this.getCategoryLabel(p.category), unit: p.unit,
            minStock: p.minStock, purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice,
            default_currency: p.default_currency, stock: p.stock
        }));
        excelManager.exportRows('products', rows);
        this.showMessage(`${rows.length} ta mahsulot Excel'ga eksport qilindi`, 'success');
    }

    async importProductsFromExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const { rows, errors } = await excelManager.readFile('products', file);
            const defaultCurrency = (this.settings && this.settings.defaultCurrency) || 'UZS';
            let imported = 0;
            for (const r of rows) {
                if (!r.name) continue;
                await api.addProduct({
                    name: r.name,
                    category: this.resolveProductCategory(r.category),
                    unit: r.unit || 'dona',
                    minStock: r.minStock || 10,
                    purchasePrice: r.purchasePrice || 0,
                    sellingPrice: r.sellingPrice || 0,
                    default_currency: r.default_currency || defaultCurrency
                });
                imported++;
            }
            await this.loadInventory();
            await this.updateProductDropdowns();
            this.reportImportResult('Mahsulotlar', imported, errors);
        } catch (err) {
            this.showMessage('Import xatosi: ' + err.message, 'error');
        }
        e.target.value = '';
    }

    // Clients
    async exportClientsToExcel() {
        const clients = await api.getClients();
        const rows = clients.map(c => ({ name: c.name, stir: c.stir, phone: c.phone, address: c.address }));
        excelManager.exportRows('clients', rows);
        this.showMessage(`${rows.length} ta mijoz Excel'ga eksport qilindi`, 'success');
    }

    async importClientsFromExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const { rows, errors } = await excelManager.readFile('clients', file);
            let imported = 0;
            for (const r of rows) {
                if (!r.name) continue;
                await api.addClient({ name: r.name, stir: r.stir || '', phone: r.phone || '', address: r.address || '' });
                imported++;
            }
            await this.displayClients();
            await this.updateClientDropdowns();
            await this.updateSupplierDropdowns();
            this.reportImportResult('Mijozlar', imported, errors);
        } catch (err) {
            this.showMessage('Import xatosi: ' + err.message, 'error');
        }
        e.target.value = '';
    }

    // Suppliers
    async exportSuppliersToExcel() {
        const suppliers = await api.getSuppliers();
        const rows = suppliers.map(s => ({
            name: s.name, stir: s.stir, phone: s.phone, address: s.address,
            productType: this.getProductTypeLabel(s.productType)
        }));
        excelManager.exportRows('suppliers', rows);
        this.showMessage(`${rows.length} ta yetkazib beruvchi Excel'ga eksport qilindi`, 'success');
    }

    async importSuppliersFromExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const { rows, errors } = await excelManager.readFile('suppliers', file);
            let imported = 0;
            for (const r of rows) {
                if (!r.name) continue;
                await api.addSupplier({
                    name: r.name, stir: r.stir || '', phone: r.phone || '', address: r.address || '',
                    productType: this.resolveSupplierProductType(r.productType)
                });
                imported++;
            }
            await this.displaySuppliers();
            await this.updateSupplierDropdowns();
            this.reportImportResult('Yetkazib beruvchilar', imported, errors);
        } catch (err) {
            this.showMessage('Import xatosi: ' + err.message, 'error');
        }
        e.target.value = '';
    }

    // Transactions
    async exportTransactionsToExcel() {
        const [clients, suppliers, transactions] = await Promise.all([api.getClients(), api.getSuppliers(), api.getTransactions()]);
        const clientMap = new Map(clients.map(c => [c.id, c]));
        const supplierMap = new Map(suppliers.map(s => [s.id, s]));
        const rows = transactions.map(t => ({
            date: t.date ? String(t.date).split('T')[0] : '',
            type: t.type,
            category: t.category,
            clientName: clientMap.get(t.clientId)?.name || '',
            supplierName: supplierMap.get(t.supplierId)?.name || '',
            amount: t.amount,
            currency: t.currency || '',
            description: t.description || ''
        }));
        excelManager.exportRows('transactions', rows);
        this.showMessage(`${rows.length} ta tranzaksiya Excel'ga eksport qilindi`, 'success');
    }

    async importTransactionsFromExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const { rows, errors } = await excelManager.readFile('transactions', file);
            let imported = 0, createdClients = 0, createdSuppliers = 0;
            let [clients, suppliers] = await Promise.all([api.getClients(), api.getSuppliers()]);

            for (const r of rows) {
                if (!r.date || !r.amount) continue;
                const t = String(r.type || '').toLowerCase();
                let type = null;
                if (t.includes('income') || t.includes('daromad') || t.includes('xarid')) type = 'income';
                else if (t.includes('expense') || t.includes('chiqim') || t.includes('xaraj')) type = 'expense';
                if (!type) {
                    errors.push(`${r.__row}-qator: "Turi" ustuni income yoki expense bo'lishi kerak`);
                    continue;
                }

                let clientId = '';
                if (r.clientName) {
                    let client = clients.find(c => (c.name || '').toLowerCase() === String(r.clientName).toLowerCase());
                    if (!client) { client = await api.addClient({ name: r.clientName }); clients.push(client); createdClients++; }
                    clientId = client.id;
                }
                let supplierId = '';
                if (r.supplierName) {
                    let supplier = suppliers.find(s => (s.name || '').toLowerCase() === String(r.supplierName).toLowerCase());
                    if (!supplier) { supplier = await api.addSupplier({ name: r.supplierName }); suppliers.push(supplier); createdSuppliers++; }
                    supplierId = supplier.id;
                }

                await api.addTransaction({
                    date: r.date, clientId, supplierId, type,
                    category: r.category || 'other',
                    amount: r.amount, currency: r.currency || '',
                    description: r.description || ''
                });
                imported++;
            }

            await this.displayTransactions();
            await this.loadDashboard();
            await this.updateClientDropdowns();
            await this.updateSupplierDropdowns();

            let msg = `Tranzaksiyalar: ${imported} ta qator import qilindi`;
            if (createdClients) msg += `, ${createdClients} ta yangi mijoz avtomatik yaratildi`;
            if (createdSuppliers) msg += `, ${createdSuppliers} ta yangi yetkazib beruvchi avtomatik yaratildi`;
            this.reportImportResult('Tranzaksiyalar', imported, errors, msg);
        } catch (err) {
            this.showMessage('Import xatosi: ' + err.message, 'error');
        }
        e.target.value = '';
    }

    // Employees
    async exportEmployeesToExcel() {
        const employees = await api.getEmployees();
        const rows = employees.map(emp => ({
            name: emp.name, position: emp.position, salary: emp.salary, taxRate: emp.taxRate
        }));
        excelManager.exportRows('employees', rows);
        this.showMessage(`${rows.length} ta xodim Excel'ga eksport qilindi`, 'success');
    }

    async importEmployeesFromExcel(e) {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const { rows, errors } = await excelManager.readFile('employees', file);
            const settings = await api.getSettings();
            const defaultNdfl = settings.taxNDFL || 12;
            let imported = 0;
            for (const r of rows) {
                if (!r.name) continue;
                await api.addEmployee({
                    name: r.name, position: r.position || '',
                    salary: r.salary || 0,
                    taxRate: r.taxRate || defaultNdfl
                });
                imported++;
            }
            await this.displayEmployees();
            await this.updateEmployeeDropdowns();
            this.reportImportResult('Xodimlar', imported, errors);
        } catch (err) {
            this.showMessage('Import xatosi: ' + err.message, 'error');
        }
        e.target.value = '';
    }

    // Invoices (export only - ko'p qatorli hujjat bo'lgani uchun import qo'llab-quvvatlanmaydi)
    async exportInvoicesToExcel() {
        const [clients, invoices] = await Promise.all([api.getClients(), api.getInvoices()]);
        const rows = invoices.map(inv => ({
            number: inv.number,
            date: inv.date ? String(inv.date).split('T')[0] : '',
            clientName: (clients.find(c => c.id === inv.clientId) || {}).name || '',
            subtotal: inv.subtotal !== undefined ? inv.subtotal : inv.total,
            vatAmount: inv.vatAmount || 0,
            total: inv.total,
            status: inv.status,
            description: inv.description || ''
        }));
        excelManager.exportRows('invoices', rows);
        this.showMessage(`${rows.length} ta savdo hujjati Excel'ga eksport qilindi`, 'success');
    }

    // INVENTORY METHODS
    async loadInventory() {
        await this.updateInventoryStats();
        await this.displayProducts();
        await this.updateProductDropdowns();
    }

    async updateInventoryStats() {
        const products = await api.getProducts();
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

    async handleAddProduct(e) {
        e.preventDefault();

        const defaultCurrency = (this.settings && this.settings.defaultCurrency) || 'UZS';
        const selectedCurrency = document.getElementById('productCurrency')?.value;
        const product = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            unit: document.getElementById('productUnit').value,
            minStock: parseInt(document.getElementById('minStock').value) || 10,
            purchasePrice: parseFloat(document.getElementById('purchasePrice').value) || 0,
            sellingPrice: parseFloat(document.getElementById('sellingPrice').value) || 0,
            default_currency: selectedCurrency || defaultCurrency
        };

        try {
            await api.addProduct(product);
        } catch (err) {
            this.showMessage('Mahsulot qo\'shishda xato: ' + err.message, 'error');
            return;
        }

        document.getElementById('addProductModal').style.display = 'none';
        await this.loadInventory();
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
            if (quantityLabel) quantityLabel.textContent = 'Miqdor:';
        } else if (type === 'out') {
            title.textContent = 'Ombor Chiqimi';
            submitBtn.textContent = 'Chiqim qilish';
            if (quantityLabel) quantityLabel.textContent = 'Miqdor:';
        } else {
            title.textContent = 'Zahira Tuzatish';
            submitBtn.textContent = 'Tuzatish';
            if (quantityLabel) quantityLabel.textContent = 'Yangi zahira miqdori:';
        }

        this.currentMovementType = type;
        modal.style.display = 'block';
        document.getElementById('stockMovementForm').reset();
        document.getElementById('movementDate').value = new Date().toISOString().split('T')[0];
        this.updateProductDropdowns();
    }

    async handleStockMovement(e) {
        e.preventDefault();

        const productId = document.getElementById('movementProduct').value;
        const quantity = parseInt(document.getElementById('movementQuantity').value);
        const date = document.getElementById('movementDate').value;
        const description = document.getElementById('movementDescription').value;

        if (!productId || isNaN(quantity)) {
            this.showMessage('Mahsulot va miqdorni to\'g\'ri kiriting', 'error');
            return;
        }

        try {
            await api.addInventoryMovement({ productId, type: this.currentMovementType, quantity, date, description });
        } catch (err) {
            this.showMessage('Harakatni saqlashda xato: ' + err.message, 'error');
            return;
        }

        document.getElementById('stockMovementModal').style.display = 'none';
        await this.loadInventory();
        this.showMessage('Harakat muvaffaqiyatli amalga oshirildi', 'success');
    }

    async displayProducts() {
        const products = await api.getProducts();
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

    async filterProducts() {
        const searchTerm = document.getElementById('productSearch').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;
        const stockFilter = document.getElementById('stockFilter').value;

        let products = await api.getProducts();

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

    async updateProductDropdowns() {
        const products = await api.getProducts();
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

    async editProduct(productId) {
        const product = await api.getProductById(productId);
        if (!product) return;

        // For now, just show a message. Could implement full edit modal later
        this.showMessage('Tahrirlash funksiyasi tez orada qo\'shiladi', 'warning');
    }

    async deleteProduct(productId) {
        if (!this.canDelete()) {
            this.showMessage('Faqat menejeri va administratorlar o\'chira oladi', 'error');
            return;
        }
        if (!confirm('Mahsulotni o\'chirishni xohlaysizmi? Bu harakatni bekor qilib bo\'lmaydi.')) return;

        try {
            await api.deleteProduct(productId);
        } catch (err) {
            this.showMessage('O\'chirishda xato: ' + err.message, 'error');
            return;
        }
        await this.loadInventory();
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
            'social_tax': '🏛️ Ijtimoiy soliq (ISHV)',
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
