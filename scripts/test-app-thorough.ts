import { generatePDF, generateDOCX, generatePaymentPlanPDF, generarReservaPdf, generarReservaDocx } from '../src/utils/documentGenerator';

async function runThoroughTest() {
  console.log('===============================================================');
  console.log('      PRUEBA DE VERIFICACIÓN Y DIAGNÓSTICO INTEGRAL (CRM)     ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: Conexión Servidor Dev (HTTP GET http://localhost:5173)
  try {
    const res = await fetch('http://localhost:5173/');
    if (res.ok && res.status === 200) {
      console.log('✅ TEST 1: Servidor Vite en http://localhost:5173 responde correctamente (HTTP 200 OK).');
      passed++;
    } else {
      console.log(`❌ TEST 1: Servidor Vite respondió con estado HTTP ${res.status}`);
      failed++;
    }
  } catch (err: any) {
    console.log(`❌ TEST 1: No se pudo conectar a http://localhost:5173 - ${err.message}`);
    failed++;
  }

  // TEST 2: Carga diferida y generación de Plan de Pagos PDF
  try {
    const pdfBlob = await generatePaymentPlanPDF({
      numero_vivienda: 'TEST-101',
      modelo: 'ARCE',
      precio: 350000
    }, false);

    if (pdfBlob && pdfBlob.size > 1000) {
      console.log(`✅ TEST 2: Carga diferida de jsPDF y generación de Plan de Pagos PDF exitosa (Blob size: ${(pdfBlob.size / 1024).toFixed(1)} KB).`);
      passed++;
    } else {
      console.log('❌ TEST 2: El Blob devuelto por generatePaymentPlanPDF es nulo o demasiado pequeño.');
      failed++;
    }
  } catch (err: any) {
    console.log(`❌ TEST 2: Fallo al probar generatePaymentPlanPDF: ${err.message}`);
    failed++;
  }

  // TEST 3: Generación de Contrato de Reserva en PDF (generarReservaPdf)
  try {
    const reservaPdfBlob = await generarReservaPdf({
      nombre: 'Cliente Prueba',
      dni: '12345678X',
      estadoCivil: 'Soltero/a',
      domicilio: 'Calle Prueba 12',
      localidad: 'Valladolid',
      provincia: 'Valladolid',
      codigoPostal: '47001',
      nacionalidad: 'Española',
      email: 'prueba@mirapinos.es',
      telefono: '600000000',
      nOrden: '101',
      portal: '1',
      planta: '2',
      letra: 'A',
      dormitorios: 3,
      banos: 2,
      supUtil: 95.5,
      supConst: 110.0,
      supTerrazas: 15.0,
      supPorche: 0,
      garaje: 'G-12',
      trastero: 'T-05',
      precio: 280000,
      fechaReserva: '01/08/2026',
      importeReserva: 6000
    }, false);

    if (reservaPdfBlob && reservaPdfBlob.size > 1000) {
      console.log(`✅ TEST 3: Generación unificada de Contrato de Reserva PDF exitosa (Blob size: ${(reservaPdfBlob.size / 1024).toFixed(1)} KB).`);
      passed++;
    } else {
      console.log('❌ TEST 3: Blob devuelto por generarReservaPdf no es válido.');
      failed++;
    }
  } catch (err: any) {
    console.log(`❌ TEST 3: Fallo en generarReservaPdf: ${err.message}`);
    failed++;
  }

  // TEST 4: Generación genérica de documento PDF (generatePDF)
  try {
    const contractPdfBlob = await generatePDF({
      tipoDocumento: 'reserva',
      fecha: '01/08/2026',
      comprador: {
        nombre: 'Juan Pérez',
        dni: '87654321Z',
        domicilio: 'Av. Zorrilla 45',
        localidad: 'Valladolid'
      },
      propiedad: {
        numeroVivienda: '202',
        modelo: 'OLIVO',
        dormitorios: 4,
        banos: 3,
        precio: 420000
      },
      importeReserva: 6000
    }, false);

    if (contractPdfBlob && contractPdfBlob.size > 1000) {
      console.log(`✅ TEST 4: Generación genérica generatePDF (Reserva) exitosa (Blob size: ${(contractPdfBlob.size / 1024).toFixed(1)} KB).`);
      passed++;
    } else {
      console.log('❌ TEST 4: Blob devuelto por generatePDF no es válido.');
      failed++;
    }
  } catch (err: any) {
    console.log(`❌ TEST 4: Fallo en generatePDF: ${err.message}`);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(` RESUMEN FINAL: ${passed} PRUEBAS PASADAS, ${failed} FALLADAS`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runThoroughTest();
