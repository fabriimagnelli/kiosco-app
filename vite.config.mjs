import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // <--- OBLIGATORIO para Electron
  build: {
    outDir: 'server/public', // <--- OBLIGATORIO: Guardar en la carpeta pública del server
    emptyOutDir: true
  }
})