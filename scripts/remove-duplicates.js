const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

function removeDuplicates() {
    try {
        const transaction = db.transaction(() => {
            // Get all employees
            const allEmployees = db.prepare('SELECT * FROM empleados ORDER BY id').all();
            console.log('Total employees found:', allEmployees.length);

            // Group by usuario_id
            const grouped = {};
            allEmployees.forEach(emp => {
                if (!grouped[emp.usuario_id]) {
                    grouped[emp.usuario_id] = [];
                }
                grouped[emp.usuario_id].push(emp);
            });

            // For each usuario_id, keep only the first employee record
            for (const [usuarioId, employees] of Object.entries(grouped)) {
                if (employees.length > 1) {
                    console.log(`Found ${employees.length} duplicates for usuario_id ${usuarioId}`);

                    // Keep the first one, delete the rest
                    const toKeep = employees[0];
                    const toDelete = employees.slice(1);

                    for (const emp of toDelete) {
                        // Update registros_tiempo to point to the kept employee
                        db.prepare(`
                            UPDATE registros_tiempo 
                            SET empleado_id = ? 
                            WHERE empleado_id = ?
                        `).run(toKeep.id, emp.id);

                        // Delete the duplicate employee
                        db.prepare('DELETE FROM empleados WHERE id = ?').run(emp.id);
                        console.log(`Deleted duplicate employee ID ${emp.id}, kept ID ${toKeep.id}`);
                    }
                }
            }
        });

        transaction();
        console.log('✅ Duplicates removed successfully.');

        // Show final count
        const finalCount = db.prepare('SELECT COUNT(*) as count FROM empleados').get();
        console.log(`Final employee count: ${finalCount.count}`);

    } catch (error) {
        console.error('❌ Error removing duplicates:', error);
    }
}

removeDuplicates();
