-- Chat Feature Schema
-- Execute this SQL in your Supabase SQL Editor

-- Create mensajes_chat table
CREATE TABLE IF NOT EXISTS mensajes_chat (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_usuario TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_mensajes_created_at ON mensajes_chat(created_at DESC);

-- Create presencia_usuarios table
CREATE TABLE IF NOT EXISTS presencia_usuarios (
    usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    estado TEXT DEFAULT 'offline' CHECK(estado IN ('online', 'offline')),
    ultima_actividad TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE mensajes_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencia_usuarios ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now)
CREATE POLICY "Enable all operations for mensajes_chat" ON mensajes_chat FOR ALL USING (true);
CREATE POLICY "Enable all operations for presencia_usuarios" ON presencia_usuarios FOR ALL USING (true);

-- Enable Realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE mensajes_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE presencia_usuarios;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Chat schema created successfully!';
    RAISE NOTICE '📊 Tables created: mensajes_chat, presencia_usuarios';
    RAISE NOTICE '⚡ Realtime enabled for both tables';
END $$;
