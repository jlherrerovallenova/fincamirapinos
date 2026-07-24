// src/components/leads/LeadDetailModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Mail, Phone, Save, Trash2, Loader2, Send,
  Compass, MessageCircle, Calendar as CalendarIcon,
  CheckCircle2, Circle, Plus, Pencil, RotateCcw, Smartphone, Users, Globe,
  ChevronDown, ChevronUp, Zap, Trees, Leaf
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import EmailComposerModal from './EmailComposerModal';
import { useDocuments } from '../../hooks/useDocuments';
import type { Database } from '../../types/supabase';
import SaleTab from './SaleTab';
import FeedbackEmailModal from '../surveys/components/FeedbackEmailModal';
import { formatClientName } from '../../utils/formatName';

type Lead = Database['public']['Tables']['leads']['Row'];
type AgendaItem = Database['public']['Tables']['agenda']['Row'];

type ExtendedAgendaItem = AgendaItem & {
  call_attended?: boolean | null;
  tracking_id?: string | null;
};

interface EmailTrackingItem {
  id: string;
  created_at: string;
  status: string;
  opens_count: number;
  last_opened_at?: string | null;
  first_opened_at?: string | null;
}

import { LEAD_STATUS_DETAILS } from '../../config/constants';

const STATUS_CONFIG = LEAD_STATUS_DETAILS;

interface Props {
  lead: Lead;
  onClose: () => void;
  onUpdate: (deleted?: boolean) => void;
  isInline?: boolean;
}

import { useUpdateLead } from '../../hooks/useLeads';

