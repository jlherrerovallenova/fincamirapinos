import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

async function run() {
  console.log('==================================================');
  console.log('         INICIANDO PRUEBA DE UI CON PUPPETEER     ');
  console.log('==================================================');

  const url = 'http://localhost:5173/';
  console.log(`Conectando a la app en: ${url}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Navegar a la página
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Página cargada con éxito.');

    // Esperar a que el formulario de login esté visible
    console.log('Esperando formulario de inicio de sesión...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    console.log('✅ Formulario de inicio de sesión detectado correctamente.');

    // Validar el título y logotipo
    const title = await page.title();
    console.log(`Título de la página: "${title}"`);

    const hasLogo = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Mirapinos Logo"]');
      return img !== null;
    });
    console.log(`¿Logotipo corporativo presente?: ${hasLogo ? 'SÍ' : 'NO'}`);

    // Capturar pantalla
    const artifactDir = 'C:\\Users\\Celia\\.gemini\\antigravity\\brain\\2a4feed4-0133-4553-aa4f-561aed920bdc';
    const screenshotPath = path.join(artifactDir, 'login_screenshot.png');
    
    console.log(`Guardando captura de pantalla en: ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath });
    console.log('✅ Captura de pantalla guardada con éxito.');

    console.log('\n==================================================');
    console.log('             RESULTADOS DE LA VERIFICACIÓN         ');
    console.log('==================================================');
    console.log('1. Conexión de red local:    EXITOSA');
    console.log(`2. Título de página:         ${title || 'No definido'}`);
    console.log(`3. Formulario de Login:      PRESENTE`);
    console.log(`4. Imagen corporativa:       ${hasLogo ? 'OK' : 'FALTA'}`);
    console.log('==================================================\n');

  } catch (err: any) {
    console.error('❌ Error durante la prueba de UI:', err.message || err);
  } finally {
    await browser.close();
    console.log('Navegador cerrado.');
  }
}

run();
