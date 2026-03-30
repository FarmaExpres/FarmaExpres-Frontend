import { buildAuthHeaders, normalizeApiError, authApi } from '../../shared/services/api.service'
import { getRoleApiCandidates } from '../../shared/constants/roles'

const USERS_ENDPOINT = '/api/users'

const mapStatusToUi = (status, active) => {
  if (typeof active === 'boolean') return active ? 'ACTIVO' : 'INACTIVO'

  const normalizedStatus = String(status || '').trim().toUpperCase()
  if (['INACTIVE', 'INACTIVO', 'BLOCKED', 'BLOQUEADO'].includes(normalizedStatus)) return 'INACTIVO'
  return 'ACTIVO'
}

const mapUser = (user = {}) => ({
  id: user?.id,
  nombre: String(user?.name ?? user?.nombre ?? '').trim(),
  email: String(user?.email ?? '').trim().toLowerCase(),
  rol: String(user?.role ?? user?.rol ?? '').trim().toUpperCase(),
  estado: mapStatusToUi(user?.status ?? user?.estado, user?.active ?? user?.activo)
})

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
  const roleCandidates = getRoleApiCandidates(data.role)
  let lastError = null

  for (const apiRole of roleCandidates) {
    try {
      const payload = {
        name: String(data?.fullName || '').trim(),
        email: String(data?.email || '').trim().toLowerCase(),
        password: String(data?.password || ''),
        role: apiRole
      }

      const response = await authApi.post(USERS_ENDPOINT, payload, {
        headers: buildAuthHeaders(token)
      })

      return mapUser(response.data)
    } catch (error) {
      const normalizedError = normalizeApiError(error, 'No se pudo crear el usuario.')
      lastError = normalizedError

      const roleNotFound =
        /rol no encontrado|role not found|invalid role|unknown role/i.test(normalizedError.rawMessage || '')

      // Errores de permisos/autenticación no deben reintentarse, salvo cuando backend indique rol no encontrado.
      if ((normalizedError.isForbidden || normalizedError.isUnauthorized) && !roleNotFound) {
        throw normalizedError
      }
    }
  }

  throw (lastError || new Error('No se pudo crear el usuario.'))
}

export const updateUser = async ({ id, fullName, email, role }, token) => {
  const roleCandidates = getRoleApiCandidates(role)
  let lastError = null

  for (const apiRole of roleCandidates) {
    try {
      const payload = {
        name: String(fullName || '').trim(),
        email: String(email || '').trim().toLowerCase(),
        role: apiRole
      }

      const response = await authApi.put(`${USERS_ENDPOINT}/${id}/update`, payload, {
        headers: buildAuthHeaders(token)
      })

      return mapUser(response.data)
    } catch (error) {
      const normalizedError = normalizeApiError(error, 'No se pudo actualizar el usuario.')
      lastError = normalizedError

      const roleNotFound = /rol no encontrado|role not found|invalid role|unknown role/i.test(normalizedError.rawMessage || '')
      if ((normalizedError.isForbidden || normalizedError.isUnauthorized) && !roleNotFound) {
        throw normalizedError
      }
    }
  }

  throw (lastError || new Error('No se pudo actualizar el usuario.'))
}

export const toggleUserStatus = async ({ id, isActive }, token) => {
  try {
    const action = isActive ? 'unlock' : 'block'
    const response = await authApi.put(`${USERS_ENDPOINT}/${id}/${action}`, null, {
      headers: buildAuthHeaders(token)
    })

    return mapUser(response.data || { id, active: isActive })
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo actualizar el estado del usuario.')
  }
}

export const changeUserPassword = async ({ id, currentPassword, newPassword }, token) => {
  try {
    const payload = {
      currentpassword: String(currentPassword || ''),
      newPassword: String(newPassword || '')
    }

    const response = await authApi.put(`${USERS_ENDPOINT}/${id}/password`, payload, {
      headers: buildAuthHeaders(token)
    })

    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo cambiar la contraseña.')
  }
}
