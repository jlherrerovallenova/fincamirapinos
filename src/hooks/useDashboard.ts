// src/hooks/useDashboard.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

export const DASHBOARD_QUERY_KEYS = {
  stats: ['dashboard', 'stats'],
  agenda: ['dashboard', 'agenda'],
  emails: ['dashboard', 'emails'],
};

export function useDashboardStats() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.stats,
    queryFn: () => dashboardService.getLeadsStats(),
    staleTime: 1000 * 60 * 5,
  });
}

export function usePendingAgenda() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.agenda,
    queryFn: () => dashboardService.getPendingAgenda(),
  });
}

export function useEmailTracking(limit = 50) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEYS.emails, limit],
    queryFn: () => dashboardService.getEmailTracking(limit),
  });
}

export function useToggleAgendaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      dashboardService.toggleAgendaStatus(id, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.agenda });
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });
}

export function useDeleteDashboardAgendaItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => dashboardService.deleteAgendaItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.agenda });
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
    },
  });
}
