// src/utils/documentGenerator.ts

export type DocumentType = 'reserva' | 'compraventa' | 'visita' | 'entrega_llaves';

export interface PaymentPlanProperty {
  numero_vivienda: string;
  modelo: string;
  precio: number;
}

export interface PartyData {
  nombre: string;
  dni: string;
  estadoCivil?: string;
  nacionalidad?: string;
  domicilio?: string;
  codigoPostal?: string;
  localidad?: string;
  provincia?: string;
  email?: string;
  telefono?: string;
  nombreCotitular?: string;
  dniCotitular?: string;
}

export interface PropertyData {
  id?: number | string;
  numeroVivienda: string;
  modelo?: string;
  tipo?: string;
  dormitorios?: number;
  banos?: number;
  superficieUtil?: number;
  superficieConstruida?: number;
  garaje?: string;
  trastero?: string;
  precio: number;
  direccion?: string;
}

export interface ContractData {
  tipoDocumento: DocumentType;
  fecha: string; // Formato DD/MM/YYYY
  comprador: PartyData;
  propiedad: PropertyData;
  
  importeReserva?: number;
  porcentajeIva?: number;
  plazoEscrituraMeses?: number;

  agenteNombre?: string;
  comentariosVisita?: string;

  juegosLlaves?: number;
  mandosGaraje?: number;
  lecturaAgua?: string;
  lecturaLuz?: string;
  observacionesEntrega?: string;
}

export interface DatosReserva {
  nombre: string;
  dni: string;
  estadoCivil: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  nacionalidad: string;
  email: string;
  telefono: string;
  nombreCotitular?: string;
  dniCotitular?: string;
  nOrden: string;
  portal: string;
  planta: string;
  letra: string;
  dormitorios: number;
  banos: number;
  supUtil: number;
  supConst: number;
  supTerrazas: number;
  supPorche: number;
  garaje: string;
  trastero: string;
  precio: number;
  fechaReserva: string;
  importeReserva: number;
}

export function formatEur(n: number = 0): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(n);
}

export function numeroALetras(n: number = 0): string {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales: Record<number, string> = {
    10: 'DIEZ', 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
    16: 'DIECISÉIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE', 20: 'VEINTE',
    21: 'VEINTIÚN', 22: 'VEINTIDÓS', 23: 'VEINTITRÉS', 24: 'VEINTICUATRO',
    25: 'VEINTICINCO', 26: 'VEINTISÉIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE',
    30: 'TREINTA', 40: 'CUARENTA', 50: 'CINCUENTA', 60: 'SESENTA', 70: 'SETENTA', 80: 'OCHENTA', 90: 'NOVENTA'
  };
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const convertir = (num: number): string => {
    if (num === 0) return '';
    if (num === 100) return 'CIEN';
    if (num in especiales) return especiales[num];
    if (num < 10) return unidades[num];
    
    if (num < 100) {
      const d = Math.floor(num / 10);
      const u = num % 10;
      return `${especiales[d * 10]} Y ${unidades[u]}`;
    }
    
    if (num < 1000) {
      const c = Math.floor(num / 100);
      const resto = num % 100;
      return `${centenas[c]} ${convertir(resto)}`.trim();
    }
    
    if (num < 1000000) {
      const m = Math.floor(num / 1000);
      const resto = num % 1000;
      const milPrefix = m === 1 ? 'MIL' : `${convertir(m)} MIL`;
      return `${milPrefix} ${convertir(resto)}`.trim();
    }
    
    return String(num);
  };

  return (convertir(Math.floor(n)) || 'CERO').toUpperCase();
}

