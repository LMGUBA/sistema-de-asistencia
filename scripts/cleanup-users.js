const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

function cleanupUsers() {
    try {
        // Start transaction
        const transaction = db.transaction(() => {
            // Get users to keep
            const adminUser = db.prepare("SELECT id FROM usuarios WHERE usuario = 'admin'").get();
            const juanUser = db.prepare("SELECT id FROM usuarios WHERE usuario = 'juan.perez'").get();

            if (!adminUser || !juanUser) {
                console.log('❌ Error: admin or juan.perez not found in database');
                return;
            }

            const keepIds = [adminUser.id, juanUser.id];
            console.log('Keeping users with IDs:', keepIds);

            // Get all other users
            const usersToDelete = db.prepare(`
                SELECT id, usuario FROM usuarios 
                WHERE id NOT IN (?, ?)
            `).all(adminUser.id, juanUser.id);

            console.log('Users to delete:', usersToDelete.map(u => u.usuario).join(', '));

            // Delete related records for users to be deleted
            for (const user of usersToDelete) {
                db.prepare("DELETE FROM registros_tiempo WHERE usuario_id = ?").run(user.id);
                db.prepare("DELETE FROM empleados WHERE usuario_id = ?").run(user.id);
                console.log(`Deleted records for user: ${user.usuario}`);
            }

            // Delete the users
            const deleteResult = db.prepare(`
                DELETE FROM usuarios 
                WHERE id NOT IN (?, ?)
            `).run(adminUser.id, juanUser.id);

            console.log(`Deleted ${deleteResult.changes} users.`);
        });

        transaction();
        console.log('✅ Database cleanup completed successfully.');
        console.log('Remaining users: admin, juan.perez');

    } catch (error) {
        console.error('❌ Error cleaning up users:', error);
    }
}

cleanupUsers();
