import { authApi, normalizeApiError } from '../../shared/services/api.service'
import { normalizeRole } from '../../shared/constants/roles'

const AUTH_LOGIN_ENDPOINT = '/api/auth/login'

const resolveToken = (payload = {}) => (
  payload?.token ||
  payload?.jwt ||
  payload?.accessToken ||
  payload?.access_token ||
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
