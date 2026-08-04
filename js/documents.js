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
            'power-of-attorney': 'Ishonchnoma'
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
            }
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
        return `
            <div class="doc-party">
                <strong>${this.esc(roleLabel)}:</strong> ${this.esc(client.name)}<br>
                STIR: ${this.esc(client.stir) || '____________'}<br>
                Manzil: ${this.esc(client.address) || '____________________'}<br>
                Tel: ${this.esc(client.phone) || '____________'}
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
        const { company, client, date, number, items, currency } = data;
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
            <p>QQS stavkasi: ${(typeof storage !== 'undefined' ? storage.getSettings().taxVAT : 12) || 0}%</p>
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

    build(type, data) {
        switch (type) {
            case 'invoice-faktura': return this.buildInvoiceFaktura(data);
            case 'act': return this.buildAct(data);
            case 'contract': return this.buildContract(data);
            case 'cash-in': return this.buildCashOrder(data, 'in');
            case 'cash-out': return this.buildCashOrder(data, 'out');
            case 'power-of-attorney': return this.buildPowerOfAttorney(data);
            default: return '';
        }
    }
}

const documentManager = new DocumentManager();
