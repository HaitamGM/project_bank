import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // WebSocket Gemini Live -> backend FastAPI (port 8000)
      '/ws': { target: 'ws://localhost:8000', ws: true },
      // API REST (santé, clients, transactions) -> backend FastAPI
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
