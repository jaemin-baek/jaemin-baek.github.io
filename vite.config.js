import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [react()],
  base: '/',
})
