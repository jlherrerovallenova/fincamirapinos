// src/pages/Agenda.tsx
import { useState, useMemo } from 'react';
import { useAgenda, useUpdateAgendaItem, useDeleteAgendaItem } from '../hooks/useAgenda';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  User
} from 'lucide-react';
import CreateTaskModal from '../components/CreateTaskModal';
import { useDialog } from '../context/DialogContext';
import type { Database } from '../types/supabase';

// Tipo AgendaItem enriquecido con datos del cliente
type AgendaItem = Database['public']['Tables']['agenda']['Row'] & {
  leads?: { name: string } | null
};

const ITEMS_PER_PAGE = 8;

export default function Agenda() {
  const { data: rawItems = [], isLoading: loading } = useAgenda();
  const updateMutation = useUpdateAgendaItem();
  const deleteMutation = useDeleteAgendaItem();

  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { showConfirm, showAlert } = useDialog();

  // Filtrado y mapeo seguro de la lista
  const filteredItems = useMemo(() => {
    const formatted = rawItems.map(item => ({
      ...item,
      leads: Array.isArray(item.leads) ? item.leads[0] : item.leads
    })) as AgendaItem[];

    if (filterStatus === 'pending') return formatted.filter(i => !i.completed);
    if (filterStatus === 'completed') return formatted.filter(i => i.completed);
    return formatted;
  }, [rawItems, filterStatus]);

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    const from = (page - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(from, from + ITEMS_PER_PAGE);
  }, [filteredItems, page]);

  const toggleStatus = (item: AgendaItem) => {
    updateMutation.mutate({
      id: item.id,
      updates: { completed: !item.completed }
    });
  };

  const deleteItem = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Tarea',
      message: '¿Estás seguro de que deseas eliminar esta tarea de la agenda de forma permanente?',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      await showAlert({ title: 'Error', message: 'No se pudo eliminar la tarea' });
    }
  };

  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('llamada')) return <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Clock size={18} /></div>;
    if (t.includes('visita')) return <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CalendarIcon size={18} /></div>;
    return <div className="p-2 bg-slate-50 text-slate-500 rounded-lg"><AlertCircle size={18} /></div>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* CABECERA DE PÁGINA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <CalendarIcon size={36} className="text-[#006c4a]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Agenda Global</h2>
            <p className="text-slate-500 text-xs font-semibold mt-1">Planificación y seguimiento de visitas, llamadas y tareas comerciales.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto self-start md:self-auto justify-end">
          <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden p-1 shadow-sm">
            <button
              onClick={() => { setFilterStatus('pending'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'pending' ? 'bg-[#006c4a] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Pendientes
            </button>
            <button
              onClick={() => { setFilterStatus('completed'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Completadas
            </button>
            <button
              onClick={() => { setFilterStatus('all'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Todas
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-[#006c4a] text-white font-bold rounded-xl shadow-lg hover:bg-[#005137] transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} /> <span className="hidden sm:inline">Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Próximas Actividades</h3>
          <span className="text-xs font-medium text-slate-400">{totalItems} registros</span>
        </div>

        <div className="divide-y divide-slate-100 flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 gap-2">
              <Loader2 className="animate-spin" /> Cargando...
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <p className="font-medium">No hay tareas en esta vista.</p>
            </div>
          ) : (
            paginatedItems.map((item) => {
              const dateObj = new Date(item.due_date);
              return (
                <div key={item.id} className={`p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors group ${item.completed ? 'opacity-60 bg-slate-50/50' : ''}`}>
                  <button
                    onClick={() => toggleStatus(item)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500 text-transparent'}`}
                  >
                    <CheckCircle2 size={14} />
                  </button>

                  {getTypeIcon(item.type || '')}

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold ${item.completed ? 'text-emerald-600 opacity-70' : 'text-slate-800'}`}>
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      {item.leads?.name ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                          <User size={12} /> {item.leads.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sin cliente vinculado</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <p className="text-sm font-bold text-slate-700">
                      {dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </p>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Paginación */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Página {page} de {totalPages || 1}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-white border rounded-lg disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 bg-white border rounded-lg disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}