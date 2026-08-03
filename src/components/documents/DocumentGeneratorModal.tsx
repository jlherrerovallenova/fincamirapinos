// src/components/documents/DocumentGeneratorModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  X, FileText, Download, Eye, FileSpreadsheet, 
  User, Home, Calendar, CheckCircle2, Key, Loader2, Sparkles, PenLine
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  generatePDF, 
  generateDOCX, 
  type DocumentType, 
  type ContractData,
  type PartyData,
  type PropertyData
} from '../../utils/documentGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialLead?: any;
  initialProperty?: any;
  lockSelection?: boolean;
}

export const DocumentGeneratorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialLead,
  initialProperty,
  lockSelection
}) => {
  const [docType, setDocType] = useState<DocumentType>('reserva');
  const [leads, setLeads] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLead?.id || '');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialProperty?.id || '');
  
  const [fecha, setFecha] = useState<string>(
    new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
  
  const [importeReserva, setImporteReserva] = useState<number>(6000);
  const [agenteNombre, setAgenteNombre] = useState<string>('Finca Mirapinos');
  const [juegosLlaves, setJuegosLlaves] = useState<number>(2);
  const [mandosGaraje, setMandosGaraje] = useState<number>(1);
  const [lecturaAgua, setLecturaAgua] = useState<string>('');
  const [lecturaLuz, setLecturaLuz] = useState<string>('');
  const [comentarios, setComentarios] = useState<string>('');

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
      fetchProperties();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialLead?.id) setSelectedLeadId(String(initialLead.id));
    if (initialProperty?.id) setSelectedPropertyId(String(initialProperty.id));
  }, [initialLead, initialProperty]);

  async function fetchLeads() {
    const { data } = await supabase.from('leads').select('*').order('name');
    if (data) setLeads(data);
  }

  async function fetchProperties() {
    const { sortInventoryProperties } = await import('../../hooks/useInventory');
    const { data } = await supabase.from('inventory').select('*');
    if (data) setProperties(sortInventoryProperties(data));
  }

  const activeLead = leads.find(l => String(l.id) === String(selectedLeadId)) || initialLead;
  const activeProperty = properties.find(p => String(p.id) === String(selectedPropertyId)) || initialProperty;

  const buildContractData = (): ContractData | null => {
    if (!activeLead || !activeProperty) return null;

    const comprador: PartyData = {
      nombre: activeLead.name || 'Cliente Sin Nombre',
      dni: activeLead.dni || '_______________',
      estadoCivil: activeLead.civil_status || 'Soltero/a',
      nacionalidad: activeLead.nationality || 'Española',
      domicilio: activeLead.address || '_______________',
      codigoPostal: activeLead.postal_code || '',
      localidad: activeLead.city || '',
      provincia: activeLead.province || '',
      email: activeLead.email || '',
      telefono: activeLead.phone || '',
      nombreCotitular: activeLead.joint_buyer_name || undefined,
      dniCotitular: activeLead.joint_buyer_dni || undefined,
    };

    const propiedad: PropertyData = {
      id: activeProperty.id,
      numeroVivienda: String(activeProperty.numero_vivienda || activeProperty.id),
      modelo: activeProperty.modelo || '',
      dormitorios: Number(activeProperty.habitaciones || 0),
      banos: Number(activeProperty.banos || 0),
      superficieUtil: Number(activeProperty.superficie_util || 0),
      superficieConstruida: Number(activeProperty.superficie_construida || 0),
      garaje: activeProperty.garaje ? 'Incluido' : 'No incluido',
      trastero: activeProperty.trastero ? 'Incluido' : 'No incluido',
      precio: Number(activeProperty.precio || 0),
    };

    return {
      tipoDocumento: docType,
      fecha,
      comprador,
      propiedad,
      importeReserva,
      agenteNombre,
      juegosLlaves,
      mandosGaraje,
      lecturaAgua,
      lecturaLuz,
      comentariosVisita: comentarios,
    };
  };

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handlePreview = async () => {
    const data = buildContractData();
    if (!data) {
      alert('Por favor, selecciona un cliente y una vivienda para generar el documento.');
      return;
    }
    setIsGenerating(true);
    try {
      const blob = await generatePDF(data, false);
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
    } catch (e: any) {
      console.error('Error generando previsualización:', e);
      alert('Error al generar previsualización PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    const data = buildContractData();
    if (!data) {
      alert('Por favor, selecciona un cliente y una vivienda.');
      return;
    }
    await generatePDF(data, true);
  };

  const handleDownloadDOCX = async () => {
    const data = buildContractData();
    if (!data) {
      alert('Por favor, selecciona un cliente y una vivienda.');
      return;
    }
    await generateDOCX(data);
  };

  const handleRequestSignature = async () => {
    const data = buildContractData();
    if (!data) {
      alert('Por favor, selecciona un cliente y una vivienda.');
      return;
    }
    const { signatureService } = await import('../../services/signatureService');
    const { shareUrl: url } = await signatureService.createRequest(data);
    setShareUrl(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* CABECERA MODAL */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Generador de Documentos y Contratos Oficiales</h2>
              <p className="text-xs text-slate-400">Emisión instantánea de contratos en formato PDF oficial y Word editable</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* PANEL IZQUIERDO: CONFIGURACIÓN Y PARÁMETROS (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-6">
            
            {/* TIPO DE DOCUMENTO */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">1. Tipo de Documento</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'reserva', label: 'Contrato Reserva', icon: FileText, desc: 'Señal y reserva de preferencia' },
                  { id: 'compraventa', label: 'Contrato Compraventa', icon: CheckCircle2, desc: 'Acuerdo definitivo privado' },
                ].map(item => {
                  const Icon = item.icon;
                  const active = docType === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setDocType(item.id as DocumentType); setPreviewBlobUrl(null); }}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        active 
                          ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' 
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${active ? 'text-emerald-950' : 'text-slate-700'}`}>{item.label}</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELECCIÓN DE CLIENTE E INMUEBLE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-emerald-600" /> Cliente / Comprador
                </label>
                <select
                  value={selectedLeadId}
                  onChange={e => { setSelectedLeadId(e.target.value); setPreviewBlobUrl(null); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={lockSelection}
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} {l.dni ? `(${l.dni})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Home size={14} className="text-cyan-600" /> Vivienda / Propiedad
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={e => { setSelectedPropertyId(e.target.value); setPreviewBlobUrl(null); }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={lockSelection}
                >
                  <option value="">-- Seleccionar Vivienda --</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>Nº {p.numero_vivienda} | {p.modelo || 'General'} - {p.precio ? `${p.precio.toLocaleString('es-ES')} €` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CAMPOS ESPECÍFICOS SEGÚN EL TIPO */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-2">
                <span>Parámetros del Documento</span>
                <Calendar size={14} className="text-slate-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha del Contrato</label>
                  <input
                    type="text"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                {(docType === 'reserva' || docType === 'compraventa') && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Importe Señal Reserva (€)</label>
                    <input
                      type="number"
                      value={importeReserva}
                      onChange={e => setImporteReserva(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>
                )}

                {docType === 'visita' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre del Agente / Asesor</label>
                      <input
                        type="text"
                        value={agenteNombre}
                        onChange={e => setAgenteNombre(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Comentarios de Visita</label>
                      <textarea
                        rows={2}
                        value={comentarios}
                        onChange={e => setComentarios(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        placeholder="Interés del cliente, observaciones..."
                      />
                    </div>
                  </>
                )}

                {docType === 'entrega_llaves' && (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Juegos Llaves Entregados</label>
                      <input
                        type="number"
                        value={juegosLlaves}
                        onChange={e => setJuegosLlaves(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Mandos Garaje Entregados</label>
                      <input
                        type="number"
                        value={mandosGaraje}
                        onChange={e => setMandosGaraje(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Lectura Agua</label>
                      <input
                        type="text"
                        value={lecturaAgua}
                        onChange={e => setLecturaAgua(e.target.value)}
                        placeholder="Ej: 004512 m³"
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Lectura Luz</label>
                      <input
                        type="text"
                        value={lecturaLuz}
                        onChange={e => setLecturaLuz(e.target.value)}
                        placeholder="Ej: 012490 kWh"
                        className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex flex-col gap-2.5 pt-3">
              <button
                onClick={handlePreview}
                disabled={isGenerating || !activeLead || !activeProperty}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                Previsualizar PDF en Pantalla
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleDownloadPDF}
                  disabled={!activeLead || !activeProperty}
                  className="py-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all border border-emerald-200 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download size={15} />
                  Descargar PDF
                </button>

                <button
                  onClick={handleDownloadDOCX}
                  disabled={!activeLead || !activeProperty}
                  className="py-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all border border-emerald-200 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileSpreadsheet size={15} />
                  Descargar Word
                </button>
              </div>

              <button
                onClick={handleRequestSignature}
                disabled={!activeLead || !activeProperty}
                className="w-full py-3 bg-emerald-900 hover:bg-emerald-950 active:bg-black text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PenLine size={16} />
                Enviar para Firma Digital Táctil
              </button>
            </div>

          </div>

          {/* PANEL DERECHO: VISTA PREVIA DEL PDF (5 cols) */}
          <div className="lg:col-span-5 bg-slate-100 p-6 flex flex-col justify-between min-h-[350px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-emerald-600" /> Vista Previa del Documento
              </span>
              {previewBlobUrl && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  PDF Renderizado
                </span>
              )}
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-300 overflow-hidden shadow-inner flex items-center justify-center relative min-h-[400px]">
              {previewBlobUrl ? (
                <iframe
                  src={previewBlobUrl}
                  className="w-full h-full border-0 rounded-xl"
                  title="Vista Previa PDF"
                />
              ) : (
                <div className="p-6 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600">Ninguna vista previa generada</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                      Selecciona un cliente y vivienda, luego presiona "Previsualizar PDF en Pantalla" para revisar antes de descargar.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {activeLead && activeProperty && (
              <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">{activeLead.name}</span>
                  <span className="text-slate-400 mx-1.5">|</span>
                  <span>Viv. Nº {activeProperty.numero_vivienda}</span>
                </div>
                <span className="font-bold text-emerald-600 font-mono">{activeProperty.precio?.toLocaleString('es-ES')} €</span>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL OVERLAY PARA COMPARTIR ENLACE DE FIRMA */}
      {shareUrl && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <PenLine size={28} />
            </div>

            <h3 className="text-lg font-bold text-center mb-1">Enlace de Firma Generado</h3>
            <p className="text-xs text-slate-400 text-center mb-6">
              El cliente puede abrir este enlace desde su teléfono móvil para revisar y firmar el contrato con el dedo.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center gap-2 mb-6">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="bg-transparent flex-1 text-xs text-emerald-400 font-mono outline-none truncate"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                {isCopied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={`https://wa.me/${activeLead?.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(`Hola ${activeLead?.name || ''}, te enviamos el contrato para su revisión y firma digital táctil: ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <span>Enviar por WhatsApp</span>
              </a>

              <button
                onClick={() => setShareUrl(null)}
                className="w-full py-2.5 text-slate-400 hover:text-white text-xs font-medium rounded-xl transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
