import { normalizeRole, ROLES } from '../constants/roles'

const decodeBase64UrlUtf8 = (payload) => {
  const normalizedPayload = String(payload || '').replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalizedPayload.length % 4)) % 4)
  const binary = atob(normalizedPayload + padding)

  try {
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    try {
      return decodeURIComponent(escape(binary))
    } catch {
      return binary
    }
  }
}

const repairMojibakeText = (value = '') => {
  const text = String(value || '')
  if (!/[ÃƒÃ‚]/.test(text)) return text

  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return text
  }
}

const parseJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const json = decodeBase64UrlUtf8(payload)

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
    name: repairMojibakeText(String(payload?.nombre || payload?.name || payload?.fullName || payload?.fullname || '').trim())
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

export const getRefreshToken = () => sanitizeToken(localStorage.getItem('authRefreshToken'))

export const getAuthToken = () => {
  const persistedToken = sanitizeToken(localStorage.getItem('authToken'))
  const envToken = sanitizeToken(import.meta.env.VITE_DEV_TOKEN || '')
  const token = persistedToken || envToken

  if (!token) return ''
  if (!isTokenExpired(token)) return token
  if (getRefreshToken()) return token

  localStorage.removeItem('authToken')
  localStorage.removeItem('authRefreshToken')
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

export const saveSession = ({ token, refreshToken, role, email, name } = {}) => {
  const sanitizedToken = sanitizeToken(token)
  const sanitizedRefreshToken = sanitizeToken(refreshToken)

  if (!sanitizedToken) {
    throw new Error('No se recibio un token de autenticacion valido.')
  }

  const tokenSession = getSessionFromToken(sanitizedToken)
  const normalizedRole = normalizeRole(role || tokenSession.role || '')
  const normalizedEmail = String(email || tokenSession.user.email || '').trim().toLowerCase()
  const normalizedName = String(
    name ||
    tokenSession.user.name ||
    buildDisplayNameFromEmail(normalizedEmail)
  ).trim()
  const safeName = repairMojibakeText(normalizedName)

  localStorage.setItem('authToken', sanitizedToken)
  if (sanitizedRefreshToken) {
    localStorage.setItem('authRefreshToken', sanitizedRefreshToken)
  }
  localStorage.setItem('authUserRole', normalizedRole)
  localStorage.setItem('authUserEmail', normalizedEmail)
  localStorage.setItem('authUserName', safeName)
}

export const updateSessionTokens = ({ token, refreshToken, role, email, name } = {}) => {
  const persistedRole = normalizeRole(localStorage.getItem('authUserRole') || '')
  const persistedEmail = String(localStorage.getItem('authUserEmail') || '').trim().toLowerCase()
  const persistedName = repairMojibakeText(localStorage.getItem('authUserName') || '')

  saveSession({
    token,
    refreshToken: refreshToken || getRefreshToken(),
    role: role || persistedRole,
    email: email || persistedEmail,
    name: name || persistedName
  })
}

export const getSession = () => {
  const token = getAuthToken()
  const tokenRole = getRoleFromToken(token)
  const tokenUser = getUserFromToken(token)
  const persistedRole = normalizeRole(localStorage.getItem('authUserRole') || '')
  const envRole = normalizeRole(import.meta.env.VITE_DEV_ROLE || '')
  const hasToken = Boolean(token)

  const role = hasToken
    ? tokenRole
    : (persistedRole || envRole || ROLES.ADMIN)

  return {
    token,
    user: {
      email: tokenUser.email || localStorage.getItem('authUserEmail') || '',
      name: tokenUser.name || repairMojibakeText(localStorage.getItem('authUserName') || '')
    },
    role,
    isAuthenticated: Boolean(token)
  }
}

export const isAdmin = (role) => normalizeRole(role) === ROLES.ADMIN

export const clearSession = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('authRefreshToken')
  localStorage.removeItem('authUserRole')
  localStorage.removeItem('authUserEmail')
  localStorage.removeItem('authUserName')
}
