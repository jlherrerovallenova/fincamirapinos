import { useNavigate } from 'react-router-dom';
import { Mail, MessageCircle, Eye } from 'lucide-react';

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

interface DashboardEmailTrackingProps {
  filteredEmails: EmailTrackingItem[];
  searchQuery: string;
  loading: boolean;
  emailFilter?: 'all' | 'unopened';
}

export default function DashboardEmailTracking({ 
  filteredEmails, 
  searchQuery, 
  loading, 
  emailFilter = 'all' 
}: DashboardEmailTrackingProps) {
  const navigate = useNavigate();

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Hoy, ${time}` : `${date.toLocaleDateString()} ${time}`;
  };

  if (filteredEmails.length === 0 && !loading) {
    let title = 'Sin correos';
    let subtitle = 'No se ha enviado ningún correo todavía';

    if (searchQuery) {
      title = 'No hay coincidencias';
      subtitle = 'Prueba con otro cliente o asunto';
    } else if (emailFilter === 'unopened') {
      title = '¡Todo al día!';
      subtitle = 'Todos los correos enviados han sido abiertos por los clientes';
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-in fade-in">
        <Mail size={48} className="mb-4 opacity-20 text-indigo-500" />
        <p className="text-sm font-medium text-slate-600">
          {title}
        </p>
        <p className="text-xs opacity-60">
          {subtitle}
        </p>
      </div>
    );
  }

  return (
    <>
      {filteredEmails.map((email) => {
        const isOpened = email.status === 'opened' || email.opens_count > 0;
        return (
          <div
            key={email.id}
            className={`p-4 hover:bg-slate-50 transition-all flex items-center justify-between group bg-white ${email.lead_id ? 'cursor-pointer' : ''}`}
            onClick={() => email.lead_id && navigate(`/leads?open=${email.lead_id}`)}
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold text-xs">
                <Mail size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-800 truncate">
                    {email.leads?.name || 'Cliente desconocido'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                      isOpened
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {isOpened ? 'Abierto' : 'Enviado'}
                    </span>
                    {!isOpened && email.leads?.phone && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const firstName = (email.leads?.name || '').split(' ')[0];
                          const hour = new Date().getHours();
                          const greeting = hour < 14 ? 'Buenos días' : 'Buenas tardes';
                          const message = `${greeting}, ${firstName}:\nSoy Juan Herrero, de Terravall, inmobiliaria comercializadora de Finca Mirapinos. Le escribo para confirmar si pudo recibir el dossier informativo de la promoción que le enviamos hace unos días. Si no es así, le agradecería que revisase su carpeta de correo no deseado (SPAM); en caso de que siga sin localizarlo, por favor háganoslo saber y se lo haré llegar de inmediato. Quedo a su entera disposición para resolver cualquier duda que pueda tener sobre la promoción.\nUn cordial saludo,\nJuan Herrero\nwww.mirapinos.com`;

                          const cleanPhone = (email.leads?.phone || '').replace(/\D/g, '');
                          const phoneWithCode = cleanPhone.startsWith('34') ? cleanPhone : '34' + cleanPhone;
                          window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="p-1 rounded-full hover:bg-emerald-100 text-emerald-600 transition-colors shadow-sm bg-white border border-emerald-100"
                        title="Enviar WhatsApp de seguimiento"
                      >
                        <MessageCircle size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-500 truncate font-medium">
                  {email.subject}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span>Enviado: {formatDateTime(email.created_at)}</span>
                  {isOpened && email.last_opened_at && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                        <Eye size={10} />
                        Últ. apertura: {formatDateTime(email.last_opened_at)} ({email.opens_count} {email.opens_count === 1 ? 'vez' : 'veces'})
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 pl-3">
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isOpened
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border border-slate-200'
                }`}>
                  <Eye size={12} />
                  {email.opens_count} {email.opens_count === 1 ? 'apertura' : 'aperturas'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
