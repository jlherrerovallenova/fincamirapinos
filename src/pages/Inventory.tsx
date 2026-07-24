// src/pages/Inventory.tsx
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Home,
  BedDouble,
  Bath,
  AlertTriangle,
  Filter,
  Copy,
  FileText,
  Trees,
  Leaf,
  Compass
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import CreatePropertyModal from '../components/inventory/CreatePropertyModal';
import { useDialog } from '../context/DialogContext';

interface Property {
  id: number;
  modelo: string;
  numero_vivienda: string;
  superficie_parcela: number | null;
  superficie_util: number | null;
  superficie_construida: number | null;
  habitaciones: number | null;
  banos: number | null;
  precio: number | null;
  estado_vivienda?: string | null;
  created_at: string;
}

export default function Inventory() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const { showAlert } = useDialog();

  // Estados para el nuevo modal de confirmación de borrado
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('numero_vivienda', { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!propertyToDelete || isDeleting) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', propertyToDelete.id);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== propertyToDelete.id));
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Error deleting property:', error);
      await showAlert({ title: 'Error', message: 'Error al intentar eliminar el registro.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClone = (property: Property) => {
    // Para clonar, pasamos los datos pero SIN el ID
    const { id, created_at, ...cloneData } = property;
    setEditingProperty(cloneData as any);
    setIsModalOpen(true);
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.modelo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.numero_vivienda.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === '' || p.estado_vivienda === stateFilter;
    return matchesSearch && matchesState;
  });

  const handleExportPDF = async () => {
    if (filteredProperties.length === 0) return;

    try {
      setIsExporting(true);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Función para cargar imagen de forma asíncrona y convertirla a base64 preservando calidad y fondo
      const getBase64Image = (url: string): Promise<{ data: string, width: number, height: number } | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // 1. Rellenar con blanco (para PNGs transparentes)
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              // 2. Dibujar imagen
              ctx.drawImage(img, 0, 0);
              // 3. Exportar como JPEG (máxima compatibilidad)
              const dataURL = canvas.toDataURL('image/jpeg', 0.95);
              resolve({ data: dataURL, width: img.width, height: img.height });
            } else {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      const logoInfo = await getBase64Image('/logo-mirapinos.png');
      
      // Función para añadir cabecera premium
      const addHeader = () => {
        // Franja superior blanca para el logotipo
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 297, 20, 'F');
        
        // Líneas decorativas inferiores
        doc.setFillColor(15, 23, 42); // Slate-900
        doc.rect(0, 20, 297, 0.5, 'F');
        
        doc.setFillColor(16, 185, 129); // Emerald-500
        doc.rect(0, 20.5, 297, 1.5, 'F');

        // Logo si existe
        if (logoInfo) {
          const targetHeight = 10; // Altura fija deseada en mm
          const aspectRatio = logoInfo.width / logoInfo.height;
          const targetWidth = targetHeight * aspectRatio;
          
          // Centrado vertical en la franja de 20mm
          doc.addImage(logoInfo.data, 'JPEG', 14, (20 - targetHeight) / 2, targetWidth, targetHeight);
        } else {
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(10);
          doc.text('MIRAPINOS', 14, 12);
        }

        // Título y Subtítulo
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('CATÁLOGO DE VIVIENDAS', 14, 30);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const statusText = stateFilter === '' ? 'TODOS LOS ESTADOS' : stateFilter.toUpperCase();
        doc.text(`INVENTARIO ACTUAL - MODO: ${statusText}`, 14, 37);

        // Fecha y página (derecha)
        doc.setFontSize(9);
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 240, 30);
        doc.text(`Total registros: ${filteredProperties.length}`, 240, 35);
      };

      addHeader();

    // Preparar datos
    const tableColumn = ["№", "MODELO", "PARCELA", "ÚTIL", "CONST.", "HAB/BAÑOS", "PRECIO", "ESTADO"];
    const tableRows = filteredProperties.map(p => [
      p.numero_vivienda,
      p.modelo,
      `${p.superficie_parcela} m²`,
      `${p.superficie_util} m²`,
      `${p.superficie_construida} m²`,
      `${p.habitaciones} / ${p.banos}`,
      new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(p.precio || 0),
      (p.estado_vivienda || 'DISPONIBLE').toUpperCase()
    ]);

    // Generar tabla con estilo corporativo
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      headStyles: { 
        fillColor: [16, 185, 129], 
        textColor: 255, 
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 10,
        cellPadding: 4,
        valign: 'middle'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 15 },
        1: { fontStyle: 'bold', cellWidth: 35 },
        6: { fontStyle: 'bold', halign: 'right', textColor: [15, 23, 42] },
        7: { halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        // Colorear celda de estado
        if (data.section === 'body' && data.column.index === 7) {
          const status = data.cell.raw as string;
          if (status === 'DISPONIBLE') data.cell.styles.textColor = [16, 185, 129];
          if (status === 'RESERVADA') data.cell.styles.textColor = [245, 158, 11];
          if (['BLOQUEADA', 'NO DISPONIBLE'].includes(status)) data.cell.styles.textColor = [239, 68, 68];
        }
      }
    });

    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, 270, 200);
    }

    // Generar el PDF y abrirlo en una nueva pestaña (más fiable para depuración y visualización)
    const pdfOutput = doc.output('bloburl');
    window.open(pdfOutput, '_blank', 'noopener,noreferrer');
    
    // También guardarlo por si el usuario lo prefiere
    doc.save(`listado_viviendas_${stateFilter || 'todas'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      await showAlert({ 
        title: 'Error de Exportación', 
        message: 'No se pudo generar el documento PDF correctamente.' 
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isModalOpen ? (
        <CreatePropertyModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProperty(null);
          }}
          onSuccess={() => {
            fetchProperties();
            setIsModalOpen(false);
            setEditingProperty(null);
          }}
          initialData={editingProperty}
          isInline={true}
        />
      ) : (
        <>
          {/* CABECERA DE PÁGINA */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                <Home size={36} className="text-[#006c4a]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Viviendas</h2>
                <p className="text-slate-500 text-xs font-semibold mt-1">Gestión profesional del catálogo de activos, modelos y planos.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
              <button
                onClick={handleExportPDF}
                disabled={loading || isExporting || filteredProperties.length === 0}
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-3 rounded-2xl font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 min-w-[150px]"
                title="Descargar Listado PDF"
              >
                {isExporting ? <Loader2 className="animate-spin text-emerald-600" size={20} /> : <FileText size={20} className="text-red-500" />}
                {isExporting ? 'Generando...' : 'Exportar PDF'}
              </button>
              <button
                onClick={() => {
                  setEditingProperty(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-[#006c4a] text-white hover:bg-[#005137] px-6 py-3 rounded-2xl font-bold shadow-md shadow-emerald-900/10 transition-all active:scale-95"
              >
                <Plus size={20} />
                Nueva Propiedad
              </button>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por modelo o nº vivienda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <Filter size={16} className="text-slate-400 shrink-0 ml-2" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Estado:</span>
              <button
                onClick={() => setStateFilter('')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  stateFilter === '' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({properties.length})
              </button>
              {['DISPONIBLE', 'RESERVADA', 'BLOQUEADA', 'CONTRATO CV', 'ESCRITURADA', 'NO DISPONIBLE'].map((st) => {
                const count = properties.filter(p => p.estado_vivienda === st).length;
                if (count === 0 && stateFilter !== st) return null;
                return (
                  <button
                    key={st}
                    onClick={() => setStateFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      stateFilter === st ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* TABLA DE PROPIEDADES */}
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
              <Loader2 className="animate-spin mx-auto text-emerald-600 mb-4" size={32} />
              <p className="text-slate-500 font-medium text-sm">Cargando catálogo de inventario...</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
              <Home className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-lg font-bold text-slate-800">No se encontraron viviendas</h3>
              <p className="text-slate-500 text-xs font-medium mt-1">Prueba a ajustar los criterios de búsqueda o añade una nueva propiedad.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-4 px-6 text-center">Nº Vivienda</th>
                      <th className="py-4 px-6 text-center">Modelo</th>
                      <th className="py-4 px-6 text-center">Superficie Parcela</th>
                      <th className="py-4 px-6 text-center">Sup. Útil / Constr.</th>
                      <th className="py-4 px-6 text-center">Hab / Baños</th>
                      <th className="py-4 px-6 text-center">Precio</th>
                      <th className="py-4 px-6 text-center">Estado</th>
                      <th className="py-4 px-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredProperties.map((property) => (
                      <tr key={property.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-4 px-6 font-bold text-slate-900 text-center">
                          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-black text-xs">
                            {property.numero_vivienda}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                            property.modelo.toUpperCase().includes('OLIVO')
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                              : property.modelo.toUpperCase().includes('ARCE')
                                ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                                : 'bg-blue-50 text-blue-800 border border-blue-200/80'
                          }`}>
                            {property.modelo.toUpperCase().includes('OLIVO') ? (
                              <Trees size={15} className="text-emerald-600 shrink-0" />
                            ) : property.modelo.toUpperCase().includes('ARCE') ? (
                              <Leaf size={15} className="text-amber-600 shrink-0" />
                            ) : (
                              <Compass size={15} className="text-blue-600 shrink-0" />
                            )}
                            <span>{property.modelo}</span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-medium text-center">{property.superficie_parcela ? `${property.superficie_parcela} m²` : '-'}</td>
                        <td className="py-4 px-6 text-slate-600 font-medium text-center">
                          {property.superficie_util ? `${property.superficie_util} m²` : '-'} / {property.superficie_construida ? `${property.superficie_construida} m²` : '-'}
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-medium text-center">
                          <div className="flex items-center justify-center gap-3">
                            <span className="flex items-center gap-1 text-slate-700 font-semibold"><BedDouble size={15} className="text-slate-400" /> {property.habitaciones || 0}</span>
                            <span className="flex items-center gap-1 text-slate-700 font-semibold"><Bath size={15} className="text-slate-400" /> {property.banos || 0}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900 text-center">
                          {property.precio ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(property.precio) : '-'}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            property.estado_vivienda === 'DISPONIBLE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                            property.estado_vivienda === 'RESERVADA' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                            property.estado_vivienda === 'BLOQUEADA' || property.estado_vivienda === 'NO DISPONIBLE' ? 'bg-red-50 text-red-700 border border-red-200/60' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {property.estado_vivienda || 'DISPONIBLE'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-90 group-hover:opacity-100">
                            <button
                              onClick={() => {
                                setEditingProperty(property);
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Editar propiedad"
                            >
                              <Edit2 size={17} />
                            </button>
                            <button
                              onClick={() => setPropertyToDelete(property)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Eliminar propiedad"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* CONFIRMACIÓN DE BORRADO */}
      {propertyToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¿Eliminar vivienda?</h3>
              <p className="text-slate-500 font-medium mb-8">
                Estás a punto de borrar la vivienda <span className="text-slate-900 font-bold">{propertyToDelete.numero_vivienda}</span> (Modelo {propertyToDelete.modelo}). Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPropertyToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={20} /> : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}