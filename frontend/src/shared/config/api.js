const INVENTORY_DEV_PROXY = '/inventory-api'
const AUTH_DEV_PROXY = '/auth-api'

// En desarrollo se usa proxy de Vite para evitar bloqueos CORS sin modificar backend.
export const API_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? INVENTORY_DEV_PROXY : 'http://localhost:8082')
).trim()

// En desarrollo se usa proxy de Vite para evitar bloqueos CORS sin modificar backend.
export const AUTH_API_URL = (
  import.meta.env.VITE_AUTH_API_URL ||
  (import.meta.env.DEV ? AUTH_DEV_PROXY : 'http://localhost:8081')
).trim()
