# Multi-currency — Design (Data model & UX)

Purpose: add multi-currency support so products, transactions and reports can use and display different currencies while keeping consistent base-currency accounting.

1) Key concepts
- `baseCurrency`: application-level canonical currency (e.g., UZS). All stored "base amounts" are derived using exchange rates.
- `displayCurrency`: user-preference for UI only (formatting, conversion on-the-fly).
- `currency` (ISO code): stored on price/transaction records when they originate in a non-base currency.
- `exchange_rate`: rate from a currency to baseCurrency at a specific date/time.

2) Data model (SQLite tables / JSON fields)
- `currencies` (static list)
  - `code` TEXT PRIMARY KEY (e.g., "USD")
  - `name` TEXT ("US Dollar")
  - `symbol` TEXT ("$")

- `exchange_rates`
  - `id` INTEGER PRIMARY KEY
  - `from_currency` TEXT
  - `to_currency` TEXT (usually baseCurrency)
  - `rate` REAL
  - `date` TEXT (ISO date)
  - `source` TEXT (optional, e.g., "ECB", "manual")

- `products` (extend existing)
  - add `default_currency` TEXT (optional) — price's currency
  - `price` REAL — the nominal price in `default_currency`

- `transactions` (extend existing)
  - `amount` REAL — amount in `currency`
  - `currency` TEXT
  - `amount_base` REAL — derived amount in `baseCurrency` (amount * rate)
  - `rate` REAL — applied conversion rate (for audit)
  - `rate_date` TEXT

3) Backend behavior
- Store every externally-entered amount along with its currency, the applied `rate` and `amount_base`.
- When creating/updating a transaction: fetch latest exchange rate for `currency -> baseCurrency` at `rate_date` (or allow manual override). Calculate and store `amount_base`.
- Provide endpoints:
  - `GET /api/currencies` — list supported currencies
  - `GET /api/exchange-rates?date=YYYY-MM-DD&from=USD&to=UZS` — rate lookup
  - `POST /api/exchange-rates` — admin/manual rate entry

4) Frontend UX
- Settings: choose `baseCurrency` (app-wide) and `displayCurrency` (user preference).
- Product form: allow entering price + currency selector; show price in base currency next to it.
- Transaction form: add `currency` dropdown and show converted `amount_base` live using current rate.
- Header/UI: currency selector to switch how totals are displayed (formatting + on-the-fly conversion for UI; data stored unchanged).
- Reports: allow selecting output currency (report converted to chosen currency using rates from the selected period). Note: use stored `amount_base` for stable aggregation.

5) Reports & persistence
- Aggregate on `amount_base` to avoid double-conversion and keep consistency.
- For exported reports include original amounts, currency, rate and `amount_base` per row.

6) Exchange rate sources & cadence
- Support manual rates, and optional integration with public APIs (ex: exchangerate.host, openexchangerates, fixer). Keep a simple manual fallback.
- Schedule daily rate imports for active currencies (backend cron or manual button).

7) Implementation notes (minimal changes needed)
- DB: add `currencies` and `exchange_rates` tables; add columns to `products` and `transactions`.
- Backend: add small API routes in `server.js` to get/set rates and currencies. Use `amount_base` calculation at write time.
- Frontend: update `js/app.js` and `js/api-client.js` to include currency selector, show converted amounts, and send `currency`/`rate` with transactions.

8) Example JSON (transaction payload)
{
  "date": "2026-08-02",
  "type": "income",
  "amount": 100,
  "currency": "USD",
  "rate": 11500,
  "amount_base": 1150000,
  "description": "Product sale"
}

9) Backward compatibility
- Existing records without `currency` default to `baseCurrency`.
- Migration: when adding columns, backfill `currency=baseCurrency`, `amount_base=amount`, `rate=1` for existing transactions.

10) Security & audit
- Store `rate` and `rate_date` per transaction for auditability.

---

Next steps: implement DB migrations, backend endpoints, then frontend forms. I'll scaffold the backend endpoints next if you want.
