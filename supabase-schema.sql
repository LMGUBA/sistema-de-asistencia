-- Dashboard Trabajo Remoto - Supabase Schema
-- Execute this SQL in your Supabase SQL Editor

-- Drop existing tables if they exist (optional, uncomment if needed)
-- DROP TABLE IF EXISTS registros_tiempo CASCADE;
-- DROP TABLE IF EXISTS empleados CASCADE;
-- DROP TABLE IF EXISTS usuarios CASCADE;

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    usuario TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'empleado' CHECK(rol IN ('admin', 'empleado')),
    nombre_completo TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create empleados table
CREATE TABLE IF NOT EXISTS empleados (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    departamento TEXT NOT NULL,
    tipo_trabajo TEXT DEFAULT 'presencial' CHECK(tipo_trabajo IN ('presencial', 'remoto', 'hibrido')),
    estado_actual TEXT DEFAULT 'desconectado' CHECK(estado_actual IN ('conectado', 'desconectado')),
    ultima_conexion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create registros_tiempo table
CREATE TABLE IF NOT EXISTS registros_tiempo (
    id BIGSERIAL PRIMARY KEY,
    empleado_id BIGINT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_entrada TIMESTAMPTZ,
    hora_salida TIMESTAMPTZ,
    horas_trabajadas DECIMAL(5,2) DEFAULT 0 CHECK(horas_trabajadas >= 0),
    estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo', 'completado', 'cancelado')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_empleados_usuario_id ON empleados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_empleados_departamento ON empleados(departamento);
CREATE INDEX IF NOT EXISTS idx_empleados_estado ON empleados(estado_actual);
CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros_tiempo(fecha);
CREATE INDEX IF NOT EXISTS idx_registros_empleado ON registros_tiempo(empleado_id);
CREATE INDEX IF NOT EXISTS idx_registros_usuario ON registros_tiempo(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_estado ON registros_tiempo(estado);
CREATE INDEX IF NOT EXISTS idx_registros_fecha_empleado ON registros_tiempo(fecha, empleado_id);

-- Enable Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_tiempo ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now, you can restrict later)
CREATE POLICY "Enable all operations for usuarios" ON usuarios FOR ALL USING (true);
CREATE POLICY "Enable all operations for empleados" ON empleados FOR ALL USING (true);
CREATE POLICY "Enable all operations for registros_tiempo" ON registros_tiempo FOR ALL USING (true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Tables created: usuarios, empleados, registros_tiempo';
    RAISE NOTICE '🔒 Row Level Security enabled with permissive policies';
    RAISE NOTICE '⚡ Indexes created for optimal performance';
END $$;
