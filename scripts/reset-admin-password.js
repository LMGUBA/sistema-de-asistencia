require('dotenv').config();
const bcrypt = require('bcrypt');
const { supabase } = require('../config/database');

async function resetAdminPassword() {
    try {
        console.log('Resetting admin password...');

        // Hash the new password
        const newPassword = 'admin123';
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update admin password
        const { data, error } = await supabase
            .from('usuarios')
            .update({ password_hash: passwordHash })
            .eq('usuario', 'admin')
            .select();

        if (error) {
            console.error('Error updating password:', error);
            return;
        }

        console.log('✅ Admin password reset successfully!');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin123');
        console.log('');
        console.log('You can now login with these credentials.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

resetAdminPassword();
