// src/pages/Sales.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BadgeDollarSign, 
  Search, 
  User, 
  Home, 
  Map as MapPin, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Loader2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatCurrency';

interface SaleItem {
  id: string;
  lead_id: string;
  property_id: string;
  sale_price: number;
  sale_status: 'reserva' | 'mensualidades' | 'escrituracion' | 'completada' | 'cancelada';
  contract_date?: string | null;
  escritura_date?: string | null;
  notes?: string | null;
  created_at: string;
  lead: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  property: {
    id: string;
    numero_vivienda: string;
    modelo: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  reserva: { 
    label: 'Reserva', 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: <Clock size={12} /> 
  },
  mensualidades: { 
    label: 'Mensualidades', 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: <FileText size={12} /> 
  },
  escrituracion: { 
    label: 'Escrituración', 
    color: 'bg-purple-50 text-purple-700 border-purple-200', 
    icon: <FileText size={12} /> 
  },
  completada: { 
    label: 'Cerrada / Completada', 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
    icon: <CheckCircle size={12} /> 
  },
  cancelada: { 
    label: 'Cancelada', 
    color: 'bg-red-50 text-red-700 border-red-200', 
    icon: <AlertCircle size={12} /> 
  }
};

export default function Sales() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      // Peticiones en paralelo a la base de datos
      const [salesRes, closedRes, assignedRes] = await Promise.all([
        supabase
          .from('sales')
          .select(`
            *,
            lead:leads(id, name, phone, email),
            property:inventory(id, numero_vivienda, modelo, precio)
          `)
          .limit(200)
          .order('created_at', { ascending: false }),

        supabase
          .from('leads')
          .select(`
            id, name, phone, email, status, sale_status, property_id, created_at,
            property:inventory(id, numero_vivienda, modelo, precio)
          `)
          .eq('status', 'closed')
          .limit(200),

        supabase
          .from('leads')
          .select(`
            id, name, phone, email, status, sale_status, property_id, created_at,
            property:inventory(id, numero_vivienda, modelo, precio)
          `)
          .not('property_id', 'is', null)
          .limit(200)
      ]);

      const salesData = salesRes.data;
      const closedLeads = closedRes.data || [];
      const assignedLeads = assignedRes.data || [];

      const salesMap = new Map<string, any>();

      (salesData || []).forEach((s: any) => {
        if (s.lead_id) {
          salesMap.set(s.lead_id, {
            id: s.id,
            lead_id: s.lead_id,
            property_id: s.property_id,
            sale_price: s.sale_price || s.property?.precio || 0,
            sale_status: s.sale_status || 'reserva',
            contract_date: s.contract_date,
            escritura_date: s.escritura_date,
            created_at: s.created_at,
            lead: s.lead,
            property: s.property
          });
        }
      });

      // Combinar closedLeads + assignedLeads sin duplicados en O(N) usando un Set
      const closedIds = new Set(closedLeads.map((c: any) => c.id));
      const allLeads = [
        ...closedLeads,
        ...assignedLeads.filter((l: any) => !closedIds.has(l.id))
      ];

      allLeads.forEach((l: any) => {
        if (l.property_id && !salesMap.has(l.id)) {
          salesMap.set(l.id, {
            id: `lead-sale-${l.id}`,
            lead_id: l.id,
            property_id: l.property_id,
            sale_price: l.property?.precio || 0,
            sale_status: l.sale_status || (l.status === 'closed' ? 'completada' : 'reserva'),
            created_at: l.created_at,
            lead: {
              id: l.id,
              name: l.name,
              phone: l.phone,
              email: l.email
            },
            property: l.property ? {
              id: String(l.property.id),
              numero_vivienda: l.property.numero_vivienda,
              modelo: l.property.modelo
            } : null
          });
        }
      });

