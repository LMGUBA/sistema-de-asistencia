const { initializeDatabase, insertTestData } = require('../config/database');

console.log('🚀 Inicializando base de datos...');

// Inicializar la base de datos
initializeDatabase();

// Insertar datos de prueba
insertTestData();

console.log('✅ Base de datos lista para usar');
console.log('👤 Usuarios de prueba:');
console.log('   Admin: admin / admin123');
console.log('   Empleado: juan.perez / user123');
console.log('   Otros empleados: usuario / 123456');