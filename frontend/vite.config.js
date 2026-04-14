import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Permite cambiar puertos/targets por ambiente con `.env.<mode>`.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const vitePort = Number(env.VITE_DEV_SERVER_PORT || 3000)
  const proxyTarget = String(env.VITE_PROXY_TARGET || 'http://localhost:8080').trim()

  return {
    plugins: [react()],
    server: {
      port: vitePort,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
