const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

function fullCleanup() {
    try {
        const transaction = db.transaction(() => {
            // Get admin and juan.perez IDs
            const adminUser = db.prepare("SELECT id FROM usuarios WHERE usuario = 'admin'").get();
            const juanUser = db.prepare("SELECT id FROM usuarios WHERE usuario = 'juan.perez'").get();

            if (!adminUser || !juanUser) {
                console.log('❌ Error: admin or juan.perez not found');
                return;
            }

            console.log(`Keeping: admin (ID: ${adminUser.id}), juan.perez (ID: ${juanUser.id})`);

            // Delete all time records for users we're removing
            db.prepare(`
                DELETE FROM registros_tiempo 
                WHERE usuario_id NOT IN (?, ?)
            `).run(adminUser.id, juanUser.id);

            // Delete all employees for users we're removing
            db.prepare(`
                DELETE FROM empleados 
                WHERE usuario_id NOT IN (?, ?)
            `).run(adminUser.id, juanUser.id);

            // Delete all users except admin and juan.perez
            const deletedUsers = db.prepare(`
                DELETE FROM usuarios 
                WHERE id NOT IN (?, ?)
            `).run(adminUser.id, juanUser.id);
            console.log(`Deleted ${deletedUsers.changes} users`);

            // Now remove duplicate employees for admin and juan.perez
            // Keep only one employee record per usuario_id
            const employees = db.prepare('SELECT * FROM empleados ORDER BY id').all();
            const seen = new Set();

            for (const emp of employees) {
                if (seen.has(emp.usuario_id)) {
                    // This is a duplicate, delete it
                    db.prepare('DELETE FROM empleados WHERE id = ?').run(emp.id);
                    console.log(`Deleted duplicate employee ID ${emp.id} for usuario_id ${emp.usuario_id}`);
                } else {
                    seen.add(emp.usuario_id);
                }
            }
        });

        transaction();
        console.log('✅ Full cleanup completed successfully.');

        // Show final state
        console.log('\n=== FINAL STATE ===');
        const finalUsers = db.prepare('SELECT id, usuario, nombre_completo FROM usuarios').all();
        console.log('Users:', finalUsers);

        const finalEmployees = db.prepare('SELECT id, usuario_id, nombre FROM empleados').all();
        console.log('Employees:', finalEmployees);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

fullCleanup();
