import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// /api and /images are proxied to the FastAPI backend (backend/main.py on :8000)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/images': 'http://127.0.0.1:8000',
    },
  },
})
