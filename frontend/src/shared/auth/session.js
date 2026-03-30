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
    name: String(payload?.nombre || payload?.name || payload?.fullName || payload?.fullname || '').trim()
  }
}

const sanitizeToken = (rawToken) => String(rawToken || '').replace(/^Bearer\s+/i, '').trim()

const toTitleCase = (value = '') => (
  String(value || '')
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ')
)

const buildDisplayNameFromEmail = (email = '') => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail.includes('@')) return ''

  const localPart = normalizedEmail.split('@')[0] || ''
  return toTitleCase(localPart)
}

const isTokenExpired = (token) => {
  const payload = parseJwtPayload(token)
  const exp = Number(payload?.exp)
  if (!Number.isFinite(exp)) return false

  const nowInSeconds = Math.floor(Date.now() / 1000)
  return exp <= nowInSeconds
}

export const getAuthToken = () => {
  const persistedToken = sanitizeToken(localStorage.getItem('authToken'))
  const envToken = sanitizeToken(import.meta.env.VITE_DEV_TOKEN || '')
  const token = persistedToken || envToken

  if (!token) return ''
  if (!isTokenExpired(token)) return token

  // Si el token venció se limpia sesión persistida para forzar nuevo login.
  localStorage.removeItem('authToken')
  localStorage.removeItem('authUserRole')
  localStorage.removeItem('authUserEmail')
  localStorage.removeItem('authUserName')
  return ''
}

const getSessionFromToken = (token) => {
  const sanitizedToken = sanitizeToken(token)
  const payload = parseJwtPayload(sanitizedToken) || {}
  const roleFromToken = getRoleFromToken(sanitizedToken)

  return {
    token: sanitizedToken,
    role: roleFromToken || normalizeRole(payload?.role || payload?.rol || ''),
    user: {
      email: String(payload?.email || payload?.sub || '').trim(),
      name: String(payload?.name || payload?.nombre || '').trim()
    }
  }
}

export const saveSession = ({ token, role, email, name } = {}) => {
  const sanitizedToken = sanitizeToken(token)

  if (!sanitizedToken) {
    throw new Error('No se recibió un token de autenticación válido.')
  }

  const tokenSession = getSessionFromToken(sanitizedToken)
  const normalizedRole = normalizeRole(role || tokenSession.role || '')
  const normalizedEmail = String(email || tokenSession.user.email || '').trim().toLowerCase()
  const normalizedName = String(
    name ||
    tokenSession.user.name ||
    buildDisplayNameFromEmail(normalizedEmail)
  ).trim()

  localStorage.setItem('authToken', sanitizedToken)
  localStorage.setItem('authUserRole', normalizedRole)
  localStorage.setItem('authUserEmail', normalizedEmail)
  localStorage.setItem('authUserName', normalizedName)
}

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
