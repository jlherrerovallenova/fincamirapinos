// src/utils/propertySorter.ts

/**
 * Función de ordenación personalizada para inmuebles:
 * 1. Primero viviendas (Olivo y Arce).
 * 2. Al final parcelas.
 * 3. Orden numérico natural ascendente por número de vivienda dentro de cada grupo.
 */
export function sortInventoryProperties<T extends { modelo?: string | null; numero_vivienda: string }>(properties: T[]): T[] {
  return [...properties].sort((a, b) => {
    const isParcelaA = (a.modelo || '').toLowerCase().includes('parcela');
    const isParcelaB = (b.modelo || '').toLowerCase().includes('parcela');

    if (!isParcelaA && isParcelaB) return -1;
    if (isParcelaA && !isParcelaB) return 1;

    return a.numero_vivienda.localeCompare(b.numero_vivienda, undefined, { numeric: true, sensitivity: 'base' });
  });
}
