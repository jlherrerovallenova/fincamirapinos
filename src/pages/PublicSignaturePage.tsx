// src/pages/PublicSignaturePage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  AlertCircle, 
  Building2, 
  Calendar, 
  User, 
  Download,
  Lock
} from 'lucide-react';
import { signatureService, type SignatureRequest } from '../services/signatureService';
import { generatePDF, formatEur } from '../utils/documentGenerator';
import { calculateDocumentHash, stampSignatureAndAudit } from '../utils/signatureEngine';
import SignaturePad from '../components/signature/SignaturePad';

export default function PublicSignaturePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<SignatureRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signedBlob, setSignedBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (token) {
      loadSignatureRequest(token);
    } else {
      setErrorMsg('Token de solicitud no proporcionado.');
      setLoading(false);
    }
  }, [token]);

  const loadSignatureRequest = async (t: string) => {
    setLoading(true);
    try {
      const data = await signatureService.getRequestByToken(t);
      if (!data) {
        setErrorMsg('La solicitud de firma no existe o ha expirado.');
      } else {
        setRequest(data);
        if (data.status === 'signed') {
          setIsSuccess(true);
        }
      }
    } catch (err: any) {
      setErrorMsg('Error al cargar la solicitud de firma: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignComplete = async (signatureBase64: string) => {
    if (!request || !token || !acceptedTerms) return;

    setIsSubmitting(true);
    try {
      // 1. Obtener IP pública del cliente
      let clientIp = '127.0.0.1';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          clientIp = ipData.ip;
        }
      } catch {
        // Fallback si bloquean apis de ip
      }

      const timestampIso = new Date().toISOString();
      const contractJson = JSON.stringify(request.contractData);

      // 2. Calcular Hash SHA-256 de integridad
      const hash = await calculateDocumentHash(contractJson, signatureBase64, timestampIso);

      // 3. Generar el PDF base
      let basePdfBlob: Blob;
      if (request.contractData.tipoDocumento === 'reserva') {
        basePdfBlob = await generatePDF(request.contractData, false);
      } else {
        basePdfBlob = await generatePDF(request.contractData, false);
      }

      // 4. Estampar firma y bloque de auditoría en el PDF
      const finalSignedBlob = await stampSignatureAndAudit(basePdfBlob, {
        signerName: request.contractData.comprador.nombre,
        signerDni: request.contractData.comprador.dni,
        signerIp: clientIp,
        signedAtIso: timestampIso,
        userAgent: navigator.userAgent,
        documentHash: hash,
        signatureImageBase64: signatureBase64
      });

      setSignedBlob(finalSignedBlob);

      // 5. Guardar firma en servicio y Supabase
      await signatureService.completeSignature(
        token,
        signatureBase64,
        clientIp,
        hash
      );

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error completando firma:', err);
      alert('Ocurrió un error al procesar la firma: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadSignedDoc = () => {
    if (!signedBlob || !request) return;
    const url = URL.createObjectURL(signedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contrato_Firmado_${request.contractData.comprador.nombre.replace(/\s+/g, '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="animate-spin text-emerald-400 mb-4" size={40} />
        <p className="text-slate-300 font-medium">Cargando pasarela de firma segura...</p>
      </div>
    );
  }

  if (errorMsg || !request) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-3xl p-8 text-center text-white shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">Solicitud No Disponible</h2>
          <p className="text-slate-400 text-sm mb-6">{errorMsg || 'La solicitud no se pudo encontrar.'}</p>
          <a
            href="https://mirapinos.es"
            className="inline-flex items-center justify-center px-6 py-3 bg-slate-700 hover:bg-slate-600 font-semibold rounded-xl transition-all"
          >
            Volver a Mirapinos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 font-sans">
      {/* Cabecera Corporativa */}
      <header className="w-full max-w-2xl bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wide text-base">FINCA MIRAPINOS</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Lock size={12} className="text-emerald-400" /> Pasarela de Firma Digital Segura
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold rounded-full">
          <ShieldCheck size={14} />
          <span>Cumplimiento eIDAS</span>
        </div>
      </header>

      {/* Pantalla de Éxito tras Firmar */}
      {isSuccess ? (
        <main className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">¡Documento Firmado con Éxito!</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            El contrato ha sido firmado digitalmente y respaldado con certificado de auditoría SHA-256 y sellado temporal.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-8 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Firmante:</span>
              <span className="font-bold text-slate-200">{request.contractData.comprador.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DNI:</span>
              <span className="font-bold text-slate-200">{request.contractData.comprador.dni}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estado:</span>
              <span className="font-bold text-emerald-400">FIRMADO Y CERTIFICADO</span>
            </div>
          </div>

          {signedBlob && (
            <button
              onClick={downloadSignedDoc}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <Download size={20} />
              Descargar Copia Firmada en PDF
            </button>
          )}
        </main>
      ) : (
        /* Formulario de Lectura y Firma */
        <main className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
          {/* Resumen del Contrato */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <FileText size={18} />
                <span>{request.contractData.tipoDocumento.toUpperCase()} DE VIVIENDA</span>
              </div>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar size={12} /> {request.contractData.fecha}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500 font-medium mb-1 flex items-center gap-1">
                  <User size={13} /> Comprador Principal
                </p>
                <p className="font-bold text-slate-200 text-sm">{request.contractData.comprador.nombre}</p>
                <p className="text-slate-400">DNI: {request.contractData.comprador.dni}</p>
              </div>

              <div>
                <p className="text-slate-500 font-medium mb-1 flex items-center gap-1">
                  <Building2 size={13} /> Inmueble Objeto
                </p>
                <p className="font-bold text-slate-200 text-sm">Vivienda Nº {request.contractData.propiedad.numeroVivienda}</p>
                <p className="text-slate-400">Precio: {formatEur(request.contractData.propiedad.precio)}</p>
              </div>
            </div>
          </div>

          {/* Cláusula de Conformidad */}
          <label className="flex items-start gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
            />
            <span className="text-xs text-slate-300 leading-relaxed">
              He leído y acepto los términos del contrato presentado, así como el tratamiento de mi firma táctil e identificación IP para la certificación digital del documento.
            </span>
          </label>

          {/* Lienzo de Firma */}
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-slate-200 text-sm">Firma táctil sobre la pantalla:</h3>
            <SignaturePad
              onSave={handleSignComplete}
              disabled={!acceptedTerms || isSubmitting}
            />
          </div>

          {isSubmitting && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold pt-2">
              <Loader2 className="animate-spin" size={18} />
              <span>Estampando firma y sellando certificado SHA-256...</span>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
