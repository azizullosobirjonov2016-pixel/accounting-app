/**
 * Document Manager - Yuridik shaxslar uchun Soliq Kodeksi bo'yicha majburiy
 * asosiy hujjatlar (hisob-faktura, akt, shartnoma, kassa order, ishonchnoma) shablonlari.
 */
class DocumentManager {
    constructor() {
        this.typeLabels = {
            'invoice-faktura': 'Elektron hisob-faktura',
            'act': "Bajarilgan ish-xizmatlar to'g'risida dalolatnoma (Akt)",
            'contract': 'Shartnoma',
            'cash-in': 'Kassa kirim orderi (PKO)',
            'cash-out': 'Kassa chiqim orderi (RKO)',
            'power-of-attorney': 'Ishonchnoma',
            'reconciliation-act': 'Solishtirma dalolatnoma'
        };

        // Har bir hujjat turi uchun qo'shimcha (dinamik) maydonlar tavsifi
        this.fieldConfigs = {
            'invoice-faktura': { needsClient: true, needsInvoice: true, fields: [] },
            'act': { needsClient: true, needsInvoice: true, fields: [] },
            'contract': {
                needsClient: true, needsInvoice: false, fields: [
                    { id: 'docContractSubject', label: 'Shartnoma predmeti', type: 'text', placeholder: 'masalan: Tovar yetkazib berish' },
                    { id: 'docContractAmount', label: "Shartnoma summasi (so'm)", type: 'number' },
                    { id: 'docContractTerm', label: 'Amal qilish muddati', type: 'text', placeholder: 'masalan: 31.12.2026 gacha' }
                ]
            },
            'cash-in': {
                needsClient: false, needsInvoice: false, fields: [
                    { id: 'docCashParty', label: 'Kimdan qabul qilindi', type: 'text' },
                    { id: 'docCashAmount', label: "Summa (so'm)", type: 'number' },
                    { id: 'docCashBasis', label: 'Asos', type: 'text', placeholder: "masalan: Tovar uchun to'lov" }
                ]
            },
            'cash-out': {
                needsClient: false, needsInvoice: false, fields: [
                    { id: 'docCashParty', label: 'Kimga berildi', type: 'text' },
                    { id: 'docCashAmount', label: "Summa (so'm)", type: 'number' },
                    { id: 'docCashBasis', label: 'Asos', type: 'text', placeholder: "masalan: Xo'jalik xarajati" }
                ]
            },
            'power-of-attorney': {
                needsClient: false, needsInvoice: false, fields: [
                    { id: 'docPoaName', label: 'Vakil F.I.Sh.', type: 'text' },
                    { id: 'docPoaPassport', label: 'Passport seriya va raqami', type: 'text', placeholder: 'AB1234567' },
                    { id: 'docPoaValidUntil', label: 'Amal qilish muddati', type: 'date' },
                    { id: 'docPoaAuthority', label: 'Vakolatlar', type: 'text', placeholder: 'masalan: Tovar-moddiy boyliklarni qabul qilib olish' }
                ]
            },
            'reconciliation-act': { needsClient: false, needsInvoice: false, fields: [], needsReconciliation: true }
        };

        this.ones = ['', 'bir', 'ikki', 'uch', "to'rt", 'besh', 'olti', 'yetti', 'sakkiz', "to'qqiz"];
        this.tens = ['', "o'n", 'yigirma', "o'ttiz", 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', "to'qson"];
        this.scales = ['', ' ming', ' million', ' milliard', ' trillion'];
    }

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str === null || str === undefined ? '' : String(str);
        return div.innerHTML;
    }

    fmt(amount) {
        return (typeof app !== 'undefined' && app.formatNumber) ? app.formatNumber(amount) : Math.round(amount || 0).toLocaleString();
    }

    threeDigitToWords(n) {
        let words = '';
        const h = Math.floor(n / 100);
        const rem = n % 100;
        const t = Math.floor(rem / 10);
        const o = rem % 10;
        if (h > 0) words += this.ones[h] + ' yuz ';
        if (t > 0) words += this.tens[t] + ' ';
        if (o > 0) words += this.ones[o] + ' ';
        return words.trim();
    }

