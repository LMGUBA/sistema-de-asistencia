const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dashboard-trabajo-remoto-secret-key';

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

// Ruta de login
router.post('/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;

        if (!usuario || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }

        // Buscar usuario en Supabase
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('usuario', usuario)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Usuario o contraseña incorrectos'
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            {
                id: user.id,
                usuario: user.usuario,
                rol: user.rol,
                nombre: user.nombre_completo
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Actualizar estado del empleado
        if (user.rol === 'admin') {
            await supabase
                .from('empleados')
                .update({
                    ultima_conexion: new Date().toISOString(),
                    estado_actual: 'conectado'
                })
                .eq('usuario_id', user.id);
        } else {
            // Check if employee has any active time records today
            const { data: empleado } = await supabase
                .from('empleados')
                .select('id')
                .eq('usuario_id', user.id)
                .single();

            if (empleado) {
                const today = new Date().toISOString().split('T')[0];
                const { data: activeRecord } = await supabase
                    .from('registros_tiempo')
                    .select('id')
                    .eq('empleado_id', empleado.id)
                    .eq('fecha', today)
                    .eq('estado', 'activo')
                    .single();

                const newStatus = activeRecord ? 'conectado' : 'desconectado';

                await supabase
                    .from('empleados')
                    .update({
                        ultima_conexion: new Date().toISOString(),
                        estado_actual: newStatus
                    })
                    .eq('usuario_id', user.id);
            }
        }

        res.json({
            success: true,
            message: 'Login exitoso',
            token: token,
            user: {
                id: user.id,
                usuario: user.usuario,
                rol: user.rol,
                nombre: user.nombre_completo,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para verificar token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Ruta de logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Actualizar estado del empleado
        await supabase
            .from('empleados')
            .update({ estado_actual: 'desconectado' })
            .eq('usuario_id', req.user.id);

        res.json({
            success: true,
            message: 'Logout exitoso'
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;