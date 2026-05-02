import { authApi, normalizeApiError } from '../../shared/services/api.service'
import { normalizeRole } from '../../shared/constants/roles'

const AUTH_LOGIN_ENDPOINT = '/api/auth/login'
const AUTH_REFRESH_ENDPOINT = '/api/auth/refresh'

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

export const login = async ({ email, password }) => {
  try {
    const response = await authApi.post(AUTH_LOGIN_ENDPOINT, {
      email: String(email || '').trim().toLowerCase(),
      password: String(password || '')
    })

    const payload = response?.data || {}
    const token = String(resolveToken(payload) || '').trim()
    const role = normalizeRole(payload?.role || payload?.rol || '')
    const userEmail = String(payload?.email || email || '').trim().toLowerCase()
    const userName = String(
      payload?.name ||
      payload?.nombre ||
      payload?.fullName ||
      payload?.fullname ||
      ''
    ).trim()

    if (!token) {
      throw new Error('La respuesta de login no contiene token.')
    }

    return {
      token,
      refreshToken: String(resolveRefreshToken(payload) || '').trim(),
      role,
      email: userEmail,
      name: userName
    }
  } catch (error) {
    const normalizedError = normalizeApiError(error, 'No fue posible iniciar sesión.')

    if (normalizedError.status === 401 || normalizedError.status === 403) {
      throw {
        ...normalizedError,
        message: 'Credenciales incorrectas. Verifica tu correo y contraseña.'
      }
    }

    if (normalizedError.status >= 500) {
      throw {
        ...normalizedError,
        message: 'Error del servidor al iniciar sesión. Intenta nuevamente.'
      }
    }

    throw normalizedError
  }
}

export const refreshSession = async (refreshToken) => {
  try {
    const response = await authApi.post(AUTH_REFRESH_ENDPOINT, {
      refreshToken: String(refreshToken || '').trim()
    })

    const payload = response?.data || {}
    const token = String(resolveToken(payload) || '').trim()
    const nextRefreshToken = String(resolveRefreshToken(payload) || refreshToken || '').trim()

    if (!token) {
      throw new Error('La respuesta de renovacion no contiene token.')
    }

    return {
      token,
      refreshToken: nextRefreshToken,
      role: normalizeRole(payload?.role || payload?.rol || ''),
      email: String(payload?.email || '').trim().toLowerCase(),
      name: String(
        payload?.name ||
        payload?.nombre ||
        payload?.fullName ||
        payload?.fullname ||
        ''
      ).trim()
    }
  } catch (error) {
    throw normalizeApiError(error, 'No fue posible renovar la sesion.')
  }
}
