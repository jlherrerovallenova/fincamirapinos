// src/components/leads/EmailComposerModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  MessageCircle,
  Paperclip,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

// Importamos la imagen de la firma (asegúrate de que la ruta sea correcta según tu estructura)
// import firmaImg from '../../../assets/Firma.png';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  leadEmail: string | null;
  leadPhone: string | null;
  availableDocs: { name: string; url: string; category?: string; metadata?: { size?: number; mimetype?: string } }[];
  onSentSuccess?: () => void;
  initialMethod?: 'email' | 'whatsapp';
  initialSubject?: string;
  initialMessage?: string;
  isInline?: boolean;
}

export default function EmailComposerModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  availableDocs,
  onSentSuccess,
  initialMethod,
  initialSubject,
  initialMessage,
  isInline = true
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { showAlert } = useDialog();
  const [method, setMethod] = useState<'email' | 'whatsapp'>(
    initialMethod || (leadEmail ? 'email' : 'whatsapp')
  );
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState(
    initialSubject || `Documentación de interés - Finca Mirapinos`
  );
  const greeting = new Date().getHours() < 14 ? 'Buenos días' : 'Buenas tardes';
  const [message, setMessage] = useState(
    initialMessage || `${greeting}, ${leadName.split(' ')[0]}:\n\nTal como comentamos en nuestra última conversación, le envío la documentación comercial actualizada sobre la promoción Finca Mirapinos.\n\nLe agradecería que me confirmara la recepción de los archivos. Asimismo, me pongo a su disposición para coordinar una reunión o llamada si precisa cualquier aclaración adicional sobre el proyecto.\n\nAtentamente,`
  );

  useEffect(() => {
    if (isOpen) {
      if (initialMethod) {
        setMethod(initialMethod);
      } else if (leadEmail) {
        setMethod('email');
      } else {
        setMethod('whatsapp');
      }
      if (initialSubject !== undefined) {
        setSubject(initialSubject);
      } else {
        setSubject(`Documentación de interés - Finca Mirapinos`);
      }
      if (initialMessage !== undefined) {
        setMessage(initialMessage);
      } else {
        const currentGreeting = new Date().getHours() < 14 ? 'Buenos días' : 'Buenas tardes';
        setMessage(`${currentGreeting}, ${leadName.split(' ')[0]}:\n\nTal como comentamos en nuestra última conversación, le envío la documentación comercial actualizada sobre la promoción Finca Mirapinos.\n\nLe agradecería que me confirmara la recepción de los archivos. Asimismo, me pongo a su disposición para coordinar una reunión o llamada si precisa cualquier aclaración adicional sobre el proyecto.\n\nAtentamente,`);
      }
      setStatus('idle');
    }
  }, [isOpen, initialMethod, initialSubject, initialMessage, leadEmail, leadName]);

  const [selectedDocs, setSelectedDocs] = useState<{ name: string; url: string; category?: string; metadata?: { size?: number; mimetype?: string } }[]>([]);

  if (!isOpen) return null;

  const getSignatureHtml = (): string => {
    return `
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin-top: 32px; font-family: Arial, sans-serif;">
        <tr>
          <td style="width: 50%; vertical-align: middle; padding: 0;">
            <div style="font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: 0.02em; margin: 0;">TERRAVALL</div>
            <div style="display: block; margin-top: 4px;">
              <span style="width: 24px; height: 2px; background-color: #006c4a; margin-right: 8px; display: inline-block; vertical-align: middle;"></span>
              <span style="font-size: 11px; font-weight: 800; color: #006c4a; letter-spacing: 0.05em; text-transform: uppercase; vertical-align: middle; display: inline-block;">Finca Mirapinos</span>
            </div>
          </td>
          <td style="width: 50%; text-align: right; vertical-align: middle; padding: 0;">
            <div style="display: inline-block; text-align: left;">
              <div style="font-size: 12px; color: #475569; font-weight: 500; margin-bottom: 4px;">
                <span style="margin-right: 6px;">📍</span>
                <span>Plaza Mayor 8, 1ºA &middot; Valladolid</span>
              </div>
              <div style="font-size: 12px; color: #475569; font-weight: 500; margin-bottom: 4px;">
                <span style="margin-right: 6px;">📞</span>
                <a href="tel:983342132" style="color: #475569; text-decoration: none;">983 34 21 32</a>
              </div>
              <div style="font-size: 12px; color: #006c4a; font-weight: 600;">
                <span style="margin-right: 6px; color: #006c4a;">🌐</span>
                <a href="https://www.mirapinos.com" target="_blank" style="color: #006c4a; text-decoration: none;">www.mirapinos.com</a>
              </div>
            </div>
          </td>
        </tr>
      </table>
    `;
  };

  const toggleDoc = (doc: { name: string; url: string; category?: string }) => {
    setSelectedDocs(prev =>
      prev.find(d => d.url === doc.url)
        ? prev.filter(d => d.url !== doc.url)
        : [...prev, doc]
    );
  };

  const createTaskRecord = async (sentMethod: 'email' | 'whatsapp', trackingId?: string) => {
    try {
      const methodLabel = sentMethod === 'email' ? 'Email' : 'WhatsApp';
      const docNames = selectedDocs.length > 0 
        ? selectedDocs.map(d => d.name).join(', ')
        : 'Documentación manual';
      
      const payload: any = {
        lead_id: leadId,
        user_id: user?.id,
        title: `Envío ${methodLabel}: ${docNames}`,
        type: methodLabel,
        due_date: new Date().toISOString(),
        completed: true
      };

      if (sentMethod === 'email' && trackingId) {
        payload.tracking_id = trackingId;
      }

      try {
        const { error: insertErr } = await supabase.from('agenda').insert([payload] as any);
        if (insertErr) throw insertErr;
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
      } catch (err: any) {
        if (payload.tracking_id && (err?.message?.includes('tracking_id') || err?.message?.includes('schema cache'))) {
          delete payload.tracking_id;
          const { error: retryErr } = await supabase.from('agenda').insert([payload] as any);
          if (retryErr) throw retryErr;
          queryClient.invalidateQueries({ queryKey: ['agenda'] });
        } else {
          throw err;
        }
      }
    } catch (error) {
      console.error('Error al crear tarea de agenda:', error);
    }
  };

  const saveHistory = async (sentMethod: 'email' | 'whatsapp') => {
    if (selectedDocs.length === 0) return;

    try {
      const records = selectedDocs.map(doc => ({
        lead_id: leadId,
        doc_name: doc.name,
        method: sentMethod,
        sent_at: new Date().toISOString()
      }));

      const { error } = await (supabase as any)
        .from('sent_documents')
        .insert(records as any);

      if (error) throw error;

      if (onSentSuccess) onSentSuccess();
    } catch (error) {
      console.error('Error al guardar el historial:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `clientes/${leadId}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const newDoc = { 
        name: file.name, 
        url: publicUrl, 
        category: 'Archivo Externo',
        metadata: { size: file.size, mimetype: file.type }
      };
      setSelectedDocs(prev => [...prev, newDoc]);
    } catch (error: any) {
      console.error('Error subiendo archivo:', error);
      await showAlert({ title: 'Error', message: 'No se pudo subir el archivo: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
      if (method === 'email') {
        if (!leadEmail) {
          await showAlert({ title: 'Atención', message: 'El cliente no tiene email configurado.' });
          setLoading(false);
          return;
        }

        const formatFileSize = (bytes?: number): string => {
          if (!bytes) return 'N/A';
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
          return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        };

        const getFileTypeLabel = (name: string): string => {
          const ext = name.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') return 'PDF DOCUMENT';
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'IMAGE FILE';
          if (['doc', 'docx'].includes(ext || '')) return 'WORD DOCUMENT';
          if (['xls', 'xlsx'].includes(ext || '')) return 'EXCEL SPREADSHEET';
          return 'FILE';
        };

        let htmlDocs = '';
        if (selectedDocs.length > 0) {
          let rowsHtml = '';
          for (let i = 0; i < selectedDocs.length; i += 2) {
            const doc1 = selectedDocs[i];
            const doc2 = selectedDocs[i + 1];

            const renderCard = (d?: typeof selectedDocs[0]) => {
              if (!d) return '<td style="width: 50%; padding: 8px;"></td>';
              
              const isPdf = d.name.toLowerCase().endsWith('.pdf');
              const isImg = /\.(jpe?g|png|gif|webp)$/i.test(d.name);
              
              const wrapperBg = isPdf ? '#fef2f2' : (isImg ? '#f0fdf4' : '#f8fafc');
              const wrapperBorder = isPdf ? '#fca5a5' : (isImg ? '#86efac' : '#e2e8f0');
              const wrapperColor = isPdf ? '#dc2626' : (isImg ? '#16a34a' : '#64748b');
              
              const fileText = isPdf ? 'PDF' : (isImg ? 'IMG' : 'DOC');
              const actionIcon = isPdf ? '📥' : '👁️';

              const fileType = getFileTypeLabel(d.name);
              const fileSize = formatFileSize(d.metadata?.size);
              const metaText = fileSize !== 'N/A' ? `${fileSize} • ${fileType}` : fileType;

              return `
                <td style="width: 50%; padding: 8px; vertical-align: top;">
                  <a href="${d.url}" target="_blank" style="text-decoration: none; display: block;">
                    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-family: Arial, sans-serif;">
                      <tr>
                        <td style="padding: 12px 14px; vertical-align: middle;">
                          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                            <tr>
                              <td style="width: 36px; vertical-align: middle; padding: 0;">
                                <table cellpadding="0" cellspacing="0" border="0" style="width: 36px; height: 36px; background-color: ${wrapperBg}; border: 1px solid ${wrapperBorder}; border-radius: 6px; text-align: center; border-collapse: collapse;">
                                  <tr>
                                    <td align="center" valign="middle" style="font-size: 10px; font-weight: 800; color: ${wrapperColor}; text-align: center; vertical-align: middle; line-height: 36px; padding: 0; font-family: Arial, sans-serif;">
                                      ${fileText}
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding-left: 12px; vertical-align: middle; text-align: left;">
                                <div style="font-size: 13px; font-weight: bold; color: #1e293b; line-height: 1.3; margin: 0; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                  ${d.name}
                                </div>
                                <div style="font-size: 9px; font-weight: 600; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.03em;">
                                  ${metaText}
                                </div>
                              </td>
                              <td style="width: 24px; text-align: right; vertical-align: middle; font-size: 14px; color: #64748b;">
                                ${actionIcon}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
              `;
            };

            rowsHtml += `
              <tr>
                ${renderCard(doc1)}
                ${renderCard(doc2)}
              </tr>
            `;
          }

          htmlDocs = `
            <div style="margin: 28px 0; background: #f8fafb; border-radius: 12px; padding: 20px 20px; border: 1px solid #f1f5f9;">
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; font-family: Arial, sans-serif;">
                <tr>
                  <td style="padding: 0 8px 12px 8px; font-size: 11px; font-weight: 700; color: #006c4a; letter-spacing: 0.08em; text-transform: uppercase;">
                    <span style="margin-right: 6px;">📎</span> DOCUMENTOS ADJUNTOS
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                ${rowsHtml}
              </table>
            </div>
          `;
        }

        const { data: trackingRecord, error: trackingError } = await (supabase as any)
          .from('email_tracking')
          .insert([{ lead_id: leadId, subject: subject }])
          .select()
          .single();

        if (trackingError) {
          console.error("No se pudo registrar el tracking", trackingError);
        }

        const trackingId = trackingRecord?.id;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const pixelHtml = trackingId ? `<img src="${supabaseUrl}/functions/v1/track-pixel?tracking_id=${trackingId}" width="1" height="1" alt="" style="display:none;" />` : '';

        const logoUrl = 'https://raw.githubusercontent.com/jlherrerovallenova/mirapinos-crm/main/public/logo-mirapinos.png';
        const htmlFullMessage = `
          <!DOCTYPE html>
          <html>
          <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
              <tr>
                <td align="center" style="padding: 40px 16px;">
                  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.05);">

                    <tr>
                      <td style="background-color:#ffffff; padding: 32px 40px 24px 40px; text-align:center; border-bottom: 2px solid #006c4a;">
                        <img src="${logoUrl}" alt="— F I N C A — MIRAPINOS" height="52" style="height: 52px; width: auto; display: block; margin: 0 auto;" />
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 40px 48px; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.65; color: #334155; text-align: left;">
                        ${message.replace(/\n/g, '<br>')}
                        ${htmlDocs}
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0 24px 0;" />
                        ${getSignatureHtml()}
                      </td>
                    </tr>

                    <tr>
                      <td style="background-color:#006c4a; padding: 16px 40px; text-align: center;">
                        <div style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; color: #ffffff; letter-spacing: 0.2em; text-transform: uppercase;">MIRAPINOS, CASAS DE CAMPO</div>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
            ${pixelHtml}
          </body>
          </html>
        `;

        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            to: leadEmail,
            subject,
            html: htmlFullMessage,
          },
        });

        if (error || data?.error) {
          const msg = data?.error || error?.message || 'Error desconocido';
          throw new Error(msg);
        }

        await saveHistory('email');
        await createTaskRecord('email', trackingId);
        setStatus('success');
        setTimeout(onClose, 2000);
      } else {
        if (!leadPhone) {
          await showAlert({ title: 'Atención', message: 'El cliente no tiene teléfono configurado.' });
          setLoading(false);
          return;
        }

        let cleanPhone = leadPhone.replace(/\D/g, '');
        if (cleanPhone.length === 9) cleanPhone = '34' + cleanPhone;

        const docsText = selectedDocs.length > 0
          ? `\n\n📄 *Documentación adjunta:*` + selectedDocs.map(d => `\n- ${d.name}: ${d.url}`).join('')
          : '';

        const fullMessage = `${message}${docsText}`;
        const encodedMsg = encodeURIComponent(fullMessage);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;

        window.open(whatsappUrl, '_blank');
        await saveHistory('whatsapp');
        await createTaskRecord('whatsapp');
        setStatus('success');
        setTimeout(onClose, 1000);
      }
    } catch (error: any) {
      console.error('Error en el proceso de envío:', error);
      const msg = error?.text || error?.message || 'No se pudo enviar. Revisa la consola.';
      await showAlert({ title: 'Error de envío', message: msg });
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="bg-white w-full rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-200">
      {/* HEADER CLARO Y LIMPIO */}
      <div className="bg-slate-50 px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
            method === 'email' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}>
            {method === 'email' ? <Mail size={18} /> : <MessageCircle size={18} />}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {method === 'email' ? 'Envío por Email' : 'Envío por WhatsApp'}
            </p>
            <h2 className="text-slate-900 font-bold text-base leading-tight">
              Enviar a <span className="text-emerald-700 font-extrabold">{leadName}</span> mensaje por {method === 'email' ? 'email' : 'whatsapp'}
            </h2>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-slate-200/60 rounded-xl transition-colors text-slate-400 hover:text-slate-700 shrink-0"
          title="Volver"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSend} className="p-6 space-y-5">

        {/* METODO SELECTOR SI SE DESEA CAMBIAR */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMethod('email')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              method === 'email' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail size={14} /> Correo Electrónico
          </button>
          <button
            type="button"
            onClick={() => setMethod('whatsapp')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              method === 'whatsapp' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageCircle size={14} /> WhatsApp
          </button>
        </div>

        {/* CAMPOS */}
        <div className="space-y-4">
          {method === 'email' && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asunto</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none font-semibold text-sm text-slate-800 transition-all"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensaje personalizado</label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full mt-1.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-300/30 focus:border-slate-400 outline-none font-medium text-sm text-slate-700 transition-all"
            />
          </div>
        </div>

        {/* DOCUMENTOS */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Documentación a enviar</label>
          <div className="space-y-3">
              {['Documentos Olivo', 'Documentos Arce', 'Parcelas', 'Renders-Fotos', 'Sin Categoría', 'Archivo Externo'].map(cat => {
                const catDocs = (cat === 'Archivo Externo') 
                  ? selectedDocs.filter(d => d.category === 'Archivo Externo')
                  : availableDocs.filter(d => (d.category || 'Sin Categoría') === cat);
                  
                if (catDocs.length === 0 && cat !== 'Archivo Externo') return null;

                return (
                  <div key={cat} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div 
                      className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => setExpandedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{cat}</h4>
                        {expandedCategories.includes(cat) ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                      {cat === 'Archivo Externo' && (
                        <label 
                          className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-200 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Upload size={12} /> Adjuntar archivo
                          <input type="file" className="hidden" onChange={handleFileUpload} />
                        </label>
                      )}
                    </div>
                    
                    {expandedCategories.includes(cat) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-100">
                        {catDocs.length === 0 && cat === 'Archivo Externo' ? (
                          <div className="col-span-2 bg-white px-4 py-3 text-center">
                            <p className="text-[10px] text-slate-400 italic">No hay archivos externos adjuntos para este envío.</p>
                          </div>
                        ) : (
                          catDocs.map((doc, idx) => {
                            const isSelected = selectedDocs.find(d => d.url === doc.url);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => toggleDoc(doc)}
                                className={`flex items-center gap-2.5 px-4 py-3 text-left transition-all ${
                                  isSelected
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <Paperclip size={14} className={isSelected ? 'text-emerald-500 shrink-0' : 'text-slate-300 shrink-0'} />
                                <span className="text-xs font-semibold truncate" title={doc.name}>{doc.name}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            {status === 'success' && (
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <CheckCircle2 size={18} /> ¡Mensaje procesado correctamente!
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                <AlertCircle size={18} /> Error al procesar el envío
              </div>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 text-slate-600 font-semibold text-sm border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={loading || status === 'success'}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-sm ${
                method === 'email' ? 'bg-[#1a5c38] hover:bg-[#134228]' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'Enviar Documentación'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  if (isInline) {
    return content;
  }

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[70] flex items-start justify-center pt-16 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl">
        {content}
      </div>
    </div>,
    document.body
  );
}