// src/pages/Settings.tsx
import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  FolderOpen,
  Copy,
  FileText,
  Download,
  X
} from 'lucide-react';
import ProfileTab from '../components/settings/ProfileTab';
import IntegrationsTab from '../components/settings/IntegrationsTab';
import DocumentsTab from '../components/settings/DocumentsTab';
import ClonePropertyTab from '../components/settings/ClonePropertyTab';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'integrations' | 'clone_property'>('profile');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* CABECERA DE PÁGINA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <SettingsIcon size={36} className="text-[#006c4a]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Configuración del Sistema</h2>
            <p className="text-slate-500 text-xs font-semibold mt-1">Ajustes del perfil, integraciones, plantillas de documentos y base de datos.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navegación Lateral (Sidebar) */}
        <div className="w-full md:w-56 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'profile'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <UserIcon size={16} />
            <span className="font-medium">Mi Perfil</span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'documents'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <FolderOpen size={16} />
            <span className="font-medium">Documentos Venta</span>
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'integrations'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <SettingsIcon size={16} />
            <span className="font-medium">Integraciones</span>
          </button>
          <button
            onClick={() => setActiveTab('clone_property')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'clone_property'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'hover:bg-slate-100 text-slate-600'
              }`}
          >
            <Copy size={16} />
            <span className="font-medium">Clonar Propiedad</span>
          </button>
        </div>

        {/* Panel de Contenido */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'documents' && <DocumentsTab onPreview={(url) => setPreviewUrl(url)} />}
          {activeTab === 'clone_property' && <ClonePropertyTab />}
        </div>
      </div>

      {/* MODAL DE VISTA PREVIA */}
      {previewUrl && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <FileText className="text-emerald-600" size={20} />
                <span className="text-sm font-bold text-slate-700">Visor de Documentación</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  <Download size={14} /> Abrir Externa
                </a>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative">
              <iframe
                src={previewUrl}
                className="w-full h-full border-none shadow-inner"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;