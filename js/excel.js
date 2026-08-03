/**
 * Excel Manager - SheetJS (xlsx.full.min.js) asosida import/eksport
 * Har bir bo'lim (mahsulotlar, mijozlar va h.k.) uchun ustunlar tavsifi shu yerda saqlanadi.
 */
class ExcelManager {
    constructor() {
        // entity -> { sheetName, columns: [{ key, label, required, type }] }
        this.schemas = {
            products: {
                sheetName: 'Mahsulotlar',
                filePrefix: 'Mahsulotlar',
                columns: [
                    { key: 'name', label: 'Nomi', required: true, type: 'string' },
                    { key: 'category', label: 'Kategoriya', required: false, type: 'string' },
                    { key: 'unit', label: 'Birlik', required: false, type: 'string' },
                    { key: 'minStock', label: 'Min. zahira', required: false, type: 'number' },
                    { key: 'purchasePrice', label: 'Sotib olish narxi', required: false, type: 'number' },
                    { key: 'sellingPrice', label: 'Sotish narxi', required: false, type: 'number' },
                    { key: 'default_currency', label: 'Valyuta', required: false, type: 'string' },
                    { key: 'stock', label: 'Joriy zahira', required: false, type: 'number' }
                ]
            },
            clients: {
                sheetName: 'Mijozlar',
                filePrefix: 'Mijozlar',
                columns: [
                    { key: 'name', label: 'Nomi/Kompaniya', required: true, type: 'string' },
                    { key: 'stir', label: 'STIR', required: false, type: 'string' },
                    { key: 'phone', label: 'Telefon', required: false, type: 'string' },
                    { key: 'address', label: 'Manzil', required: false, type: 'string' }
                ]
            },
            suppliers: {
                sheetName: 'YetkazibBeruvchilar',
                filePrefix: 'YetkazibBeruvchilar',
                columns: [
                    { key: 'name', label: 'Nomi/Kompaniya', required: true, type: 'string' },
                    { key: 'stir', label: 'STIR', required: false, type: 'string' },
                    { key: 'phone', label: 'Telefon', required: false, type: 'string' },
                    { key: 'address', label: 'Manzil', required: false, type: 'string' },
                    { key: 'productType', label: 'Mahsulot turi', required: false, type: 'string' }
                ]
            },
            transactions: {
                sheetName: 'Tranzaksiyalar',
                filePrefix: 'Tranzaksiyalar',
                columns: [
                    { key: 'date', label: 'Sana', required: true, type: 'string' },
                    { key: 'type', label: 'Turi (income/expense)', required: true, type: 'string' },
                    { key: 'category', label: 'Kategoriya', required: false, type: 'string' },
                    { key: 'clientName', label: 'Mijoz', required: false, type: 'string' },
                    { key: 'supplierName', label: 'Yetkazib beruvchi', required: false, type: 'string' },
                    { key: 'amount', label: 'Summa', required: true, type: 'number' },
                    { key: 'currency', label: 'Valyuta', required: false, type: 'string' },
                    { key: 'description', label: 'Tavsif', required: false, type: 'string' }
                ]
            },
            employees: {
                sheetName: 'Xodimlar',
                filePrefix: 'Xodimlar',
                columns: [
                    { key: 'name', label: 'Ism Familiya', required: true, type: 'string' },
                    { key: 'position', label: 'Lavozim', required: false, type: 'string' },
                    { key: 'salary', label: 'Oylik maosh', required: false, type: 'number' },
                    { key: 'taxRate', label: 'JShDS stavkasi (%)', required: false, type: 'number' }
                ]
            },
            invoices: {
                sheetName: 'Savdo',
                filePrefix: 'Savdo_Hujjatlari',
                columns: [
                    { key: 'number', label: 'Invoice №', required: false, type: 'string' },
                    { key: 'date', label: 'Sana', required: false, type: 'string' },
                    { key: 'clientName', label: 'Mijoz', required: false, type: 'string' },
                    { key: 'subtotal', label: 'Summa (QQSsiz)', required: false, type: 'number' },
                    { key: 'vatAmount', label: 'QQS summasi', required: false, type: 'number' },
                    { key: 'total', label: 'Jami (QQS bilan)', required: false, type: 'number' },
                    { key: 'status', label: 'Holat', required: false, type: 'string' },
                    { key: 'description', label: 'Tavsif', required: false, type: 'string' }
                ]
            }
        };
    }

    getSchema(entity) {
        const schema = this.schemas[entity];
        if (!schema) throw new Error(`Noma'lum Excel sxemasi: ${entity}`);
        return schema;
    }

    // rows: array of plain objects keyed by column.key
    exportRows(entity, rows) {
        const schema = this.getSchema(entity);
        const header = schema.columns.map(c => c.label);
        const aoa = [header];
        (rows || []).forEach(row => {
            aoa.push(schema.columns.map(c => {
                const v = row[c.key];
                return v === undefined || v === null ? '' : v;
            }));
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = schema.columns.map(() => ({ wch: 20 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, schema.sheetName);
        const fileName = `${schema.filePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    downloadTemplate(entity) {
        const schema = this.getSchema(entity);
        const header = schema.columns.map(c => c.label);
        const ws = XLSX.utils.aoa_to_sheet([header]);
        ws['!cols'] = schema.columns.map(() => ({ wch: 20 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, schema.sheetName);
        XLSX.writeFile(wb, `${schema.filePrefix}_Shablon.xlsx`);
    }

    // Returns Promise<{ rows: Array<object>, errors: string[] }>
    readFile(entity, file) {
        const schema = this.getSchema(entity);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Faylni o\'qib bo\'lmadi'));
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const firstSheetName = wb.SheetNames[0];
                    const sheet = wb.Sheets[firstSheetName];
                    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });

                    if (aoa.length === 0) {
                        resolve({ rows: [], errors: ['Fayl bo\'sh'] });
                        return;
                    }

                    const headerRow = aoa[0].map(h => String(h || '').trim().toLowerCase());
                    const colIndexByKey = {};
                    schema.columns.forEach(c => {
                        const idx = headerRow.findIndex(h => h === c.label.toLowerCase());
                        if (idx !== -1) colIndexByKey[c.key] = idx;
                    });

                    const errors = [];
                    const rows = [];

                    for (let r = 1; r < aoa.length; r++) {
                        const line = aoa[r];
                        if (!line || line.every(v => v === '' || v === undefined || v === null)) continue;

                        const obj = {};
                        let rowHasError = false;
                        schema.columns.forEach(c => {
                            const idx = colIndexByKey[c.key];
                            let val = idx !== undefined ? line[idx] : '';
                            if (val === undefined || val === null) val = '';
                            if (typeof val === 'string') val = val.trim();

                            if (c.type === 'number') {
                                if (val === '') {
                                    val = 0;
                                } else {
                                    const num = parseFloat(String(val).replace(/,/g, ''));
                                    if (isNaN(num)) {
                                        errors.push(`${r + 1}-qator: "${c.label}" ustunida noto'g'ri son: "${val}"`);
                                        rowHasError = true;
                                        val = 0;
                                    } else {
                                        val = num;
                                    }
                                }
                            }

                            if (c.required && (val === '' || val === undefined)) {
                                errors.push(`${r + 1}-qator: "${c.label}" majburiy ustun to'ldirilmagan`);
                                rowHasError = true;
                            }

                            obj[c.key] = val;
                        });

                        if (!rowHasError || Object.keys(obj).length) {
                            obj.__row = r + 1;
                            rows.push(obj);
                        }
                    }

                    resolve({ rows, errors });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }
}

const excelManager = new ExcelManager();
