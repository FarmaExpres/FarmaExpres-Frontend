import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false
      },
      '/api/users': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false
      },
      '/api/binnacle': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false
      },
      '/api/products': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
