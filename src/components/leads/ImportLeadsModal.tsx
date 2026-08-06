import { useState, useRef } from 'react';
import { X, Loader2, AlertCircle, Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ExcelJS from 'exceljs';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isInline?: boolean;
}

interface ParsedRow {
    NOMBRE?: string;
    EMAIL?: string;
    TELEFONO?: string;
    'NOTAS INTERNAS'?: string;
    ALTA?: string;
    ORIGEN?: string;
    [key: string]: any;
}

export default function ImportLeadsModal({ isOpen, onClose, onSuccess, isInline = false }: Props) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [fileName, setFileName] = useState<string>('');

    if (!isOpen) return null;

    const resetState = () => {
        setStep(1);
        setLoading(false);
        setErrorMsg(null);
        setParsedData([]);
        setFileName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const parseCSVLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setErrorMsg(null);

        const isCSV = file.name.toLowerCase().endsWith('.csv');

        if (isCSV) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target?.result as string;
                    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

                    if (lines.length < 2) {
                        throw new Error('El archivo CSV esta vacio o no contiene datos.');
                    }

                    const headers = parseCSVLine(lines[0]).map(h => h.toUpperCase());
                    const data: ParsedRow[] = [];
                    for (let i = 1; i < lines.length; i++) {
                        const values = parseCSVLine(lines[i]);
                        const rowData: any = {};

                        headers.forEach((header, index) => {
                            rowData[header] = values[index] !== undefined ? values[index] : '';
                        });

                        if (rowData['NOMBRE']) {
                            data.push(rowData);
                        }
                    }

                    if (data.length === 0) {
                        throw new Error('No se encontraron registros validos para importar.');
                    }

                    setParsedData(data);
                    setStep(2);
                } catch (err: any) {
                    setErrorMsg(err.message || 'Error al procesar el archivo CSV.');
                }
            };
            reader.onerror = () => {
                setErrorMsg('Error de lectura del archivo.');
            };
            reader.readAsText(file, 'UTF-8');
        } else {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const buffer = event.target?.result as ArrayBuffer;
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.load(buffer);

                    const worksheet = workbook.worksheets[0];
                    if (!worksheet) throw new Error('El archivo Excel no contiene hojas.');

                    const headerRow = worksheet.getRow(1);
                    const headers: string[] = [];
                    headerRow.eachCell({ includeEmpty: true }, (cell) => {
                        headers.push(String(cell.value ?? '').toUpperCase());
                    });

                    const dataWithNames: ParsedRow[] = [];
                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber === 1) return;
                        const newRow: any = {};
                        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                            const header = headers[colNumber - 1];
                            if (header) {
                                newRow[header] = cell.value !== null && cell.value !== undefined
                                    ? String(cell.value)
                                    : '';
                            }
                        });
                        if (newRow['NOMBRE']) {
                            dataWithNames.push(newRow);
                        }
                    });

                    if (dataWithNames.length === 0) {
                        throw new Error('No se encontraron registros validos para importar (falta columna NOMBRE o esta vacia).');
                    }

                    setParsedData(dataWithNames);
                    setStep(2);
                } catch (err: any) {
                    setErrorMsg(err.message || 'Error al procesar el archivo Excel.');
                }
            };
            reader.onerror = () => {
                setErrorMsg('Error de lectura del archivo Excel.');
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const parseDate = (dateStr?: string) => {
        if (!dateStr) return undefined;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            let year = parseInt(parts[2], 10);
            if (year < 100) year += 2000;
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) return date.toISOString();
        }
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) return dateObj.toISOString();
        return undefined;
    };

    const handleImport = async () => {
        setLoading(true);
        setErrorMsg(null);

        try {
            if (!user?.id) throw new Error('Sesion no detectada. Recarga la pagina.');

            const payloads = parsedData.map(row => ({
                name: row['NOMBRE'] || 'Sin Nombre',
                email: row['EMAIL'] || null,
                phone: row['TELEFONO'] || null,
                notes: row['NOTAS INTERNAS'] || null,
                source: row['ORIGEN'] === 'Excel' || row['ORIGEN'] === 'EXCEL' ? 'Idealista' : (row['ORIGEN'] || 'Idealista'),
                status: 'new',
                assigned_to: user.id,
                created_at: parseDate(row['ALTA']) || undefined,
            }));

            const { error } = await (supabase as any).from('leads').insert(payloads);

            if (error) {
                throw error;
            }

            onSuccess();
            handleClose();

        } catch (err: any) {
            console.error('Error importando:', err);
            setErrorMsg(err.message || 'Error al guardar en la base de datos.');
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="text-emerald-600" />
                        Importacion Masiva de Leads
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Sube un archivo CSV o Excel (.xlsx, .xls) para anadir multiples clientes.
                    </p>
                </div>
                <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg">
                    <X size={24} />
                </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-start gap-3">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {step === 1 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100/50 hover:border-emerald-500/50 transition-all group">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="text-emerald-600" size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Selecciona un archivo CSV o Excel</h3>
                        <p className="text-slate-500 text-sm text-center max-w-md mb-6">
                            El archivo debe tener cabeceras en la primera fila. Las columnas recomendadas son: <br />
                            <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-xs">NOMBRE</span>, <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-xs">EMAIL</span>, <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-xs">TELEFONO</span>, <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-xs">NOTAS INTERNAS</span>, <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-xs">ALTA</span>, <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-xs">ORIGEN</span>
                        </p>
                        <input
                            type="file"
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:bg-emerald-700 active:scale-95 transition-all text-sm"
                        >
                            Explorar Archivos
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-emerald-600" size={24} />
                                <div>
                                    <p className="font-bold text-emerald-900">Archivo procesado con exito</p>
                                    <p className="text-sm text-emerald-700">Se han encontrado <b>{parsedData.length}</b> registros validos en "{fileName}".</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="text-sm font-bold text-emerald-600 hover:text-emerald-800 transition-colors"
                            >
                                Cambiar archivo
                            </button>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Vista previa de datos (Primeros 5 registros)</h3>
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase">
                                            <tr>
                                                <th className="px-4 py-3 font-bold">Nombre</th>
                                                <th className="px-4 py-3 font-bold">Email</th>
                                                <th className="px-4 py-3 font-bold">Telefono</th>
                                                <th className="px-4 py-3 font-bold">Origen</th>
                                                <th className="px-4 py-3 font-bold">Alta</th>
                                                <th className="px-4 py-3 font-bold">Notas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 5).map((row, i) => (
                                                <tr key={i} className="bg-white border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-900">{row['NOMBRE'] || <span className="text-slate-400 italic">Vacio</span>}</td>
                                                    <td className="px-4 py-3 text-slate-600">{row['EMAIL'] || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-600">{row['TELEFONO'] || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-600">{row['ORIGEN'] || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-600">{row['ALTA'] || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate" title={row['NOTAS INTERNAS']}>{row['NOTAS INTERNAS'] || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {parsedData.length > 5 && (
                                    <div className="bg-slate-50 p-2 text-center text-xs text-slate-500 font-medium border-t border-slate-100">
                                        Y {parsedData.length - 5} registros mas...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end shrink-0">
                <button
                    onClick={handleClose}
                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={step === 1 ? () => fileInputRef.current?.click() : handleImport}
                    disabled={loading || (step === 2 && parsedData.length === 0)}
                    className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                >
                    {loading ? (
                        <><Loader2 className="animate-spin" size={20} /> Importando...</>
                    ) : step === 1 ? (
                        'Siguiente'
                    ) : (
                        `Confirmar Importacion (${parsedData.length})`
                    )}
                </button>
            </div>
        </div>
    );

    if (isInline) return content;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {content}
        </div>
    );
}
