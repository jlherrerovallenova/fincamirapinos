// src/pages/Dashboard.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Search,
  LayoutDashboard,
  ArrowUpRight,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import DashboardAgenda from '../components/dashboard/DashboardAgenda';
import DashboardEmailTracking from '../components/dashboard/DashboardEmailTracking';
import DashboardStatsCards from '../components/dashboard/DashboardStatsCards';
import { TabButton } from '../components/dashboard/TabButton';
import {
  useDashboardStats,
  usePendingAgenda,
  useEmailTracking,
  useToggleAgendaStatus,
  useDeleteDashboardAgendaItem
} from '../hooks/useDashboard';
import type { AgendaItem } from '../types/crm';

export default function Dashboard() {
  const { session } = useAuth();
  const { showConfirm, showAlert } = useDialog();
  const navigate = useNavigate();

  // Custom Hooks con React Query
  const { data: stats = { totalLeads: 0, topSources: [] } } = useDashboardStats();
  const { data: agenda = [], isLoading: loadingAgenda } = usePendingAgenda();
  const { data: emails = [], isLoading: loadingEmails } = useEmailTracking();
  const toggleAgendaMutation = useToggleAgendaStatus();
  const deleteAgendaMutation = useDeleteDashboardAgendaItem();

  const loading = loadingAgenda || loadingEmails;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'hoy' | 'caducadas' | 'semana' | 'correos'>('hoy');
  const [emailFilter, setEmailFilter] = useState<'all' | 'unopened'>('all');

  const dateBoundaries = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59, 999);

    const next7Days = new Date(startToday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    const endW = endSunday.getTime() > next7Days.getTime() ? endSunday : next7Days;

    return {
      startTodayTime: startToday.getTime(),
      endTodayTime: endToday.getTime(),
      endWeekTime: endW.getTime(),
    };
  }, []);

  const filteredAgenda = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return agenda
      .filter(item => {
        const leadName = item.leads?.name || '';
        const taskTitle = item.title || '';
        const taskComments = item.comments || '';
        const matchesSearch =
          leadName.toLowerCase().includes(query) ||
          taskTitle.toLowerCase().includes(query) ||
          taskComments.toLowerCase().includes(query);

        if (!matchesSearch) return false;

        const taskDate = new Date(item.due_date).getTime();

        if (activeTab === 'hoy') {
          return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endTodayTime && !item.completed;
        }
        if (activeTab === 'caducadas') {
          return taskDate < dateBoundaries.startTodayTime && !item.completed;
        }
        if (activeTab === 'semana') {
          return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endWeekTime && !item.completed;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        return dateA - dateB;
      });
  }, [agenda, searchQuery, activeTab, dateBoundaries]);

  const filteredEmails = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return emails
      .filter(email => {
        const matchesSearch =
          email.leads?.name?.toLowerCase().includes(query) ||
          email.subject?.toLowerCase().includes(query);

        if (!matchesSearch) return false;

        if (emailFilter === 'unopened') {
          const isOpened = email.status === 'opened' || email.opens_count > 0;
          if (isOpened) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [emails, searchQuery, emailFilter]);

  const todayCount = useMemo(() => agenda.filter(task => {
    if (task.completed) return false;
    const taskDate = new Date(task.due_date).getTime();
    return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endTodayTime;
  }).length, [agenda, dateBoundaries]);

  const overdueCount = useMemo(() => agenda.filter(task => {
    if (task.completed) return false;
    const taskDate = new Date(task.due_date).getTime();
    return taskDate < dateBoundaries.startTodayTime;
  }).length, [agenda, dateBoundaries]);

  const weekCount = useMemo(() => agenda.filter(task => {
    if (task.completed) return false;
    const taskDate = new Date(task.due_date).getTime();
    return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endWeekTime;
  }).length, [agenda, dateBoundaries]);

  const unopenedEmailsCount = useMemo(() => {
    return emails.filter(email => {
      const isOpened = email.status === 'opened' || email.opens_count > 0;
      return !isOpened;
    }).length;
  }, [emails]);

  const toggleTask = async (task: AgendaItem) => {
    try {
      await toggleAgendaMutation.mutateAsync({ id: task.id, completed: !task.completed });
    } catch (error) {
      console.error("Error actualizando tarea:", error);
      await showAlert({ title: 'Error', message: 'No se pudo actualizar la tarea.' });
    }
  };

  const deleteTask = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Tarea',
      message: '¿Estás seguro de que deseas eliminar esta tarea de la agenda?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;
    try {
      await deleteAgendaMutation.mutateAsync(id);
    } catch (error) {
      console.error("Error eliminando tarea:", error);
      await showAlert({ title: 'Error', message: 'No se pudo eliminar la tarea' });
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 w-full gap-6 pb-10">
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <LayoutDashboard size={36} className="text-[#006c4a]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Panel de Control</h2>
            <p className="text-slate-500 text-xs font-semibold mt-1">Hola {session?.user.email?.split('@')[0]}, bienvenido de nuevo. Aquí tienes un resumen de la actividad hoy.</p>
          </div>
        </div>
      </div>

      {/* FILA 1: AGENDA DE ACCIONES */}
      <div className="grid grid-cols-1 gap-8 mb-6">
        <div className="col-span-1 bg-white rounded-xl shadow-[0_4px_6px_-1px_rgb(0,0,0,0.05)] border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Calendar className="text-[#006c4a]" size={18} />
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">Agenda de Acciones</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/agenda')}
                className="text-xs font-bold text-[#006c4a] hover:underline transition-all"
              >
                VER CALENDARIO
              </button>
            </div>

            {/* PESTAÑAS (TABS) */}
            <div className="p-1.5 bg-slate-50 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-100">
              <div className="flex bg-white p-1 rounded-lg border border-slate-200 w-fit">
                <TabButton
                  label="Hoy"
                  count={todayCount > 0 ? todayCount : undefined}
                  active={activeTab === 'hoy'}
                  onClick={() => setActiveTab('hoy')}
                />
                <TabButton
                  label="Caducadas"
                  count={overdueCount}
                  active={activeTab === 'caducadas'}
                  onClick={() => setActiveTab('caducadas')}
                  variant="overdue"
                />
                <TabButton
                  label="Esta semana"
                  count={weekCount > 0 ? weekCount : undefined}
                  active={activeTab === 'semana'}
                  onClick={() => setActiveTab('semana')}
                />
                <TabButton
                  label="Correos"
                  count={unopenedEmailsCount}
                  active={activeTab === 'correos'}
                  onClick={() => setActiveTab('correos')}
                  variant="primary"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                {activeTab === 'correos' && (
                  <select
                    value={emailFilter}
                    onChange={(e) => setEmailFilter(e.target.value as 'all' | 'unopened')}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-700 bg-white shadow-sm cursor-pointer"
                  >
                    <option value="all">Todos los correos</option>
                    <option value="unopened">Sin abrir</option>
                  </select>
                )}
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder={activeTab === 'correos' ? "Buscar por cliente o asunto..." : "Buscar por cliente o tarea..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[500px]">
            {activeTab === 'correos' ? (
              <DashboardEmailTracking
                filteredEmails={filteredEmails}
                searchQuery={searchQuery}
                loading={loading}
                emailFilter={emailFilter}
              />
            ) : (
              <DashboardAgenda
                filteredAgenda={filteredAgenda}
                searchQuery={searchQuery}
                loading={loading}
                activeTab={activeTab as 'hoy' | 'caducadas' | 'semana'}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
              />
            )}
          </div>
        </div>
      </div>

      {/* FILA 2: RESUMEN DE CAPTACIÓN Y ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <DashboardStatsCards stats={stats} />

        {/* WIDGET: ACCESOS RÁPIDOS */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-slate-150 bg-white">
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">Accesos Rápidos</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 flex-1 items-center">
            <button
              onClick={() => navigate('/leads?create=true')}
              className="flex flex-col items-center justify-center p-3 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-200 rounded-xl transition-all duration-200 group text-center gap-2 active:scale-95 h-full min-h-[90px]"
            >
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <Users size={18} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Nuevo Cliente</span>
            </button>

            <button
              onClick={() => navigate('/agenda?create=true')}
              className="flex flex-col items-center justify-center p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 hover:border-blue-200 rounded-xl transition-all duration-200 group text-center gap-2 active:scale-95 h-full min-h-[90px]"
            >
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-all">
                <Calendar size={18} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Nueva Tarea</span>
            </button>

            <button
              onClick={() => navigate('/inventory')}
              className="flex flex-col items-center justify-center p-3 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 hover:border-purple-200 rounded-xl transition-all duration-200 group text-center gap-2 active:scale-95 h-full min-h-[90px]"
            >
              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-all">
                <Globe size={18} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Ver Catálogo</span>
            </button>

            <button
              onClick={() => navigate('/stats')}
              className="flex flex-col items-center justify-center p-3 bg-amber-50/50 hover:bg-amber-50 border border-amber-100 hover:border-amber-200 rounded-xl transition-all duration-200 group text-center gap-2 active:scale-95 h-full min-h-[90px]"
            >
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-all">
                <ArrowUpRight size={18} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Estadísticas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}