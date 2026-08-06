-- Migración de Optimización de Índices de Base de Datos para Supabase / PostgreSQL
-- Archivo: supabase/migrations/20260806224500_optimize_search_and_indexes.sql

-- 1. Índices para agilizar filtrados por estado y ordenación cronológica en Leads
CREATE INDEX IF NOT EXISTS idx_leads_status_created_at 
ON leads (status, created_at DESC);

-- 2. Índices para agilizar consultas de tareas pendientes en Agenda
CREATE INDEX IF NOT EXISTS idx_agenda_completed_due_date 
ON agenda (completed, due_date ASC);

-- 3. Índices para ordenación de correos en Email Tracking
CREATE INDEX IF NOT EXISTS idx_email_tracking_created_at 
ON email_tracking (created_at DESC);

-- 4. Índice para la tabla de inventario por estado y número de vivienda
CREATE INDEX IF NOT EXISTS idx_inventory_estado_numero 
ON inventory (estado_vivienda, numero_vivienda ASC);
