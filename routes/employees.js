const express = require('express');
const bcrypt = require('bcryptjs');
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

// Obtener todos los empleados (solo admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { data: empleados, error } = await supabase
            .from('empleados')
            .select(`
                id,
                nombre,
                departamento,
                tipo_trabajo,
                estado_actual,
                ultima_conexion,
                created_at,
                usuarios!inner (
                    usuario,
                    email,
                    rol
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten the structure
        const flattenedEmpleados = empleados.map(emp => ({
            id: emp.id,
            nombre: emp.nombre,
            departamento: emp.departamento,
            tipo_trabajo: emp.tipo_trabajo,
            estado_actual: emp.estado_actual,
            ultima_conexion: emp.ultima_conexion,
            created_at: emp.created_at,
            usuario: emp.usuarios.usuario,
            email: emp.usuarios.email,
            rol: emp.usuarios.rol
        }));

        res.json({
            success: true,
            data: flattenedEmpleados
        });
    } catch (err) {
        console.error('Error al obtener empleados:', err);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener empleado por ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Si no es admin, solo puede ver su propio perfil
        if (req.user.rol !== 'admin' && req.user.id != id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para ver este empleado'
            });
        }

        const { data: empleado, error } = await supabase
            .from('empleados')
            .select(`
                id,
                nombre,
                departamento,
                tipo_trabajo,
                estado_actual,
                ultima_conexion,
                created_at,
                usuarios!inner (
                    usuario,
                    email,
                    rol
                )
            `)
            .eq('id', id)
            .single();

        if (error || !empleado) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        // Flatten the structure
        const flattenedEmpleado = {
            id: empleado.id,
            nombre: empleado.nombre,
            departamento: empleado.departamento,
            tipo_trabajo: empleado.tipo_trabajo,
            estado_actual: empleado.estado_actual,
            ultima_conexion: empleado.ultima_conexion,
            created_at: empleado.created_at,
            usuario: empleado.usuarios.usuario,
            email: empleado.usuarios.email,
            rol: empleado.usuarios.rol
        };

        res.json({
            success: true,
            data: flattenedEmpleado
        });
    } catch (err) {
        console.error('Error al obtener empleado:', err);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Crear nuevo empleado (solo admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { nombre, departamento, tipo_trabajo, usuario, email, password } = req.body;

    if (!nombre || !usuario || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Nombre, usuario, email y contraseña son requeridos'
        });
    }

    try {
        // Verificar si el usuario ya existe
        const { data: existingUser } = await supabase
            .from('usuarios')
            .select('id')
            .or(`usuario.eq.${usuario},email.eq.${email}`)
            .single();

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'El usuario o email ya existe'
            });
        }

        // Hash de la contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario
        const { data: newUser, error: userError } = await supabase
            .from('usuarios')
            .insert([{
                usuario: usuario,
                password_hash: passwordHash,
                rol: 'empleado',
                nombre_completo: nombre,
                email: email
            }])
            .select()
            .single();

        if (userError) throw userError;

        // Insertar empleado
        const { error: employeeError } = await supabase
            .from('empleados')
            .insert([{
                usuario_id: newUser.id,
                nombre: nombre,
                departamento: departamento || 'General',
                tipo_trabajo: tipo_trabajo || 'presencial'
            }]);

        if (employeeError) throw employeeError;

        res.status(201).json({
            success: true,
            message: 'Empleado creado exitosamente'
        });
    } catch (error) {
        console.error('Error al crear empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Actualizar empleado
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, departamento, tipo_trabajo, email } = req.body;

        // Si no es admin, solo puede editar su propio perfil
        if (req.user.rol !== 'admin') {
            const { data: employee } = await supabase
                .from('empleados')
                .select('usuario_id')
                .eq('id', id)
                .single();

            if (!employee || employee.usuario_id != req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para editar este empleado'
                });
            }
        }

        // Actualizar empleado
        const { error: employeeError } = await supabase
            .from('empleados')
            .update({
                nombre: nombre,
                departamento: departamento,
                tipo_trabajo: tipo_trabajo
            })
            .eq('id', id);

        if (employeeError) throw employeeError;

        // Actualizar email en usuarios si se proporciona
        if (email) {
            const { data: employee } = await supabase
                .from('empleados')
                .select('usuario_id')
                .eq('id', id)
                .single();

            if (employee) {
                await supabase
                    .from('usuarios')
                    .update({ email: email })
                    .eq('id', employee.usuario_id);
            }
        }

        res.json({
            success: true,
            message: 'Empleado actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error al actualizar empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Eliminar empleado (solo admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener usuario_id antes de eliminar
        const { data: employee, error: getError } = await supabase
            .from('empleados')
            .select('usuario_id')
            .eq('id', id)
            .single();

        if (getError || !employee) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        // Eliminar usuario (esto eliminará en cascada empleado y registros gracias a ON DELETE CASCADE)
        const { error: deleteError } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', employee.usuario_id);

        if (deleteError) throw deleteError;

        res.json({
            success: true,
            message: 'Empleado eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor: ' + error.message
        });
    }
});

// Buscar empleados
router.get('/search/:query', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { query } = req.params;

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
                    usuario,
                    email
                )
            `)
            .or(`nombre.ilike.%${query}%,departamento.ilike.%${query}%,usuarios.usuario.ilike.%${query}%`)
            .order('nombre');

        if (error) throw error;

        // Flatten the structure
        const flattenedEmpleados = empleados.map(emp => ({
            id: emp.id,
            nombre: emp.nombre,
            departamento: emp.departamento,
            tipo_trabajo: emp.tipo_trabajo,
            estado_actual: emp.estado_actual,
            ultima_conexion: emp.ultima_conexion,
            usuario: emp.usuarios.usuario,
            email: emp.usuarios.email
        }));

        res.json({
            success: true,
            data: flattenedEmpleados
        });
    } catch (error) {
        console.error('Error al buscar empleados:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;