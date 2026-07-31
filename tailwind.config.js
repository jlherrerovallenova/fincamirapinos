/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mantenemos 'pine' para compatibilidad con páginas antiguas
        pine: {
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#10b981',
          800: '#065f46',
          900: '#064e3b',
        },
        // Añadimos 'slate' específico para el nuevo modo oscuro/contraste
        slate: {
          850: '#1e293b', 
          950: '#020617', 
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Eliminamos los bordes exagerados (4xl) del diseño anterior en los nuevos componentes
    },
  },
  plugins: [],
};