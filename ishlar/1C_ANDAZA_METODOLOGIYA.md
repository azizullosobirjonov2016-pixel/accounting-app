# 1C:Buxgalteriya 8 (O'zbekiston) andazasida — Ishlash Tartibi va Formulalar

> Manba: https://1c.uz/v8/generic_products/uz_accounting.php (1C:Buxgalteriya 8 O'zbekiston uchun, mahsulot tavsifi) + loyihaning joriy holati (`js/app.js`, `ARCHITECTURE.md`, `ishlar/TASKS.md`).
> Maqsad: 1C dasturidagi buxgalteriya mantig'ini bizning `accounting-app` loyihasiga moslashtirib, aniq ishlash tartibi va hisob-kitob formulalarini belgilash.

---

## 1. 1C andazasidagi umumiy tsikl (hujjat oqimi)

1C'da har bir xo'jalik operatsiyasi **birlamchi hujjat** orqali kiritiladi va tizim avtomatik ravishda buxgalteriya provodkalarini (jurnal yozuvlarini) yaratadi:

```
Birlamchi hujjat → Ombor/Kassa harakati → Buxgalteriya provodkasi (Debet/Kredit) → Registрlar → Hisobotlar
```

Bizning loyihada bu tsikl quyidagicha moslashtiriladi:

| 1C bo'limi | Bizning modul (fayl) | Natija |
|---|---|---|
| Birlamchi hujjatlar (Kirim, Chiqim, Hisob-faktura) | `js/documents.js`, Hujjatlar bo'limi | PDF/HTML hujjat + `InventoryMovement`/`Transaction` yozuvi |
| Ombor hisobi | Ombor bo'limi (`js/app.js` — Product, InventoryMovement) | `product.stock`, ombor qiymati |
| Ishlab chiqarish | Ishlab chiqarish bo'limi (BOM, Orders) | `productionCost`, tayyor mahsulot kirimi |
| Savdo va xarid | Savdo/Invoice bo'limi | `Invoice`, mijoz balansi |
| Kassa va bank | Tranzaksiyalar bo'limi | `Transaction` (income/expense) |
| Kontragent hisob-kitoblari | Mijozlar/Yetkazib beruvchilar balansi | Debitorlik/kreditorlik qarzi |
| Kadrlar va ish haqi | Ish haqi bo'limi | `PayrollRecord` |
| Reglamentlangan hisobotlar | Soliq hisobotlari bo'limi | QQS, Foyda/Aylanma solig'i, ISHV, JShDS |
| Standart hisobotlar | Hisobotlar bo'limi | P&L, Balans, Cash Flow |

---

## 2. Modul bo'yicha ishlash tartibi