// ─────────────────────────────────────────────
// PLAN DE PAGOS — generación directa desde el inventario
// ─────────────────────────────────────────────
export async function generatePaymentPlanPDF(
  property: PaymentPlanProperty,
  download: boolean = true
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;

  const GREEN  = [0, 108, 74]  as const;
  const SLATE9 = [15, 23, 42]  as const;
  const SLATE5 = [71, 85, 105] as const;
  const SLATE3 = [203, 213, 225] as const;
  const WHITE  = [255, 255, 255] as const;

  const IVA_PCT       = 0.10;
  const AJD_PCT       = 0.015;
  const RESERVA_FIJA  = 6_000;
  const CUOTAS        = 18;

  const precioBase   = property.precio;
  const ivaTotal     = precioBase * IVA_PCT;
  const totalViv     = precioBase + ivaTotal;
  const ajd          = precioBase * AJD_PCT;

  const e1Total = RESERVA_FIJA;

  const e2Total = totalViv * 0.10 - RESERVA_FIJA;
  const e2Base  = e2Total / (1 + IVA_PCT);
  const e2Iva   = e2Total - e2Base;

  const e3Total = totalViv * 0.10;
  const e3Base  = e3Total / (1 + IVA_PCT);
  const e3Iva   = e3Total - e3Base;
  const e3Cuota = e3Total / CUOTAS;

  const e4Total = totalViv * 0.80;
  const e4Base  = e4Total / (1 + IVA_PCT);
  const e4Iva   = e4Total - e4Base;

  const today = new Date().toLocaleDateString('es-ES');

  const loadLogoBase64 = (): Promise<{ data: string; w: number; h: number } | null> =>
    new Promise((resolve) => {
      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        resolve(null);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve({ data: canvas.toDataURL('image/jpeg', 0.95), w: img.width, h: img.height });
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/logo-mirapinos.png';
    });

  const logoInfo = await loadLogoBase64();

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 2, 'F');

  let y = 10;
  if (logoInfo) {
    const maxLogoW = 70;
    const maxLogoH = 22;
    const aspect   = logoInfo.w / logoInfo.h;
    let logoW = maxLogoW;
    let logoH = logoW / aspect;
    if (logoH > maxLogoH) { logoH = maxLogoH; logoW = logoH * aspect; }
    const logoX = (pageW - logoW) / 2;
    doc.addImage(logoInfo.data, 'JPEG', logoX, y, logoW, logoH);
    y += logoH + 4;
  } else {
    y += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE5);
    doc.text('— F I N C A —', pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE9);
    doc.text('MIRAPINOS', pageW / 2, y, { align: 'center' });
    y += 4;
  }

  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.line(margin + 20, y, pageW - margin - 20, y);
  y += 12;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE9);
  doc.text('PLAN DE PAGOS', margin, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE5);
  doc.text(
    `Vivienda No. ${property.numero_vivienda}  |  Modelo ${property.modelo.toUpperCase()}  |  ${today}`,
    margin, y
  );

  y += 8;
  const boxH  = 24;
  const col   = contentW / 3;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, col * 2, boxH, 2, 2, 'F');

  doc.setFillColor(...GREEN);
  doc.roundedRect(margin + col * 2, y, col, boxH, 2, 2, 'F');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE5);
  doc.text('IMPORTE BASE', margin + col * 0.5, y + 7, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE9);
  doc.text(formatEur(precioBase), margin + col * 0.5, y + 15, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE5);
  doc.text('IVA (10%)', margin + col * 1.5, y + 7, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE9);
  doc.text(formatEur(ivaTotal), margin + col * 1.5, y + 15, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text('TOTAL VIVIENDA', margin + col * 2.5, y + 7, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(formatEur(totalViv), margin + col * 2.5, y + 16, { align: 'center' });

  y += boxH + 4;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...SLATE5);
  doc.text(`* El impuesto de AJD (1,5% s/base) no está incluido: ${formatEur(ajd)}`, margin, y);

  const drawStage = (
    num: number,
    titulo: string,
    subtitulo: string,
    base: number | null,
    iva: number | null,
    total: number,
    extraLine?: string
  ) => {
    y += 16;
    if (y > 250) { doc.addPage(); y = 20; }

    doc.setFillColor(...GREEN);
    doc.circle(margin + 5, y + 1, 5, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text(String(num), margin + 5, y + 3.5, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE9);
    doc.text(titulo, margin + 13, y + 3);

    if (base === null) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...GREEN);
      doc.text(formatEur(total), pageW - margin, y + 3, { align: 'right' });
    }

    y += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE5);
    doc.text(subtitulo, margin + 13, y);

    if (extraLine) {
      y += 5;
      doc.text(extraLine, margin + 13, y);
    }

    if (base !== null && iva !== null) {
      y += 7;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...SLATE5);
      doc.text('BASE', margin + 13, y);
      doc.text('IVA 10%', margin + 60, y);
      doc.text('TOTAL', pageW - margin - 30, y);

      y += 5;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...SLATE9);
      doc.text(formatEur(base), margin + 13, y);
      doc.setTextColor(...SLATE5);
      doc.text(formatEur(iva), margin + 60, y);
      doc.setTextColor(...GREEN);
      doc.text(formatEur(total), pageW - margin - 30, y);
    }

    y += 12;
    doc.setDrawColor(...SLATE3);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
  };

  drawStage(1, 'RESERVA DE VIVIENDA',   'Pago inicial para bloqueo de vivienda.', null, null, e1Total);
  drawStage(2, 'FIRMA DE CONTRATO',     'A la firma del contrato privado (10% - Reserva).', e2Base, e2Iva, e2Total);
  drawStage(3, 'PAGOS APLAZADOS',       `${CUOTAS} cuotas mensuales de ${formatEur(e3Cuota)} (${CUOTAS} meses).`, e3Base, e3Iva, e3Total);
  drawStage(4, 'ESCRITURA PÚBLICA',     'Entrega de llaves y firma ante notario (80%).', e4Base, e4Iva, e4Total);

  const avalY = 297 - 38;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, avalY, contentW, 11, 2, 2, 'F');
  doc.setDrawColor(...SLATE3);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, avalY, contentW, 11, 2, 2, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE9);
  doc.text('Cantidades avaladas por CAJA RURAL DE ZAMORA', pageW / 2, avalY + 7, { align: 'center' });

  const pgH = 297;
  doc.setDrawColor(...SLATE3);
  doc.setLineWidth(0.3);
  doc.line(margin, pgH - 18, pageW - margin, pgH - 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN);
  doc.text('FINCA MIRAPINOS — www.mirapinos.com', pageW / 2, pgH - 7, { align: 'center' });

  doc.setFillColor(...GREEN);
  doc.rect(0, pgH - 2, pageW, 2, 'F');

  const fileName = `PlanPagos_Vivienda${property.numero_vivienda}_${property.modelo.toUpperCase()}.pdf`;
  if (download) doc.save(fileName);
  return doc.output('blob');
}

