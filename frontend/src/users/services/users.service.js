import { buildAuthHeaders, normalizeApiError, authApi } from '../../shared/services/api.service'
import { getRoleApiCandidates } from '../../shared/constants/roles'

const USERS_ENDPOINT = '/usuarios'

const mapUser = (user = {}) => ({
  id: user?.id,
  nombre: user?.nombre || '',
  email: user?.email || '',
  rol: user?.rol || '',
  estado: String(user?.estado || 'ACTIVO').toUpperCase()
})

const requestWithFallbackEndpoints = async ({ method, endpoints, payload, token, fallbackMessage }) => {
  let lastError = null

  for (const endpoint of endpoints) {
    try {
      const response = await authApi.request({
        method,
        url: endpoint,
        data: payload,
        headers: buildAuthHeaders(token)
      })

      return response
    } catch (error) {
      const normalizedError = normalizeApiError(error, fallbackMessage)
      lastError = normalizedError

      // Cuando el endpoint no existe en backend, se prueba la siguiente ruta candidata.
      if (normalizedError.status === 404 || normalizedError.status === 405) continue

      throw normalizedError
    }
  }

  throw (
    lastError ||
    new Error(fallbackMessage || 'No se pudo completar la solicitud.')
  )
}

export const getUsers = async (token) => {
  try {
    const response = await authApi.get(USERS_ENDPOINT, {
      headers: buildAuthHeaders(token)
    })

    return Array.isArray(response.data) ? response.data.map(mapUser) : []
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo cargar la lista de usuarios.')
  }
}

export const createUser = async (data, token) => {
  const basePayload = {
    nombre: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    rol: ''
  }
  const roleCandidates = getRoleApiCandidates(data.role)
  let lastError = null

  for (const apiRole of roleCandidates) {
    try {
      const response = await authApi.post(USERS_ENDPOINT, { ...basePayload, rol: apiRole }, {
        headers: buildAuthHeaders(token)
      })

      return mapUser(response.data)
    } catch (error) {
      const normalizedError = normalizeApiError(error, 'No se pudo crear el usuario.')
      lastError = normalizedError

      const roleNotFound =
        /rol no encontrado|role not found/i.test(normalizedError.rawMessage || '')

      // Errores de permisos/autenticación no deben reintentarse, salvo cuando backend indique rol no encontrado.
      if ((normalizedError.isForbidden || normalizedError.isUnauthorized) && !roleNotFound) {
        throw normalizedError
      }
    }
  }

  throw (lastError || new Error('No se pudo crear el usuario.'))
}

export const updateUser = async ({ id, fullName, email, role }, token) => {
  const payload = {
    nombre: String(fullName || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    rol: ''
  }

  const roleCandidates = getRoleApiCandidates(role)
  let lastError = null

  for (const apiRole of roleCandidates) {
    try {
      const response = await requestWithFallbackEndpoints({
        method: 'put',
        endpoints: [`${USERS_ENDPOINT}/${id}`, `${USERS_ENDPOINT}/${id}/perfil`],
        payload: { ...payload, rol: apiRole },
        token,
        fallbackMessage: 'No se pudo actualizar el usuario.'
      })

      return mapUser(response.data)
    } catch (error) {
      const normalizedError = error?.status ? error : normalizeApiError(error, 'No se pudo actualizar el usuario.')
      lastError = normalizedError

      const roleNotFound = /rol no encontrado|role not found/i.test(normalizedError.rawMessage || '')
      if ((normalizedError.isForbidden || normalizedError.isUnauthorized) && !roleNotFound) {
        throw normalizedError
      }
    }
  }

  throw (lastError || new Error('No se pudo actualizar el usuario.'))
}

export const toggleUserStatus = async ({ id, isActive }, token) => {
  const endpointCandidates = [
    `${USERS_ENDPOINT}/${id}/estado`,
    `${USERS_ENDPOINT}/${id}/status`,
    `${USERS_ENDPOINT}/${id}/${isActive ? 'activar' : 'desactivar'}`
  ]

  const payloadCandidates = [
    { estado: isActive ? 'ACTIVO' : 'INACTIVO' },
    { estado: isActive },
    {}
  ]

  let lastError = null

  for (const payload of payloadCandidates) {
    try {
      const response = await requestWithFallbackEndpoints({
        method: 'patch',
        endpoints: endpointCandidates,
        payload,
        token,
        fallbackMessage: 'No se pudo actualizar el estado del usuario.'
      })

      return mapUser(response.data)
    } catch (error) {
      lastError = error?.status ? error : normalizeApiError(error, 'No se pudo actualizar el estado del usuario.')
    }
  }

  throw (lastError || new Error('No se pudo actualizar el estado del usuario.'))
}

export const changeUserPassword = async ({ id, currentPassword, newPassword }, token) => {
  const endpointCandidates = [
    `${USERS_ENDPOINT}/${id}/password`,
    `${USERS_ENDPOINT}/${id}/contrasena`,
    `/users/${id}/password`
  ]

  const payloadCandidates = [
    { passwordActual: currentPassword, nuevaPassword: newPassword },
    { currentPassword, newPassword },
    { nuevaPassword: newPassword },
    { newPassword },
    { password: newPassword }
  ]

  let lastError = null

  for (const payload of payloadCandidates) {
    try {
      const response = await requestWithFallbackEndpoints({
        method: 'put',
        endpoints: endpointCandidates,
        payload,
        token,
        fallbackMessage: 'No se pudo cambiar la contraseña.'
      })

      return response.data
    } catch (error) {
      const normalizedError = error?.status ? error : normalizeApiError(error, 'No se pudo cambiar la contraseña.')
      lastError = normalizedError

      // Un 400 ya trae una validacion funcional del backend (ej: contraseña actual incorrecta),
      // por eso no se debe seguir intentando payloads alternos que puedan sobreescribir el mensaje.
      if (normalizedError.status === 400) {
        throw normalizedError
      }

      if (normalizedError.isForbidden || normalizedError.isUnauthorized || normalizedError.isNotFound) {
        throw normalizedError
      }
    }
  }

  throw (lastError || new Error('No se pudo cambiar la contraseña.'))
}