export default function LeadDetailModal({ lead, onClose, onUpdate, isInline = true }: Props) {
  const { session, profile } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'agenda' | 'sale'>('info');
  const { data: rawDocs = [] } = useDocuments();
  const availableDocs = rawDocs.filter((d: any) => d.url).map((d: any) => ({ name: d.name, url: d.url!, category: d.category, metadata: d.metadata }));

  // Mutations
  const updateMutation = useUpdateLead();
  const [loading, setLoading] = useState(false); // Mantener para el estado local de guardado de tareas o procesos largos

  // Tareas de la agenda
  const [tasks, setTasks] = useState<ExtendedAgendaItem[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingCommentTaskId, setEditingCommentTaskId] = useState<number | null>(null);
  const [inlineCommentValue, setInlineCommentValue] = useState<string>('');
  const [emailTracking, setEmailTracking] = useState<EmailTrackingItem[]>([]);

  // Estado local para el formulario de nueva tarea
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getFollowUpTime = () => {
    const now = new Date();
    const hour = now.getHours();
    const scheduled = new Date(now);
    
    if (hour < 13) {
      scheduled.setHours(hour + 1);
      return { 
        date: scheduled.toISOString().slice(0, 10), 
        time: scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) 
      };
    } else if (hour < 19) {
      return { 
        date: scheduled.toISOString().slice(0, 10), 
        time: '17:00' 
      };
    } else {
      scheduled.setDate(now.getDate() + 1);
      return { 
        date: scheduled.toISOString().slice(0, 10), 
        time: '10:00' 
      };
    }
  };

  const [newTask, setNewTask] = useState({
    type: 'Llamada',
    title: '',
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    time: getCurrentTime(),
    call_attended: null as boolean | null,
    comments: ''
  });

  const [formData, setFormData] = useState({
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    status: lead.status || 'new',
    source: lead.source || 'Web',
    notes: lead.notes || '',
    is_subscribed: lead.is_subscribed ?? true,
    created_at_date: lead.created_at ? new Date(lead.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    interested_in: lead.interested_in || ''
  });
  
  const INTERESTED_OPTIONS = [
    { value: "Chalet Olivo", label: "OLIVO" },
    { value: "Chalet Arce", label: "ARCE" },
    { value: "Parcelas", label: "PARCELAS" }
  ];

  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [composerConfig, setComposerConfig] = useState<{
    method?: 'email' | 'whatsapp';
    subject?: string;
    message?: string;
  }>({});

  const toggleTaskExpand = (taskId: number) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleGroup = (type: string) => {
    setCollapsedGroups(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Cargar tareas de la tabla agenda filtrando por ID del cliente y su seguimiento de email
  const fetchTasks = useCallback(async () => {
    try {
      const { data: agendaData } = await supabase
        .from('agenda')
        .select('*')
        .eq('lead_id', lead.id)
        .order('due_date', { ascending: true });
      setTasks(agendaData as ExtendedAgendaItem[]);
    } catch (err) {
      console.error("Error al cargar tareas:", err);
    }

    try {
      const { data: trackingData } = await supabase
        .from('email_tracking')
        .select('*')
        .eq('lead_id', lead.id);

      if (trackingData) setEmailTracking(trackingData as EmailTrackingItem[]);
    } catch (err) {
      console.error("Error al cargar email tracking:", err);
    }
  }, [lead.id]);

  useEffect(() => {
    let ignore = false;
    fetchTasks();

    const channel = supabase.channel(`email_tracking_changes_${lead.id}`);
    
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_tracking',
          filter: `lead_id=eq.${lead.id}`
        },
        () => {
          if (!ignore) fetchTasks();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [lead.id, fetchTasks]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'status' && value !== 'closed' && activeTab === 'sale') {
      setActiveTab('info');
    }
  };

  const handleInterestedInToggle = (option: string) => {
    const current = formData.interested_in ? formData.interested_in.split(', ').filter(Boolean) : [];
    let updated;
    if (current.includes(option)) {
      updated = current.filter((o: string) => o !== option);
    } else {
      updated = [...current, option];
    }
    
    const newValue = updated.join(', ');
    const updates: { interested_in: string; status?: Lead['status'] } = { interested_in: newValue };
    
    // Si se selecciona algo (no vacío) y el estado es Nuevo o Contactado, pasar a Cualificado
    if (updated.length > 0 && (formData.status === 'new' || formData.status === 'contacted')) {
      updates.status = 'qualified';
    }
    
    setFormData((prev: any) => ({ ...prev, ...updates }));
  };

  interface TaskOverrides {
    title?: string;
    type?: string;
    date?: string;
    time?: string;
    call_attended?: boolean | null;
    completed?: boolean;
    comments?: string;
  }

  const saveTask = async (overrides?: TaskOverrides) => {
    const taskTitle = overrides?.title || newTask.title;
    const taskType = overrides?.type || newTask.type;
    const taskDate = overrides?.date || newTask.date;
    const taskTime = overrides?.time || newTask.time;
    const taskAttended = overrides?.call_attended !== undefined ? overrides.call_attended : newTask.call_attended;
    const taskComments = overrides?.comments !== undefined ? overrides.comments : newTask.comments;
    const isCompleted = overrides?.completed !== undefined ? overrides.completed : false;

    if (!taskTitle || !session?.user.id) return;

    // Combinar fecha y hora para crear un ISO String
    const dateTimeString = `${taskDate}T${taskTime}:00`;
    const finalDate = new Date(dateTimeString).toISOString();

    const isCommentable = ['Llamada', 'Visita', 'Reunión'].includes(taskType);

    const taskData = {
      title: taskTitle,
      type: taskType,
      due_date: finalDate,
      lead_id: lead.id,          // Vinculación clave con el cliente
      user_id: session.user.id,  // Vinculación clave con el usuario
      completed: isCompleted,
      call_attended: taskType === 'Llamada' ? taskAttended : null,
      comments: isCommentable && (editingTaskId || overrides?.comments) ? (taskComments || null) : null
    };

    setLoading(true);
    try {
      if (editingTaskId) {
        // Editar
        const { error } = await (supabase.from('agenda') as any)
          .update({
            title: taskData.title,
            type: taskData.type,
            due_date: finalDate,
            comments: taskData.comments
          })
          .eq('id', editingTaskId);
        if (error) throw error;
        setEditingTaskId(null);
      } else {
        // En lugar de Google Calendar directo aquí, lo mantenemos igual por ahora
        const { error } = await (supabase.from('agenda') as any).insert([taskData]);
        if (error) throw error;

        // Abrir Google Calendar
        const parsedDate = new Date(finalDate);
        const endParsedDate = new Date(parsedDate.getTime() + 60 * 60 * 1000);
        const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

        const googleCalUrl = new URL('https://calendar.google.com/calendar/render');
        googleCalUrl.searchParams.append('action', 'TEMPLATE');
        googleCalUrl.searchParams.append('text', `[${taskData.type}] ${taskData.title}`);
        googleCalUrl.searchParams.append('details', `Tarea añadida desde Mirapinos CRM.\nCliente vinculado: ${lead.name}${taskData.comments ? `\nComentarios: ${taskData.comments}` : ''}`);
        googleCalUrl.searchParams.append('dates', `${formatGoogleDate(parsedDate)}/${formatGoogleDate(endParsedDate)}`);

        window.open(googleCalUrl.toString(), '_blank');
      }

      // Lógica de transición automática al guardar una tarea completada con éxito
      if (isCompleted && formData.status === 'new') {
        const updatedStatus = 'contacted';
        setFormData(prev => ({ ...prev, status: updatedStatus }));
        await (supabase.from('leads') as any).update({ status: updatedStatus }).eq('id', lead.id);
      }

      setNewTask({ 
        type: 'Llamada', 
        title: '', 
        date: new Date().toISOString().slice(0, 10), 
        time: getCurrentTime(), 
        call_attended: null,
        comments: ''
      });
      fetchTasks();

    } catch (error) {
      console.error("Error guardando tarea:", error);
      await showAlert({ title: 'Error', message: 'Error al guardar la tarea.' });
    } finally {
      setLoading(false);
    }
  };

  const saveInlineComment = async (taskId: number) => {
    try {
      const { error } = await (supabase.from('agenda') as any)
        .update({ comments: inlineCommentValue || null })
        .eq('id', taskId);
      if (error) throw error;
      setEditingCommentTaskId(null);
      fetchTasks();
    } catch (err) {
      console.error("Error al guardar comentario inline:", err);
      showAlert({ title: 'Error', message: 'No se pudo guardar el comentario.' });
    }
  };

  const deleteTask = async (id: number) => {
    const confirmed = await showConfirm({
      title: 'Eliminar Tarea',
      message: '¿Estás seguro de que deseas eliminar esta tarea?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('agenda').delete().eq('id', id);
      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error("Error al eliminar tarea:", err);
    }
  };

  const startEditingTask = (task: ExtendedAgendaItem) => {
    setEditingTaskId(task.id);
    const dateObj = new Date(task.due_date);
    setNewTask({
      type: task.type || 'Llamada',
      title: task.title,
      date: dateObj.toISOString().slice(0, 10),
      time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      call_attended: task.call_attended ?? null,
      comments: task.comments || ''
    });
  };

  const toggleTaskStatus = async (task: ExtendedAgendaItem) => {
    const newStatus = !task.completed;
    setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: newStatus } : t));
    await (supabase.from('agenda') as any).update({ completed: newStatus }).eq('id', task.id);
    
    // Lógica de transición automática al marcar una tarea como realizada
    if (newStatus && formData.status === 'new') {
       const updatedStatus = 'contacted';
       setFormData(prev => ({ ...prev, status: updatedStatus }));
       await (supabase.from('leads') as any).update({ status: updatedStatus }).eq('id', lead.id);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const normalizedName = formatClientName(formData.name);
    if (!normalizedName) {
      showAlert({ title: 'Error', message: 'El nombre es obligatorio.' });
      return;
    }

    const { created_at_date, ...restData } = formData;
    const finalData = {
      ...restData,
      name: normalizedName,
      created_at: new Date(`${created_at_date}T12:00:00Z`).toISOString()
    };

    updateMutation.mutate({ id: lead.id, updates: finalData }, {
      onSuccess: () => {
        onUpdate();
        onClose();
      },
      onError: (err: unknown) => {
        const errorVal = err as { message?: string };
        console.error("Error actualizando lead:", err);
        if (errorVal.message?.includes('interested_in')) {
          showAlert({ 
            title: 'Error de Base de Datos', 
            message: 'La columna "interested_in" no existe en la base de datos. Por favor, ejecuta la migración SQL necesaria.' 
          });
        } else {
          showAlert({ 
            title: 'Error', 
            message: 'No se pudieron guardar los cambios: ' + (errorVal.message || 'Error desconocido') 
          });
        }
      }
    });
  };
  // WhatsApp URL con mensaje predefinido
  const getWhatsAppUrl = () => {
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone) return '#';
    
    const hour = new Date().getHours();
    const greeting = hour < 14 ? 'Buenos días' : 'Buenas tardes';
    const firstName = formData.name.split(' ')[0];
    const message = `${greeting}, ${firstName}. Soy Juan Herrero de Terravall inmobiliaria. Nos ha solicitado información de la promoción inmobiliaria FINCA MIRAPINOS. ¿En qué puedo ayudarle?.`;
    
    return `https://wa.me/${cleanPhone.startsWith('34') ? cleanPhone : '34' + cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const whatsappUrl = getWhatsAppUrl();

  const statusCfg = STATUS_CONFIG[formData.status || 'new'] || STATUS_CONFIG['new'];

  const content = (
    <div className={`bg-white w-full flex flex-col animate-in fade-in duration-300 min-h-[600px] ${
      isInline ? 'border-none shadow-none rounded-none' : 'rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden'
    }`}>
      {/* HEADER claro y limpio sin fondo verde */}
      <div className="px-6 sm:px-8 py-5 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 relative border-b border-slate-200/80">
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg border border-slate-200/80 bg-white shrink-0 shadow-sm ${getAvatarStyle(formData.name)}`}>
            {formData.name.substring(0, 2).toUpperCase() || 'CL'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{formData.name}</h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusCfg.pill}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
            </div>
            <p className="text-slate-500 text-xs font-semibold mt-0.5">Ficha del Cliente</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {/* WHATSAPP */}
              <button
                type="button"
                onClick={() => {
                  setIsFeedbackModalOpen(false);
                  setComposerConfig({ method: 'whatsapp' });
                  setIsEmailModalOpen(true);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl transition-all text-xs font-bold uppercase tracking-wider shadow-sm ${
                  isEmailModalOpen && composerConfig.method === 'whatsapp' && !composerConfig.subject?.includes('Información')
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-extrabold'
                    : 'bg-white text-emerald-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200'
                }`}
              >
                <MessageCircle size={15} />
                <span>WhatsApp</span>
              </button>

              {/* EMAIL */}
              <button
                type="button"
                onClick={() => {
                  setIsFeedbackModalOpen(false);
                  setComposerConfig({ method: 'email' });
                  setIsEmailModalOpen(true);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl transition-all text-xs font-bold uppercase tracking-wider shadow-sm ${
                  isEmailModalOpen && composerConfig.method === 'email'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md font-extrabold'
                    : 'bg-white text-blue-700 border-slate-200 hover:bg-blue-50 hover:border-blue-200'
                }`}
              >
                <Mail size={15} />
                <span>Email</span>
              </button>

              {/* 1ER CONTACTO */}
              <button
                type="button"
                disabled={tasks.length > 0}
                onClick={() => {
                  const agentName = profile?.full_name || 'Juan Herrero';
                  setIsFeedbackModalOpen(false);
                  setComposerConfig({
                    method: 'whatsapp',
                    subject: 'Información Finca Mirapinos',
                    message: `Hola ${formData.name.split(' ')[0]},\n\nSoy ${agentName} de Terravall inmobiliaria. Nos ha solicitado información de la promoción inmobiliaria FINCA MIRAPINOS. ¿En qué puedo ayudarle?`
                  });
                  setIsEmailModalOpen(true);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl transition-all text-xs font-bold uppercase tracking-wider shadow-sm ${
                  tasks.length > 0
                    ? 'border-slate-200 text-slate-300 bg-slate-100 cursor-not-allowed opacity-50'
                    : isEmailModalOpen && composerConfig.subject?.includes('Información')
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md font-extrabold'
                      : 'bg-white text-amber-700 border-slate-200 hover:bg-amber-50 hover:border-amber-200'
                }`}
                title={tasks.length > 0 ? "El cliente ya tiene actividad en su agenda" : "Enviar mensaje de primer contacto"}
              >
                <Zap size={15} />
                <span>1er Contacto</span>
              </button>

              {/* ENCUESTA */}
              <button
                type="button"
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setIsFeedbackModalOpen(true);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl transition-all text-xs font-bold uppercase tracking-wider shadow-sm ${
                  isFeedbackModalOpen
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md font-extrabold'
                    : (lead as any).feedback_rating
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : (lead as any).feedback_sent
                        ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'bg-white text-purple-700 border-slate-200 hover:bg-purple-50 hover:border-purple-200'
                }`}
                title={
                  (lead as any).feedback_rating
                    ? `Valoración recibida: ${(lead as any).feedback_rating}`
                    : (lead as any).feedback_sent
                      ? 'Encuesta enviada, pendiente de respuesta'
                      : 'Enviar encuesta de satisfacción'
                }
              >
                <Send size={15} />
                <span>Encuesta</span>
              </button>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200/60 rounded-xl transition-colors text-slate-400 hover:text-slate-700 self-start md:self-center" title="Volver">
          <X size={24} />
        </button>
      </div>

          {/* TABS */}
          <div className="flex gap-8 border-b border-slate-200 px-8 bg-white pt-2.5">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2.5 font-bold border-b-2 text-sm transition-all ${
                activeTab === 'info'
                  ? 'text-[#006c4a] border-[#006c4a]'
                  : 'text-slate-500 border-transparent hover:text-[#006c4a]'
              }`}
            >
              Información
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`pb-2.5 font-bold border-b-2 text-sm transition-all ${
                activeTab === 'agenda'
                  ? 'text-[#006c4a] border-[#006c4a]'
                  : 'text-slate-500 border-transparent hover:text-[#006c4a]'
              }`}
            >
              Agenda y Acciones
            </button>
            <button
              onClick={() => {
                if (formData.status === 'closed') {
                  setActiveTab('sale');
                }
              }}
              disabled={formData.status !== 'closed'}
              className={`pb-2.5 font-bold border-b-2 text-sm transition-all ${
                formData.status !== 'closed'
                  ? 'text-slate-300 border-transparent cursor-not-allowed opacity-50'
                  : activeTab === 'sale'
                  ? 'text-[#006c4a] border-[#006c4a]'
                  : 'text-slate-500 border-transparent hover:text-[#006c4a]'
              }`}
              title={formData.status !== 'closed' ? "El expediente de venta solo está disponible para clientes con estado 'Venta realizada'" : ""}
            >
              Expediente de Venta
            </button>
          </div>

          {/* CONTENIDO PRINCIPAL */}
          <div className="flex-1 overflow-y-auto lg:overflow-hidden bg-white flex flex-col min-h-0">
            {activeTab === 'info' ? (
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                <div className="w-full bg-white p-0">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5 text-[#006c4a]">
                      Información Personal
                    </h3>
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                      
                      {/* NOMBRE COMPLETO */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                        <input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full bg-slate-50 border-slate-200/80 focus:bg-white focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 rounded-lg py-1.5 px-3 text-sm text-slate-800 font-medium transition-all"
                          required
                        />
                      </div>

                      {/* TELÉFONO */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                        <div className="relative flex gap-2">
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder="600..."
                              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border-slate-200/80 focus:bg-white focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 rounded-lg text-sm text-slate-800 font-medium transition-all"
                            />
                          </div>
                          {formData.phone && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-[#006c4a] text-white rounded-lg hover:bg-[#006c4a]/90 transition-all active:scale-95 shadow-md flex items-center justify-center shrink-0"
                              title="Contactar por WhatsApp"
                            >
                              <MessageCircle size={18} />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* CORREO ELECTRÓNICO */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                        <input
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full bg-slate-50 border-slate-200/80 focus:bg-white focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 rounded-lg py-1.5 px-3 text-sm text-slate-800 font-medium transition-all"
                        />
                      </div>

                      {/* ORIGEN DEL CONTACTO */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Origen del Contacto</label>
                        <div className="relative group/source">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                            {(() => {
                              const src = (formData.source || '').toLowerCase();
                              if (src.includes('idealista')) return <img src="/idealista.png" className="w-4 h-4 object-contain rounded-sm" alt="" />;
                              if (src.includes('web') || src.includes('google')) return <Globe className="text-blue-500" size={16} />;
                              if (src.includes('social') || src.includes('redes') || src.includes('insta')) return <Smartphone className="text-purple-500" size={16} />;
                              if (src.includes('referido')) return <Users className="text-emerald-500" size={16} />;
                              if (src.includes('llamada')) return <Phone className="text-amber-500" size={16} />;
                              return <Compass className="text-slate-400" size={16} />;
                            })()}
                          </div>
                          <select
                            name="source"
                            value={formData.source}
                            onChange={handleChange}
                            className="w-full pl-9 pr-10 py-1.5 bg-slate-50 border-slate-200/80 focus:bg-white focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 rounded-lg text-sm text-slate-800 font-medium transition-all appearance-none cursor-pointer"
                          >
                            <option value="Idealista">Idealista</option>
                            <option value="Web">Web</option>
                            <option value="Google">Google</option>
                            <option value="Redes Sociales">Redes Sociales</option>
                            <option value="Referido">Referido</option>
                            <option value="Llamada">Llamada</option>
                            <option value="Otro">Otro</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                            <ChevronDown size={16} className="text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* FECHA DE ALTA */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha de Alta</label>
                        <input
                          type="date"
                          name="created_at_date"
                          value={formData.created_at_date}
                          onChange={handleChange}
                          className="w-full bg-slate-50 border-slate-200/80 focus:bg-white focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 rounded-lg py-1.5 px-3 text-sm text-slate-800 font-medium transition-all"
                        />
                      </div>

                      {/* ESTADO ACTUAL */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Estado Actual</label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                            <span className={`w-2.5 h-2.5 rounded-full ${statusCfg.dot}`} />
                          </div>
                          <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full pl-9 pr-10 py-1.5 bg-slate-50 border-slate-200/80 focus:bg-white focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 rounded-lg text-sm text-slate-800 font-medium transition-all appearance-none cursor-pointer"
                          >
                            <option value="new">Nuevo</option>
                            <option value="contacted">Contactado</option>
                            <option value="qualified">Cualificado</option>
                            <option value="visiting">Visitando</option>
                            <option value="closed">Venta realizada</option>
                            <option value="lost">Perdido</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                            <ChevronDown size={16} className="text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* INTERESADO EN */}
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Interesado en</label>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          {INTERESTED_OPTIONS.map(option => {
                            const isSelected = formData.interested_in.split(', ').includes(option.value);
                            const upper = option.value.toUpperCase();
                            const isOlivo = upper.includes('OLIVO');
                            const isParcela = upper.includes('PARCELA');
                            const isArce = !isParcela && upper.includes('ARCE');
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleInterestedInToggle(option.value)}
                                className={`px-3.5 py-1 rounded-full text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-[#006c4a] text-white border-[#006c4a] shadow-sm'
                                    : isOlivo
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:border-[#006c4a]'
                                      : isArce
                                        ? 'bg-amber-50 text-amber-800 border-amber-200/80 hover:border-[#006c4a]'
                                        : 'bg-blue-50 text-blue-800 border-blue-200/80 hover:border-[#006c4a]'
                                }`}
                              >
                                {isOlivo && <Trees size={14} className={isSelected ? 'text-emerald-200' : 'text-emerald-600'} />}
                                {isArce && <Leaf size={14} className={isSelected ? 'text-amber-200' : 'text-amber-600'} />}
                                <span>{option.label}</span>
                              </button>
                            );
                          })}
                          {formData.interested_in === '' && (
                            <span className="text-[10px] text-slate-400 italic ml-1 self-center">Sin especificar</span>
                          )}
                        </div>
                      </div>

                      {/* NEWSLETTERS */}
                      <div className="md:col-span-1 flex items-center justify-between p-2 bg-slate-50 border border-slate-200/60 rounded-lg shadow-sm self-end h-[34px]">
                        <div className="flex items-center gap-2">
                          <Mail className="text-[#006c4a]" size={16} />
                          <span className="text-xs font-bold text-slate-700">Newsletters</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.is_subscribed}
                            onChange={(e) => setFormData({ ...formData, is_subscribed: e.target.checked })}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#006c4a]"></div>
                        </label>
                      </div>

                      {/* NOTAS INTERNAS */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notas Internas</label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleChange}
                          rows={2}
                          className="w-full mt-0.5 px-4 py-1.5 bg-slate-50 border-slate-200/80 focus:bg-white focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 rounded-lg text-sm text-slate-800 font-medium transition-all resize-none"
                          placeholder="Añade detalles relevantes sobre el cliente..."
                        />
                      </div>
                    </form>

                    {/* GUARDAR CAMBIOS */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={handleUpdate}
                        disabled={loading}
                        className="bg-[#006c4a] hover:bg-[#006c4a]/90 text-white px-5 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-700/10"
                      >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                </div>
            ) : activeTab === 'agenda' ? (
              <div className="p-2 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                <div className="w-full bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col h-full min-h-[400px]">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2 text-[#006c4a]">
                      <CalendarIcon size={16} /> Agenda de Acciones
                    </h3>

                    {/* Formulario Inline Compacto */}
                    <div className="grid grid-cols-1 gap-1.5 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-200/60 shadow-sm">
                      <div className="flex gap-2">
                        <select
                          value={newTask.type}
                          onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                          className="bg-white border border-slate-200 rounded-lg text-xs font-medium p-2 outline-none focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 text-slate-700 appearance-none pr-6 relative"
                        >
                          <option value="Llamada">Llamada</option>
                          <option value="Email">Email</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Visita">Visita</option>
                          <option value="Reunión">Reunión</option>
                        </select>
                        <input
                          type="date"
                          value={newTask.date}
                          onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                          className="flex-1 bg-white border border-slate-200 rounded-lg text-xs p-2 outline-none focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 text-slate-700"
                        />
                        <input
                          type="time"
                          value={newTask.time}
                          onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                          className="w-20 bg-white border border-slate-200 rounded-lg text-xs p-2 outline-none focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 text-slate-700"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={editingTaskId ? "Editando tarea..." : "Nueva tarea pendiente..."}
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          className="flex-1 bg-white border border-slate-200 rounded-lg text-xs p-2 outline-none focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 text-slate-900 placeholder-slate-400"
                        />
                        {newTask.type === 'Llamada' && (
                          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setNewTask({ ...newTask, call_attended: true })}
                              className={`px-2 py-1 text-[10px] rounded-md font-bold transition-all ${
                                newTask.call_attended === true
                                  ? 'bg-[#006c4a] text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              Atendida
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const currentTitle = newTask.title || 'Llamada no atendida';
                                const currentTaskData = {
                                  ...newTask,
                                  call_attended: false,
                                  title: currentTitle,
                                  completed: true,
                                };
                                setNewTask(currentTaskData);
                                await saveTask(currentTaskData);

                                const followUp = getFollowUpTime();
                                const nextTaskData = {
                                  type: 'Llamada',
                                  title: `Re-intento: ${currentTitle.replace('Re-intento: ', '')}`,
                                  date: followUp.date,
                                  time: followUp.time,
                                  call_attended: null,
                                  completed: false,
                                };
                                await saveTask(nextTaskData);
                              }}
                              className={`px-2 py-1 text-[10px] rounded-md font-bold transition-all ${
                                newTask.call_attended === false
                                  ? 'bg-red-500 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              No atendida
                            </button>
                          </div>
                        )}
                        {editingTaskId && (
                          <button
                            onClick={() => {
                              setEditingTaskId(null);
                              setNewTask({
                                type: 'Llamada',
                                title: '',
                                date: new Date().toISOString().slice(0, 10),
                                time: getCurrentTime(),
                                call_attended: null,
                                comments: ''
                              });
                            }}
                            className="bg-white border border-slate-200 px-2.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-500"
                            title="Cancelar edición"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => saveTask()}
                          className={`${
                            editingTaskId
                              ? 'bg-[#005137] hover:bg-[#002114]'
                              : 'bg-[#006c4a] hover:bg-[#005137]'
                          } px-4 text-white rounded-lg transition-colors shadow-sm active:scale-95 flex items-center justify-center`}
                        >
                          {editingTaskId ? <Save size={18} /> : <Plus size={18} />}
                        </button>
                      </div>
                      {editingTaskId && ['Llamada', 'Visita', 'Reunión'].includes(newTask.type) && (
                        <div className="w-full">
                          <textarea
                            placeholder="Comentarios de la acción..."
                            value={newTask.comments || ''}
                            onChange={(e) => setNewTask({ ...newTask, comments: e.target.value })}
                            maxLength={1000}
                            rows={2}
                            className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2 outline-none focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 text-slate-900 placeholder-slate-400 resize-y min-h-[44px]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Lista de Tareas */}
                    <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1 max-h-[290px]">
                      {tasks.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                          <CalendarIcon size={32} className="mx-auto mb-2 text-slate-300" />
                          <p className="text-xs text-slate-500 italic">No hay tareas para este cliente.</p>
                        </div>
                      )}
                      {Object.entries(
                        tasks.reduce((acc, task) => {
                          const taskType = task.type || 'Otros';
                          if (!acc[taskType]) acc[taskType] = [];
                          acc[taskType].push(task);
                          return acc;
                        }, {} as Record<string, typeof tasks>)
                      ).map(([type, typeTasks]) => (
                        <div key={type} className="mb-5 last:mb-0">
                          <button
                            type="button"
                            onClick={() => toggleGroup(type)}
                            className="w-full flex items-center justify-between group mb-2 hover:bg-slate-50 p-1.5 -ml-1.5 rounded transition-colors"
                          >
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {type}
                            </h4>
                            <div className="text-slate-300 group-hover:text-[#006c4a] transition-colors mr-1">
                              {collapsedGroups[type] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                            </div>
                          </button>
                          {!collapsedGroups[type] && (
                            <div className="space-y-2">
                              {(typeTasks as ExtendedAgendaItem[]).map((task: ExtendedAgendaItem) => {
                                const dateObj = new Date(task.due_date);
                                return (
                                  <div
                                    key={task.id}
                                    className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                                      task.completed
                                        ? 'bg-slate-50 border-transparent opacity-50'
                                        : 'bg-white border-slate-200 hover:border-emerald-200 shadow-sm'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                      <button
                                        onClick={() => toggleTaskStatus(task)}
                                        className={`transition-transform hover:scale-110 mt-0.5 ${
                                          task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-[#006c4a]'
                                        }`}
                                      >
                                        {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                      </button>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span
                                            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                              task.type === 'Llamada'
                                                ? 'bg-blue-100 text-blue-700'
                                                : task.type === 'WhatsApp'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : task.type === 'Visita'
                                                ? 'bg-purple-100 text-purple-700'
                                                : task.type === 'Email'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-slate-100 text-slate-700'
                                            }`}
                                          >
                                            {task.type === 'Llamada' && <Phone size={10} />}
                                            {task.type === 'WhatsApp' && <Smartphone size={10} />}
                                            {task.type === 'Visita' && <CalendarIcon size={10} />}
                                            {task.type === 'Email' && <Mail size={10} />}
                                            {task.type === 'Reunión' && <Users size={10} />}
                                            {task.type}
                                          </span>
                                          {(() => {
                                            const title = task.title || '';
                                            const isEnvio =
                                              title.startsWith('Envío Email:') || title.startsWith('Envío WhatsApp:');
                                            const colonIndex = title.indexOf(':');

                                            if (isEnvio && colonIndex !== -1) {
                                              const prefix = title.substring(0, colonIndex + 1);
                                              const docs = title.substring(colonIndex + 1).trim();

                                              if (docs) {
                                                const isExpanded = !!expandedTasks[task.id];
                                                return (
                                                  <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      <p
                                                        className={`text-sm font-bold ${
                                                          task.completed ? 'text-emerald-600 opacity-70' : 'text-slate-800'
                                                        }`}
                                                      >
                                                        {prefix}
                                                      </p>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          toggleTaskExpand(task.id);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-500 font-bold transition-all active:scale-95 border border-slate-200"
                                                      >
                                                        <span>{isExpanded ? 'Ocultar' : 'Ver'}</span>
                                                        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                                      </button>
                                                    </div>
                                                    {isExpanded && (
                                                      <div className="mt-1 pl-2 border-l-2 border-emerald-500 text-xs text-slate-500 font-medium py-1 animate-in slide-in-from-top-1 duration-200">
                                                        <ul className="list-disc list-inside space-y-0.5">
                                                          {docs.split(',').map((doc: string, idx: number) => (
                                                            <li key={idx} className="truncate max-w-xs">
                                                              {doc.trim()}
                                                            </li>
                                                          ))}
                                                        </ul>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              }
                                            }

                                            return (
                                              <p
                                                className={`text-sm font-bold ${
                                                  task.completed ? 'text-emerald-600 opacity-70' : 'text-slate-800'
                                                }`}
                                              >
                                                {title}
                                              </p>
                                            );
                                          })()}
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                          {dateObj.toLocaleDateString()} •{' '}
                                          {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          {task.call_attended !== null && task.type === 'Llamada' && (
                                            <span
                                              className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                task.call_attended ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                              }`}
                                            >
                                              {task.call_attended ? 'ATENDIDA' : 'NO ATENDIDA'}
                                            </span>
                                          )}
                                          {task.type === 'Email' && (() => {
                                            const tracking = emailTracking.find((t) => {
                                              if (task.tracking_id) return t.id === task.tracking_id;
                                              const taskTime = new Date(task.due_date).getTime();
                                              const trackingTime = new Date(t.created_at).getTime();
                                              return Math.abs(taskTime - trackingTime) < 15000;
                                            });

                                            if (!tracking) return null;

                                            const isOpened = tracking.opens_count > 0;
                                            const opensLabel = tracking.opens_count > 1 ? ` (${tracking.opens_count})` : '';

                                            return (
                                              <div className="flex items-center gap-1 ml-1">
                                                <span
                                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                    isOpened
                                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                  } transition-colors cursor-help`}
                                                  title={
                                                    isOpened
                                                      ? `Abierto${opensLabel}. Última apertura: ${new Date(
                                                          tracking.last_opened_at || tracking.first_opened_at || tracking.created_at
                                                        ).toLocaleString()}`
                                                      : 'Recibido pero aún no abierto.'
                                                  }
                                                >
                                                  {isOpened ? 'ABIERTO' : 'ENVIADO'}
                                                  {opensLabel}
                                                </span>
                                                {!isOpened && lead.phone && (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const firstName = (lead.name || '').split(' ')[0];
                                                      const hour = new Date().getHours();
                                                      const greeting = hour < 14 ? 'Buenos días' : 'Buenas tardes';
                                                      const message = `${greeting}, ${firstName}:\nSoy Juan Herrero, de Terravall, inmobiliaria comercializadora de Finca Mirapinos. Le escribo para confirmar si pudo recibir el dossier informativo de la promoción que le enviamos hace unos días. Si no es así, le agradecería que revisase su carpeta de correo no deseado (SPAM); en caso de que siga sin localizarlo, por favor háganoslo saber y se lo haré llegar de inmediato. Quedo a su entera disposición para resolver cualquier duda que pueda tener sobre la promoción.\nUn cordial saludo,\nJuan Herrero\nwww.mirapinos.com`;

                                                      const cleanPhone = (lead.phone || '').replace(/\D/g, '');
                                                      const phoneWithCode = cleanPhone.startsWith('34') ? cleanPhone : '34' + cleanPhone;
                                                      window.open(
                                                        `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`,
                                                        '_blank'
                                                      );
                                                    }}
                                                    className="p-1 rounded-full hover:bg-emerald-100 text-emerald-600 transition-colors shadow-sm bg-white border border-emerald-100"
                                                    title="Enviar WhatsApp de seguimiento"
                                                  >
                                                    <MessageCircle size={10} />
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </p>

                                        {/* COMENTARIO DIRECTO EN LA TARJETA */}
                                        {['Llamada', 'Visita', 'Reunión'].includes(task.type || '') && (
                                          <div className="mt-1.5 pt-1.5 border-t border-slate-100/60 w-full">
                                            {editingCommentTaskId === task.id ? (
                                              <div className="w-full mt-1 space-y-1">
                                                <textarea
                                                  placeholder="Escribe un comentario..."
                                                  value={inlineCommentValue}
                                                  onChange={(e) => setInlineCommentValue(e.target.value)}
                                                  onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                      e.preventDefault();
                                                      await saveInlineComment(task.id);
                                                    } else if (e.key === 'Escape') {
                                                      setEditingCommentTaskId(null);
                                                    }
                                                  }}
                                                  maxLength={1000}
                                                  rows={2}
                                                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-[#006c4a] focus:ring-1 focus:ring-[#006c4a]/20 text-slate-800 resize-y min-h-[44px]"
                                                  autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                  <button
                                                    onClick={() => setEditingCommentTaskId(null)}
                                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                                  >
                                                    Cancelar
                                                  </button>
                                                  <button
                                                    onClick={() => saveInlineComment(task.id)}
                                                    className="text-[10px] font-bold text-[#006c4a] hover:text-[#005137] transition-colors"
                                                  >
                                                    Guardar
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-between w-full">
                                                {task.comments ? (
                                                  <p 
                                                    onClick={() => {
                                                      setEditingCommentTaskId(task.id);
                                                      setInlineCommentValue(task.comments || '');
                                                    }}
                                                    className="text-[11px] text-slate-600 bg-slate-50/80 px-2 py-1 rounded border border-slate-100 italic cursor-pointer hover:bg-slate-100 hover:border-slate-200 transition-all flex-1 pr-8 relative group/editcomment text-left"
                                                    title="Haga clic para editar comentario"
                                                  >
                                                    <span className="font-semibold text-[9px] text-slate-400 not-italic block uppercase tracking-wider mb-0.5">Comentario:</span>
                                                    {task.comments}
                                                    <Pencil size={9} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover/editcomment:opacity-100 transition-opacity" />
                                                  </p>
                                                ) : (
                                                  <button
                                                    onClick={() => {
                                                      setEditingCommentTaskId(task.id);
                                                      setInlineCommentValue('');
                                                    }}
                                                    className="text-[10px] font-bold text-[#006c4a]/70 hover:text-[#006c4a] flex items-center gap-1 transition-colors mt-0.5"
                                                  >
                                                    <Plus size={10} /> Añadir comentario
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => startEditingTask(task)}
                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Editar"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        onClick={() => deleteTask(task.id)}
                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600 transition-colors"
                                        title="Borrar"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                </div>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto flex-1">
                <SaleTab lead={lead} onLeadUpdate={async (updates) => {
                  try {
                    await updateMutation.mutateAsync({ id: lead.id, updates });
                    onUpdate();
                  } catch (err) {
                    console.error("Error updating lead from SaleTab:", err);
                    showAlert({ title: 'Error', message: 'No se pudieron guardar los datos.' });
                  }
                }} />
              </div>
            )}
          </div>
        </div>
  );

  return (
    <>
      {isInline ? (
        content
      ) : (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {content}
          </div>
        </div>
      )}

      {isEmailModalOpen && (
        <EmailComposerModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          leadId={lead.id}
          leadName={formData.name}
          leadEmail={formData.email}
          leadPhone={formData.phone}
          availableDocs={availableDocs}
          onSentSuccess={fetchTasks}
          initialMethod={composerConfig.method}
          initialSubject={composerConfig.subject}
          initialMessage={composerConfig.message}
          isInline={isInline}
        />
      )}

      {isFeedbackModalOpen && (
        <FeedbackEmailModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          lead={{
            id: lead.id,
            name: lead.name,
            email: lead.email,
            source: lead.source
          }}
          onSuccess={() => {
            fetchTasks();
            onUpdate();
          }}
          isInline={isInline}
        />
      )}
    </>
  );
}

const getAvatarStyle = (name: string) => {
  const colors = [
    'bg-emerald-100 text-emerald-800 border-emerald-200/50',
    'bg-blue-100 text-blue-800 border-blue-200/50',
    'bg-purple-100 text-purple-800 border-purple-200/50',
    'bg-amber-100 text-amber-800 border-amber-200/50',
    'bg-rose-100 text-rose-800 border-rose-200/50'
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
};