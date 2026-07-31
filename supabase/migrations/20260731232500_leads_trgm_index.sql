-- Habilitar extensión pg_trgm si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Crear índices de trigramas para búsqueda eficiente con ilike
CREATE INDEX IF NOT EXISTS leads_name_trgm_idx ON leads USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS leads_email_trgm_idx ON leads USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS leads_phone_trgm_idx ON leads USING gin (phone gin_trgm_ops);
