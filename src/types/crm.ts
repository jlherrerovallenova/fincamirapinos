// src/types/crm.ts
import type { Database } from './supabase';

export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];

export type AgendaRow = Database['public']['Tables']['agenda']['Row'];
export type AgendaUpdate = Database['public']['Tables']['agenda']['Update'];
export type AgendaInsert = Database['public']['Tables']['agenda']['Insert'];

export type PropertyInfo = Database['public']['Tables']['inventory']['Row'];
export type PropertyUpdate = Database['public']['Tables']['inventory']['Update'];
export type PropertyInsert = Database['public']['Tables']['inventory']['Insert'];

export interface AgendaItem extends AgendaRow {
  leads?: { name: string } | null;
}

export interface EmailTrackingItem {
  id: string;
  lead_id: string | null;
  subject: string;
  status: string;
  opens_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  created_at: string;
  leads?: { name: string; phone: string | null } | null;
}

export interface SourceStat {
  name: string;
  count: number;
  percentage: number;
}
