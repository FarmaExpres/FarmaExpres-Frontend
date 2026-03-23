import { normalizeRole, ROLES } from '../constants/roles'

const parseJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padding = '='.repeat((4 - (normalizedPayload.length % 4)) % 4)
    const json = atob(normalizedPayload + padding)

    return JSON.parse(json)
  } catch {
    return null
  }
}

const getRoleFromToken = (token) => {
  const payload = parseJwtPayload(token)
  return normalizeRole(payload?.rol || payload?.role || '')
}

const getUserFromToken = (token) => {
  const payload = parseJwtPayload(token) || {}

  return {
    email: String(payload?.email || payload?.sub || '').trim(),
    name: String(payload?.nombre || payload?.name || '').trim()
  }
}

const sanitizeToken = (rawToken) => String(rawToken || '').replace(/^Bearer\s+/i, '').trim()

export const getAuthToken = () => sanitizeToken(localStorage.getItem('authToken') || import.meta.env.VITE_DEV_TOKEN || '')

export const getSession = () => {
  const token = getAuthToken()
  const tokenRole = getRoleFromToken(token)
  const tokenUser = getUserFromToken(token)
  const persistedRole = normalizeRole(localStorage.getItem('authUserRole') || '')
  const envRole = normalizeRole(import.meta.env.VITE_DEV_ROLE || '')
  const hasToken = Boolean(token)

  // Si hay token, se prioriza su rol real para no habilitar acciones que backend rechazará (403).
  const role = hasToken
    ? tokenRole
    : (persistedRole || envRole || ROLES.ADMIN)

  return {
    token,
    user: {
      email: tokenUser.email || localStorage.getItem('authUserEmail') || '',
      name: tokenUser.name || localStorage.getItem('authUserName') || ''
    },
    role,
    isAuthenticated: Boolean(token)
  }
}

export const isAdmin = (role) => normalizeRole(role) === ROLES.ADMIN

export const clearSession = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('authUserRole')
  localStorage.removeItem('authUserEmail')
  localStorage.removeItem('authUserName')
}
