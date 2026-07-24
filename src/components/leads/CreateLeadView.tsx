// src/components/leads/CreateLeadView.tsx
import { useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useCreateLead } from '../../hooks/useLeads';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateLeadView({ onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const createMutation = useCreateLead();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Web'
  });

  const loading = createMutation.isPending;

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isValidPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 9;
  };

  const checkDuplicates = async (email: string, phone: string) => {
    if (!email && !phone) return false;
    try {
      if (email) {
        const { data, error } = await (supabase as any).from('leads').select('id').eq('email', email).limit(1);
        if (!error && data && data.length > 0) return true;
      }
      if (phone) {
        const { data, error } = await (supabase as any).from('leads').select('id').eq('phone', phone).limit(1);
        if (!error && data && data.length > 0) return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (!user?.id) throw new Error('Sesión de usuario no detectada.');
      if (!formData.name.trim()) throw new Error('El nombre es obligatorio.');

      if (formData.email && !isValidEmail(formData.email)) {
        throw new Error('El formato del correo electrónico no es válido.');
      }

      if (formData.phone && !isValidPhone(formData.phone)) {
        throw new Error('El teléfono debe tener al menos 9 dígitos.');
      }

      const isDuplicate = await checkDuplicates(formData.email, formData.phone);
      if (isDuplicate) {
        throw new Error('Ya existe un cliente registrado con este email o teléfono.');
      }

      const payload: any = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        source: formData.source,
        status: 'new',
        assigned_to: user.id
      };

      createMutation.mutate(payload, {
        onSuccess: () => {
          setFormData({ name: '', email: '', phone: '', source: 'Web' });
          onSuccess();
          onClose();
        },
        onError: (err: any) => {
          setErrorMsg(err.message || 'Error al guardar el cliente.');
        }
      });

    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-300">
      {/* Cabecera con botón Volver */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all flex items-center gap-1 text-sm font-semibold"
            title="Volver a la lista"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Dar de alta Nuevo Cliente</h2>
              <p className="text-xs text-slate-500">Rellena los datos para añadirlo a la base de datos</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-w-3xl">
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-3 animate-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-900"
              placeholder="Ej. Juan Pérez"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900"
                placeholder="juan@ejemplo.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-900"
                placeholder="600 000 000"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Canal de Origen
            </label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800 cursor-pointer font-medium"
              value={formData.source}
              onChange={e => setFormData({ ...formData, source: e.target.value })}
            >
              <option value="Idealista">Idealista</option>
              <option value="Web">Web</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Referido">Referido</option>
              <option value="Llamada">Llamada</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm text-center"
          >
            Cancelar y Volver
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Guardar Cliente</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
