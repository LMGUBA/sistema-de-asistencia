const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

function cleanDatabase() {
    try {
        const transaction = db.transaction(() => {
            // Get admin user
            const adminUser = db.prepare("SELECT id FROM usuarios WHERE usuario = 'admin'").get();

            if (!adminUser) {
                console.log('❌ Error: admin user not found in database');
                return;
            }

            console.log(`Keeping admin user with ID: ${adminUser.id}`);

            // Delete ALL time records (including admin's)
            const deletedRecords = db.prepare('DELETE FROM registros_tiempo').run();
            console.log(`Deleted ${deletedRecords.changes} time records`);

            // Delete ALL employees (including admin's)
            const deletedEmployees = db.prepare('DELETE FROM empleados').run();
            console.log(`Deleted ${deletedEmployees.changes} employee records`);

            // Delete all users EXCEPT admin
            const deletedUsers = db.prepare(`
                DELETE FROM usuarios 
                WHERE id != ?
            `).run(adminUser.id);
            console.log(`Deleted ${deletedUsers.changes} users`);

            // Recreate admin employee record
            db.prepare(`
                INSERT INTO empleados (usuario_id, nombre, departamento, tipo_trabajo)
                VALUES (?, ?, ?, ?)
            `).run(adminUser.id, 'Nuevo Administrador', 'IT', 'remoto');
            console.log('Recreated admin employee record');
        });

        transaction();
        console.log('\n✅ Database cleaned successfully.');
        console.log('Only admin user remains: admin / admin123');
        console.log('All time records and other users have been deleted.');

    } catch (error) {
        console.error('❌ Error cleaning database:', error);
    }
}

cleanDatabase();
