---
name: uz-bhms-doc-audit
description: Audits Uzbek accounting documents (e-invoices/ESF, waybills/TTN, acts of completed work, reconciliation acts, payment orders, journal entries, inventory/warehouse documents) against Uzbekistan National Accounting Standards (BHMS/НСБУ) and Tax Code / soliq.uz requirements. Use when the user says "hujjatni tekshir", "faktura to'g'rimi", "ESF", "e-faktura", "provodka to'g'rimi", "QQS hisobla", "BHMS", "НСБУ", "soliq.uz", "my.soliq", "akt sverka", "nakladnoy", "schyot-faktura", or uploads an invoice/act/entry and asks whether it is correct.
---

# Uzbek BHMS / Soliq.uz Document Audit

## Language
- Instructions: English. ALL user-facing output (findings, explanations, questions): **Uzbek (Latin)**.
- Keep account names and legal terms as in the source (Uzbek/Russian), e.g. "6010 — Поставщикам ва подрядчикам".

## Workflow
1. Identify the document type (ESF, TTN, act, payment order, journal entry, reconciliation act, inventory doc). If unclear, ask ONE question.
2. Extract the key fields: date, number, seller/buyer, STIR (INN), PINFL, contract no., items, qty, unit, price, net amount, VAT rate, VAT amount, total, bank details, signatures.
3. Check the mandatory requisites:
   - STIR = 9 digits (legal entity); PINFL = 14 digits (individual).
   - Contract number and date are present and match across linked documents.
   - Units of measure and IKPU/MXIK product codes are present on ESF lines.
4. Check the math:
   - qty × price = line amount; Σ lines = net total.
   - VAT = net × rate (default 12%; 0% or exempt only if a legal basis is stated); net + VAT = total.
   - Allow a rounding tolerance of 0.01 sum per line. Flag anything above that.
5. Check the accounting treatment (BHMS):
   - Inventory (BHMS 4): valuation at cost, and the right account (1000/2900 group).
   - Fixed assets (BHMS 5): capitalization vs. expense.
   - Chart of accounts (BHMS 21): debit/credit correspondence is valid (e.g. Dt 2910 / Ct 6010; input VAT Dt 4410 / Ct 6010; sales Dt 4010 / Ct 9010).
6. Check tax compliance (Soliq.uz):
   - The ESF is required and issued within the legal deadline.
   - Input VAT can be offset only with a valid, confirmed ESF.
   - The seller's VAT payer status matches the VAT charged.
7. Cross-check linked documents (ESF ↔ TTN ↔ act ↔ payment) for amount, date and quantity mismatches.
8. Classify each issue as 🔴 Critical (tax/legal risk), 🟡 Warning (likely error), or 🔵 Note (style/best practice).
9. Return the result in the Output Format below.

## DO NOT
- DO NOT invent article numbers, rates, deadlines or account codes. If unsure, write "tekshirish kerak" and name the source to verify (lex.uz, soliq.uz).
- DO NOT give theory, standard summaries or long introductions. Report findings only.
- DO NOT rewrite or "fix" the document silently. Show the correct value next to the wrong one.
- DO NOT assume a VAT rate other than 12% without an explicit basis in the document.
- DO NOT mark a document "to'g'ri" if any mandatory field is missing or unreadable.
- DO NOT output in English or Russian, apart from original terms and account names.
- DO NOT request data you can already read from the attached document.

## Output Format
```
## 📄 Hujjat: <turi> №<raqam>, <sana>
**Xulosa:** ✅ To'g'ri | ⚠️ Kamchiliklar bor | ❌ Qabul qilib bo'lmaydi

| # | Daraja | Maydon | Topildi | To'g'risi | Asos |
|---|--------|--------|---------|-----------|------|
| 1 | 🔴 | QQS summasi | 1 150 000 | 1 200 000 | SK, QQS 12% |

**Provodka (tavsiya):**
Dt <hisob> — Kt <hisob> — <summa> — <izoh>

**Keyingi qadam:** <1–3 qisqa amal>
```
