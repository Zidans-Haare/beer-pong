
const Database = require('better-sqlite3');
const db = new Database('dev.db');

try {
  const settings = db.prepare('SELECT * FROM SystemSettings').all();
  console.log('Current Settings:', JSON.stringify(settings, null, 2));
} catch (e) {
  console.error('Error:', e);
}
