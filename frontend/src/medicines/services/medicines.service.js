import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const MEDICINES_ENDPOINT = '/productos'

export const getMedicines = async (token) => {
  try {
    const response = await inventoryApi.get(MEDICINES_ENDPOINT, {
      headers: buildAuthHeaders(token)
    })

    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener la lista de medicamentos.')
  }
}

export const createMedicine = async (data, token) => {
  try {
    const response = await inventoryApi.post(MEDICINES_ENDPOINT, data, {
      headers: buildAuthHeaders(token)
    })

    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo registrar el medicamento.')
  }
}

export const updateMedicine = async (id, data, token) => {
  try {
    const response = await inventoryApi.put(`${MEDICINES_ENDPOINT}/${id}`, data, {
      headers: buildAuthHeaders(token)
    })

    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo actualizar el medicamento.')
  }
}

export const deactivateMedicine = async (id, token) => {
  try {
    const response = await inventoryApi.delete(`${MEDICINES_ENDPOINT}/${id}`, {
      headers: buildAuthHeaders(token)
    })

    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo desactivar el medicamento.')
  }
}
