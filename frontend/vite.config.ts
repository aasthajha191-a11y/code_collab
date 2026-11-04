import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // REST API calls → backend
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // GitHub OAuth: only proxy the two backend routes
      // /auth/github       — initiates OAuth (backend redirects to GitHub)
      // /auth/github/callback — GitHub redirects back here (backend handles it)
      // /auth/me           — current user check
      // /auth/logout       — clear cookie
      // NOTE: /auth/callback is a FRONTEND React route — do NOT proxy it
      '/auth/github': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/auth/me': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/auth/logout': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Socket.IO WebSocket upgrade
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
