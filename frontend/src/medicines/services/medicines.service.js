import axios from 'axios'

const API_URL = 'http://localhost:8082'
const MEDICINES_ENDPOINT = '/productos'

// Prioriza token explícito; si no existe, intenta obtenerlo desde sesión local o variable de entorno.
const getAuthToken = (token) => token || localStorage.getItem('authToken') || import.meta.env.VITE_DEV_TOKEN || ''

const getAuthHeaders = (token) => {
  const authToken = getAuthToken(token).trim()

  if (!authToken) {
    throw new Error('No hay token de autenticación. Inicia sesión o configura VITE_DEV_TOKEN.')
  }

  return {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
}

const normalizeApiError = (error, fallbackMessage) => {
  const status = error?.response?.status
  const payload = error?.response?.data
  const backendMessage =
    payload?.message ||
    payload?.error ||
    (typeof payload === 'string' ? payload : '') ||
    error?.message ||
    fallbackMessage
  const isAuthError =
    status === 401 ||
    status === 403 ||
    /forbidden|unauthorized|jwt|token|expir/i.test(backendMessage)
  const userFriendlyMessage = isAuthError
    ? 'Tu sesión expiró o el token no es válido. Inicia sesión nuevamente y actualiza el token.'
    : backendMessage

  return {
    status,
    message: userFriendlyMessage,
    isAuthError,
    isNotFound: status === 404 || /no encontrado|not found/i.test(backendMessage),
    isDuplicateCode: /duplic|exist|codigo|código/i.test(backendMessage)
  }
}

export const getMedicines = async (token) => {
  try {
    const response = await axios.get(`${API_URL}${MEDICINES_ENDPOINT}`, {
      headers: getAuthHeaders(token)
    })

    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener la lista de medicamentos.')
  }
}

export const createMedicine = async (data, token) => {
  try {
    const response = await axios.post(`${API_URL}${MEDICINES_ENDPOINT}`, data, {
      headers: getAuthHeaders(token)
    })

    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo registrar el medicamento.')
  }
}

export const updateMedicine = async (id, data, token) => {
  try {
    const response = await axios.put(`${API_URL}${MEDICINES_ENDPOINT}/${id}`, data, {
      headers: getAuthHeaders(token)
    })

    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo actualizar el medicamento.')
  }
}

export const deactivateMedicine = async (id, token) => {
  try {
    const response = await axios.delete(`${API_URL}${MEDICINES_ENDPOINT}/${id}`, {
      headers: getAuthHeaders(token)
    })

    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo desactivar el medicamento.')
  }
}
