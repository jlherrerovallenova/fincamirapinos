import { Circle, CheckCircle2, AlertCircle, Trash2, MessageCircle } from 'lucide-react';

interface AgendaListItemProps {
  task: {
    id: number;
    title: string;
    type: string;
    due_date: string;
    completed?: boolean;
    leads?: {
      name: string;
      phone?: string | null;
    } | null;
    email_tracking?: {
      id: string;
      status: string;
      opens_count: number;
      last_opened_at: string | null;
    } | null;
  };
  onToggle: () => void;
  onDelete: () => void;
  onWhatsApp?: () => void;
  formatDate: (date: string) => string;
  readOnly?: boolean;
  hideToggle?: boolean;
}

export function AgendaListItem({ task, onToggle, onDelete, onWhatsApp, formatDate, readOnly, hideToggle }: AgendaListItemProps) {
  const isOverdue = new Date(task.due_date) < new Date();
  
  return (
    <div className="py-1 flex items-center justify-between group hover:pl-1 transition-all rounded-xl min-w-0 w-full">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {!readOnly && !hideToggle && (
          <button type="button"
            onClick={onToggle}
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all border hover:rotate-6 hover:scale-105 group-hover:shadow-sm shadow-slate-200/50 ${
              task.completed 
                ? 'bg-emerald-50 border-emerald-100 text-[#006c4a] hover:border-emerald-600 hover:text-emerald-600' 
                : 'border-slate-200 bg-white text-slate-200 hover:border-emerald-500 hover:text-emerald-500'
            }`}
          >
            {task.completed ? <CheckCircle2 size={15} strokeWidth={3} /> : <Circle size={15} strokeWidth={3} />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
              task.type === 'Llamada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              task.type === 'WhatsApp' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
              task.type === 'Visita' ? 'bg-purple-50 text-purple-600 border-purple-100' :
              task.type === 'Email' ? 'bg-amber-50 text-amber-600 border-amber-100' :
              'bg-slate-50 text-slate-500 border-slate-100'
            }`}>
              {task.type}
            </span>
            {task.type === 'Email' && task.email_tracking && (() => {
              const tracking = task.email_tracking;
              const isOpened = tracking.status === 'opened' || tracking.opens_count > 0;
              const opensLabel = tracking.opens_count > 0 ? ` (${tracking.opens_count})` : '';
              return (
                <span 
                  className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                    isOpened 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}
                  title={
                    isOpened 
                      ? `Abierto${opensLabel}. Última apertura: ${new Date(tracking.last_opened_at || '').toLocaleString()}`
                      : 'Recibido pero aún no abierto.'
                  }
                >
                  {isOpened ? 'ABIERTO' : 'ENVIADO'}
                  {opensLabel}
                </span>
              );
            })()}
            <span className="text-xs font-bold text-slate-800 tracking-tight truncate max-w-[150px]">
              {task.leads?.name || 'Cliente anónimo'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium truncate">
            <span className={`truncate ${task.completed ? 'opacity-60' : ''}`}>
              {(() => {
                const match = task.title.match(/^(Envío\s+[^:]+):\s*(.*)$/i);
                if (match) {
                  const prefix = match[1];
                  const docs = match[2].split(',').map(d => d.trim()).filter(Boolean);
                  return `${prefix} (${docs.length} ${docs.length === 1 ? 'doc' : 'docs'})`;
                }
                return task.title;
              })()}
            </span>
            <span className="opacity-30 shrink-0">•</span>
            <span className={`shrink-0 ${isOverdue && !task.completed ? "text-red-500 font-bold flex items-center gap-0.5 bg-red-50 px-1 py-0.2 rounded border border-red-100" : "text-emerald-600 font-semibold"}`}>
              {isOverdue && !task.completed && <AlertCircle size={9} />}
              {formatDate(task.due_date)}
            </span>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5 transform translate-x-2 group-hover:translate-x-0 shrink-0 ml-1">
          {onWhatsApp && (
            <button type="button"
              onClick={onWhatsApp}
              className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              title="Enviar recordatorio por WhatsApp"
            >
              <MessageCircle size={14} />
            </button>
          )}
          <button type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
