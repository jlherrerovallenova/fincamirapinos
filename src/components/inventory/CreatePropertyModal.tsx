// src/components/inventory/CreatePropertyModal.tsx
import React, { useState } from 'react';
import {
  X,
  Home,
  Hash,
  Maximize,
  Ruler,
  BedDouble,
  Bath,
  Euro,
  Loader2,
  Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
  isInline?: boolean;
}

export default function CreatePropertyModal({ isOpen, onClose, onSuccess, initialData, isInline = true }: Props) {
  const [loading, setLoading] = useState(false);
  const { showAlert } = useDialog();
  const [formData, setFormData] = useState({
    modelo: initialData?.modelo || '1. OLIVO',
    numero_vivienda: initialData?.numero_vivienda || '',
    superficie_parcela: initialData?.superficie_parcela || '',
    superficie_util: initialData?.superficie_util || '',
    superficie_construida: initialData?.superficie_construida || '',
    habitaciones: initialData?.habitaciones?.toString() || '',
    banos: initialData?.banos?.toString() || '',
    precio: initialData?.precio?.toString() || '',
    estado_vivienda: initialData?.estado_vivienda || 'DISPONIBLE'
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const propertyData = {
        modelo: formData.modelo,
        numero_vivienda: formData.numero_vivienda.trim(),
        superficie_parcela: parseFloat(formData.superficie_parcela) || 0,
        superficie_util: parseFloat(formData.superficie_util) || 0,
        superficie_construida: parseFloat(formData.superficie_construida) || 0,
        habitaciones: parseInt(formData.habitaciones) || 0,
        banos: parseInt(formData.banos) || 0,
        precio: parseFloat(formData.precio) || 0,
        estado_vivienda: formData.estado_vivienda
      };

      let query = supabase
        .from('inventory')
        .select('id')
        .eq('modelo', propertyData.modelo)
        .eq('numero_vivienda', propertyData.numero_vivienda);

      if (initialData?.id) {
        query = query.neq('id', initialData.id);
      }

      const { data: existing, error: checkError } = await query;

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        await showAlert({ 
          title: 'Vivienda Duplicada', 
          message: `Ya existe una vivienda con el número ${propertyData.numero_vivienda} para el modelo ${propertyData.modelo}.` 
        });
        setLoading(false);
        return;
      }

      if (initialData?.id) {
        const { error } = await (supabase as any)
          .from('inventory')
          .update(propertyData)
          .eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('inventory')
          .insert([propertyData]);
        if (error) throw error;
      }

      onSuccess?.();
      onClose();

      if (!initialData?.id) {
        setFormData({
          modelo: '1. OLIVO',
          numero_vivienda: '',
          superficie_parcela: '',
          superficie_util: '',
          superficie_construida: '',
          habitaciones: '',
          banos: '',
          precio: '',
          estado_vivienda: 'DISPONIBLE'
        });
      }
    } catch (error: any) {
      console.error('Error saving property:', error);
      await showAlert({ title: 'Error', message: 'Error al guardar la propiedad: ' + (error.message || 'Error desconocido') });
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="bg-white w-full rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-300">
      {/* Header Claro */}
      <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-2xl flex items-center justify-center shadow-sm">
            <Home size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">{initialData?.id ? 'Editar Propiedad' : 'Nueva Propiedad'}</h3>
            <p className="text-xs text-slate-500 font-semibold">Datos técnicos del activo en Mirapinos</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all p-2 rounded-xl flex items-center gap-1 text-sm font-semibold"
          title="Volver"
        >
          <X size={22} />
          <span className="hidden sm:inline">Volver</span>
        </button>
      </div>

      {/* Body */}
      <div className="p-6 sm:p-8 bg-white max-w-4xl">
        <form id="property-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 1. MODELO */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo</label>
              <div className="relative mt-1.5">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold appearance-none cursor-pointer text-slate-800 transition-all"
                >
                  <option value="1. OLIVO">1. OLIVO</option>
                  <option value="2. ARCE">2. ARCE</option>
                </select>
              </div>
            </div>

            {/* 2. Nº DE VIVIENDA */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº de Vivienda</label>
              <div className="relative mt-1.5">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="numero_vivienda"
                  required
                  value={formData.numero_vivienda}
                  onChange={handleChange}
                  placeholder="Ej: 14A"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-medium text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* 3. SUPERFICIE PARCELA */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Superficie Parcela (m²)</label>
              <div className="relative mt-1.5">
                <Maximize className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="superficie_parcela"
                  type="number"
                  step="any"
                  required
                  value={formData.superficie_parcela}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* 4. SUPERFICIE UTIL */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Superficie Útil (m²)</label>
              <div className="relative mt-1.5">
                <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="superficie_util"
                  type="number"
                  step="any"
                  required
                  value={formData.superficie_util}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* 5. SUPERFICIE CONSTRUIDA */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Superficie Construida (m²)</label>
              <div className="relative mt-1.5">
                <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="superficie_construida"
                  type="number"
                  step="any"
                  required
                  value={formData.superficie_construida}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* 6. HABITACIONES */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Habitaciones</label>
              <div className="relative mt-1.5">
                <BedDouble className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="habitaciones"
                  type="number"
                  required
                  value={formData.habitaciones}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* 7. BAÑOS */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Baños</label>
              <div className="relative mt-1.5">
                <Bath className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="banos"
                  type="number"
                  required
                  value={formData.banos}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* 8. PRECIO */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio (€)</label>
              <div className="relative mt-1.5">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="precio"
                  type="number"
                  step="any"
                  required
                  value={formData.precio}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* 9. ESTADO VIVIENDA */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado de la Vivienda</label>
              <div className="relative mt-2">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  name="estado_vivienda"
                  value={formData.estado_vivienda}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold appearance-none cursor-pointer text-slate-800 transition-all"
                >
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  <option value="NO DISPONIBLE">NO DISPONIBLE</option>
                  <option value="BLOQUEADA">BLOQUEADA</option>
                  <option value="RESERVADA">RESERVADA</option>
                  <option value="CONTRATO CV">CONTRATO CV</option>
                  <option value="ESCRITURADA">ESCRITURADA</option>
                </select>
              </div>
            </div>

          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all text-sm text-center"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 bg-[#006c4a] text-white font-bold rounded-xl shadow-md hover:bg-[#005137] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Guardar Propiedad
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (isInline) return content;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {content}
      </div>
    </div>
  );
}