const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

// Show current state
console.log('=== USUARIOS ===');
const users = db.prepare('SELECT * FROM usuarios').all();
users.forEach(u => console.log(`ID: ${u.id}, Usuario: ${u.usuario}, Nombre: ${u.nombre_completo}`));

console.log('\n=== EMPLEADOS ===');
const employees = db.prepare('SELECT * FROM empleados').all();
employees.forEach(e => console.log(`ID: ${e.id}, Usuario_ID: ${e.usuario_id}, Nombre: ${e.nombre}`));
