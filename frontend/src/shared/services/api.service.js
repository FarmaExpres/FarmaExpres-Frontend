import axios from 'axios'
import { API_URL, AUTH_API_URL } from '../config/api'
import { getAuthToken } from '../auth/session'

export const inventoryApi = axios.create({
  baseURL: API_URL
})

export const authApi = axios.create({
  baseURL: AUTH_API_URL
})

export const buildAuthHeaders = (token) => {
  const authToken = (token || getAuthToken()).trim()

  if (!authToken) {
    throw new Error('No hay token de autenticación. Inicia sesión o configura VITE_DEV_TOKEN.')
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
    ? 'No tienes permisos para realizar esta acción. Se requiere rol Administrador.'
    : isUnauthorized
      ? 'Tu sesión expiró o el token no es válido. Inicia sesión nuevamente y actualiza el token.'
      : backendMessage

  return {
    status,
    rawMessage: backendMessage,
    message: userFriendlyMessage,
    isAuthError: isUnauthorized || isForbidden,
    isUnauthorized,
    isForbidden,
    isNotFound: status === 404 || /no encontrado|not found/i.test(backendMessage),
    isDuplicateCode: /duplic|exist|codigo|código/i.test(backendMessage),
    isDuplicateEmail:
      status === 409 ||
      (/email|correo/i.test(backendMessage) && /duplic|exist|registrad/i.test(backendMessage))
  }
}
