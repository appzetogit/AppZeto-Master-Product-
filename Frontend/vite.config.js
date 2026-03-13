import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const foodSrc = path.resolve(__dirname, './src/modules/food/Quick-spicy-main/frontend/src')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Quick-spicy-main food module alias — all @/... imports inside food module resolve here
      '@food': foodSrc,
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/x-date-pickers',
      'mapbox-gl',
      'react-map-gl',
      'firebase/app',
      'firebase/auth',
      'firebase/messaging',
      'socket.io-client',
      'axios',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
