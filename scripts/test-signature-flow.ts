import { calculateDocumentHash } from '../src/utils/signatureEngine';

async function testSignature() {
  console.log('--- TEST DE FIRMA DIGITAL NATIVA Y AUDITORÍA SHA-256 ---');

  const contractData = JSON.stringify({
    tipoDocumento: 'reserva',
    comprador: { nombre: 'María García', dni: '11223344A' },
    propiedad: { numeroVivienda: '102', precio: 310000 }
  });

  const fakeSignatureStroke = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const timestampIso = new Date().toISOString();

  const hash = await calculateDocumentHash(contractData, fakeSignatureStroke, timestampIso);
  console.log('✅ Hash SHA-256 generado:', hash);
  console.log('✅ Longitud de hash correcta:', hash.length >= 16);

  if (hash && hash.length > 10) {
    console.log('✅ TEST DE FIRMA DIGITAL NATIVA: COMPLETADO CON ÉXITO.');
  } else {
    console.error('❌ FALLO EN CÁLCULO DE HASH');
    process.exit(1);
  }
}

testSignature();
