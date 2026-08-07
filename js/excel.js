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
                    { key: 'bankAccount', label: 'Xisob raqami', required: false, type: 'string' },
                    { key: 'mfo', label: 'MFO', required: false, type: 'string' },
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
                    { key: 'bankAccount', label: 'Xisob raqami', required: false, type: 'string' },
                    { key: 'mfo', label: 'MFO', required: false, type: 'string' },
                    { key: 'phone', label: 'Telefon', required: false, type: 'string' },
                    { key: 'address', label: 'Manzil', required: false, type: 'string' },
                    { key: 'productType', label: 'Mahsulot turi', required: false, type: 'string' }
                ]
            },
            transactions: {
                sheetName: 'Tranzaksiyalar',
                filePrefix: 'Tranzaksiyalar',
                // Bank ko'chirmasi eksport formatiga mos ustun tartibi
                columns: [
                    { key: 'date', label: 'Sana', required: true, type: 'string' },
                    { key: 'partyInfo', label: 'Tashkilot xisob raqami/Tashkilot STIRi/Tashkilot nomi', required: false, type: 'string' },
                    { key: 'docNumber', label: 'Dokument raqami', required: false, type: 'string' },
                    { key: 'mfo', label: 'MFO', required: false, type: 'string' },
                    { key: 'debit', label: 'Debet', required: false, type: 'number' },
                    { key: 'credit', label: 'Kredit', required: false, type: 'number' },
                    { key: 'description', label: "To'lov maqsadi", required: false, type: 'string' },
                    { key: 'type', label: 'Turi (income/expense)', required: true, type: 'string' },
                    { key: 'category', label: 'Kategoriyasi', required: false, type: 'string' }
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
            }
        };

        // soliq.uz/Didox uslubidagi "docs_<STIR>.xlsx" eksport formati — har bir hisob-faktura
        // bitta "sarlavha" (Общ.) qatori va shundan keyingi bir nechta tovar qatoridan iborat.
        this.docExchangeHeader = [
            '/', 'Дата документ', 'Договор номер', 'Договор дата',
            'Продавец (ИНН или ПИНФЛ)', 'Продавец (наименование)', 'Продавец (расчётный счёт)', 'Продавец (МФО банка)',
            'Покупатель (ИНН или ПИНФЛ)', 'Покупатель (наименование)', 'Покупатель (расчётный счёт)', 'Покупатель (МФО банка)',
            '№', 'Примечание к товару (работе, услуге)', 'Единица измерения',
            'Количество', 'Цена', 'Стоимость поставки', 'НДС ставка', 'НДС сумма', 'Стоимость поставки с учётом НДС'
        ];
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

    // ==================== ELEKTRON HUJJATLAR ALMASHINUVI (soliq.uz/Didox "docs_<STIR>.xlsx" formati) ====================

    round2(n) {
        return Math.round(((parseFloat(n) || 0) + Number.EPSILON) * 100) / 100;
    }

    // "DD-MM-YYYY" yoki Excel sana kodini "YYYY-MM-DD" ga o'giradi
    parseDMY(val) {
        if (val === undefined || val === null || val === '') return '';
        if (typeof val === 'number') {
            const parsed = XLSX.SSF && XLSX.SSF.parse_date_code ? XLSX.SSF.parse_date_code(val) : null;
            if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
        const str = String(val).trim();
        const dmy = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
        if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
        const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return iso[0];
        return str;
    }

    // "YYYY-MM-DD" ni "DD-MM-YYYY" ga o'giradi (eksport uchun, fayldagi asl format)
    formatDMY(iso) {
        if (!iso) return '';
        const [y, m, d] = String(iso).split('-');
        if (!y || !m || !d) return '';
        return `${d}-${m}-${y}`;
    }

    // Faylni o'qib, har bir hisob-fakturani { date, contractNumber, contractDate,
    // sellerStir/Name/Account/Mfo, buyerStir/Name/Account/Mfo, vatRate, items[] } blokiga ajratadi.
    // Bloklar "Дата документ" ustuni to'ldirilgan qatordan boshlanadi, undan keyingi bo'sh
    // sarlavhali qatorlar o'sha hujjatning tovar/xizmat qatorlari hisoblanadi.
    readDocExchangeFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Faylni o\'qib bo\'lmadi'));
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });

                    const errors = [];
                    const blocks = [];
                    let current = null;

                    for (let r = 1; r < aoa.length; r++) {
                        const row = aoa[r];
                        if (!row || row.every(v => v === '' || v === undefined || v === null)) continue;

                        // Sarlavha qatori sotuvchi yoki xaridor STIRi bo'yicha aniqlanadi (sana ustuni ba'zi
                        // eksport variantlarida har bir qatorda takrorlanishi mumkin, shu sabab ishonchli emas).
                        const isHeaderRow = String(row[4] || '').trim() !== '' || String(row[8] || '').trim() !== '';
                        if (isHeaderRow) {
                            if (current) blocks.push(current);
                            current = {
                                __row: r + 1,
                                date: this.parseDMY(row[1]),
                                contractNumber: String(row[2] || '').trim(),
                                contractDate: this.parseDMY(row[3]),
                                sellerStir: String(row[4] || '').trim(),
                                sellerName: String(row[5] || '').trim().replace(/"/g, ''),
                                sellerAccount: String(row[6] || '').trim(),
                                sellerMfo: String(row[7] || '').trim(),
                                buyerStir: String(row[8] || '').trim(),
                                buyerName: String(row[9] || '').trim().replace(/"/g, ''),
                                buyerAccount: String(row[10] || '').trim(),
                                buyerMfo: String(row[11] || '').trim(),
                                vatRate: 12,
                                items: []
                            };
                        }
                        if (!current) continue;

                        const lineNo = row[12];
                        const isItemRow = lineNo !== '' && lineNo !== undefined && lineNo !== null
                            && lineNo !== 'Общ.' && !isNaN(parseFloat(lineNo));
                        if (isItemRow) {
                            const vatRate = parseFloat(row[18]);
                            if (!isNaN(vatRate)) current.vatRate = vatRate;
                            current.items.push({
                                name: String(row[13] || '').trim(),
                                unit: String(row[14] || '').trim() || 'dona',
                                quantity: parseFloat(row[15]) || 0,
                                price: parseFloat(row[16]) || 0
                            });
                        }
                    }
                    if (current) blocks.push(current);

                    blocks.forEach(b => {
                        if (!b.items.length) errors.push(`${b.__row}-qator: hujjatda tovar/xizmat qatorlari topilmadi`);
                        if (!b.sellerStir && !b.buyerStir) errors.push(`${b.__row}-qator: sotuvchi va xaridor STIRi bo'sh`);
                    });

                    resolve({ blocks, errors });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // blocks: [{ date, contractNumber, contractDate, seller:{stir,name,bankAccount,mfo},
    //            buyer:{stir,name,bankAccount,mfo}, vatRate, items:[{name,unit,quantity,price}] }]
    exportDocExchange(blocks) {
        const aoa = [this.docExchangeHeader];
        (blocks || []).forEach(b => {
            const vatRate = parseFloat(b.vatRate) || 0;
            const totalQty = b.items.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0);
            const totalSupply = b.items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.price) || 0), 0);
            const totalVat = totalSupply * vatRate / 100;
            const avgPrice = totalQty ? totalSupply / totalQty : 0;
            const dateFmt = this.formatDMY(b.date);

            aoa.push([
                dateFmt ? dateFmt.slice(0, 5) : '', dateFmt, b.contractNumber || '', this.formatDMY(b.contractDate),
                b.seller.stir || '', b.seller.name || '', b.seller.bankAccount || '', b.seller.mfo || '',
                b.buyer.stir || '', b.buyer.name || '', b.buyer.bankAccount || '', b.buyer.mfo || '',
                'Общ.', '', '', totalQty, this.round2(avgPrice), this.round2(totalSupply), String(vatRate), this.round2(totalVat), this.round2(totalSupply + totalVat)
            ]);

            b.items.forEach((it, idx) => {
                const qty = parseFloat(it.quantity) || 0;
                const price = parseFloat(it.price) || 0;
                const supply = qty * price;
                const vat = supply * vatRate / 100;
                aoa.push([
                    '', '', '', '', '', '', '', '', '', '', '', '',
                    idx + 1, it.name || '', it.unit || 'dona', qty, this.round2(price), this.round2(supply), vatRate, this.round2(vat), this.round2(supply + vat)
                ]);
            });
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = this.docExchangeHeader.map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Hisob-fakturalar');
        XLSX.writeFile(wb, `Hisob_fakturalar_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    downloadDocExchangeTemplate() {
        const sample = [
            '02/08', '06-08-2026', '13', '27-04-2026',
            '301758771', '"NAMUNA KORXONA" MCHJ', '20208000000000000001', '00433',
            '305982999', '"XARIDOR KORXONA" MCHJ', '20208000000000000002', '01087',
            'Общ.', '', '', 10, 100000, 1000000, '12', 120000, 1120000
        ];
        const sampleItem = [
            '', '', '', '', '', '', '', '', '', '', '', '',
            1, 'Mahsulot yoki xizmat nomi', 'dona', 10, 100000, 1000000, 12, 120000, 1120000
        ];
        const ws = XLSX.utils.aoa_to_sheet([this.docExchangeHeader, sample, sampleItem]);
        ws['!cols'] = this.docExchangeHeader.map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Hisob-fakturalar');
        XLSX.writeFile(wb, 'Hisob_fakturalar_Shablon.xlsx');
    }

    // Mijozlar/Yetkazib beruvchilar davr bo'yicha qarzdorlik-haqdorlik hisoboti
    // ("Mijozlar_<boshi>_<oxiri>.xlsx" andazasiga mos): rows: [{name, stir, opening, debit, credit, closing}]
    exportPartyBalanceReport(kind, rows, fromDate, toDate) {
        const isSupplier = kind === 'supplier';
        const header = ['#', 'Tashkilot nomi', 'Tashkilot Stiri', "Boshlanish qoldig'i", 'Debet', 'Kredit', "Yakuniy qoldiq (so'm)"];
        const aoa = [header];
        const totals = { opening: 0, debit: 0, credit: 0, closing: 0 };
        (rows || []).forEach((r, i) => {
            aoa.push([i + 1, r.name, r.stir || '', this.round2(r.opening), this.round2(r.debit), this.round2(r.credit), this.round2(r.closing)]);
            totals.opening += r.opening || 0;
            totals.debit += r.debit || 0;
            totals.credit += r.credit || 0;
            totals.closing += r.closing || 0;
        });
        aoa.push(['', 'JAMI:', '', this.round2(totals.opening), this.round2(totals.debit), this.round2(totals.credit), this.round2(totals.closing)]);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        const sheetName = isSupplier ? 'YetkazibBeruvchilar' : 'Mijozlar';
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${sheetName}_${this.formatDMY(fromDate)}_${this.formatDMY(toDate)}.xlsx`);
    }
}

const excelManager = new ExcelManager();
