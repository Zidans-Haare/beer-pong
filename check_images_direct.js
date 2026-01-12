
const Database = require('better-sqlite3');
const db = new Database('dev.db');

const rows = db.prepare("SELECT name, image FROM Player WHERE image IS NOT NULL LIMIT 5").all();
console.log(JSON.stringify(rows, null, 2));
