import axios from 'axios'
import { API_URL, AUTH_API_URL } from '../config/api'
import { clearSession, getAuthToken, getRefreshToken, updateSessionTokens } from '../auth/session'

export const inventoryApi = axios.create({
  baseURL: API_URL
})

export const authApi = axios.create({
  baseURL: AUTH_API_URL
})

const AUTH_LOGIN_ENDPOINT = '/api/auth/login'
const AUTH_REFRESH_ENDPOINT = '/api/auth/refresh'
let refreshSessionPromise = null

const redirectToLogin = () => {
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/login') return
  window.location.replace('/login')
}

const resolveToken = (payload = {}) => (
  payload?.token ||
  payload?.jwt ||
  payload?.accessToken ||
  payload?.access_token ||
  ''
)

const resolveRefreshToken = (payload = {}) => (
  payload?.refreshToken ||
  payload?.refresh_token ||
  ''
)

const isAuthEndpoint = (url, endpoint) => {
  const requestUrl = String(url || '')
  return requestUrl === endpoint || requestUrl.endsWith(endpoint)
}

const requestNewAccessToken = async () => {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('No hay refresh token disponible.')
  }

  const response = await authApi.post(AUTH_REFRESH_ENDPOINT, { refreshToken })
  const payload = response?.data || {}
  const token = String(resolveToken(payload) || '').trim()
  const nextRefreshToken = String(resolveRefreshToken(payload) || refreshToken).trim()

  if (!token) {
    throw new Error('La respuesta de renovacion no contiene token.')
  }

  updateSessionTokens({
    token,
    refreshToken: nextRefreshToken,
    role: payload?.role || payload?.rol || '',
    email: payload?.email || '',
    name: payload?.name || payload?.nombre || payload?.fullName || payload?.fullname || ''
  })

  return token
}

const refreshAccessToken = async () => {
  if (!refreshSessionPromise) {
    refreshSessionPromise = requestNewAccessToken().finally(() => {
      refreshSessionPromise = null
    })
  }

  return refreshSessionPromise
}

const handleAuthFailure = async (error) => {
  const status = error?.response?.status
  const originalRequest = error?.config || {}
  const requestUrl = String(originalRequest?.url || '')
  const isLoginRequest = isAuthEndpoint(requestUrl, AUTH_LOGIN_ENDPOINT)
  const isRefreshRequest = isAuthEndpoint(requestUrl, AUTH_REFRESH_ENDPOINT)

  if (status === 401 && !isLoginRequest && !isRefreshRequest && !originalRequest._retry) {
    try {
      originalRequest._retry = true
      const token = await refreshAccessToken()
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${token}`
      }

      return axios(originalRequest)
    } catch {
      clearSession()
      redirectToLogin()
    }
  }

  // Solo 401 invalida sesion. 403 se maneja en UI como "sin permisos" sin expulsar al usuario.
  if (status === 401 && !isLoginRequest) {
    clearSession()
    redirectToLogin()
  }

  return Promise.reject(error)
}

inventoryApi.interceptors.response.use((response) => response, handleAuthFailure)
authApi.interceptors.response.use((response) => response, handleAuthFailure)

export const buildAuthHeaders = (token) => {
  const authToken = (token || getAuthToken()).trim()

  if (!authToken) {
    clearSession()
    redirectToLogin()
    throw new Error('No hay token de autenticacion. Inicia sesion o configura VITE_DEV_TOKEN.')
  }

  return {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
}

export const normalizeApiError = (error, fallbackMessage) => {
  const status = error?.response?.status
  const payload = error?.response?.data
  const backendMessage =
    payload?.message ||
    payload?.error ||
    (typeof payload === 'string' ? payload : '') ||
    error?.message ||
    fallbackMessage

  const isUnauthorized =
    status === 401 ||
    /unauthorized|jwt|token|expir|no autorizado/i.test(backendMessage)

  const isForbidden =
    status === 403 ||
    /forbidden|denegado|permiso|acceso/i.test(backendMessage)

  const userFriendlyMessage = isForbidden
    ? 'No tienes permisos para realizar esta accion con tu rol actual.'
    : isUnauthorized
      ? 'Tu sesion expiro o el token no es valido. Inicia sesion nuevamente y actualiza el token.'
      : backendMessage

  return {
    status,
    rawMessage: backendMessage,
    message: userFriendlyMessage,
    isAuthError: isUnauthorized || isForbidden,
    isUnauthorized,
    isForbidden,
    isNotFound: status === 404 || /no encontrado|not found/i.test(backendMessage),
    isDuplicateCode: /duplic|exist|codigo|c[oó]digo/i.test(backendMessage),
    isDuplicateEmail:
      status === 409 ||
      (/email|correo/i.test(backendMessage) && /duplic|exist|registrad/i.test(backendMessage))
  }
}
