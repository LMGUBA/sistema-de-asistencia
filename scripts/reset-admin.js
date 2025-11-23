const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

async function resetAdmin() {
    try {
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Start transaction
        const transaction = db.transaction(() => {
            // Find existing admin
            const existingAdmin = db.prepare("SELECT id FROM usuarios WHERE usuario = 'admin'").get();
            
            if (existingAdmin) {
                console.log('Found existing admin with ID:', existingAdmin.id);
                
                // Delete related records first to avoid FK constraints
                db.prepare("DELETE FROM registros_tiempo WHERE usuario_id = ?").run(existingAdmin.id);
                db.prepare("DELETE FROM empleados WHERE usuario_id = ?").run(existingAdmin.id);
                
                // Delete user
                db.prepare("DELETE FROM usuarios WHERE id = ?").run(existingAdmin.id);
                console.log('Deleted existing admin user and related records.');
            }

            // Create new admin
            const result = db.prepare(`
                INSERT INTO usuarios (usuario, password_hash, rol, nombre_completo, email)
                VALUES (?, ?, ?, ?, ?)
            `).run('admin', hashedPassword, 'admin', 'Nuevo Administrador', 'admin@nuevo.com');
            
            // Create employee record for new admin
            db.prepare(`
                INSERT INTO empleados (usuario_id, nombre, departamento, tipo_trabajo)
                VALUES (?, ?, ?, ?)
            `).run(result.lastInsertRowid, 'Nuevo Administrador', 'IT', 'remoto');

            console.log('Created new admin user.');
        });

        transaction();
        console.log('✅ Admin reset successfully.');
        console.log('User: admin');
        console.log('Password: ' + newPassword);

    } catch (error) {
        console.error('❌ Error resetting admin:', error);
    }
}

resetAdmin();
