const resolveApiBaseUrl = () => {
  const explicitBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()
  if (explicitBaseUrl) return explicitBaseUrl

  // Base vacía para usar rutas relativas (/api/...) y evitar CORS:
  // - En desarrollo: Vite proxy enruta al backend.
  // - En Docker/Nginx: Nginx proxy enruta al backend.
  // Si se requiere otro host, definir VITE_API_BASE_URL explícitamente.
  return ''
}

const API_BASE_URL = resolveApiBaseUrl()

export const API_URL = API_BASE_URL
export const AUTH_API_URL = API_BASE_URL
