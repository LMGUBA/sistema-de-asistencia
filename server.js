require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, insertTestData } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const dashboardRoutes = require('./routes/dashboard');
const attendanceRoutes = require('./routes/attendance');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/chat', chatRoutes);

// Ruta principal - servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Inicializar base de datos
async function startServer() {
    try {
        await initializeDatabase();
        await insertTestData();

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            console.log('📊 Dashboard de Trabajo Remoto');
            console.log('👤 Usuarios de prueba:');
            console.log('   Admin: admin / password');
            console.log('   Empleado: juan.perez / password');
            console.log('   Empleado: maria.gonzalez / password');
            console.log('   Empleado: carlos.rodriguez / password');
        });
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;