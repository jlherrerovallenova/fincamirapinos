import { sortInventoryProperties } from '../src/utils/propertySorter';

function testCustomSorting() {
  console.log('--- TEST DE ORDENACIÓN DE INVENTARIO (VIVIENDAS -> PARCELAS) ---');

  const testList = [
    { numero_vivienda: 'Parcela 15', modelo: 'PARCELA' },
    { numero_vivienda: '10', modelo: 'OLIVO' },
    { numero_vivienda: 'Parcela 2', modelo: 'PARCELA' },
    { numero_vivienda: '1', modelo: 'ARCE' },
    { numero_vivienda: '2', modelo: 'OLIVO' },
    { numero_vivienda: 'Parcela 1', modelo: 'PARCELAS' },
  ];

  const sorted = sortInventoryProperties(testList);
  console.log('Lista ordenada:', sorted);

  const firstThreeAreHouses = !sorted[0].modelo.includes('PARCELA') &&
                              !sorted[1].modelo.includes('PARCELA') &&
                              !sorted[2].modelo.includes('PARCELA');

  const lastThreeAreParcelas = sorted[3].modelo.includes('PARCELA') &&
                               sorted[4].modelo.includes('PARCELA') &&
                               sorted[5].modelo.includes('PARCELA');

  const houseOrderCorrect = sorted[0].numero_vivienda === '1' &&
                            sorted[1].numero_vivienda === '2' &&
                            sorted[2].numero_vivienda === '10';

  if (firstThreeAreHouses && lastThreeAreParcelas && houseOrderCorrect) {
    console.log('✅ TEST DE ORDENACIÓN DE INVENTARIO: COMPLETADO CON ÉXITO.');
  } else {
    console.error('❌ FALLO EN TEST DE ORDENACIÓN DE INVENTARIO');
    process.exit(1);
  }
}

testCustomSorting();
