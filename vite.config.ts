import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('xlsx')) {
              return 'vendor-excel';
            }
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('@supabase') || id.includes('@tanstack') || id.includes('react-router-dom')) {
              return 'vendor-core';
            }
          }
        }
      }
    }
  }
})