      const combinedSales = Array.from(salesMap.values()).filter(s => s.property);
      setSales(combinedSales);
    } catch (err) {
      console.error('Error general al cargar operaciones de venta:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const updateSaleStatus = async (sale: SaleItem, newStatus: SaleItem['sale_status']) => {
    setUpdatingId(sale.id);
    setEditingStatusId(null);
    try {
      // Si el id es real de la tabla sales (no prefijado con 'lead-sale-')
      if (!sale.id.startsWith('lead-sale-')) {
        await (supabase as any).from('sales').update({ sale_status: newStatus }).eq('id', sale.id);
      }
      // Actualizar también el campo sale_status del lead
      await (supabase as any).from('leads').update({ sale_status: newStatus }).eq('id', sale.lead_id);
      setSales(prev => prev.map(s => s.id === sale.id ? { ...s, sale_status: newStatus } : s));
    } catch (err) {
      console.error('Error al actualizar estado:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredSales = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return sales.filter(sale => {
      const matchesSearch = 
        sale.lead?.name?.toLowerCase().includes(term) ||
        sale.property?.numero_vivienda?.toLowerCase().includes(term) ||
        sale.property?.modelo?.toLowerCase().includes(term);
      
      const matchesStatus = statusFilter === 'all' || sale.sale_status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [sales, searchTerm, statusFilter]);

  const totalClosedValue = useMemo(() => {
    return (sales || [])
      .filter(s => s.sale_status === 'completada')
      .reduce((acc, curr) => acc + (curr.sale_price || 0), 0);
  }, [sales]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="font-medium animate-pulse">Cargando operaciones de venta...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 gap-6 overflow-hidden">
      {/* Header Inline */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <BadgeDollarSign size={36} className="text-[#006c4a]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Ventas Realizadas</h2>
            <p className="text-slate-500 text-xs font-semibold mt-1 flex items-center gap-2">
              Listado de clientes con viviendas reservadas o escrituradas. 
              <span className="tabular-nums font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                {formatCurrency(totalClosedValue)}
              </span> 
              en ventas completadas.
            </p>
          </div>
        </div>
        <div className="text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm self-start md:self-auto">
          Total Operaciones: <span className="text-slate-900">{sales.length}</span>
        </div>
      </div>

      {/* Barra de Herramientas */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente o vivienda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${statusFilter === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            Todas las operaciones ({sales.length})
          </button>
          <button
            onClick={() => setStatusFilter('reserva')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${statusFilter === 'reserva' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}
          >
            Reservas ({sales.filter(s => s.sale_status === 'reserva').length})
          </button>
          <button
            onClick={() => setStatusFilter('completada')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${statusFilter === 'completada' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}
          >
            Vendidas ({sales.filter(s => s.sale_status === 'completada').length})
          </button>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Cliente</th>
                <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Vivienda / Parcela</th>
                <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Estado</th>
                <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-right">Precio Venta</th>
                <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Fecha Cierre</th>
                <th className="px-6 py-3.5 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={32} className="text-slate-300" />
                      <p className="font-semibold text-slate-500">No se encontraron operaciones de venta</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const statusConf = STATUS_CONFIG[sale.sale_status] || STATUS_CONFIG.reserva;
                  
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-6 py-3.5">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group-hover:text-emerald-700"
                          onClick={() => navigate(`/leads?search=${encodeURIComponent(sale.lead?.name || '')}`)}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{sale.lead?.name || 'Cliente sin nombre'}</p>
                            <p className="text-[11px] text-slate-400">{sale.lead?.phone || sale.lead?.email || 'Sin contacto'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div 
                          className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-emerald-700"
                          onClick={() => navigate(`/inventory?search=${encodeURIComponent(sale.property?.numero_vivienda || '')}`)}
                        >
                          {sale.property?.modelo === 'PARCELA' ? (
                            <>
                              <MapPin size={14} className="text-slate-400" />
                              <span className="font-bold">Parcela {sale.property?.numero_vivienda}</span>
                            </>
                          ) : (
                            <>
                              <Home size={14} className="text-slate-400" />
                              <div>
                                <span className="font-bold">Vivienda {sale.property?.numero_vivienda}</span>
                                <span className="text-[10px] text-slate-400 ml-1">({sale.property?.modelo})</span>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConf.color}`}>
                          {statusConf.icon}
                          {statusConf.label.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                        {formatCurrency(sale.sale_price)}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-semibold">
                        {formatDate(sale.escritura_date || sale.contract_date)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Selector de estado */}
                          {editingStatusId === sale.id ? (
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1">
                              {(Object.keys(STATUS_CONFIG) as Array<SaleItem['sale_status']>).map(st => (
                                <button
                                  key={st}
                                  onClick={() => updateSaleStatus(sale, st)}
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                                    sale.sale_status === st
                                      ? STATUS_CONFIG[st].color + ' scale-105 shadow-sm'
                                      : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                                  }`}
                                >
                                  {STATUS_CONFIG[st].label}
                                </button>
                              ))}
                              <button
                                onClick={() => setEditingStatusId(null)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-1 rounded-lg hover:bg-slate-100"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                              onClick={() => setEditingStatusId(sale.id)}
                              title="Cambiar estado"
                              disabled={updatingId === sale.id}
                            >
                              {updatingId === sale.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <FileText size={12} />
                              )}
                              Estado
                            </button>
                          )}
                          <button
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2.5 py-1.5 rounded-xl transition-colors shadow-sm"
                            onClick={() => navigate(`/leads?search=${encodeURIComponent(sale.lead?.name || '')}`)}
                          >
                            Ver Ficha
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold shrink-0">
          <p>Mostrando {filteredSales.length} de {sales.length} operaciones</p>
        </div>
      </div>
    </div>
  );
}