### 2.1 Ombor (mahsulot va zaxira)
1. Mahsulot kartochkasi ochiladi: nomi, birligi, min. zaxira, tannarx (`purchasePrice`), sotish narxi (`sellingPrice`).
2. Har bir kirim/chiqim/tuzatish `InventoryMovement` sifatida qayd etiladi (`type: in/out/adjust`).
3. Qoldiq real vaqtda yangilanadi: kirimda `+`, chiqimda `-`.
4. Minimal zaxiradan past tushganda ogohlantirish beriladi (1C'dagi "минимальный остаток" nazorati).

### 2.2 Ishlab chiqarish (BOM)
1. Retsept (`ProductionRecipe`) — tayyor mahsulot uchun kerakli xomashyo va me'yor (`qtyPerUnit`).
2. Buyurtma yaratilganda: xomashyo omborda yetarli ekanligi tekshiriladi → xomashyo chiqimga chiqadi → tayyor mahsulot kirimga kiradi.
3. Tannarx xomashyo tannarxlari yig'indisi sifatida hisoblanadi (pastda formulasi bor).

### 2.3 Savdo (Invoice / hisob-faktura)
1. Mijoz tanlanadi, mahsulot qatorlari (`lineItems`: productId, quantity, price) kiritiladi.
2. Jami summa hisoblanadi, kerak bo'lsa QQS ajratiladi (`vatRate`, hozircha faqat hisob-faktura hujjatida ko'rsatiladi — pastdagi 4-bo'limga qarang).
3. Invoice tasdiqlanganda ombordan mahsulot chiqimga yoziladi va mijoz balansiga daromad/qarz sifatida tushadi.

### 2.4 Kassa/Bank (Tranzaksiyalar)
1. Har bir pul harakati `Transaction` sifatida kiritiladi: `type` (income/expense), `category`, `amount`, `clientId`/`supplierId`.
2. Tranzaksiyalar davr bo'yicha filtrlanib, P&L va Cash Flow hisobotlarida jamlanadi.

### 2.5 Kontragent hisob-kitoblari (mijoz/yetkazib beruvchi balansi)
1. Har bir kontragent uchun davr boshidagi qoldiq (`openingBalance`) hisoblanadi.
2. Davr davomidagi barcha debit/kredit tranzaksiyalari qo'shiladi.
3. Davr oxiridagi qoldiq (`closingBalance`) — debitorlik (mijoz qarzdor) yoki kreditorlik (biz qarzdormiz) sifatida ko'rsatiladi.

### 2.6 Ish haqi (Payroll)
1. Xodim uchun asosiy oylik (`gross`) belgilanadi.
2. JShDS (jismoniy shaxslardan daromad solig'i) xodim maoshidan ushlab qolinadi.
3. ISHV (ijtimoiy soliq) ish beruvchi tomonidan qo'shimcha xarajat sifatida to'lanadi (xodim maoshidan ushlanmaydi).
4. Sof maosh (`net`) xodimga to'lanadi.

### 2.7 Soliq hisobotlari
1. Soliq rejimi tanlanadi: **Soddalashtirilgan** (Aylanma solig'i) yoki **Umumbelgilangan** (QQS + Foyda solig'i).
2. Davr (oy/chorak/yil) tanlanadi.
3. Tizim tegishli formulalar bo'yicha soliqni avtomatik hisoblaydi (3-bo'limga qarang).

### 2.8 Hisobotlar
1. P&L — davr daromadi, xarajati, sof foydasi.
2. Balans — aktiv/passiv (ombor qiymati, pul mablag'lari, qarzlar).
3. Cash Flow — pul oqimi (kirim/chiqim davri bo'yicha).
4. Kontragent balans hisobotlari (grafik + Excel eksport).

---

## 3. Hisob-kitob formulalari

### 3.1 Ombor qoldig'i
```
Stock_end = Stock_start + Σ(Kirim.quantity) − Σ(Chiqim.quantity) ± Σ(Tuzatish)
```

### 3.2 Ombor qiymati (joriy tannarx bo'yicha)
```
StockValue = Σ(product.stock × product.purchasePrice)
```
*(loyihada: `js/app.js:1202`, `3504`, `3623`, `3681`)*

> **1C'dagi farq**: 1C standart holda **o'rtacha o'lchangan tannarx** (weighted average cost) yoki **FIFO** usulini qo'llaydi — har bir kirim narxi qoldiq bilan qayta o'rtachalanadi. Bizning loyihada hozircha bitta statik `purchasePrice` ishlatiladi (oxirgi kiritilgan narx). Aniqroq hisob uchun tavsiya: har kirimda `purchasePrice_new = (stock_old × price_old + qty_in × price_in) / (stock_old + qty_in)`.

### 3.3 Ishlab chiqarish tannarxi
```
ProductionCost = Σ(material.quantity × material.purchasePrice)
```
*(loyihada: `js/app.js:1754`, `3340`)*

Birlik tannarxi:
```
UnitCost = ProductionCost / producedQuantity
```

### 3.4 Savdo summasi va QQS (hisob-faktura)
```
LineTotal = quantity × price
InvoiceTotal = Σ(LineTotal)
VAT = InvoiceTotal × vatRate / (100 + vatRate)      // summaga kiritilgan QQS (ichki)
     yoki
VAT = InvoiceTotal × vatRate / 100                   // QQS ustama sifatida (tashqi)
```
*(hozircha `vatRate` faqat hisob-faktura hujjatini chop etishda ishlatiladi — `js/app.js:876,910`; soliq hisobotida alohida QQS jamlanmasi yo'q, pastdagi 4-bo'limdagi tavsiyaga qarang)*

### 3.5 Foyda va zarar (P&L)
```
TotalIncome  = Σ(Transaction.amount) type=income
TotalExpense = Σ(Transaction.amount) type=expense
GrossProfit  = TotalIncome − TotalExpense
```
*(loyihada: `js/app.js:2345-2347`)*

### 3.6 Soliqlar

**Soddalashtirilgan rejim (Aylanma solig'i):**
```
TurnoverTax = TotalIncome × (taxTurnover% / 100)
NetProfit   = GrossProfit − TurnoverTax
```

**Umumbelgilangan rejim (Foyda solig'i):**
```
IncomeTax = GrossProfit > 0 ? GrossProfit × (taxIncome% / 100) : 0   // zararga soliq solinmaydi
NetProfit = GrossProfit − IncomeTax
```
*(loyihada: `js/app.js:2349-2355`)*

**Ish haqi soliqlari:**
```
JShDS (NDFL) = Gross × (taxNDFL% / 100)         // xodimdan ushlanadi
ISHV (Ijtimoiy soliq) = Gross × (taxSSV% / 100) // ish beruvchi to'laydi (qo'shimcha xarajat)
Net = Gross − JShDS − boshqa_ushlanmalar
ISHV_ish_beruvchi_xarajati = Net + ISHV
```
*(loyihada: `js/app.js:1136-1149`)*

### 3.7 Kontragent balansi (davr bo'yicha)
```
ClosingBalance = OpeningBalance + Σ(Debit) − Σ(Credit)
```
Musbat qiymat — mijoz bizga qarzdor (debitorlik); manfiy — biz qarzdormiz (kreditorlik).
*(loyihada: `computePartyPeriodBalance` — `js/app.js:1311`)*

### 3.8 Jurnal (bosh kitob) ochilish/yopilish qoldig'i
```
OpeningBalance = Σ(oldingi yozuvlar.debit − credit)
ClosingBalance = OpeningBalance + Σ(joriy davr.debit − credit)
```
*(loyihada: `js/app.js:949,955`)*

### 3.9 Balans (aktiv = passiv, soddalashtirilgan)
```
Aktiv  = StockValue + Kassa/Bank_qoldig'i + Debitorlik_qarzi
Passiv = Kreditorlik_qarzi + Kapital + NetProfit(to'plangan)
Aktiv = Passiv   (nazorat tenglamasi)
```

### 3.10 Pul oqimi (Cash Flow)
```
CashFlow = Operatsion_oqim + Investitsion_oqim + Moliyaviy_oqim
Operatsion_oqim = Savdo_tushumi − Xomashyo/Xarajat_to'lovlari − Ish_haqi_to'lovlari − Soliqlar
```

---

## 4. Amalga oshirilgan tuzatishlar (2026-08-08)

Quyidagi barcha tavsiyalar `server.js`, `js/app.js`, `js/api-client.js` va `index.html`ga joriy qilindi:

| # | Masala | Eski holat | Yangi holat |
|---|---|---|---|
| 1 | Tannarx usuli | Statik `purchasePrice` | Ombor kirimi (`POST /api/inventory-movements`, `unitCost`) va ishlab chiqarish (`POST /api/production/orders`) o'rtacha o'lchangan tannarxni avtomatik qayta hisoblaydi (3.2-formula) |
| 2 | QQS hisob-kitobi | Faqat hisob-fakturada ko'rsatilardi | Hisobotlar bo'limida davr bo'yicha "QQS HISOB-KITOBI" jadvali — barcha sotuv hisob-fakturalaridan yig'ilgan chiqish QQS jamlanadi |
| 3 | Provodka (Debet/Kredit) | Yo'q | Soddalashtirilgan schyotlar rejasi (`CHART_OF_ACCOUNTS`) qo'shildi; har bir `Transaction` avtomatik `debitAccount`/`creditAccount` bilan yoziladi (`resolveAccounts()`), `GET /api/chart-of-accounts` orqali frontendga uzatiladi |
| 4 | Ishlab chiqarish — qo'shimcha xarajatlar | Faqat xomashyo tannarxi | `ProductionOrder.overheadCost` maydoni qo'shildi, `productionCost = materialCost + overheadCost` |
| 5 | Balans hisoboti | Yo'q edi | Hisobotlar bo'limida "BALANS (AKTIV/PASSIV)" jadvali — ombor qiymati, kassa/bank, debitorlik, kreditorlik, soliq/ISHV/ish haqi qarzlari va kapital (yig'ilgan sof foyda) |

Qo'shimcha: har bir savdo hisob-fakturasi endi ikkita provodka hosil qiladi — daromad (Dt 4010/Kt 9010) va sotilgan mahsulot tannarxi — **COGS** (Dt 9020/Kt 2710), 1C'dagi realizatsiya hujjati mantig'iga muvofiq.

### 4.1 Schyotlar rejasi (soddalashtirilgan)

| Schyot | Nomi | Tabiati |
|---|---|---|
| 5010 | Kassa va bank hisob-kitoblari | Debet |
| 4010 | Xaridorlar bilan hisob-kitoblar (debitorlik) | Debet |
| 2710 | Tovar-moddiy zaxiralar (ombor) | Debet |
| 6010 | Ta'minotchilar bilan hisob-kitoblar (kreditorlik) | Kredit |
| 6410 | Byudjetga soliqlar bo'yicha qarz | Kredit |
| 6520 | Ijtimoiy sug'urta bo'yicha qarz (ISHV) | Kredit |
| 6710 | Mehnatga haq to'lash bo'yicha qarz | Kredit |
| 9010 | Sotishdan daromad | Kredit |
| 9020 | Sotilgan mahsulot tannarxi (COGS) | Debet |
| 9030 | Davr xarajatlari | Debet |

Debet/Kredit avtomatik biriktirilishi (`resolveAccounts(type, category)`):
- `income` + `sales`/`services` → Dt 4010 / Kt 9010; boshqa daromad → Dt 5010 / Kt 9010
- `expense` + `cogs` → Dt 9020 / Kt 2710
- `expense` + `salaries` → Dt 9030 / Kt 6710
- `expense` + `social_tax` → Dt 9030 / Kt 6520
- `expense` + `materials` → Dt 2710 / Kt 6010
- `expense` + soliq turlari → Dt 9030 / Kt 6410
- boshqa `expense` (ijara, kommunal, transport va h.k.) → Dt 9030 / Kt 5010

**Muhim eslatma**: bu — soddalashtirilgan model. Ilovada naqd/hisob-kitob to'lovlari va qarz yopilishi alohida hujjat sifatida yuritilmaydi (har bir `Transaction` daromad/xarajatning o'zi hisoblanadi), shuning uchun Balans hisobotidagi kassa, debitorlik va kreditorlik qatorlari **taxminiy** xarakterga ega — bu haqda hisobot ichida ham ogohlantirish chiqariladi.

---

## 5. Xulosa

Loyihaning joriy arxitekturasi (`ARCHITECTURE.md`) va amalga oshirilgan kod (`js/app.js`, `server.js`) endi 1C:Buxgalteriya 8 (O'zbekiston) mantig'iga to'liqroq mos keladi: hujjat → ombor/kassa harakati → Debet/Kredit provodka → hisobot (P&L, QQS, Bosh kitob, Balans) zanjiri amalga oshirilgan. 4-bo'limdagi barcha tavsiyalar kodga joriy qilingan va smoke-test orqali tekshirilgan (o'rtacha o'lchangan tannarx, COGS provodkasi, ishlab chiqarish overhead xarajati, ish haqi provodkalari).
