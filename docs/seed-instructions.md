# Seed: Currencies & Exchange Rates

This script inserts a small set of sample currencies and exchange rates into `./accounting.db`.

Prerequisites
- Node.js installed (to run `node scripts/seed-currencies.js`).
- The project DB file `accounting.db` is created by running the server once or via migrations.

How to run
1. Install dependencies (if not already):

```bash
cd "g:/Мой диск/HTML darslari/accounting-app"
npm install
```

2. Start the server once (optional, ensures DB file and tables created by `server.js`):

```bash
npm start
```

3. Run the seed script:

```bash
node scripts/seed-currencies.js
```

What it does
- Adds currency rows for `UZS`, `USD`, `EUR`, `RUB` (INSERT OR IGNORE).
- Inserts sample exchange rates USD->UZS, EUR->UZS, RUB->UZS with today's date and `source: seed`.

Notes
- Running the script multiple times will not duplicate currencies (uses `INSERT OR IGNORE`), but will append new exchange_rate rows each run.
- If you prefer idempotent rates, remove old seed entries or modify the script to upsert rates.
