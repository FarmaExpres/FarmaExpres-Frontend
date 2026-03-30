const resolveApiBaseUrl = () => {
  const explicitBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()
  if (explicitBaseUrl) return explicitBaseUrl

  // En desarrollo se usa proxy local para evitar CORS.
  // Se deja base vacía porque los servicios ya incluyen el prefijo /api en sus endpoints.
  if (import.meta.env.DEV) return ''

  // En build/producción se usa gateway directo por defecto.
  return 'http://localhost:8080'
}

const API_BASE_URL = resolveApiBaseUrl()

export const API_URL = API_BASE_URL
export const AUTH_API_URL = API_BASE_URL
