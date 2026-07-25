import { useMemo } from 'react';
import { CheckCircle2, Calendar, Sun, Sunset } from 'lucide-react';
import { AgendaListItem } from './AgendaListItem';
import { EmptyState } from './EmptyState';
import type { Database } from '../../types/supabase';

type AgendaItem = Database['public']['Tables']['agenda']['Row'] & {
  leads?: { name: string; phone?: string | null } | null;
  email_tracking?: {
    id: string;
    status: string;
    opens_count: number;
    last_opened_at: string | null;
  } | null;
};

interface DashboardAgendaProps {
  filteredAgenda: AgendaItem[];
  searchQuery: string;
  loading: boolean;
  activeTab: 'hoy' | 'caducadas' | 'semana' | 'correos' | 'feedback';
  onToggleTask: (task: AgendaItem) => void;
  onDeleteTask: (id: number) => void;
}

export default function DashboardAgenda({
  filteredAgenda,
  searchQuery,
  loading,
  activeTab,
  onToggleTask,
  onDeleteTask
}: DashboardAgendaProps) {

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Hoy, ${time}` : `${date.toLocaleDateString()} ${time}`;
  };

  // --- Lógica para la pestaña "Hoy" (Morning / Afternoon slots) ---
  const getTasksForHour = (targetHour: number, period: 'morning' | 'afternoon') => {
    return filteredAgenda.filter(task => {
      const taskHour = new Date(task.due_date).getHours();
      if (period === 'morning') {
        if (targetHour === 9 && taskHour < 9) return true;
        return taskHour === targetHour;
      } else {
        if (targetHour === 20 && taskHour > 20) return true;
        return taskHour === targetHour;
      }
    });
  };

  const morningTaskCount = useMemo(() => {
    return filteredAgenda.filter(task => {
      const h = new Date(task.due_date).getHours();
      return h <= 14;
    }).length;
  }, [filteredAgenda]);

  const afternoonTaskCount = useMemo(() => {
    return filteredAgenda.filter(task => {
      const h = new Date(task.due_date).getHours();
      return h >= 15;
    }).length;
  }, [filteredAgenda]);

  // --- Lógica para la pestaña "Esta semana" (Lunes a Domingo grid) ---
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    // Ajuste para que el Lunes sea el primer día de la semana (Lunes: 1, ..., Domingo: 0)
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday, 0, 0, 0, 0);
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    return dayNames.map((name, index) => {
      const dayStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index, 0, 0, 0, 0);
      const dayEnd = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index, 23, 59, 59, 999);
      const dateFormatted = dayStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      const isToday = now.getDate() === dayStart.getDate() && now.getMonth() === dayStart.getMonth() && now.getFullYear() === dayStart.getFullYear();

      return {
        name,
        dateFormatted,
        isToday,
        startTime: dayStart.getTime(),
        endTime: dayEnd.getTime()
      };
    });
  }, []);

  const getTasksForDay = (startTime: number, endTime: number) => {
    return filteredAgenda.filter(task => {
      const taskTime = new Date(task.due_date).getTime();
      return taskTime >= startTime && taskTime <= endTime;
    });
  };

  // --- Render según Pestaña ---

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006c4a]"></div>
      </div>
    );
  }

  if (activeTab === 'hoy') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-3 px-6">
        {/* Columna Mañana: 09:00 a 14:00 */}
        <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100/85 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-2">
              <Sun size={15} className="text-amber-500" />
              Mañana (09:00 - 14:00)
            </h4>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
              {morningTaskCount} {morningTaskCount === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>

          <div className="space-y-2.5">
            {[9, 10, 11, 12, 13, 14].map(h => {
              const slotTasks = getTasksForHour(h, 'morning');
              const formattedHour = `${h.toString().padStart(2, '0')}:00`;
              return (
                <div key={h} className="group flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-100 shadow-2xs hover:border-amber-200 transition-all">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-100 shrink-0 font-mono mt-1">
                    {formattedHour}
                  </span>
                  <div className="flex-1 min-w-0">
                    {slotTasks.length === 0 ? (
                      <span className="text-[11px] text-slate-300 font-medium italic block py-1">Disponible</span>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {slotTasks.map(task => (
                          <AgendaListItem
                            key={task.id}
                            task={task as any}
                            onToggle={() => onToggleTask(task)}
                            onDelete={() => onDeleteTask(task.id)}
                            formatDate={formatDateTime}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Tarde: 15:00 a 20:00 */}
        <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100/85 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
              <Sunset size={15} className="text-indigo-500" />
              Tarde (15:00 - 20:00)
            </h4>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
              {afternoonTaskCount} {afternoonTaskCount === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>

          <div className="space-y-2.5">
            {[15, 16, 17, 18, 19, 20].map(h => {
              const slotTasks = getTasksForHour(h, 'afternoon');
              const formattedHour = `${h.toString().padStart(2, '0')}:00`;
              return (
                <div key={h} className="group flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-100 shadow-2xs hover:border-indigo-200 transition-all">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50/80 px-2 py-1 rounded-lg border border-indigo-100 shrink-0 font-mono mt-1">
                    {formattedHour}
                  </span>
                  <div className="flex-1 min-w-0">
                    {slotTasks.length === 0 ? (
                      <span className="text-[11px] text-slate-300 font-medium italic block py-1">Disponible</span>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {slotTasks.map(task => (
                          <AgendaListItem
                            key={task.id}
                            task={task as any}
                            onToggle={() => onToggleTask(task)}
                            onDelete={() => onDeleteTask(task.id)}
                            formatDate={formatDateTime}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'semana') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 py-3 px-6">
        {weekDays.map((day) => {
          const dayTasks = getTasksForDay(day.startTime, day.endTime);
          return (
            <div 
              key={day.name} 
              className={`rounded-2xl p-3.5 border space-y-3 transition-all ${
                day.isToday 
                  ? 'bg-emerald-50/40 border-emerald-200 shadow-xs' 
                  : 'bg-slate-50/70 border-slate-100/80'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${day.isToday ? 'text-[#006c4a]' : 'text-slate-700'}`}>
                    {day.name}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400 capitalize">
                    {day.dateFormatted}
                  </span>
                  {day.isToday && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest bg-[#006c4a] text-white px-2 py-0.5 rounded-md">
                      Hoy
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  dayTasks.length > 0 
                    ? 'text-[#006c4a] bg-emerald-50 border-emerald-200' 
                    : 'text-slate-400 bg-white border-slate-200'
                }`}>
                  {dayTasks.length} {dayTasks.length === 1 ? 'tarea' : 'tareas'}
                </span>
              </div>

              <div className="space-y-2">
                {dayTasks.length === 0 ? (
                  <div className="p-3 text-center rounded-xl bg-white/60 border border-dashed border-slate-200/80">
                    <span className="text-[11px] text-slate-300 font-medium italic">Sin tareas agendadas</span>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-100/80 p-2 shadow-2xs">
                    {dayTasks.map(task => (
                      <AgendaListItem
                        key={task.id}
                        task={task as any}
                        onToggle={() => onToggleTask(task)}
                        onDelete={() => onDeleteTask(task.id)}
                        formatDate={formatDateTime}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // --- Caso por defecto: Vista listado caducadas / listados genéricos ---
  if (filteredAgenda.length === 0) {
    return (
      <EmptyState 
        icon={activeTab === 'caducadas' ? <CheckCircle2 /> : <Calendar />} 
        title={
          activeTab === 'caducadas' 
            ? "¡Al día!" 
            : searchQuery 
            ? "No hay coincidencias" 
            : "Sin tareas"
        } 
        subtitle={
          activeTab === 'caducadas' 
            ? "No tienes acciones retrasadas pendientes." 
            : searchQuery 
            ? "Prueba con otra palabra clave." 
            : "No tienes acciones agendadas para esta sección."
        } 
      />
    );
  }

  return (
    <div className="px-6 py-2 divide-y divide-slate-100">
      {filteredAgenda.map(task => (
        <AgendaListItem 
          key={task.id} 
          task={task as any} 
          onToggle={() => onToggleTask(task)} 
          onDelete={() => onDeleteTask(task.id)} 
          formatDate={formatDateTime}
        />
      ))}
    </div>
  );
}
