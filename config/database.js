require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to initialize database (create tables)
async function initializeDatabase() {
    try {
        console.log('✅ Supabase client initialized');
        console.log('📊 Please ensure tables are created in Supabase dashboard');
        console.log('   Run the SQL script from the implementation plan');
        return Promise.resolve();
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        return Promise.reject(error);
    }
}

// Function to insert admin user (if not exists)
async function insertTestData() {
    try {
        const bcrypt = require('bcryptjs');

        // Check if admin already exists
        const { data: existingAdmin, error: checkError } = await supabase
            .from('usuarios')
            .select('id')
            .eq('usuario', 'admin')
            .single();

        if (existingAdmin) {
            console.log('✅ Usuario admin ya existe');
            return Promise.resolve();
        }

        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 10);

        const { data: adminUser, error: userError } = await supabase
            .from('usuarios')
            .insert([
                {
                    usuario: 'admin',
                    password_hash: adminPassword,
                    rol: 'admin',
                    nombre_completo: 'Administrador',
                    email: 'admin@empresa.com'
                }
            ])
            .select()
            .single();

        if (userError) throw userError;

        // Create admin employee record
        const { error: employeeError } = await supabase
            .from('empleados')
            .insert([
                {
                    usuario_id: adminUser.id,
                    nombre: 'Administrador',
                    departamento: 'Administración',
                    tipo_trabajo: 'remoto'
                }
            ]);

        if (employeeError) throw employeeError;

        console.log('✅ Usuario administrador creado correctamente');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin123');
        return Promise.resolve();
    } catch (error) {
        console.error('❌ Error al crear usuario administrador:', error);
        return Promise.reject(error);
    }
}

module.exports = {
    supabase,
    initializeDatabase,
    insertTestData
};