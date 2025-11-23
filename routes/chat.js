const express = require('express');
const { supabase } = require('../config/database');

const router = express.Router();

// Middleware para verificar token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido'
        });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dashboard-trabajo-remoto-secret-key';

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token inválido'
            });
        }
        req.user = user;
        next();
    });
}

// Enviar mensaje
router.post('/messages', authenticateToken, async (req, res) => {
    try {
        const { mensaje } = req.body;

        if (!mensaje || mensaje.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El mensaje no puede estar vacío'
            });
        }

        const { data, error } = await supabase
            .from('mensajes_chat')
            .insert([{
                usuario_id: req.user.id,
                nombre_usuario: req.user.nombre,
                mensaje: mensaje.trim()
            }])
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener historial de mensajes (últimos 100)
router.get('/messages', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('mensajes_chat')
            .select('id, usuario_id, nombre_usuario, mensaje, created_at')
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) throw error;

        res.json({
            success: true,
            data: data || []
        });
    } catch (error) {
        console.error('Error obteniendo mensajes:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Marcar usuario como online
router.post('/presence/online', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('presencia_usuarios')
            .upsert({
                usuario_id: req.user.id,
                nombre_completo: req.user.nombre,
                estado: 'online',
                ultima_actividad: new Date().toISOString()
            }, {
                onConflict: 'usuario_id'
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error marcando usuario online:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Marcar usuario como offline
router.post('/presence/offline', authenticateToken, async (req, res) => {
    try {
        const { error } = await supabase
            .from('presencia_usuarios')
            .update({
                estado: 'offline',
                ultima_actividad: new Date().toISOString()
            })
            .eq('usuario_id', req.user.id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Usuario marcado como offline'
        });
    } catch (error) {
        console.error('Error marcando usuario offline:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener usuarios online con estado de check-in
router.get('/presence', authenticateToken, async (req, res) => {
    try {
        console.log('Getting presence data...');

        // Get presence data
        const { data: presenceData, error: presenceError } = await supabase
            .from('presencia_usuarios')
            .select('usuario_id, nombre_completo, estado, ultima_actividad')
            .order('nombre_completo');

        if (presenceError) {
            console.error('Error getting presence:', presenceError);
            throw presenceError;
        }

        console.log('Presence data:', presenceData);

        if (!presenceData || presenceData.length === 0) {
            console.log('No presence data found');
            return res.json({
                success: true,
                data: []
            });
        }

        // Get employee check-in status for each user
        const usersWithStatus = [];

        for (const user of presenceData) {
            try {
                const { data: empleado, error: empError } = await supabase
                    .from('empleados')
                    .select('estado_actual')
                    .eq('usuario_id', user.usuario_id)
                    .maybeSingle(); // Use maybeSingle instead of single

                if (empError) {
                    console.error(`Error getting employee for user ${user.usuario_id}:`, empError);
                }

                usersWithStatus.push({
                    ...user,
                    check_in_status: empleado?.estado_actual || 'desconectado'
                });
            } catch (error) {
                console.error(`Error processing user ${user.usuario_id}:`, error);
                // Still add the user even if there's an error
                usersWithStatus.push({
                    ...user,
                    check_in_status: 'desconectado'
                });
            }
        }

        console.log('Users with status:', usersWithStatus);

        res.json({
            success: true,
            data: usersWithStatus
        });
    } catch (error) {
        console.error('Error obteniendo presencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// Actualizar actividad (heartbeat)
router.post('/presence/heartbeat', authenticateToken, async (req, res) => {
    try {
        await supabase
            .from('presencia_usuarios')
            .update({
                ultima_actividad: new Date().toISOString()
            })
            .eq('usuario_id', req.user.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error en heartbeat:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;
