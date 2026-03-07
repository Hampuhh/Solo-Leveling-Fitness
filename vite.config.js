import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/mi-sistema-fitness/', /* ¡ESTA LÍNEA ES CRUCIAL! Pon el nombre exacto de tu repositorio entre las barras */
})