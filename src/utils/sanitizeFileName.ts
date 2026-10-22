/**
 * Sanitiza nombres de archivo para compatibilidad con Supabase Storage / AWS S3.
 * Elimina acentos, tildes (ej. Ó -> O, ñ -> n), reemplaza espacios y caracteres especiales
 * no permitidos por guiones bajos, garantizando que la 'key' sea válida y segura.
 */
export function sanitizeStorageFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
  const ext = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';

  const cleanName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita marcas diacríticas / acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Caracteres no permitidos por S3 / Supabase a _
    .replace(/_+/g, '_') // Evita múltiples guiones bajos seguidos
    .replace(/^_+|_+$/g, ''); // Quita guiones bajos sobrantes al inicio o al final

  const cleanExt = ext
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.]/g, '')
    .toLowerCase();

  return `${cleanName || 'documento'}${cleanExt}`;
}
