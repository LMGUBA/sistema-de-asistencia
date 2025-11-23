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

// Obtener estadísticas del dashboard
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const user = req.user;

        if (user.rol === 'admin') {
            // Admin stats
            const { count: totalEmpleados } = await supabase
                .from('empleados')
                .select('*', { count: 'exact', head: true });

            const { count: empleadosConectados } = await supabase
                .from('empleados')
                .select('*', { count: 'exact', head: true })
                .eq('estado_actual', 'conectado');

            const { count: empleadosRemotos } = await supabase
                .from('empleados')
                .select('*', { count: 'exact', head: true })
                .eq('tipo_trabajo', 'remoto');

            const today = new Date().toISOString().split('T')[0];
            const { count: registrosHoy } = await supabase
                .from('registros_tiempo')
                .select('*', { count: 'exact', head: true })
                .eq('fecha', today);

            res.json({
                totalEmpleados: totalEmpleados || 0,
                empleadosConectados: empleadosConectados || 0,
                empleadosRemotos: empleadosRemotos || 0,
                registrosHoy: registrosHoy || 0
            });
        } else {
            // Employee stats
            const { data: empleado } = await supabase
                .from('empleados')
                .select('estado_actual')
                .eq('usuario_id', user.id)
                .single();

            const today = new Date().toISOString().split('T')[0];
            const { count: registrosHoy } = await supabase
                .from('registros_tiempo')
                .select('*', { count: 'exact', head: true })
                .eq('usuario_id', user.id)
                .eq('fecha', today);

            // Get hours worked this month
            const firstDayOfMonth = new Date();
            firstDayOfMonth.setDate(1);
            const firstDay = firstDayOfMonth.toISOString().split('T')[0];

            const { data: monthRecords } = await supabase
                .from('registros_tiempo')
                .select('horas_trabajadas')
                .eq('usuario_id', user.id)
                .gte('fecha', firstDay)
                .eq('estado', 'completado');

            const horasTrabajadasMes = monthRecords?.reduce((sum, record) =>
                sum + (record.horas_trabajadas || 0), 0) || 0;

            res.json({
                estadoActual: empleado?.estado_actual || 'desconectado',
                registrosHoy: registrosHoy || 0,
                horasTrabajadasMes: Math.round(horasTrabajadasMes * 100) / 100
            });
        }
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener datos para gráficos (solo admin)
router.get('/charts', authenticateToken, async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado'
            });
        }

        const { data: empleados } = await supabase
            .from('empleados')
            .select('tipo_trabajo, departamento');

        // Count by work type
        const workTypeCounts = {};
        const departmentCounts = {};

        empleados?.forEach(emp => {
            workTypeCounts[emp.tipo_trabajo] = (workTypeCounts[emp.tipo_trabajo] || 0) + 1;
            departmentCounts[emp.departamento] = (departmentCounts[emp.departamento] || 0) + 1;
        });

        res.json({
            workTypes: workTypeCounts,
            departments: departmentCounts
        });
    } catch (error) {
        console.error('Error obteniendo datos de gráficos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener registros de tiempo de un empleado específico (admin puede ver cualquiera, empleado solo el suyo)
router.get('/employee-time-records/:employeeId', authenticateToken, async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Get employee to check usuario_id
        const { data: empleado } = await supabase
            .from('empleados')
            .select('usuario_id')
            .eq('id', employeeId)
            .single();

        if (!empleado) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        // Check permissions
        if (req.user.rol !== 'admin' && empleado.usuario_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver estos registros'
            });
        }

        const today = new Date().toISOString().split('T')[0];

        const { data: records, error } = await supabase
            .from('registros_tiempo')
            .select('id, fecha, hora_entrada, hora_salida, horas_trabajadas, estado, notas')
            .eq('empleado_id', employeeId)
            .eq('fecha', today)
            .order('hora_entrada', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: records || []
        });
    } catch (error) {
        console.error('Error obteniendo registros de empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;