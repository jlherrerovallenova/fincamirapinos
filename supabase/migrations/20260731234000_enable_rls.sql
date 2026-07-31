-- Migración para asegurar la seguridad perimetral de la base de datos (RLS)
-- Esto impide que usuarios no autenticados (con la anon_key pública) puedan acceder a los datos.

-- 1. Habilitar RLS en todas las tablas clave
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;

-- 2. Crear políticas de acceso (sólo usuarios autenticados)

-- Leads
DROP POLICY IF EXISTS "Autenticados pueden gestionar leads" ON leads;
CREATE POLICY "Autenticados pueden gestionar leads" ON leads FOR ALL USING (auth.role() = 'authenticated');

-- Inventory
DROP POLICY IF EXISTS "Autenticados pueden gestionar inventory" ON inventory;
CREATE POLICY "Autenticados pueden gestionar inventory" ON inventory FOR ALL USING (auth.role() = 'authenticated');

-- Agenda
DROP POLICY IF EXISTS "Autenticados pueden gestionar agenda" ON agenda;
CREATE POLICY "Autenticados pueden gestionar agenda" ON agenda FOR ALL USING (auth.role() = 'authenticated');

-- Email Tracking
DROP POLICY IF EXISTS "Autenticados pueden gestionar email_tracking" ON email_tracking;
CREATE POLICY "Autenticados pueden gestionar email_tracking" ON email_tracking FOR ALL USING (auth.role() = 'authenticated');

-- Profiles
DROP POLICY IF EXISTS "Autenticados pueden gestionar profiles" ON profiles;
CREATE POLICY "Autenticados pueden gestionar profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated');

-- Settings
DROP POLICY IF EXISTS "Autenticados pueden gestionar settings" ON settings;
CREATE POLICY "Autenticados pueden gestionar settings" ON settings FOR ALL USING (auth.role() = 'authenticated');
