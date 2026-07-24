// src/components/leads/ExportLeadsModal.tsx
import { useState } from 'react';
import { X, FileText, Loader2, Calendar } from 'lucide-react'; // Cambiado icono a FileText
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDialog } from '../../context/DialogContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean;
}

export default function ExportLeadsModal({ isOpen, onClose, isInline = true }: Props) {
  const [loading, setLoading] = useState(false);
  const { showAlert } = useDialog();
  const [filterType, setFilterType] = useState<'all' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .order('source', { ascending: true })
        .order('created_at', { ascending: false });

      if (filterType === 'month' && selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString();
        const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString();

        query = query.gte('created_at', startDate).lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        await showAlert({ title: 'Aviso', message: 'No hay datos para exportar en el periodo seleccionado.' });
        setLoading(false);
        return;
      }

      generatePDF(data);
      onClose();

    } catch (error) {
      console.error('Error exportando:', error);
      await showAlert({ title: 'Error', message: 'Hubo un error al exportar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (data: any[]) => {
    const doc = new jsPDF({ orientation: 'landscape' });

    const title = 'Listado de Clientes - MIRAPINOS';
    const subtitle = filterType === 'month'
      ? `Filtrado por mes: ${selectedMonth}`
      : 'Histórico completo';

    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-ES')}`, 14, 36);

    const tableColumn = ["Nombre", "Email", "Teléfono", "Origen", "Estado", "Fecha Alta"];
    const tableRows: any[] = [];

    data.forEach(lead => {
      const leadData = [
        lead.name || 'Sin nombre',
        lead.email || '',
        lead.phone || '',
        lead.source || 'Desconocido',
        lead.status?.toUpperCase() || 'NUEVO',
        new Date(lead.created_at).toLocaleDateString('es-ES'),
      ];
      tableRows.push(leadData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        4: { fontStyle: 'bold', textColor: [80, 80, 80] }
      },
    });

    const fileName = `leads_mirapinos_${filterType === 'month' ? selectedMonth : 'todos'}.pdf`;
    doc.save(fileName);
  };

  const content = (
    <div className="bg-white w-full rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-200 mb-6">
      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText className="text-red-600" size={20} />
          Exportar Clientes a PDF
        </h2>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6 max-w-xl">
        <p className="text-sm text-slate-600">
          Selecciona el rango de fechas. Se generará un documento <strong>PDF</strong> clasificado por Origen.
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="radio"
              name="filter"
              checked={filterType === 'all'}
              onChange={() => setFilterType('all')}
              className="text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-bold text-slate-700">Exportar todo el histórico</span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="filter"
                checked={filterType === 'month'}
                onChange={() => setFilterType('month')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-bold text-slate-700">Filtrar por mes</span>
            </label>
            <div className="flex-1 flex justify-start sm:justify-end">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <Calendar size={14} className="text-slate-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  disabled={filterType !== 'month'}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs bg-transparent border-none p-0 focus:ring-0 text-slate-600 font-medium disabled:opacity-50 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-xs text-center"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl shadow-md hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md">
        {content}
      </div>
    </div>
  );
}