require('dotenv').config();
const { supabase } = require('../config/database');

async function testPresenceEndpoint() {
    try {
        console.log('Testing presence endpoint logic...\n');

        // Get presence data
        const { data: presenceData, error: presenceError } = await supabase
            .from('presencia_usuarios')
            .select('usuario_id, nombre_completo, estado, ultima_actividad')
            .order('nombre_completo');

        if (presenceError) {
            console.error('Error getting presence:', presenceError);
            return;
        }

        console.log('Presence data from Supabase:');
        console.log(JSON.stringify(presenceData, null, 2));
        console.log(`\nTotal users: ${presenceData?.length || 0}\n`);

        if (!presenceData || presenceData.length === 0) {
            console.log('No presence data found!');
            return;
        }

        // Get employee check-in status for each user
        const usersWithStatus = [];

        for (const user of presenceData) {
            const { data: empleado, error: empError } = await supabase
                .from('empleados')
                .select('estado_actual')
                .eq('usuario_id', user.usuario_id)
                .maybeSingle();

            if (empError) {
                console.error(`Error getting employee for user ${user.usuario_id}:`, empError);
            }

            const userWithStatus = {
                ...user,
                check_in_status: empleado?.estado_actual || 'desconectado'
            };

            usersWithStatus.push(userWithStatus);
            console.log(`User: ${user.nombre_completo}, Estado: ${user.estado}, Check-in: ${userWithStatus.check_in_status}`);
        }

        console.log('\nFinal result:');
        console.log(JSON.stringify(usersWithStatus, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

testPresenceEndpoint();
