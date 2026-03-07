import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Solo-Leveling-Fitness/', /* <-- ESTE ES EL CAMBIO CLAVE */
})
