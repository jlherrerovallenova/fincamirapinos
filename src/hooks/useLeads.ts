// src/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Lead, LeadUpdate, LeadInsert } from '../types/crm';

export const LEADS_QUERY_KEY = ['leads'];

interface FetchLeadsParams {
  page: number;
  pageSize: number;
  searchTerm?: string;
  statusFilter?: string;
  sourceFilter?: string;
  sortField?: keyof Lead;
  sortDirection?: 'asc' | 'desc';
}

export function useLeads(params: FetchLeadsParams) {
  const { page, pageSize, searchTerm, statusFilter, sourceFilter, sortField = 'created_at', sortDirection = 'desc' } = params;

  return useQuery({
    queryKey: [...LEADS_QUERY_KEY, params],
    queryFn: async ({ signal }) => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('leads')
        .select('*', { count: 'exact' });

      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (sourceFilter) {
        query = query.ilike('source', `%${sourceFilter}%`);
      }

      query = query.abortSignal(signal);

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        leads: data || [],
        totalCount: count || 0
      };
    }
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: LeadUpdate }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      if (data?.id) {
        queryClient.setQueryData(['lead', data.id], data);
      }
    }
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newLead: LeadInsert) => {
      const { data, error } = await supabase
        .from('leads')
        .insert([newLead])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    }
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
    }
  });
}
