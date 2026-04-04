import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const PRODUCTS_ENDPOINT = '/api/products'
const ACTIVE_TABLE_ENDPOINT = '/api/products/active-table'
const ACTIVE_SUMMARY_ENDPOINT = '/api/products/active-summary'

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const mapProduct = (product = {}) => {
  const activeFromStatus = String(product?.status || product?.estado || '').trim().toUpperCase()
  const hasBooleanActive = typeof product?.active === 'boolean' || typeof product?.activo === 'boolean'
  const isActive = hasBooleanActive
    ? Boolean(product?.active ?? product?.activo)
    : activeFromStatus
      ? activeFromStatus !== 'INACTIVE' && activeFromStatus !== 'INACTIVO'
      : true

  return {
    id: product?.id,
    codigo: String(product?.code ?? product?.codigo ?? '').trim(),
    nombre: String(product?.name ?? product?.nombre ?? '').trim(),
    stock: toNumberOrDefault(product?.stock, 0),
    stockMinimo: toNumberOrDefault(product?.minimumStock ?? product?.stockMinimo, 0),
    precio: toNumberOrDefault(product?.unitPrice ?? product?.precio, 0),
    fechavencimiento: String(product?.expirationDate ?? product?.fechavencimiento ?? '').trim(),
    activo: isActive
  }
}

const mapActiveInventoryRow = (item = {}) => ({
  id: item?.id ?? item?.code ?? null,
  codigo: String(item?.code ?? item?.codigo ?? '').trim(),
  nombre: String(item?.name ?? item?.nombre ?? '').trim(),
  stock: toNumberOrDefault(item?.stock, 0),
  precio: toNumberOrDefault(item?.unitPrice ?? item?.precio, 0),
  totalValue: toNumberOrDefault(item?.totalValue ?? item?.valorTotal, 0)
})

const mapActiveInventorySummary = (summary = {}) => ({
  totalStock: toNumberOrDefault(summary?.totalStock, 0),
  totalInventoryValue: toNumberOrDefault(summary?.totalInventoryValue ?? summary?.totalValue, 0)
})

const buildProductPayload = (data = {}, includeCode = false) => {
  const payload = {
    name: String(data?.name ?? data?.nombre ?? data?.commercialName ?? '').trim(),
    stock: Number(data?.stock),
    minimumStock: Number(data?.minimumStock ?? data?.stockMinimo),
    unitPrice: Number(data?.unitPrice ?? data?.precio),
    expirationDate: String(data?.expirationDate ?? data?.fechavencimiento ?? '').trim()
  }

  if (includeCode) {
    payload.code = String(data?.code ?? data?.codigo ?? '').trim()
  }

  if (typeof data?.active === 'boolean' || typeof data?.activo === 'boolean') {
    payload.active = Boolean(data?.active ?? data?.activo)
  }

  return payload
}

export const getMedicines = async (token) => {
  try {
    const response = await inventoryApi.get(PRODUCTS_ENDPOINT, {
      headers: buildAuthHeaders(token)
    })

    return Array.isArray(response.data) ? response.data.map(mapProduct) : []
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener la lista de medicamentos.')
  }
}

export const createMedicine = async (data, token) => {
  try {
    const payload = buildProductPayload(data, true)
    const response = await inventoryApi.post(PRODUCTS_ENDPOINT, payload, {
      headers: buildAuthHeaders(token)
    })

    return mapProduct(response.data)
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo registrar el medicamento.')
  }
}

export const updateMedicine = async (id, data, token) => {
  try {
    const payload = buildProductPayload(data, false)
    const response = await inventoryApi.put(`${PRODUCTS_ENDPOINT}/${id}`, payload, {
      headers: buildAuthHeaders(token)
    })

    return mapProduct(response.data)
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo actualizar el medicamento.')
  }
}

export const deactivateMedicine = async (id, token) => {
  try {
    await inventoryApi.delete(`${PRODUCTS_ENDPOINT}/${id}`, {
      headers: buildAuthHeaders(token)
    })
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo desactivar el medicamento.')
  }
}

export const getActiveInventoryTable = async (token) => {
  try {
    const response = await inventoryApi.get(ACTIVE_TABLE_ENDPOINT, {
      headers: buildAuthHeaders(token)
    })

    return Array.isArray(response.data) ? response.data.map(mapActiveInventoryRow) : []
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener la tabla de inventario activo.')
  }
}

export const getActiveInventorySummary = async (token) => {
  try {
    const response = await inventoryApi.get(ACTIVE_SUMMARY_ENDPOINT, {
      headers: buildAuthHeaders(token)
    })

    return mapActiveInventorySummary(response.data)
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener el resumen del inventario activo.')
  }
}
