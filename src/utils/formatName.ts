// src/utils/formatName.ts

/**
 * Diccionario de correcciones automáticas para nombres españoles comunes
 * sin tilde → con tilde correcta
 */
const ACCENT_CORRECTIONS: Record<string, string> = {
  // Nombres masculinos
  'Adrian':    'Adrián',
  'Agustin':   'Agustín',
  'Aitor':     'Aitor',
  'Alvaro':    'Álvaro',
  'Angel':     'Ángel',
  'Andres':    'Andrés',
  'Benjamin':  'Benjamín',
  'Cesar':     'César',
  'Christian': 'Christian',
  'Daniel':    'Daniel',
  'David':     'David',
  'Diego':     'Diego',
  'Elias':     'Elías',
  'Enrique':   'Enrique',
  'Ezequiel':  'Ezequiel',
  'Fabian':    'Fabián',
  'Felix':     'Félix',
  'Fernando':  'Fernando',
  'Francisco': 'Francisco',
  'German':    'Germán',
  'Gonzalo':   'Gonzalo',
  'Guillermo': 'Guillermo',
  'Hector':    'Héctor',
  'Ivan':      'Iván',
  'Joaquin':   'Joaquín',
  'Jose':      'José',
  'Juan':      'Juan',
  'Julian':    'Julián',
  'Lazaro':    'Lázaro',
  'Lucas':     'Lucas',
  'Luis':      'Luis',
  'Manuel':    'Manuel',
  'Marcos':    'Marcos',
  'Martin':    'Martín',
  'Miguel':    'Miguel',
  'Nicolas':   'Nicolás',
  'Oscar':     'Óscar',
  'Pablo':     'Pablo',
  'Ramon':     'Ramón',
  'Raul':      'Raúl',
  'Ruben':     'Rubén',
  'Samuel':    'Samuel',
  'Santana':   'Santana',
  'Santiago':  'Santiago',
  'Sergio':    'Sergio',
  'Simon':     'Simón',
  'Tomas':     'Tomás',
  'Victor':    'Víctor',
  'Victorino': 'Victorino',

  // Nombres femeninos
  'Adriana':    'Adriana',
  'Africa':     'África',
  'Agustina':   'Agustina',
  'Alejandra':  'Alejandra',
  'Alicia':     'Alicia',
  'Amalia':     'Amalia',
  'Amparo':     'Amparo',
  'Ana':        'Ana',
  'Andrea':     'Andrea',
  'Angeles':    'Ángeles',
  'Antonia':    'Antonia',
  'Aurora':     'Aurora',
  'Beatriz':    'Beatriz',
  'Belen':      'Belén',
  'Blanca':     'Blanca',
  'Berta':      'Berta',
  'Carmen':     'Carmen',
  'Carolina':   'Carolina',
  'Cecilia':    'Cecilia',
  'Celia':      'Celia',
  'Clara':      'Clara',
  'Concepcion': 'Concepción',
  'Cristina':   'Cristina',
  'Dolores':    'Dolores',
  'Elena':      'Elena',
  'Elisa':      'Elisa',
  'Elvira':     'Elvira',
  'Esperanza':  'Esperanza',
  'Eva':        'Eva',
  'Fatima':     'Fátima',
  'Francisca':  'Francisca',
  'Gloria':     'Gloria',
  'Ines':       'Inés',
  'Irene':      'Irene',
  'Isabel':     'Isabel',
  'Jessica':    'Jéssica',
  'Julia':      'Julia',
  'Laura':      'Laura',
  'Leticia':    'Leticia',
  'Lidia':      'Lidia',
  'Lucia':      'Lucía',
  'Luisa':      'Luisa',
  'Mar':        'Mar',
  'Maria':      'María',
  'Monica':     'Mónica',
  'Natalia':    'Natalia',
  'Nerea':      'Nerea',
  'Noelia':     'Noelia',
  'Nuria':      'Nuria',
  'Olga':       'Olga',
  'Patricia':   'Patricia',
  'Paula':      'Paula',
  'Pilar':      'Pilar',
  'Raquel':     'Raquel',
  'Rebeca':     'Rebeca',
  'Rosa':       'Rosa',
  'Rosario':    'Rosario',
  'Ruth':       'Ruth',
  'Sandra':     'Sandra',
  'Sara':       'Sara',
  'Silvia':     'Silvia',
  'Sofia':      'Sofía',
  'Sonia':      'Sonia',
  'Susana':     'Susana',
  'Teresa':     'Teresa',
  'Vanesa':     'Vanesa',
  'Veronica':   'Verónica',
  'Virginia':   'Virginia',
  'Yolanda':    'Yolanda',

  // Apellidos frecuentes
  'Alvarez':    'Álvarez',
  'Fernandez':  'Fernández',
  'Garcia':     'García',
  'Gonzalez':   'González',
  'Gutierrez':  'Gutiérrez',
  'Hernandez':  'Hernández',
  'Jimenez':    'Jiménez',
  'Lopez':      'López',
  'Martinez':   'Martínez',
  'Mendez':     'Méndez',
  'Muñoz':      'Muñoz',
  'Nuñez':      'Núñez',
  'Ortega':     'Ortega',
  'Perez':      'Pérez',
  'Ramirez':    'Ramírez',
  'Rodriguez':  'Rodríguez',
  'Ruiz':       'Ruiz',
  'Sanchez':    'Sánchez',
  'Torres':     'Torres',
  'Vazquez':    'Vázquez',
};

/**
 * Formatea el nombre de un cliente:
 * - Convierte a Title Case (primera letra de cada palabra en mayúscula)
 * - Corrige tildes en nombres y apellidos españoles comunes
 */
export function formatClientName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';

  // 1. Convertir a Title Case: primera letra mayúscula, resto minúsculas
  const titleCased = trimmed
    .toLowerCase()
    .replace(/(?:^|[\s-])(\S)/g, (match) => match.toUpperCase());

  // 2. Corregir tildes palabra por palabra
  const corrected = titleCased
    .split(' ')
    .map(word => ACCENT_CORRECTIONS[word] ?? word)
    .join(' ');

  return corrected;
}
