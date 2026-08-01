// src/hooks/useInventory.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { sortInventoryProperties } from '../utils/propertySorter';

export { sortInventoryProperties };

type PropertyInfo = Database['public']['Tables']['inventory']['Row'];

/**
 * Hook para obtener el listado del Inventario ordenado por defecto.
 */
export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*');

      if (error) throw new Error(error.message);
      return sortInventoryProperties(data as PropertyInfo[]);
    },
  });
}

/**
 * Mutación para eliminar una propiedad del inventario
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
