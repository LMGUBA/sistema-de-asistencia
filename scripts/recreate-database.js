const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database.db');

// Delete existing database
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('🗑️  Base de datos anterior eliminada');
}

// Import and run initialization
const { initializeDatabase, insertTestData } = require('../config/database');

async function recreateDatabase() {
    try {
        await initializeDatabase();
        await insertTestData();

        console.log('\n✅ Base de datos recreada exitosamente');
        console.log('📊 Estructura optimizada con:');
        console.log('   - Constraints mejorados (CHECK, UNIQUE, NOT NULL)');
        console.log('   - ON DELETE CASCADE para integridad referencial');
        console.log('   - Índices optimizados para mejor rendimiento');
        console.log('   - Campo activo para usuarios');
        console.log('   - Campo updated_at en todas las tablas');
        console.log('\n👤 Usuario administrador:');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin123');
    } catch (error) {
        console.error('❌ Error recreando base de datos:', error);
    }
}

recreateDatabase();
