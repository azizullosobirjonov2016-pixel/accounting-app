const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./accounting.db');

const currencies = [
  { code: 'UZS', name: 'Uzbekistani Som', symbol: 'so\'' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' }
];

const exchangeRates = [
  // sample rates to UZS
  { from: 'USD', to: 'UZS', rate: 11500, date: new Date().toISOString().split('T')[0], source: 'seed' },
  { from: 'EUR', to: 'UZS', rate: 12500, date: new Date().toISOString().split('T')[0], source: 'seed' },
  { from: 'RUB', to: 'UZS', rate: 130, date: new Date().toISOString().split('T')[0], source: 'seed' }
];

function run() {
  db.serialize(() => {
    const insertCurrency = db.prepare('INSERT OR IGNORE INTO currencies (code, name, symbol) VALUES (?, ?, ?)');
    currencies.forEach(c => {
      insertCurrency.run(c.code, c.name, c.symbol, function(err) {
        if (err) console.error('Currency insert error', err.message);
        else console.log('Inserted/ignored currency', c.code);
      });
    });
    insertCurrency.finalize();

    const insertRate = db.prepare('INSERT INTO exchange_rates (from_currency, to_currency, rate, date, source) VALUES (?, ?, ?, ?, ?)');
    exchangeRates.forEach(r => {
      insertRate.run(r.from, r.to, r.rate, r.date, r.source, function(err) {
        if (err) console.error('Rate insert error', err.message);
        else console.log(`Inserted rate ${r.from}->${r.to} = ${r.rate} (${r.date})`);
      });
    });
    insertRate.finalize(() => {
      console.log('Seeding complete.');
      db.close();
    });
  });
}

run();