    numberToWords(num) {
        num = Math.floor(Math.abs(num || 0));
        if (num === 0) return 'nol';
        const groups = [];
        let n = num;
        while (n > 0) {
            groups.push(n % 1000);
            n = Math.floor(n / 1000);
        }
        const parts = [];
        for (let i = groups.length - 1; i >= 0; i--) {
            if (groups[i] === 0) continue;
            parts.push(this.threeDigitToWords(groups[i]) + this.scales[i]);
        }
        return parts.join(' ').trim();
    }

    amountInWords(amount) {
        const words = this.numberToWords(amount);
        const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
        return `${capitalized} so'm 00 tiyin`;
    }

    formatDate(dateStr) {
        if (!dateStr) return '____________';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return this.esc(dateStr);
        return d.toLocaleDateString('uz-UZ');
    }

    sumItems(items) {
        if (!items) return 0;
        return items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.price) || 0), 0);
    }

    companyBlock(company, roleLabel) {
        return `
            <div class="doc-party">
                <strong>${this.esc(roleLabel)}:</strong> ${this.esc(company.legalForm)} «${this.esc(company.name) || '____________________'}»<br>
                STIR: ${this.esc(company.stir) || '____________'} | OKED: ${this.esc(company.oked) || '____'}<br>
                Manzil: ${this.esc(company.address) || '____________________'}<br>
                Bank: ${this.esc(company.bankName) || '____________________'}, h/r: ${this.esc(company.bankAccount) || '____________________'}, MFO: ${this.esc(company.mfo) || '_____'}<br>
                Tel: ${this.esc(company.phone) || '____________'}
            </div>`;
    }

    clientBlock(client, roleLabel) {
        if (!client) {
            return `<div class="doc-party"><strong>${this.esc(roleLabel)}:</strong> ____________________</div>`;
        }
        const bankLine = (client.bankAccount || client.mfo)
            ? `h/r: ${this.esc(client.bankAccount) || '____________________'}, MFO: ${this.esc(client.mfo) || '_____'}<br>`
            : '';
        return `
            <div class="doc-party">
                <strong>${this.esc(roleLabel)}:</strong> ${this.esc(client.name)}<br>
                STIR: ${this.esc(client.stir) || '____________'}<br>
                Manzil: ${this.esc(client.address) || '____________________'}<br>
                ${bankLine}Tel: ${this.esc(client.phone) || '____________'}
            </div>`;
    }

    lineItemsTable(items, currency) {
        if (!items || items.length === 0) {
            return '<p class="doc-note">Mahsulot/xizmat qatorlari kiritilmagan.</p>';
        }
        let rows = '';
        items.forEach((item, i) => {
            const sum = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            rows += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${this.esc(item.name)}</td>
                    <td>${this.esc(item.quantity)}</td>
                    <td>${this.fmt(item.price)}</td>
                    <td>${this.fmt(sum)}</td>
                </tr>`;
        });
        const total = this.sumItems(items);
        return `
            <table class="doc-table">
                <thead>
                    <tr><th>#</th><th>Nomi</th><th>Miqdori</th><th>Narxi</th><th>Summasi</th></tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr><td colspan="4" style="text-align:right;"><strong>Jami:</strong></td><td><strong>${this.fmt(total)} ${this.esc(currency) || "so'm"}</strong></td></tr>
                </tfoot>
            </table>`;
    }

    signatureBlock(company, extra = '') {
        return `
            <div class="doc-signatures">
                <div class="doc-sign-col">
                    <p>Ijrochi / Sotuvchi:</p>
                    <p>Direktor: ${this.esc(company.director) || '____________________'} &nbsp; imzo: _______________</p>
                    <p>Bosh buxgalter: ${this.esc(company.accountant) || '____________________'} &nbsp; imzo: _______________</p>
                </div>
                <div class="doc-sign-col">
                    <p>Buyurtmachi / Xaridor:</p>
                    <p>_________________________ &nbsp; imzo: _______________</p>
                    ${extra}
                </div>
            </div>
            <p class="doc-stamp-hint">M.O'. (muhr o'rni)</p>`;
    }

    buildInvoiceFaktura(data) {
        const { company, client, date, number, items, currency, vatRate } = data;
        return `
            <div class="doc-header">
                <div class="doc-title">ELEKTRON HISOB-FAKTURA</div>
                <div class="doc-meta">№ ${this.esc(number)} &nbsp;&nbsp; Sana: ${this.formatDate(date)}</div>
            </div>
            <div class="doc-parties">
                ${this.companyBlock(company, 'Sotuvchi')}
                ${this.clientBlock(client, 'Xaridor')}
            </div>
            ${this.lineItemsTable(items, currency)}
            <p><strong>Summasi so'z bilan:</strong> ${this.amountInWords(this.sumItems(items))}</p>
            <p>QQS stavkasi: ${vatRate || 0}%</p>
            ${this.signatureBlock(company)}
        `;
    }

    buildAct(data) {
        const { company, client, date, number, items, currency } = data;
        const total = this.sumItems(items);
        return `
            <div class="doc-header">
                <div class="doc-title">BAJARILGAN ISH-XIZMATLAR TO'G'RISIDA DALOLATNOMA (AKT)</div>
                <div class="doc-meta">№ ${this.esc(number)} &nbsp;&nbsp; Sana: ${this.formatDate(date)}</div>
            </div>
            <p>Biz, quyida imzo chekuvchilar, ${this.esc(company.name) || '____________________'} (Ijrochi) va ${client ? this.esc(client.name) : '____________________'} (Buyurtmachi) ushbu dalolatnomani quyidagilar to'g'risida tuzdik: pastda ko'rsatilgan ish/xizmatlar to'liq va sifatli bajarilgan bo'lib, tomonlarning bir-biriga da'volari yo'q.</p>
            ${this.lineItemsTable(items, currency)}
            <p><strong>Jami summa so'z bilan:</strong> ${this.amountInWords(total)}</p>
            ${this.signatureBlock(company)}
        `;
    }

    buildContract(data) {
        const { company, client, date, number, subject, amount, term } = data;
        return `
            <div class="doc-header">
                <div class="doc-title">SHARTNOMA № ${this.esc(number)}</div>
                <div class="doc-meta">${this.formatDate(date)}</div>
            </div>
            <div class="doc-parties">
                ${this.companyBlock(company, 'Ijrochi (1-tomon)')}
                ${this.clientBlock(client, 'Buyurtmachi (2-tomon)')}
            </div>
            <p><strong>1. Shartnoma predmeti:</strong> ${this.esc(subject) || '____________________'}</p>
            <p><strong>2. Shartnoma summasi:</strong> ${this.fmt(amount)} so'm (${this.amountInWords(amount)})</p>
            <p><strong>3. Amal qilish muddati:</strong> ${this.esc(term) || '____________________'}</p>
            <p><strong>4. Tomonlarning javobgarligi:</strong> Tomonlar ushbu shartnoma majburiyatlarini bajarmagan yoki lozim darajada bajarmagan taqdirda O'zbekiston Respublikasi qonunchiligiga muvofiq javobgar bo'ladilar.</p>
            ${this.signatureBlock(company)}
        `;
    }

    buildCashOrder(data, direction) {
        const { company, date, number, party, amount, basis } = data;
        const title = direction === 'in' ? 'KASSA KIRIM ORDERI (PKO)' : 'KASSA CHIQIM ORDERI (RKO)';
        const partyLabel = direction === 'in' ? 'Kimdan qabul qilindi' : 'Kimga berildi';
        return `
            <div class="doc-header">
                <div class="doc-title">${title}</div>
                <div class="doc-meta">№ ${this.esc(number)} &nbsp;&nbsp; Sana: ${this.formatDate(date)}</div>
            </div>
            ${this.companyBlock(company, 'Tashkilot')}
            <p><strong>${partyLabel}:</strong> ${this.esc(party) || '____________________'}</p>
            <p><strong>Summa:</strong> ${this.fmt(amount)} so'm</p>
            <p><strong>Summasi so'z bilan:</strong> ${this.amountInWords(amount)}</p>
            <p><strong>Asos:</strong> ${this.esc(basis) || '____________________'}</p>
            ${this.signatureBlock(company, '<p>Kassir: _________________________ &nbsp; imzo: _______________</p>')}
        `;
    }

    buildPowerOfAttorney(data) {
        const { company, date, number, poaName, poaPassport, poaValidUntil, poaAuthority } = data;
        return `
            <div class="doc-header">
                <div class="doc-title">ISHONCHNOMA № ${this.esc(number)}</div>
                <div class="doc-meta">${this.formatDate(date)}</div>
            </div>
            ${this.companyBlock(company, 'Beruvchi tashkilot')}
            <p>Ushbu ishonchnoma asosida <strong>${this.esc(poaName) || '____________________'}</strong> (passport: ${this.esc(poaPassport) || '____________________'}) ga ${this.esc(company.name) || '____________________'} nomidan quyidagi vakolatlarni amalga oshirish ishonib topshiriladi:</p>
            <p>${this.esc(poaAuthority) || '____________________'}</p>
            <p><strong>Ishonchnoma amal qilish muddati:</strong> ${this.formatDate(poaValidUntil)} gacha</p>
            <p class="doc-note">Ishonchnoma imzo namunasi tasdiqlangan holda beriladi.</p>
            ${this.signatureBlock(company, '<p>Vakilning imzosi: _______________</p>')}
        `;
    }

    buildReconciliationAct(data) {
        const { company, reconParty: party, reconPartyType: partyType, date, number, fromDate, toDate, openingBalance, rows, closingBalance } = data;
        const partyRoleLabel = partyType === 'supplier' ? 'Yetkazib beruvchi' : 'Mijoz';

        let bodyRows = '';
        let running = openingBalance;
        bodyRows += `
            <tr>
                <td colspan="3" style="text-align:right;"><strong>Davr boshiga saldo:</strong></td>
                <td colspan="2"><strong>${this.fmt(openingBalance)} so'm</strong></td>
            </tr>`;
        (rows || []).forEach(r => {
            running += (r.debit || 0) - (r.credit || 0);
            bodyRows += `
                <tr>
                    <td>${this.formatDate(r.date)}</td>
                    <td>${this.esc(r.description)}</td>
                    <td>${r.debit ? this.fmt(r.debit) : ''}</td>
                    <td>${r.credit ? this.fmt(r.credit) : ''}</td>
                    <td>${this.fmt(running)}</td>
                </tr>`;
        });
        bodyRows += `
            <tr>
                <td colspan="3" style="text-align:right;"><strong>Davr oxiriga saldo:</strong></td>
                <td colspan="2"><strong>${this.fmt(closingBalance)} so'm</strong></td>
            </tr>`;

        const balanceOwner = closingBalance >= 0
            ? `${this.esc(partyRoleLabel)} tomonidan ${this.esc(company.name) || 'tashkilot'}ga`
            : `${this.esc(company.name) || 'Tashkilot'} tomonidan ${this.esc(partyRoleLabel).toLowerCase()}ga`;

        return `
            <div class="doc-header">
                <div class="doc-title">SOLISHTIRMA DALOLATNOMA</div>
                <div class="doc-meta">№ ${this.esc(number)} &nbsp;&nbsp; Sana: ${this.formatDate(date)}</div>
                <div class="doc-meta">${this.formatDate(fromDate)} — ${this.formatDate(toDate)} davr uchun o'zaro hisob-kitoblar bo'yicha</div>
            </div>
            <div class="doc-parties">
                ${this.companyBlock(company, 'Tashkilot')}
                ${this.clientBlock(party, partyRoleLabel)}
            </div>
            <p>Biz, quyida imzo chekuvchilar, ${this.esc(company.name) || '____________________'} va ${party ? this.esc(party.name) : '____________________'} o'rtasida ${this.formatDate(fromDate)} dan ${this.formatDate(toDate)} gacha bo'lgan davrdagi o'zaro hisob-kitoblarni solishtirdik va quyidagini tasdiqlaymiz:</p>
            <table class="doc-table">
                <thead>
                    <tr><th>Sana</th><th>Tavsif</th><th>Debet (qarzga)</th><th>Kredit (to'lov)</th><th>Saldo</th></tr>
                </thead>
                <tbody>${bodyRows}</tbody>
            </table>
            <p><strong>Davr oxiriga saldo:</strong> ${this.fmt(Math.abs(closingBalance))} so'm ${closingBalance === 0 ? '(hisob-kitoblar teng)' : '— ' + balanceOwner + ' foyzasiga qarzdorlik'}</p>
            <p><strong>Saldo so'z bilan:</strong> ${this.amountInWords(Math.abs(closingBalance))}</p>
            <p class="doc-note">Ushbu dalolatnoma ikki nusxada tuzilgan bo'lib, har bir tomon uchun bittadan, teng yuridik kuchga ega.</p>
            ${this.signatureBlock(company)}
        `;
    }

    // ==================== SOLIQ HISOBOTLARI (soliq.uz rasmiy deklaratsiya shakllari andazasida) ====================

    taxReportHeader(title, company, periodLabel) {
        return `
            <div class="doc-header">
                <div class="doc-title">${this.esc(title)}</div>
                <div class="doc-meta">Hisobot davri: ${this.esc(periodLabel)}</div>
            </div>
            <div class="doc-party">
                <strong>Soliq to'lovchi:</strong> ${this.esc(company.legalForm)} «${this.esc(company.name) || '____________________'}»<br>
                STIR: ${this.esc(company.stir) || '____________'} | OKED: ${this.esc(company.oked) || '____'}<br>
                Manzil: ${this.esc(company.address) || '____________________'}
            </div>`;
    }

    buildVatReport(data) {
        const { company, periodLabel, outputBase, outputVat, inputBase, inputVat, payableVat, vatRate } = data;
        return `
            ${this.taxReportHeader("QQS BO'YICHA HISOBOT-DEKLARATSIYA", company, periodLabel)}
            <table class="doc-table">
                <thead><tr><th>№</th><th>Ko'rsatkich</th><th>Summa (so'm)</th></tr></thead>
                <tbody>
                    <tr><td>010</td><td>Soliq solinadigan aylanma (tovar/xizmat sotish)</td><td>${this.fmt(outputBase)}</td></tr>
                    <tr><td>020</td><td>Hisoblangan QQS (${vatRate}%)</td><td><strong>${this.fmt(outputVat)}</strong></td></tr>
                    <tr><td>030</td><td>Xarid bo'yicha aylanma (zachyotga qabul qilinadigan)</td><td>${this.fmt(inputBase)}</td></tr>
                    <tr><td>040</td><td>Zachyot qilinadigan QQS (${vatRate}%)</td><td><strong>${this.fmt(inputVat)}</strong></td></tr>
                    <tr style="background:#fff3cd;"><td>050</td><td><strong>Byudjetga to'lanadigan QQS</strong></td><td><strong>${this.fmt(payableVat)}</strong></td></tr>
                </tbody>
            </table>
            <p class="doc-note">Eslatma: hisoblash davr ichidagi tranzaksiyalar (daromad/chiqim) asosida taxminiy amalga oshirilgan. Har bir bitim bo'yicha aniq QQS uchun "📨 Elektron hujjatlar almashinuvi" bo'limidagi elektron hisob-fakturalarni tekshiring va rasmiy topshirishdan oldin soliq.uz shaxsiy kabinetida solishtiring.</p>`;
    }

    buildProfitTaxReport(data) {
        const { company, periodLabel, totalIncome, totalExpense, taxBase, taxRate, taxAmount } = data;
        return `
            ${this.taxReportHeader("FOYDA SOLIG'I BO'YICHA HISOBOT-DEKLARATSIYA", company, periodLabel)}
            <table class="doc-table">
                <thead><tr><th>№</th><th>Ko'rsatkich</th><th>Summa (so'm)</th></tr></thead>
                <tbody>
                    <tr><td>010</td><td>Jami daromad (umumiy aylanma)</td><td>${this.fmt(totalIncome)}</td></tr>
                    <tr><td>020</td><td>Chegiriladigan xarajatlar</td><td>${this.fmt(totalExpense)}</td></tr>
                    <tr><td>030</td><td>Soliq solinadigan baza (foyda)</td><td><strong>${this.fmt(taxBase)}</strong></td></tr>
                    <tr style="background:#fff3cd;"><td>040</td><td><strong>Hisoblangan foyda solig'i (${taxRate}%)</strong></td><td><strong>${this.fmt(taxAmount)}</strong></td></tr>
                </tbody>
            </table>`;
    }

    buildTurnoverTaxReport(data) {
        const { company, periodLabel, totalTurnover, taxRate, taxAmount } = data;
        return `
            ${this.taxReportHeader("AYLANMA SOLIG'I BO'YICHA HISOBOT-DEKLARATSIYA (soddalashtirilgan rejim)", company, periodLabel)}
            <table class="doc-table">
                <thead><tr><th>№</th><th>Ko'rsatkich</th><th>Summa (so'm)</th></tr></thead>
                <tbody>
                    <tr><td>010</td><td>Umumiy aylanma (jami daromad)</td><td>${this.fmt(totalTurnover)}</td></tr>
                    <tr style="background:#fff3cd;"><td>020</td><td><strong>Hisoblangan aylanma solig'i (${taxRate}%)</strong></td><td><strong>${this.fmt(taxAmount)}</strong></td></tr>
                </tbody>
            </table>`;
    }

    buildPayrollTaxReport(data) {
        const { company, periodLabel, rows, totals, ndflRate, ssvRate } = data;
        let bodyRows = '';
        (rows || []).forEach((r, i) => {
            bodyRows += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${this.esc(r.name)}</td>
                    <td>${this.esc(r.position) || '—'}</td>
                    <td>${this.fmt(r.gross)}</td>
                    <td>${this.fmt(r.tax)}</td>
                    <td>${this.fmt(r.socialTax)}</td>
                    <td>${this.fmt(r.net)}</td>
                </tr>`;
        });
        if (!rows || rows.length === 0) {
            bodyRows = `<tr><td colspan="7" class="doc-note">Ushbu davrda ish haqi yozuvlari topilmadi.</td></tr>`;
        }
        return `
            ${this.taxReportHeader("JShDS VA ISHV BO'YICHA HISOBOT", company, periodLabel)}
            <table class="doc-table">
                <thead>
                    <tr><th>#</th><th>F.I.Sh.</th><th>Lavozimi</th><th>Hisoblangan ish haqi</th><th>JShDS (${ndflRate}%)</th><th>ISHV (${ssvRate}%)</th><th>Qo'lga tegadigan</th></tr>
                </thead>
                <tbody>${bodyRows}</tbody>
                <tfoot>
                    <tr style="background:#fff3cd;">
                        <td colspan="3" style="text-align:right;"><strong>Jami:</strong></td>
                        <td><strong>${this.fmt(totals.gross)}</strong></td>
                        <td><strong>${this.fmt(totals.tax)}</strong></td>
                        <td><strong>${this.fmt(totals.socialTax)}</strong></td>
                        <td><strong>${this.fmt(totals.net)}</strong></td>
                    </tr>
                </tfoot>
            </table>`;
    }

    // Elektron hujjatlar almashinuvi importida omborda topilmagan, lekin unga mos kalkulyatsiya (retsept)
    // topilgan mahsulot avtomatik ishlab chiqarilganda shakllantiriladigan dalolatnoma.
    buildProductionCertificate(data) {
        const {
            company, number, date, recipeName, finishedProductName, producedQuantity, unit,
            materials, materialCost, markupPercent, markupAmount, totalCost, unitCost,
            sellingTotal, profit, invoiceNumber
        } = data;

        let materialRows = '';
        (materials || []).forEach((m, i) => {
            materialRows += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${this.esc(m.name)}</td>
                    <td>${this.esc(m.qtyPerUnit)} ${this.esc(m.unit)}</td>
                    <td>${this.esc(m.quantity)} ${this.esc(m.unit)}</td>
                    <td>${this.fmt(m.cost)}</td>
                </tr>`;
        });

        return `
            <div class="doc-header">
                <div class="doc-title">ISHLAB CHIQARISH TO'G'RISIDA DALOLATNOMA</div>
                <div class="doc-meta">№ ${this.esc(number)} &nbsp;&nbsp; Sana: ${this.formatDate(date)}</div>
            </div>
            ${this.companyBlock(company, 'Ishlab chiqaruvchi tashkilot')}
            <p>Biz, quyida imzo chekuvchilar, "<strong>${this.esc(recipeName)}</strong>" kalkulyatsiyasi (ishlab chiqarish retsepti) asosida quyidagi mahsulot № ${this.esc(invoiceNumber)} elektron hisob-fakturada ko'rsatilgan miqdorda ishlab chiqarilganligini tasdiqlaymiz:</p>
            <table class="doc-table">
                <thead><tr><th>Mahsulot</th><th>Ishlab chiqarilgan miqdor</th><th>Birlik tannarx</th><th>Jami tannarx</th></tr></thead>
                <tbody>
                    <tr>
                        <td>${this.esc(finishedProductName)}</td>
                        <td>${this.esc(producedQuantity)} ${this.esc(unit)}</td>
                        <td>${this.fmt(unitCost)}</td>
                        <td>${this.fmt(totalCost)}</td>
                    </tr>
                </tbody>
            </table>
            <p><strong>Kalkulyatsiya tarkibi (xom ashyo/materiallar sarfi):</strong></p>
            <table class="doc-table">
                <thead><tr><th>#</th><th>Xom ashyo/material</th><th>1 birlik uchun</th><th>Jami sarflandi</th><th>Tannarxi</th></tr></thead>
                <tbody>${materialRows}</tbody>
            </table>
            <p>Xom ashyo tannarxi: <strong>${this.fmt(materialCost)} so'm</strong></p>
            <p>Ishlov/mehnat xarajati ustamasi (${this.esc(markupPercent)}%): <strong>${this.fmt(markupAmount)} so'm</strong></p>
            <p><strong>Jami ishlab chiqarish tannarxi:</strong> ${this.fmt(totalCost)} so'm (${this.fmt(unitCost)} so'm/birlik)</p>
            <p><strong>Elektron hisob-faktura № ${this.esc(invoiceNumber)} bo'yicha sotish narxi:</strong> ${this.fmt(sellingTotal)} so'm</p>
            <p><strong>Taxminiy foyda:</strong> ${this.fmt(profit)} so'm</p>
            <p class="doc-note">Ushbu dalolatnoma "📨 Elektron hujjatlar almashinuvi" bo'limidan import qilingan hisob-faktura asosida avtomatik shakllantirilgan.</p>
            ${this.signatureBlock(company, '<p>Ishlab chiqarish mas\'uli: _________________________ &nbsp; imzo: _______________</p>')}
        `;
    }

    build(type, data) {
        switch (type) {
            case 'invoice-faktura': return this.buildInvoiceFaktura(data);
            case 'act': return this.buildAct(data);
            case 'contract': return this.buildContract(data);
            case 'cash-in': return this.buildCashOrder(data, 'in');
            case 'cash-out': return this.buildCashOrder(data, 'out');
            case 'power-of-attorney': return this.buildPowerOfAttorney(data);
            case 'reconciliation-act': return this.buildReconciliationAct(data);
            default: return '';
        }
    }
}

const documentManager = new DocumentManager();
