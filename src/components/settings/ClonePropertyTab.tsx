// src/components/settings/ClonePropertyTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Copy,
  Home,
  Hash,
  Maximize,
  Ruler,
  Euro,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useDialog } from '../../context/DialogContext';

export const ClonePropertyTab: React.FC = () => {
  const { showAlert } = useDialog();

  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [cloneFormData, setCloneFormData] = useState({
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
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    fetchInventoryForCloning();
  }, []);

  const fetchInventoryForCloning = async () => {
    try {
      setLoadingInventory(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('numero_vivienda', { ascending: true });

      if (error) throw error;
      setInventoryList(data || []);
    } catch (err) {
      console.error('Error fetching inventory for clone:', err);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleSelectSourceProperty = (id: string) => {
    setSelectedSourceId(id);
    const source = inventoryList.find(item => item.id.toString() === id);
    if (source) {
      setCloneFormData({
        modelo: source.modelo || '1. OLIVO',
        numero_vivienda: '',
        superficie_parcela: source.superficie_parcela?.toString() || '',
        superficie_util: source.superficie_util?.toString() || '',
        superficie_construida: source.superficie_construida?.toString() || '',
        habitaciones: source.habitaciones?.toString() || '',
        banos: source.banos?.toString() || '',
        precio: source.precio?.toString() || '',
        estado_vivienda: 'DISPONIBLE'
      });
    }
  };

  const handleExecuteClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneFormData.numero_vivienda.trim()) {
      await showAlert({ title: 'Campo Obligatorio', message: 'Por favor introduce el número de la nueva vivienda.' });
      return;
    }

    setIsCloning(true);
    try {
      const parseEuro = (val: string) => parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;

      const propertyData = {
        modelo: cloneFormData.modelo,
        numero_vivienda: cloneFormData.numero_vivienda.trim(),
        superficie_parcela: parseEuro(cloneFormData.superficie_parcela),
        superficie_util: parseEuro(cloneFormData.superficie_util),
        superficie_construida: parseEuro(cloneFormData.superficie_construida),
        habitaciones: parseInt(cloneFormData.habitaciones) || 0,
        banos: parseInt(cloneFormData.banos) || 0,
        precio: parseEuro(cloneFormData.precio),
        estado_vivienda: cloneFormData.estado_vivienda
      };

      const { error: insertError } = await (supabase as any)
        .from('inventory')
        .insert([propertyData]);

      if (insertError) {
        if (insertError.code === '23505') {
          await showAlert({
            title: 'Vivienda Duplicada',
            message: `Ya existe una vivienda con el número ${propertyData.numero_vivienda} para el modelo ${propertyData.modelo}.`
          });
          return;
        }
        throw insertError;
      }

      await showAlert({
        title: '¡Vivienda Clonada!',
        message: `La vivienda nº ${propertyData.numero_vivienda} (${propertyData.modelo}) ha sido creada con éxito en el inventario.`
      });

      fetchInventoryForCloning();
      setSelectedSourceId('');
      setCloneFormData({
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
    } catch (error: any) {
      console.error('Error clonando propiedad:', error);
      await showAlert({ title: 'Error', message: 'No se pudo clonar la propiedad: ' + (error.message || 'Error desconocido') });
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <div className="border-b pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Clonar Propiedad / Vivienda</h2>
          <p className="text-xs text-slate-500">Herramienta de configuración para duplicar las características de un activo del inventario y crear uno nuevo.</p>
        </div>
        <div className="w-10 h-10 bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-2xl flex items-center justify-center font-bold shadow-sm">
          <Copy size={20} />
        </div>
      </div>

      {loadingInventory ? (
        <div className="py-12 text-center">
          <Loader2 className="animate-spin mx-auto text-emerald-600 mb-2" size={28} />
          <p className="text-xs font-semibold text-slate-500">Cargando catálogo de inventario...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">1. Seleccionar Vivienda de Origen a Clonar</label>
            <div className="relative">
              <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedSourceId}
                onChange={(e) => handleSelectSourceProperty(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer text-sm"
              >
                <option value="">-- Selecciona una vivienda del inventario --</option>
                {inventoryList.map(prop => (
                  <option key={prop.id} value={prop.id}>
                    Vivienda Nº {prop.numero_vivienda} - {prop.modelo} ({prop.precio ? `${prop.precio} €` : 'Sin precio'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedSourceId && (
            <form onSubmit={handleExecuteClone} className="space-y-6 pt-2">
              <div className="bg-emerald-50/80 border border-emerald-200/80 p-4 rounded-2xl">
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  Copiando características de la vivienda seleccionada. Introduce el número de la nueva vivienda a crear.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Nº Nueva Vivienda <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      value={cloneFormData.numero_vivienda}
                      onChange={(e) => setCloneFormData(prev => ({ ...prev, numero_vivienda: e.target.value }))}
                      placeholder="Ej: 15B"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-900 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Modelo</label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      value={cloneFormData.modelo}
                      onChange={(e) => setCloneFormData(prev => ({ ...prev, modelo: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800 outline-none cursor-pointer text-sm transition-all"
                    >
                      <option value="1. OLIVO">1. OLIVO</option>
                      <option value="2. ARCE">2. ARCE</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Superficie Parcela (m²)</label>
                  <div className="relative">
                    <Maximize className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="number"
                      step="any"
                      value={cloneFormData.superficie_parcela}
                      onChange={(e) => setCloneFormData(prev => ({ ...prev, superficie_parcela: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-900 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Superficie Útil (m²)</label>
                  <div className="relative">
                    <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="number"
                      step="any"
                      value={cloneFormData.superficie_util}
                      onChange={(e) => setCloneFormData(prev => ({ ...prev, superficie_util: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-900 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Superficie Construida (m²)</label>
                  <div className="relative">
                    <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="number"
                      step="any"
                      value={cloneFormData.superficie_construida}
                      onChange={(e) => setCloneFormData(prev => ({ ...prev, superficie_construida: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-900 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Habitaciones</label>
                    <input
                      type="number"
                      value={cloneFormData.habitaciones}
                      onChange={(e) => setCloneFormData(prev => ({ ...prev, habitaciones: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-900 outline-none text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Baños</label>
                    <input
                      type="number"
                      value={cloneFormData.banos}
                      onChange={(e) => setCloneFormData(prev => ({ ...prev, banos: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-900 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Precio (€)</label>
                  <div className="relative">
                    <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="number"
                      step="any"
                      value={cloneFormData.precio}
                      onChange={(e) => setCloneFormData(prev => ({ ...prev, precio: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-900 outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Estado de la Vivienda</label>
                  <select
                    value={cloneFormData.estado_vivienda}
                    onChange={(e) => setCloneFormData(prev => ({ ...prev, estado_vivienda: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800 outline-none cursor-pointer text-sm transition-all"
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

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isCloning}
                  className="px-8 py-3 bg-[#006c4a] text-white font-bold rounded-xl shadow-md hover:bg-[#005137] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm"
                >
                  {isCloning ? <Loader2 className="animate-spin" size={18} /> : <Copy size={18} />}
                  <span>Clonar y Crear Vivienda</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default ClonePropertyTab;
