import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // CAMBIO CLAVE: Guardamos el frontend DIRECTAMENTE dentro del servidor
    outDir: 'server/public', 
    emptyOutDir: true
  }
})