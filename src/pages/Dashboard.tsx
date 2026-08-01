// src/pages/Dashboard.tsx
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Search,
  LayoutDashboard,
  ArrowUpRight,
  Globe,
  Smartphone,
  Phone,
  Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import type { Database } from '../types/supabase';
import { dashboardService } from '../services/dashboardService';
import DashboardAgenda from '../components/dashboard/DashboardAgenda';
import DashboardEmailTracking from '../components/dashboard/DashboardEmailTracking';
import { TabButton } from '../components/dashboard/TabButton';

// --- TIPOS ---
type AgendaItem = Database['public']['Tables']['agenda']['Row'] & {
  leads?: { name: string } | null
};

interface SourceStat {
  name: string;
  count: number;
  percentage: number;
}

interface EmailTrackingItem {
  id: string;
  lead_id: string | null;
  subject: string;
  status: string;
  opens_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  created_at: string;
  leads?: { name: string, phone: string | null } | null;
}

export default function Dashboard() {
  const { session } = useAuth();
  const { showConfirm, showAlert } = useDialog();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Estados para datos
  const [stats, setStats] = useState<{ totalLeads: number; topSources: SourceStat[] }>({
    totalLeads: 0,
    topSources: []
  });
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  // Estado para la búsqueda del cliente y el tab activo
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'hoy' | 'caducadas' | 'semana' | 'correos'>('hoy');
  const [emails, setEmails] = useState<EmailTrackingItem[]>([]);
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

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. CARGA DE LEADS Y ESTADÍSTICAS
      const statsData = await dashboardService.getLeadsStats();
      if (isMounted.current) setStats(statsData);

      // 2. CARGA DE AGENDA
      const agendaData = await dashboardService.getPendingAgenda();
      if (isMounted.current) setAgenda(agendaData);

      // 3. CARGA DE SEGUIMIENTO DE EMAILS
      const emailData = await dashboardService.getEmailTracking(50);
      if (isMounted.current) setEmails(emailData);

    } catch (error) {
      console.error("Error general cargando dashboard:", error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      loadDashboardData();
    }
  }, [session?.user?.id, loadDashboardData]);

  // --- LÓGICA DE FILTRADO Y PESTAÑAS MEMOIZADA ---
  const filteredAgenda = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return agenda
      .filter(task => {
        const matchesSearch =
          task.leads?.name?.toLowerCase().includes(query) ||
          task.title.toLowerCase().includes(query);

        if (!matchesSearch) return false;

        const taskDate = new Date(task.due_date).getTime();

        if (activeTab === 'hoy') {
          return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endTodayTime;
        }
        if (activeTab === 'caducadas') {
          return taskDate < dateBoundaries.startTodayTime;
        }
        if (activeTab === 'semana') {
          return taskDate >= dateBoundaries.startTodayTime && taskDate <= dateBoundaries.endWeekTime;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();

        if (activeTab === 'caducadas') {
          return dateB - dateA;
        }
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

  // --- ACCIONES DE LA AGENDA ---
  const toggleTask = async (task: AgendaItem) => {
    try {
      await dashboardService.toggleAgendaStatus(task.id, !task.completed);
      setAgenda(prev => prev.map(item => 
        item.id === task.id ? { ...item, completed: !task.completed } : item
      ));
    } catch (error) {
      console.error("Error actualizando tarea:", error);
      await showAlert({ title: 'Error', message: 'No se pudo actualizar la tarea.' });
      loadDashboardData();
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
      await dashboardService.deleteAgendaItem(id);
      if (isMounted.current) {
        setAgenda(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error("Error eliminando tarea:", error);
      await showAlert({ title: 'Error', message: 'No se pudo eliminar la tarea' });
      loadDashboardData();
    }
  };

  const getSourceIconConfig = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('idealista')) {
      return {
        icon: <Building size={14} />,
        bg: 'bg-indigo-50 text-indigo-600',
        color: 'text-indigo-600',
        barColor: 'bg-indigo-500',
        hex: '#6366f1'
      };
    }
    if (n.includes('web')) {
      return {
        icon: <Globe size={14} />,
        bg: 'bg-sky-50 text-sky-600',
        color: 'text-sky-600',
        barColor: 'bg-sky-500',
        hex: '#0ea5e9'
      };
    }
    if (n.includes('google')) {
      return {
        icon: <Search size={14} />,
        bg: 'bg-amber-50 text-amber-600',
        color: 'text-amber-600',
        barColor: 'bg-amber-500',
        hex: '#f59e0b'
      };
    }
    if (n.includes('instagram')) {
      return {
        icon: <Smartphone size={14} />,
        bg: 'bg-pink-50 text-pink-600',
        color: 'text-pink-600',
        barColor: 'bg-pink-500',
        hex: '#ec4899'
      };
    }
    if (n.includes('facebook')) {
      return {
        icon: <Users size={14} />,
        bg: 'bg-blue-50 text-blue-600',
        color: 'text-blue-600',
        barColor: 'bg-blue-500',
        hex: '#3b82f6'
      };
    }
    if (n.includes('referido')) {
      return {
        icon: <Users size={14} />,
        bg: 'bg-purple-50 text-purple-600',
        color: 'text-purple-600',
        barColor: 'bg-purple-500',
        hex: '#a855f7'
      };
    }
    if (n.includes('llamada')) {
      return {
        icon: <Phone size={14} />,
        bg: 'bg-emerald-50 text-emerald-600',
        color: 'text-emerald-600',
        barColor: 'bg-emerald-500',
        hex: '#10b981'
      };
    }
    return {
      icon: <Globe size={14} />,
      bg: 'bg-slate-100 text-slate-600',
      color: 'text-slate-600',
      barColor: 'bg-slate-500',
      hex: '#94a3b8'
    };
  };

  const mergedSources = useMemo(() => {
    const standardSources = [
      'Idealista',
      'Web',
      'Google',
      'Instagram',
      'Facebook',
      'Referido',
      'Llamada',
      'Otro'
    ];

    const sourceMap = new Map<string, { count: number; percentage: number }>();
    stats.topSources.forEach(src => {
      sourceMap.set(src.name.toLowerCase(), { count: src.count, percentage: src.percentage });
    });

    const list = standardSources.map(name => {
      const match = sourceMap.get(name.toLowerCase());
      return {
        name,
        count: match ? match.count : 0,
        percentage: match ? match.percentage : 0
      };
    });

    stats.topSources.forEach(src => {
      const isStandard = standardSources.some(s => s.toLowerCase() === src.name.toLowerCase());
      if (!isStandard) {
        list.push({
          name: src.name,
          count: src.count,
          percentage: src.percentage
        });
      }
    });

    return list;
  }, [stats.topSources]);

  const donutSegments = useMemo(() => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius; // ~226.19
    let accumulatedPercentage = 0;

    const activeSources = mergedSources.filter(s => s.percentage > 0);
    
    if (activeSources.length === 0) {
      return [{
        name: 'Sin datos',
        percentage: 100,
        strokeLength: circumference,
        strokeOffset: 0,
        hex: '#e2e8f0'
      }];
    }

    return activeSources.map((source) => {
      const percentage = source.percentage;
      const strokeLength = (percentage / 100) * circumference;
      const strokeOffset = (accumulatedPercentage / 100) * circumference;
      accumulatedPercentage += percentage;
      
      const config = getSourceIconConfig(source.name);

      return {
        name: source.name,
        percentage,
        strokeLength,
        strokeOffset,
        hex: config.hex
      };
    });
  }, [mergedSources]);

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
        {/* WIDGET: AGENDA DE ACCIONES */}
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
        {/* TARJETA UNIFICADA DE MÉTRICAS Y CAPTACIÓN */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Resumen de Captación y Orígenes</h3>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">Distribución general de prospectos y rendimiento de canales de entrada.</p>
          </div>

          {/* 3 Columns Flex Layout */}
          <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
            {/* COLUMNA 1: Total Clientes & Donut Chart */}
            <div className="w-full lg:w-[220px] shrink-0 flex flex-col items-center lg:items-start gap-4 lg:border-r border-slate-100 pr-0 lg:pr-8">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center lg:text-left">Clientes Registrados</p>
                <div className="flex items-baseline gap-2 mt-1 justify-center lg:justify-start">
                  <span className="text-4xl font-extrabold text-slate-800 tracking-tight">{stats.totalLeads}</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center shrink-0">
                    <ArrowUpRight size={12} className="mr-0.5" /> +12%
                  </span>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="relative w-[130px] h-[130px] shrink-0 mx-auto lg:mx-0 mt-2">
                <svg width="130" height="130" viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="transparent"
                    stroke="#f8fafc"
                    strokeWidth="10"
                  />
                  {donutSegments.map((segment, index) => (
                    <circle
                      key={index}
                      cx="50"
                      cy="50"
                      r="36"
                      fill="transparent"
                      stroke={segment.hex}
                      strokeWidth="10"
                      strokeDasharray={`${segment.strokeLength} ${2 * Math.PI * 36 - segment.strokeLength}`}
                      strokeDashoffset={-segment.strokeOffset}
                      strokeLinecap={segment.percentage === 100 ? 'butt' : 'round'}
                      className="transition-all duration-500 ease-out"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-800 leading-none">{stats.totalLeads}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">leads</span>
                </div>
              </div>
            </div>

            {/* COLUMNA 2: Fuentes Principales (1 a 4) */}
            <div className="flex-1 space-y-4 w-full">
              {mergedSources.slice(0, 4).map((source) => {
                const iconConfig = getSourceIconConfig(source.name);
                return (
                  <div key={source.name} className="flex items-center gap-3 p-2 hover:bg-slate-50/50 rounded-xl transition-all duration-200">
                    <div className={`p-2 rounded-lg shrink-0 ${iconConfig.bg} ${iconConfig.color}`}>
                      {iconConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-bold text-slate-700 truncate">{source.name}</span>
                        <span className="text-xs font-black text-slate-800 ml-2">{source.percentage}% <span className="text-[10px] text-slate-400 font-medium">({source.count})</span></span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${iconConfig.barColor}`}
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* COLUMNA 3: Fuentes Secundarias (5 a 8+) */}
            <div className="flex-1 space-y-4 w-full">
              {mergedSources.slice(4).map((source) => {
                const iconConfig = getSourceIconConfig(source.name);
                return (
                  <div key={source.name} className="flex items-center gap-3 p-2 hover:bg-slate-50/50 rounded-xl transition-all duration-200">
                    <div className={`p-2 rounded-lg shrink-0 ${iconConfig.bg} ${iconConfig.color}`}>
                      {iconConfig.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-bold text-slate-700 truncate">{source.name}</span>
                        <span className="text-xs font-black text-slate-800 ml-2">{source.percentage}% <span className="text-[10px] text-slate-400 font-medium">({source.count})</span></span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${iconConfig.barColor}`}
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

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