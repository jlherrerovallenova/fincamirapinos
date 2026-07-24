// src/pages/Leads.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Mail,
  Phone,
  ChevronRight,
  UserPlus,
  Loader2,
  MessageCircle,
  Filter,
  Download,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FilterX,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Users
} from 'lucide-react';
import CreateLeadView from '../components/leads/CreateLeadView';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import EmailComposerModal from '../components/leads/EmailComposerModal';
import ExportLeadsModal from '../components/leads/ExportLeadsModal';
import ImportLeadsModal from '../components/leads/ImportLeadsModal';
import { AppNotification } from '../components/AppNotification';
import { useDocuments } from '../hooks/useDocuments';
import { useLeads } from '../hooks/useLeads';
import type { Database } from '../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];
type ViewMode = 'list' | 'create' | 'detail' | 'export' | 'import' | 'composer';

const ITEMS_PER_PAGE = 10;

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Cualificado',
  visiting: 'Visitando',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  closed: 'Cerrado',
  lost: 'Perdido',
};

const STATUS_CONFIG: Record<string, { dot: string; pill: string; border: string }> = {
  new:         { dot: 'bg-blue-400',    pill: 'bg-blue-50 text-blue-700 border border-blue-200',       border: 'border-l-blue-400' },
  contacted:   { dot: 'bg-purple-400',  pill: 'bg-purple-50 text-purple-700 border border-purple-200', border: 'border-l-purple-400' },
  qualified:   { dot: 'bg-emerald-400', pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', border: 'border-l-emerald-400' },
  visiting:    { dot: 'bg-cyan-400',    pill: 'bg-cyan-50 text-cyan-700 border border-cyan-200',       border: 'border-l-cyan-400' },
  proposal:    { dot: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700 border border-amber-200',   border: 'border-l-amber-400' },
  negotiation: { dot: 'bg-orange-400',  pill: 'bg-orange-50 text-orange-700 border border-orange-200', border: 'border-l-orange-400' },
  closed:      { dot: 'bg-slate-600',   pill: 'bg-slate-800 text-slate-100 border border-slate-700',  border: 'border-l-slate-600' },
  lost:        { dot: 'bg-red-400',     pill: 'bg-red-50 text-red-700 border border-red-200',         border: 'border-l-red-400' },
};

const getStatusBadge = (status: Lead['status']) => {
  const cfg = STATUS_CONFIG[status || 'new'] || STATUS_CONFIG['new'];
  const label = STATUS_LABELS[status || 'new'] || 'Nuevo';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {label}
    </span>
  );
};

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: rawDocs = [] } = useDocuments();
  const availableDocs = rawDocs
    .filter(doc => doc.url)
    .map(doc => ({ name: doc.name, url: doc.url!, category: doc.category }));

  // Estado de vista activa (Inline navigation sin modales)
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Estados de Búsqueda y Filtros sincronizados con la URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [sourceFilter, setSourceFilter] = useState<string>(searchParams.get('source') || '');

  // Estados de Paginación
  const [page, setPage] = useState(1);

  // Estados de Ordenación
  const [sortField, setSortField] = useState<'name' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Lead seleccionado / Email
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [initialMethod, setInitialMethod] = useState<'email' | 'whatsapp'>('email');

  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, title: '', message: '', type: 'success' });

  // React Query para la gestión de leads
  const { 
    data, 
    isLoading: loading, 
    refetch 
  } = useLeads({
    page,
    pageSize: ITEMS_PER_PAGE,
    searchTerm,
    statusFilter,
    sourceFilter,
    sortField,
    sortDirection
  });

  const leads = data?.leads || [];
  const totalLeads = data?.totalCount || 0;

  // Sincronizar el estado interno si la URL cambia
  useEffect(() => {
    const s = searchParams.get('search') || '';
    const st = searchParams.get('status') || '';
    const src = searchParams.get('source') || '';
    setSearchTerm(prev => (prev !== s ? s : prev));
    setStatusFilter(prev => (prev !== st ? st : prev));
    setSourceFilter(prev => (prev !== src ? src : prev));
  }, [searchParams]);

  const handleSort = (field: 'name' | 'created_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const showMsg = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
  };

  const openComposer = (lead: Lead, method: 'email' | 'whatsapp') => {
    setInitialMethod(method);
    setEmailLead(lead);
    setViewMode('composer');
  };

  const openDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setViewMode('detail');
  };

  const updateURLParams = (key: string, value: string) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setPage(1);
    updateURLParams('search', value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatusFilter(value);
    setPage(1);
    updateURLParams('status', value);
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSourceFilter(value);
    setPage(1);
    updateURLParams('source', value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSourceFilter('');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== '' || sourceFilter !== '';
  const totalPages = Math.ceil(totalLeads / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* NOTIFICACIÓN FLOTANTE / GLOBAL */}
      {notification.show && (
        <AppNotification
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}

      {/* VISTAS INLINE: DAR DE ALTA CLIENTE */}
      {viewMode === 'create' && (
        <CreateLeadView
          onClose={() => setViewMode('list')}
          onSuccess={() => {
            refetch();
            showMsg('success', '¡Completado!', 'El nuevo cliente ha sido creado con éxito.');
            setViewMode('list');
          }}
        />
      )}

      {/* VISTAS INLINE: DETALLE DE CLIENTE */}
      {viewMode === 'detail' && selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isInline={true}
          onClose={() => {
            setSelectedLead(null);
            setViewMode('list');
          }}
          onUpdate={(deleted?: boolean) => {
            refetch();
            if (deleted) {
              setSelectedLead(null);
              setViewMode('list');
              showMsg('success', 'Cliente eliminado', 'Cliente borrado.');
            } else {
              showMsg('info', 'Cliente actualizado', 'Cambios guardados.');
            }
          }}
        />
      )}

      {/* VISTAS INLINE: ENVIAR EMAIL / WHATSAPP */}
      {viewMode === 'composer' && emailLead && (
        <EmailComposerModal
          isOpen={true}
          isInline={true}
          onClose={() => setViewMode(selectedLead ? 'detail' : 'list')}
          leadId={emailLead.id}
          leadName={emailLead.name}
          leadEmail={emailLead.email}
          leadPhone={emailLead.phone}
          availableDocs={availableDocs}
          onSentSuccess={() => {
            showMsg('success', 'Mensaje enviado', 'Registrado correctamente.');
          }}
          initialMethod={initialMethod}
        />
      )}

      {/* VISTAS INLINE: EXPORTAR LISTADO */}
      {viewMode === 'export' && (
        <ExportLeadsModal
          isOpen={true}
          isInline={true}
          onClose={() => setViewMode('list')}
        />
      )}

      {/* VISTAS INLINE: IMPORTAR CSV / EXCEL */}
      {viewMode === 'import' && (
        <ImportLeadsModal
          isOpen={true}
          isInline={true}
          onClose={() => setViewMode('list')}
          onSuccess={() => {
            refetch();
            showMsg('success', '¡Importación completada!', 'Los clientes han sido importados correctamente.');
            setViewMode('list');
          }}
        />
      )}

      {/* VISTA PRINCIPAL: LISTADO DE CLIENTES */}
      {viewMode === 'list' && (
        <>
          {/* CABECERA DE PÁGINA */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                <Users size={36} className="text-[#006c4a]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Mis Clientes</h2>
                <p className="text-slate-500 text-xs font-semibold mt-1">
                  {totalLeads} prospectos {hasActiveFilters && `(filtrados)`} en el embudo de conversión.
                </p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto self-start md:self-auto">
              <button
                onClick={() => setViewMode('import')}
                className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors shadow-sm hidden sm:flex items-center gap-2"
                title="Importar CSV / Excel"
              >
                <Upload size={18} />
                <span className="hidden lg:inline text-xs font-bold">Importar</span>
              </button>

              <button
                onClick={() => setViewMode('export')}
                className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors shadow-sm hidden sm:flex items-center gap-2"
                title="Exportar Listado PDF"
              >
                <Download size={18} />
                <span className="hidden lg:inline text-xs font-bold">Exportar</span>
              </button>

              <button
                onClick={() => setViewMode('create')}
                className="px-5 py-3 bg-[#006c4a] text-white font-bold text-sm rounded-xl shadow-lg hover:bg-[#005137] transition-all flex items-center gap-2 active:scale-95 shrink-0 flex-1 md:flex-none justify-center"
              >
                <UserPlus size={18} /> <span className="inline">Nuevo Cliente</span>
              </button>
            </div>
          </div>

          {/* BARRA DE FILTROS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o teléfono..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none shadow-sm text-slate-900"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>

              <div className="flex w-full lg:w-auto gap-3">
                <div className="relative flex-1 lg:w-48">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={statusFilter}
                    onChange={handleStatusChange}
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none shadow-sm cursor-pointer text-slate-700"
                  >
                    <option value="">Todos los Estados</option>
                    <option value="new">Nuevos</option>
                    <option value="contacted">Contactados</option>
                    <option value="qualified">Cualificados</option>
                    <option value="visiting">Visitando</option>
                    <option value="proposal">Propuesta</option>
                    <option value="negotiation">Negociación</option>
                    <option value="closed">Cerrados</option>
                    <option value="lost">Perdidos</option>
                  </select>
                </div>

                <div className="relative flex-1 lg:w-48">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    value={sourceFilter}
                    onChange={handleSourceChange}
                    className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none shadow-sm cursor-pointer text-slate-700"
                  >
                    <option value="">Cualquier Origen</option>
                    <option value="Idealista">Idealista</option>
                    <option value="Web">Web</option>
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Referido">Referido</option>
                    <option value="Llamada">Llamada</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors shadow-sm flex items-center justify-center shrink-0"
                    title="Limpiar filtros"
                  >
                    <FilterX size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TABLA / TARJETAS DE CLIENTES */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col relative z-10">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                <Loader2 className="animate-spin" size={40} />
                <p className="font-medium animate-pulse">Cargando base de datos...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <Search size={24} />
                </div>
                <p className="text-slate-500 font-medium text-center px-4">
                  {hasActiveFilters
                    ? "No hay clientes que coincidan con los filtros actuales."
                    : "No hay clientes registrados en la base de datos."}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-emerald-600 font-bold text-sm mt-4 hover:underline px-4 py-2 bg-emerald-50 rounded-lg">
                    Limpiar todos los filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 hidden md:grid">
                  <div
                    className={`col-span-4 flex items-center gap-1 cursor-pointer select-none transition-colors ${sortField === 'name' ? 'text-slate-700' : 'hover:text-slate-600'}`}
                    onClick={() => handleSort('name')}
                  >
                    Cliente
                    {sortField === 'name' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                  </div>
                  <div className="col-span-2">Estado</div>
                  <div className="col-span-3">Contacto</div>
                  <div className="col-span-1">Origen</div>
                  <div
                    className={`col-span-2 flex items-center gap-1 cursor-pointer select-none transition-colors ${sortField === 'created_at' ? 'text-slate-700' : 'hover:text-slate-600'}`}
                    onClick={() => handleSort('created_at')}
                  >
                    Alta
                    {sortField === 'created_at' ? (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                  </div>
                </div>

                {leads.map((lead) => {
                  const cfg = STATUS_CONFIG[lead.status || 'new'] || STATUS_CONFIG['new'];
                  return (
                    <div
                      key={lead.id}
                      onClick={() => openDetail(lead)}
                      className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer group border-b border-slate-100 border-l-4 ${cfg.border} hover:bg-slate-50/80 transition-all duration-150 relative`}
                    >
                      <div className="md:col-span-4 flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-100 shrink-0">
                          {lead.name?.substring(0, 2).toUpperCase() || 'CL'}
                        </div>
                        <div className="min-w-0 flex items-center">
                          <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-emerald-700 transition-colors leading-tight">{lead.name}</h3>
                        </div>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between md:justify-start">
                        {getStatusBadge(lead.status)}
                      </div>

                      <div className="md:col-span-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                          <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                            <Mail size={11} className="text-blue-400" />
                          </div>
                          <span className="truncate">{lead.email || <span className="text-slate-300 italic">Sin email</span>}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                          <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                            <Phone size={11} className="text-emerald-400" />
                          </div>
                          <span className="truncate">{lead.phone || <span className="text-slate-300 italic">Sin teléfono</span>}</span>
                        </div>
                      </div>

                      <div className="md:col-span-1">
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1 truncate block text-center">
                          {lead.source || 'Directo'}
                        </span>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between md:justify-start">
                        <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors md:hidden" />
                      </div>

                      <div className="hidden lg:flex items-center justify-end gap-1 absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openComposer(lead, 'whatsapp'); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="WhatsApp"><MessageCircle size={15} /></button>
                        <button onClick={(e) => { e.stopPropagation(); openComposer(lead, 'email'); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Email"><Mail size={15} /></button>
                        <ChevronRight size={15} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGINACIÓN */}
            {totalLeads > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium text-center md:text-left">
                  Mostrando {leads.length} de {totalLeads} leads
                </span>

                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="p-1.5 md:p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 md:p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="text-[10px] md:text-xs font-bold text-slate-700 px-1 md:px-2 whitespace-nowrap">
                    {page} / {totalPages || 1}
                  </span>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 md:p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="p-1.5 md:p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}