/**
 * Genera el documento PDF estilizado listo para previsualización o descarga
 */
export async function generatePDF(data: ContractData, download: boolean = true): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const drawHeader = (titulo: string) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 26, 'F');
    
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('FINCA MIRAPINOS', margin, 12);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Gestión Inmobiliaria Residencial', margin, 18);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 211, 153);
    doc.text(titulo, pageW - margin, 15, { align: 'right' });
    
    y = 35;
  };

  const addSectionTitle = (title: string) => {
    if (y > 260) { doc.addPage(); y = 25; }
    y += 2;
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin + 3, y + 5);
    y += 11;
  };

  const addParagraph = (text: string, size = 9, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, contentW);
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 25; }
      doc.text(line, margin, y);
      y += size * 0.45 + 1;
    });
    y += 1.5;
  };

  const addKeyValue = (key: string, value: string) => {
    if (y > 270) { doc.addPage(); y = 25; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(key + ':', margin, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const valueLines = doc.splitTextToSize(value, contentW - 45);
    doc.text(valueLines, margin + 45, y);
    y += Math.max(valueLines.length * 4.5, 5);
  };

  const addSignaturesBlock = (leftTitle: string, rightTitle: string, leftName: string, rightName: string) => {
    if (y > 235) { doc.addPage(); y = 25; }
    y += 12;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, margin + 70, y);
    doc.line(pageW - margin - 70, y, pageW - margin, y);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(leftTitle.toUpperCase(), margin + 35, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(leftName, margin + 35, y + 8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(rightTitle.toUpperCase(), pageW - margin - 35, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(rightName, pageW - margin - 35, y + 8, { align: 'center' });
  };

  if (data.tipoDocumento === 'reserva') {
    drawHeader('CONTRATO DE RESERVA');
    
    addParagraph(`En Valladolid, a ${data.fecha}.`, 9, true);

    addSectionTitle('1. Partes Intervinientes');
    addKeyValue('De una parte (Vendedora)', 'RESIDENCIAL MIRAPINOS, S.L., con CIF B-00000000 y domicilio en Paseo de Zorrilla 98, Valladolid.');
    
    const compradorStr = data.comprador.nombreCotitular
      ? `D/Dª. ${data.comprador.nombre} (DNI ${data.comprador.dni}) y D/Dª. ${data.comprador.nombreCotitular} (DNI ${data.comprador.dniCotitular || '_______'}), domicilio en ${data.comprador.domicilio || 'N/A'}, ${data.comprador.localidad || ''}.`
      : `D/Dª. ${data.comprador.nombre}, con DNI ${data.comprador.dni}, estado civil ${data.comprador.estadoCivil || 'Soltero/a'}, domicilio en ${data.comprador.domicilio || 'N/A'}, ${data.comprador.localidad || ''}.`;
    addKeyValue('De otra parte (Compradora)', compradorStr);

    addSectionTitle('2. Inmueble Objeto de Reserva');
    addKeyValue('Vivienda', `Nº ${data.propiedad.numeroVivienda} ${data.propiedad.modelo ? `(Modelo ${data.propiedad.modelo})` : ''}`);
    addKeyValue('Características', `${data.propiedad.dormitorios || 0} dormitorios, ${data.propiedad.banos || 0} baños, ${data.propiedad.superficieUtil || 0} m² útiles / ${data.propiedad.superficieConstruida || 0} m² construidos.`);
    addKeyValue('Anexos', `Garaje: ${data.propiedad.garaje || 'Incluido'} | Trastero: ${data.propiedad.trastero || 'Incluido'}`);

    addSectionTitle('3. Condiciones Económicas');
    const ivaPct = (data.porcentajeIva || 10) / 100;
    const precioBase = data.propiedad.precio;
    const ivaMonto = precioBase * ivaPct;
    const precioTotal = precioBase + ivaMonto;
    const reservaMonto = data.importeReserva || 6000;

    addKeyValue('Precio base (sin IVA)', formatEur(precioBase));
    addKeyValue('IVA (10%)', formatEur(ivaMonto));
    addKeyValue('Precio final con IVA', `${formatEur(precioTotal)} (${numeroALetras(precioTotal)} EUROS)`);
    addKeyValue('Importe Señal Reserva', `${formatEur(reservaMonto)} (${numeroALetras(reservaMonto)} EUROS)`);

    addSectionTitle('4. Cláusulas y Compromisos');
    addParagraph(
      `PRIMERA.- El COMPRADOR entrega en este acto a la VENDEDORA la cantidad de ${formatEur(reservaMonto)} en concepto de señal de reserva para la adquisición de la vivienda descrita.`,
      8.5
    );
    addParagraph(
      'SEGUNDA.- El presente documento concede al COMPRADOR un derecho preferente de adquisición sobre el inmueble hasta la firma del correspondiente Contrato Privado de Compraventa.',
      8.5
    );
    addParagraph(
      'TERCERA (RGPD).- En cumplimiento del Reglamento General de Protección de Datos, las partes consienten el tratamiento de sus datos personales para la correcta gestión de la transacción inmobiliaria.',
      8.5
    );

    addSignaturesBlock(
      'La Parte Vendedora',
      'La Parte Compradora',
      'RESIDENCIAL MIRAPINOS, S.L.',
      data.comprador.nombre
    );
  }

  else if (data.tipoDocumento === 'compraventa') {
    drawHeader('CONTRATO PRIVADO DE COMPRAVENTA');

    addParagraph(`En Valladolid, a ${data.fecha}.`, 9, true);

    addSectionTitle('Reunidos');
    addParagraph(
      `De una parte, la entidad RESIDENCIAL MIRAPINOS, S.L., provista de CIF B-00000000, actuando en su calidad de promotora y vendedora.`
    );
    const compText = data.comprador.nombreCotitular
      ? `De otra parte, D/Dª. ${data.comprador.nombre} con DNI ${data.comprador.dni} y D/Dª. ${data.comprador.nombreCotitular} con DNI ${data.comprador.dniCotitular || '_______'}, con domicilio en ${data.comprador.domicilio || 'N/A'}.`
      : `De otra parte, D/Dª. ${data.comprador.nombre}, mayor de edad, con DNI ${data.comprador.dni}, de nacionalidad ${data.comprador.nacionalidad || 'Española'}, con domicilio en ${data.comprador.domicilio || 'N/A'}.`;
    addParagraph(compText);
    addParagraph('Ambas partes se reconocen mutuamente capacidad legal suficiente para otorgar el presente Contrato Privado de Compraventa y, a tal efecto,');

    addSectionTitle('Exponen');
    addParagraph(`I. Que la VENDEDORA es legítima propietaria de la vivienda Nº ${data.propiedad.numeroVivienda}, ubicada en la promoción Finca Mirapinos.`);
    addParagraph(`II. Que la PARTE COMPRADORA está interesada en la adquisición de dicho inmueble, habiendo verificado sus especificaciones técnicas y condiciones.`);

    addSectionTitle('Estipulaciones');
    const precioBase = data.propiedad.precio;
    const totalIVA = precioBase * 1.10;
    addParagraph(`PRIMERA. OBJETO.- La VENDEDORA vende a la PARTE COMPRADORA, que compra, la finca descrita en los antecedentes.`);
    addParagraph(`SEGUNDA. PRECIO.- El precio de la compraventa se fija en la cantidad de ${formatEur(precioBase)} más el IVA legalmente aplicable (10%), resultando un total de ${formatEur(totalIVA)} (${numeroALetras(totalIVA)} EUROS).`);
    addParagraph(`TERCERA. FORMA DE PAGO.- El pago se estructurará conforme al calendario acordado: entrega a la firma, mensualidades durante la construcción y el resto (80%) al otorgamiento de la Escritura Pública de Compraventa.`);
    addParagraph(`CUARTA. ESCRITURACIÓN Y ENTREGA DE POSESIÓN.- La firma de la Escritura Pública de Compraventa se realizará ante el Notario que a tal efecto designe la PARTE COMPRADORA dentro del plazo acordado.`);

    addSignaturesBlock(
      'Por la Promotora Vendedora',
      'La Parte Compradora',
      'RESIDENCIAL MIRAPINOS, S.L.',
      data.comprador.nombre
    );
  }

  else if (data.tipoDocumento === 'visita') {
    drawHeader('HOJA DE VISITA A INMUEBLE');

    addParagraph(`Fecha de Visita: ${data.fecha}`, 9, true);

    addSectionTitle('1. Datos del Cliente / Visitante');
    addKeyValue('Nombre completo', data.comprador.nombre);
    addKeyValue('DNI / NIE', data.comprador.dni);
    addKeyValue('Teléfono de contacto', data.comprador.telefono || 'N/A');
    addKeyValue('Correo electrónico', data.comprador.email || 'N/A');

    addSectionTitle('2. Inmueble Visitado');
    addKeyValue('Identificación', `Vivienda Nº ${data.propiedad.numeroVivienda} ${data.propiedad.modelo ? `- Modelo ${data.propiedad.modelo}` : ''}`);
    addKeyValue('Superficie y distribución', `${data.propiedad.dormitorios || 0} hab | ${data.propiedad.banos || 0} baños | ${data.propiedad.superficieConstruida || 0} m² const.`);
    addKeyValue('Precio orientativo', formatEur(data.propiedad.precio));

    addSectionTitle('3. Reconocimiento de Visita y Cláusula de Protección');
    addParagraph(
      'El cliente abajo firmante declara haber visitado en la fecha indicada el inmueble arriba descrito con la mediación de FINCA MIRAPINOS.',
      8.5
    );
    addParagraph(
      'Asimismo, autoriza expresamente el tratamiento de sus datos personales para la recepción de información comercial y seguimiento de su solicitud conforme al RGPD.',
      8.5
    );

    if (data.comentariosVisita) {
      addSectionTitle('Observaciones y Comentarios');
      addParagraph(data.comentariosVisita, 8.5);
    }

    addSignaturesBlock(
      'Agente / Asesor Inmobiliario',
      'Firma del Cliente Visitante',
      data.agenteNombre || 'Finca Mirapinos',
      data.comprador.nombre
    );
  }

  else if (data.tipoDocumento === 'entrega_llaves') {
    drawHeader('ACTA DE ENTREGA DE LLAVES Y POSESIÓN');

    addParagraph(`En Valladolid, a ${data.fecha}.`, 9, true);

    addSectionTitle('Intervinientes');
    addParagraph(`Entregante: RESIDENCIAL MIRAPINOS, S.L. (Representante de la Propiedad).`);
    addParagraph(`Receptor: D/Dª. ${data.comprador.nombre}, con DNI ${data.comprador.dni}.`);

    addSectionTitle('Detalle del Inmueble y Elementos Entregados');
    addKeyValue('Inmueble', `Vivienda Nº ${data.propiedad.numeroVivienda} (Finca Mirapinos)`);
    addKeyValue('Juegos de Llaves', `${data.juegosLlaves || 2} juegos de llaves completos (Puerta principal, buzón, trastero)`);
    addKeyValue('Mandos Garaje', `${data.mandosGaraje || 1} mando(s) de acceso a garaje comunitario`);
    
    addSectionTitle('Lectura de Contadores de Suministros');
    addKeyValue('Contador de Agua', data.lecturaAgua || 'Pendiente de lectura inicial');
    addKeyValue('Contador de Electricidad', data.lecturaLuz || 'Pendiente de lectura inicial');

    addSectionTitle('Conformidad');
    addParagraph(
      'La parte adquirente declara recibir las llaves del inmueble y los mandos indicados, tomando posesión del mismo y manifestando su conformidad tras la inspección visual realizada.',
      8.5
    );

    addSignaturesBlock(
      'Entregado por (Mirapinos)',
      'Recibido por (Adquirente)',
      'RESIDENCIAL MIRAPINOS, S.L.',
      data.comprador.nombre
    );
  }

  const fileName = `${data.tipoDocumento.toUpperCase()}_${data.comprador.nombre.replace(/\s+/g, '_')}_${data.propiedad.numeroVivienda}.pdf`;
  if (download) {
    doc.save(fileName);
  }
  return doc.output('blob');
}

/**
 * Descarga plantilla DOCX procesando marcadores con Docxtemplater si se proporciona plantilla
 */
export async function generateDOCX(data: ContractData): Promise<void> {
  try {
    const [{ default: PizZip }, { default: Docxtemplater }, { saveAs }] = await Promise.all([
      import('pizzip'),
      import('docxtemplater'),
      import('file-saver')
    ]);

    const response = await fetch(`/plantilla_reserva.docx?t=${Date.now()}`);
    if (!response.ok) {
      const docxContent = `
=====================================================
            DOCUMENTO OFICIAL: ${data.tipoDocumento.toUpperCase()}
=====================================================
Fecha: ${data.fecha}

DATOS DEL CLIENTE:
- Nombre: ${data.comprador.nombre}
- DNI: ${data.comprador.dni}
- Email: ${data.comprador.email || 'N/A'}
- Teléfono: ${data.comprador.telefono || 'N/A'}

DATOS DE LA PROPIEDAD:
- Vivienda: Nº ${data.propiedad.numeroVivienda}
- Modelo: ${data.propiedad.modelo || 'N/A'}
- Precio: ${formatEur(data.propiedad.precio)}

=====================================================
Generado por CRM Finca Mirapinos
=====================================================
`;
      const blob = new Blob([docxContent], { type: 'application/msword;charset=utf-8' });
      saveAs(blob, `${data.tipoDocumento}_${data.comprador.nombre.replace(/\s+/g, '_')}.doc`);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    doc.setData({
      FECHA: data.fecha,
      NOMBRE_COMPRADOR: data.comprador.nombre,
      DNI_COMPRADOR: data.comprador.dni,
      DOMICILIO: data.comprador.domicilio || '',
      LOCALIDAD: data.comprador.localidad || '',
      EMAIL: data.comprador.email || '',
      TELEFONO: data.comprador.telefono || '',
      N_ORDEN: data.propiedad.numeroVivienda,
      MODELO: data.propiedad.modelo || '',
      PRECIO: formatEur(data.propiedad.precio),
      PRECIO_LETRAS: numeroALetras(data.propiedad.precio),
      IMPORTE_RESERVA: formatEur(data.importeReserva || 6000),
    });

    doc.render();
    const blob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    saveAs(blob, `${data.tipoDocumento}_${data.comprador.nombre.replace(/\s+/g, '_')}.docx`);
  } catch (err: any) {
    console.error('Error generando DOCX:', err);
    alert('No se pudo generar el documento DOCX: ' + (err.message || err));
  }
}

/**
 * Genera el DOCX de reserva usando la plantilla del repositorio con carga diferida.
 */
export async function generarReservaDocx(datos: DatosReserva): Promise<void> {
  const [{ default: PizZip }, { default: Docxtemplater }, { saveAs }] = await Promise.all([
    import('pizzip'),
    import('docxtemplater'),
    import('file-saver')
  ]);

  const response = await fetch(`/plantilla_reserva.docx?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la plantilla de reserva: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const compradorLinea = datos.nombreCotitular
    ? `D/Dª. ${datos.nombre}, con DNI ${datos.dni}, y D/Dª. ${datos.nombreCotitular}, con DNI ${datos.dniCotitular || '_______'}, ambos en estado civil ${datos.estadoCivil}, nacionalidad ${datos.nacionalidad}, y con domicilio a efectos de notificaciones en ${datos.domicilio}, ${datos.codigoPostal} ${datos.localidad} (${datos.provincia})`
    : `D/Dª. ${datos.nombre}, con DNI ${datos.dni}, estado civil ${datos.estadoCivil}, nacionalidad ${datos.nacionalidad}, y con domicilio a efectos de notificaciones en ${datos.domicilio}, ${datos.codigoPostal} ${datos.localidad} (${datos.provincia})`;

  try {
    doc.setData({
      FECHA_RESERVA: datos.fechaReserva,
      NOMBRE_COMPRADOR: datos.nombre,
      DNI_COMPRADOR: datos.dni,
      ESTADO_CIVIL: datos.estadoCivil,
      DOMICILIO: datos.domicilio,
      LOCALIDAD: datos.localidad,
      PROVINCIA: datos.provincia,
      CP: datos.codigoPostal,
      NACIONALIDAD: datos.nacionalidad,
      EMAIL: datos.email,
      TELEFONO: datos.telefono,
      NOMBRE_COTITULAR: datos.nombreCotitular || '',
      DNI_COTITULAR: datos.dniCotitular || '',
      COMPRADOR_LINEA: compradorLinea,
      N_ORDEN: datos.nOrden,
      PORTAL: datos.portal,
      PLANTA: datos.planta,
      LETRA: datos.letra,
      DORMITORIOS: datos.dormitorios,
      BANOS: datos.banos,
      SUP_UTIL: datos.supUtil.toFixed(2),
      SUP_CONST: datos.supConst.toFixed(2),
      SUP_TERRAZAS: datos.supTerrazas.toFixed(2),
      SUP_PORCHE: datos.supPorche.toFixed(2),
      GARAJE: datos.garaje,
      TRASTERO: datos.trastero,
      PRECIO: formatEur(datos.precio),
      PRECIO_LETRAS: numeroALetras(datos.precio),
      IMPORTE_RESERVA: formatEur(datos.importeReserva),
      IMPORTE_RESERVA_LETRAS: numeroALetras(datos.importeReserva),
      IVA_10: formatEur(datos.precio * 0.10),
      TOTAL_CON_IVA: formatEur(datos.precio * 1.10),
      TOTAL_CON_IVA_LETRAS: numeroALetras(datos.precio * 1.10),
      PAGO_CONTRATO: formatEur((datos.precio * 1.10 * 0.10) - datos.importeReserva),
      PAGO_MENSUALIDADES: formatEur(datos.precio * 1.10 * 0.10),
      CUOTA_MENSUAL: formatEur((datos.precio * 1.10 * 0.10) / 24),
      PAGO_ESCRITURA: formatEur(datos.precio * 1.10 * 0.80),
    });

    doc.render();

    const blob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    saveAs(blob, `Reserva_${datos.nombre.replace(/\s+/g, '_')}_${datos.nOrden}.docx`);
  } catch (error: any) {
    console.error('Error generating DOCX:', error);
    const errorMsg = error.properties?.explanation || error.message || 'Error desconocido';
    alert(`Error al generar el documento: ${errorMsg}. Revisa que las etiquetas en el Word estén bien escritas (ej: {NOMBRE_COMPRADOR}).`);
  }
}

/**
 * Genera el PDF de reserva con jsPDF usando carga diferida.
 */
export async function generarReservaPdf(datos: DatosReserva, download: boolean = true): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const addText = (text: string, size = 10, bold = false, color: [number, number, number] = [30, 30, 30]) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW);
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += size * 0.45;
    });
    y += 2;
  };

  const addSection = (title: string) => {
    y += 3;
    doc.setFillColor(15, 52, 96);
    doc.rect(margin, y - 4, contentW, 7, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 3, y);
    y += 6;
    doc.setTextColor(30, 30, 30);
  };

  const addLine = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value, contentW - 50);
    doc.text(lines, margin + 50, y);
    y += Math.max(lines.length * 4.5, 5);
  };

  const iva = datos.precio * 0.10;
  const totalConIva = datos.precio + iva;
  const compraContrato = iva + iva * 0.10 - datos.importeReserva;
  const mensualidadTotal = iva * 1.10;
  const mensualidad = mensualidadTotal / 24;
  const escritura = datos.precio * 0.80 * 1.10;

  doc.setFillColor(15, 52, 96);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('RESIDENCIAL Mirapinos, S.L.', margin, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Paseo de Zorrilla 98, 1º B — Valladolid', margin, 19);
  doc.text('administracion@residencialMirapinos.es', margin, 24);

  y = 36;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 52, 96);
  doc.text('CONTRATO DE RESERVA', pageW / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${datos.fechaReserva}`, pageW / 2, y, { align: 'center' });
  y += 8;

  addSection('PARTE VENDEDORA');
  addLine('Entidad', 'RESIDENCIAL Mirapinos, S.L.');
  addLine('CIF', 'B-00000000');
  addLine('Domicilio', 'Paseo de Zorrilla 98, 1º B, Valladolid');
  addLine('Representante', 'D. ANTONIO ROBERTO PASTRANA GONZÁLEZ');

  addSection('PARTE COMPRADORA');
  if (datos.nombreCotitular) {
    addLine('Comprador 1', `${datos.nombre} (DNI ${datos.dni})`);
    addLine('Comprador 2', `${datos.nombreCotitular} (DNI ${datos.dniCotitular || '_______'})`);
    addLine('Estado Civil', datos.estadoCivil);
    addLine('Nacionalidad', datos.nacionalidad);
    addLine('Domicilio común', `${datos.domicilio}, ${datos.codigoPostal} ${datos.localidad} (${datos.provincia})`);
  } else {
    addLine('Nombre', datos.nombre);
    addLine('DNI / NIE', datos.dni);
    addLine('Estado civil', datos.estadoCivil);
    addLine('Nacionalidad', datos.nacionalidad);
    addLine('Domicilio', `${datos.domicilio}, ${datos.codigoPostal} ${datos.localidad} (${datos.provincia})`);
  }

  addSection('DESCRIPCIÓN DE LA VIVIENDA');
  addLine('Referencia', `Nº ${datos.nOrden} — Portal ${datos.portal} — Planta ${datos.planta}${datos.letra}`);
  addLine('Dormitorios', String(datos.dormitorios));
  addLine('Baños', String(datos.banos));
  addLine('Superficie útil', `${datos.supUtil.toFixed(2)} m²`);
  addLine('Garaje', datos.garaje);
  addLine('Trastero', datos.trastero);

  addSection('CONDICIONES ECONÓMICAS');
  addLine('Precio de venta (sin IVA)', formatEur(datos.precio));
  addLine('IVA (10%)', formatEur(iva));
  addLine('Precio total (IVA incluido)', formatEur(totalConIva));
  y += 2;
  addLine('1. Reserva (hoy)', formatEur(datos.importeReserva));
  addLine('2. Contrato de compraventa', formatEur(compraContrato));
  addLine('3. Mensualidades (24 × ...)', `${formatEur(mensualidadTotal)} total — ${formatEur(mensualidad)}/mes`);
  addLine('4. Escrituración (80% + IVA)', formatEur(escritura));

  addSection('PRIMERA. — OBJETO');
  addText(
    `RESIDENCIAL Mirapinos, S.L. reserva a favor de ${datos.nombre}${datos.nombreCotitular ? ` y ${datos.nombreCotitular}` : ''} la vivienda descrita en el apartado anterior, con una señal de reserva de ${formatEur(datos.importeReserva)} (${numeroALetras(datos.importeReserva)} EUROS), que se entrega en este acto.`, 9
  );

  addSection('SEGUNDA. — PRECIO Y FORMA DE PAGO');
  addText(
    `El precio total de la compraventa, IVA incluido, asciende a ${formatEur(totalConIva)}. El COMPRADOR abonará dicho precio de la siguiente forma:\n` +
    `a) ${formatEur(datos.importeReserva)} en concepto de reserva, abonados en este acto.\n` +
    `b) ${formatEur(compraContrato)} a la firma del contrato de compraventa.\n` +
    `c) ${formatEur(mensualidadTotal)} mediante 24 mensualidades de ${formatEur(mensualidad)} cada una.\n` +
    `d) ${formatEur(escritura)} restantes a la firma de la escritura pública de compraventa.`, 9
  );

  addSection('TERCERA. — PROTECCIÓN DE DATOS');
  addText(
    'En cumplimiento del Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018, los datos personales del COMPRADOR serán tratados por RESIDENCIAL Mirapinos, S.L., responsable del tratamiento, con la finalidad de gestionar la relación contractual. Para más información y ejercicio de derechos: administracion@residencialMirapinos.es o www.aepd.es.',
    9
  );

  addSection('CUARTA. — PREVENCIÓN DEL BLANQUEO DE CAPITALES');
  addText(
    'De conformidad con la Ley 10/2010 de 28 de Abril, la parte compradora manifiesta que actúa en su propio nombre y derecho, y se obliga a facilitar cuantos documentos le sean requeridos para verificar el origen de los fondos.',
    9
  );

  addSection('QUINTA. — FUERO');
  addText('Las partes se someten expresamente a los Juzgados y Tribunales de Madrid para cuantas controversias traigan causa del presente contrato.', 9);

  y += 10;
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + 75, y);
  doc.line(pageW - margin - 75, y, pageW - margin, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('LA PARTE VENDEDORA', margin + 37, y + 5, { align: 'center' });
  doc.text('D. ANTONIO ROBERTO PASTRANA GONZÁLEZ', margin + 37, y + 9, { align: 'center' });
  doc.text('RESIDENCIAL Mirapinos, S.L.', margin + 37, y + 13, { align: 'center' });

  const compradorLabel = datos.nombreCotitular
    ? `${datos.nombre}\ny ${datos.nombreCotitular}`
    : datos.nombre;
  doc.text('LA PARTE COMPRADORA', pageW - margin - 37, y + 5, { align: 'center' });
  doc.text(compradorLabel, pageW - margin - 37, y + 9, { align: 'center' });

  if (download) {
    doc.save(`Reserva_${datos.nombre.replace(/\s+/g, '_')}_${datos.nOrden}.pdf`);
  }
  return doc.output('blob');
}
