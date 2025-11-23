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

// Middleware para verificar rol de admin
function requireAdmin(req, res, next) {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requiere rol de administrador'
        });
    }
    next();
}

// Check-in endpoint
router.post('/checkin', authenticateToken, async (req, res) => {
    try {
        // Get employee ID from user
        const { data: empleado, error: empError } = await supabase
            .from('empleados')
            .select('id')
            .eq('usuario_id', req.user.id)
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (empError || !empleado) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        const now = new Date();
        const fecha = now.toISOString().split('T')[0];
        const hora_entrada = now.toISOString();

        // Check if there's already an active record for today
        const { data: activeRecord } = await supabase
            .from('registros_tiempo')
            .select('id')
            .eq('empleado_id', empleado.id)
            .eq('fecha', fecha)
            .eq('estado', 'activo')
            .single();

        if (activeRecord) {
            return res.status(400).json({
                success: false,
                message: 'Ya tienes un registro activo para hoy'
            });
        }

        // Insert new time record
        const { data: newRecord, error: insertError } = await supabase
            .from('registros_tiempo')
            .insert([{
                empleado_id: empleado.id,
                usuario_id: req.user.id,
                fecha: fecha,
                hora_entrada: hora_entrada,
                estado: 'activo'
            }])
            .select()
            .single();

        if (insertError) throw insertError;

        // Update employee status to 'conectado'
        await supabase
            .from('empleados')
            .update({
                estado_actual: 'conectado',
                ultima_conexion: hora_entrada
            })
            .eq('id', empleado.id);

        res.json({
            success: true,
            message: `Entrada registrada a las ${now.toLocaleTimeString()}`,
            registro_id: newRecord.id
        });

    } catch (error) {
        console.error('Error en check-in:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Check-out endpoint
router.post('/checkout', authenticateToken, async (req, res) => {
    try {
        // Get employee ID from user
        const { data: empleado, error: empError } = await supabase
            .from('empleados')
            .select('id')
            .eq('usuario_id', req.user.id)
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (empError || !empleado) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        const now = new Date();
        const hora_salida = now.toISOString();

        // Find the latest active time record
        const { data: activeRecord, error: recordError } = await supabase
            .from('registros_tiempo')
            .select('id, hora_entrada')
            .eq('empleado_id', empleado.id)
            .eq('estado', 'activo')
            .order('hora_entrada', { ascending: false })
            .limit(1)
            .single();

        if (recordError || !activeRecord) {
            return res.status(400).json({
                success: false,
                message: 'No hay un registro de entrada activo'
            });
        }

        // Calculate worked hours
        const entrada = new Date(activeRecord.hora_entrada);
        const salida = new Date(hora_salida);
        const horasTrabajadas = Math.round(((salida - entrada) / (1000 * 60 * 60)) * 100) / 100;

        // Update the record with hora_salida and horas_trabajadas
        await supabase
            .from('registros_tiempo')
            .update({
                hora_salida: hora_salida,
                horas_trabajadas: horasTrabajadas,
                estado: 'completado',
                updated_at: now.toISOString()
            })
            .eq('id', activeRecord.id);

        // Update employee status to 'desconectado'
        await supabase
            .from('empleados')
            .update({
                estado_actual: 'desconectado',
                ultima_conexion: hora_salida
            })
            .eq('id', empleado.id);

        res.json({
            success: true,
            message: `Salida registrada a las ${now.toLocaleTimeString()}. Trabajaste ${horasTrabajadas} horas`,
            horas: horasTrabajadas
        });

    } catch (error) {
        console.error('Error en check-out:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener asistencia del día actual del empleado
router.get('/my-today', authenticateToken, async (req, res) => {
    try {
        // Get employee ID from user
        const { data: empleado } = await supabase
            .from('empleados')
            .select('id')
            .eq('usuario_id', req.user.id)
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (!empleado) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        const today = new Date().toISOString().split('T')[0];

        const { data: records, error } = await supabase
            .from('registros_tiempo')
            .select('id, fecha, hora_entrada, hora_salida, horas_trabajadas, estado, notas')
            .eq('empleado_id', empleado.id)
            .eq('fecha', today)
            .order('hora_entrada', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: records || []
        });

    } catch (error) {
        console.error('Error obteniendo asistencia de hoy:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener toda la asistencia (solo admin)
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { employeeId } = req.query;

        let query = supabase
            .from('registros_tiempo')
            .select(`
                id,
                fecha,
                hora_entrada,
                hora_salida,
                horas_trabajadas,
                estado,
                notas,
                empleados!inner (
                    id,
                    nombre,
                    departamento
                ),
                usuarios!inner (
                    usuario
                )
            `)
            .order('fecha', { ascending: false })
            .order('hora_entrada', { ascending: false })
            .limit(1000);

        if (employeeId) {
            query = query.eq('empleado_id', employeeId);
        }

        const { data: records, error } = await query;

        if (error) throw error;

        // Flatten the structure
        const flattenedRecords = records.map(record => ({
            id: record.id,
            fecha: record.fecha,
            hora_entrada: record.hora_entrada,
            hora_salida: record.hora_salida,
            horas_trabajadas: record.horas_trabajadas,
            estado: record.estado,
            notas: record.notas,
            empleado_nombre: record.empleados.nombre,
            departamento: record.empleados.departamento,
            empleado_id: record.empleados.id,
            usuario: record.usuarios.usuario
        }));

        res.json({
            success: true,
            data: flattenedRecords
        });

    } catch (error) {
        console.error('Error obteniendo toda la asistencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener asistencia del día actual (solo admin)
router.get('/today', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: records, error } = await supabase
            .from('registros_tiempo')
            .select(`
                id,
                fecha,
                hora_entrada,
                hora_salida,
                horas_trabajadas,
                estado,
                notas,
                empleados!inner (
                    nombre,
                    departamento,
                    tipo_trabajo,
                    estado_actual,
                    ultima_conexion
                ),
                usuarios!inner (
                    usuario
                )
            `)
            .eq('fecha', today)
            .order('hora_entrada', { ascending: false });

        if (error) throw error;

        // Flatten the structure
        const flattenedRecords = records.map(record => ({
            id: record.id,
            fecha: record.fecha,
            hora_entrada: record.hora_entrada,
            hora_salida: record.hora_salida,
            horas_trabajadas: record.horas_trabajadas,
            estado: record.estado,
            notas: record.notas,
            empleado_nombre: record.empleados.nombre,
            departamento: record.empleados.departamento,
            tipo_trabajo: record.empleados.tipo_trabajo,
            estado_actual: record.empleados.estado_actual,
            ultima_conexion: record.empleados.ultima_conexion,
            usuario: record.usuarios.usuario
        }));

        res.json({
            success: true,
            data: flattenedRecords
        });

    } catch (error) {
        console.error('Error obteniendo asistencia del día:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener asistencia por fecha específica (solo admin)
router.get('/by-date', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Fecha requerida'
            });
        }

        const { data: records, error } = await supabase
            .from('registros_tiempo')
            .select(`
                id,
                fecha,
                hora_entrada,
                hora_salida,
                horas_trabajadas,
                estado,
                notas,
                empleados!inner (
                    nombre,
                    departamento,
                    tipo_trabajo
                ),
                usuarios!inner (
                    usuario
                )
            `)
            .eq('fecha', date)
            .order('hora_entrada', { ascending: false });

        if (error) throw error;

        // Flatten the structure
        const flattenedRecords = records.map(record => ({
            id: record.id,
            fecha: record.fecha,
            hora_entrada: record.hora_entrada,
            hora_salida: record.hora_salida,
            horas_trabajadas: record.horas_trabajadas,
            estado: record.estado,
            notas: record.notas,
            empleado_nombre: record.empleados.nombre,
            departamento: record.empleados.departamento,
            tipo_trabajo: record.empleados.tipo_trabajo,
            usuario: record.usuarios.usuario
        }));

        res.json({
            success: true,
            data: flattenedRecords
        });

    } catch (error) {
        console.error('Error obteniendo asistencia por fecha:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener empleados con horarios de entrada/salida (solo admin)
router.get('/employees-with-hours', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: empleados, error } = await supabase
            .from('empleados')
            .select(`
                id,
                nombre,
                departamento,
                tipo_trabajo,
                estado_actual,
                ultima_conexion,
                usuarios!inner (
                    usuario
                )
            `)
            .order('nombre');

        if (error) throw error;

        // Get today's records for all employees
        const { data: records } = await supabase
            .from('registros_tiempo')
            .select('empleado_id, hora_entrada, hora_salida, horas_trabajadas, estado')
            .eq('fecha', today);

        // Combine data
        const result = empleados.map(emp => {
            const record = records?.find(r => r.empleado_id === emp.id);
            return {
                id: emp.id,
                nombre: emp.nombre,
                departamento: emp.departamento,
                tipo_trabajo: emp.tipo_trabajo,
                estado_actual: emp.estado_actual,
                ultima_conexion: emp.ultima_conexion,
                usuario: emp.usuarios.usuario,
                hora_entrada: record?.hora_entrada || null,
                hora_salida: record?.hora_salida || null,
                horas_trabajadas: record?.horas_trabajadas || null,
                registro_estado: record?.estado || null
            };
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error obteniendo empleados con horarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;