// src/pages/LeadDetail.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import type { Database } from '../types/supabase';

type Lead = Database['public']['Tables']['leads']['Row'];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchLeadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('*')
        .eq('id', id as string)
        .single();

      if (error) throw error;
      setLead(data);
    } catch (error: any) {
      console.error("Error cargando cliente:", error);
      setErrorMsg(error.message || 'No se pudo cargar la información del cliente.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchLeadData();
    }
  }, [id, fetchLeadData]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium">Cargando ficha del cliente...</p>
      </div>
    );
  }

  if (errorMsg || !lead) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-4 max-w-lg mx-auto my-12">
        <h3 className="text-lg font-bold text-slate-800">Cliente no encontrado</h3>
        <p className="text-sm text-slate-500">{errorMsg || 'No existe el registro solicitado.'}</p>
        <button
          onClick={() => navigate('/leads')}
          className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Volver a Clientes
        </button>
      </div>
    );
  }

  return (
    <LeadDetailModal
      lead={lead}
      isInline={true}
      onClose={() => navigate('/leads')}
      onUpdate={(deleted) => {
        if (deleted) navigate('/leads');
        else fetchLeadData();
      }}
    />
  );
}