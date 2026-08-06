// src/components/settings/ProfileTab.tsx
import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

export const ProfileTab: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { showAlert } = useDialog();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!profile?.id) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      await showAlert({ title: 'Éxito', message: 'Perfil actualizado correctamente' });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      await showAlert({ title: 'Error', message: 'No se pudo actualizar el perfil' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <div className="border-b pb-2">
        <h2 className="text-lg font-semibold text-slate-800">Información Personal</h2>
        <p className="text-xs text-slate-500">Actualiza tus datos de contacto y visualización.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase">Nombre Completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            placeholder="Tu nombre"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase">Rol Asignado</label>
          <div className="p-2.5 text-sm bg-slate-50 border rounded-lg text-slate-500 italic">
            {profile?.role || 'Cargando...'}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={handleUpdateProfile}
          disabled={isSavingProfile}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

export default ProfileTab;
