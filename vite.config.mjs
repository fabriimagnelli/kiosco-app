import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: false,
  },
  base: './', // <--- OBLIGATORIO para Electron
  build: {
    outDir: 'server/public', // <--- OBLIGATORIO: Guardar en la carpeta pública del server
    emptyOutDir: true
  }
})