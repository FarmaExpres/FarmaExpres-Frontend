import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const PRODUCTS_ENDPOINT = '/api/products'
const ALL_PRODUCTS_ENDPOINT = '/api/products/all'
const FEFO_SNAPSHOT_ENDPOINT = '/api/products/fefo-snapshot'
const ACTIVE_TABLE_ENDPOINT = '/api/products/active-table'
const ACTIVE_SUMMARY_ENDPOINT = '/api/products/active-summary'

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const toOptionalText = (value) => {
  const text = String(value ?? '').trim()
  return text || null
}

const toOptionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const toNormalizedText = (value) => String(value ?? '').trim()
const normalizeDateValue = (value) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  const dateOnlyMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/)
  return dateOnlyMatch ? dateOnlyMatch[1] : rawValue
}

const resolveUnitMeasure = (product = {}) =>
  toNormalizedText(
    product?.unidadMedida ??
      product?.measurementUnit ??
      product?.unitMeasure ??
      product?.unitOfMeasure ??
      product?.unidad_medida ??
      product?.unidadDeMedida
  )

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
    proximoVencimiento: normalizeDateValue(
      product?.nextExpirationDate ??
      product?.proximoVencimiento ??
      product?.nextBatchExpirationDate ??
      product?.batchExpirationDate ??
      product?.expirationDate ??
      product?.fechavencimiento
    ),
    loteFefo: String(
      product?.nextBatchCode ??
      product?.proximoLoteCodigo ??
      product?.batchCode ??
      product?.loteCodigo ??
      ''
    ).trim(),
    lotesActivos: toNumberOrDefault(
      product?.activeBatchesCount ??
      product?.lotesActivos ??
      product?.totalActiveBatches,
      0
    ),
    activo: isActive,
    nombreGenerico: String(product?.nombreGenerico ?? product?.genericName ?? '').trim(),
    concentracion: String(product?.concentracion ?? product?.concentration ?? '').trim(),
    formaFarmaceutica: String(product?.formaFarmaceutica ?? product?.dosageForm ?? '').trim(),
    presentacion: String(product?.presentacion ?? product?.presentation ?? '').trim(),
    stockMaximo: toNumberOrDefault(product?.stockMaximo ?? product?.maximumStock, 0),
    precioCompra: toNumberOrDefault(product?.precioCompra ?? product?.purchasePrice, 0),
    precioVenta: toNumberOrDefault(product?.precioVenta ?? product?.salePrice ?? product?.unitPrice, 0),
    requiereReceta: Boolean(product?.requiereReceta ?? product?.requiresPrescription),
    laboratorio: String(product?.laboratorio ?? product?.laboratory ?? '').trim(),
    registroSanitario: String(product?.registroSanitario ?? product?.sanitaryRegistry ?? '').trim(),
    viaAdministracion: String(product?.viaAdministracion ?? product?.administrationRoute ?? '').trim(),
    unidadMedida: resolveUnitMeasure(product),
    ubicacionAlmacen: String(product?.ubicacionAlmacen ?? product?.warehouseLocation ?? '').trim(),
    temperaturaConservacion: String(product?.temperaturaConservacion ?? product?.storageTemperature ?? '').trim(),
    observaciones: String(product?.observaciones ?? product?.notes ?? '').trim()
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

const buildProductPayload = (
  data = {},
  {
    includeCode = false,
    includeStock = true,
    includeExpirationDate = true
  } = {}
) => {
  const unitPrice = Number(data?.unitPrice ?? data?.precio ?? data?.precioVenta)
  const minimumStock = Number(data?.minimumStock ?? data?.stockMinimo)

  const normalizedUnitMeasure = toOptionalText(data?.unidadMedida ?? data?.measurementUnit ?? data?.unitMeasure ?? data?.unitOfMeasure)

  const payload = {
    name: String(data?.name ?? data?.nombre ?? data?.commercialName ?? '').trim(),
    minimumStock,
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    nombreGenerico: toOptionalText(data?.nombreGenerico),
    concentracion: toOptionalText(data?.concentracion),
    formaFarmaceutica: toOptionalText(data?.formaFarmaceutica),
    presentacion: toOptionalText(data?.presentacion),
    stockMaximo: toOptionalNumber(data?.stockMaximo),
    precioCompra: toOptionalNumber(data?.precioCompra),
    precioVenta: toOptionalNumber(data?.precioVenta),
    requiereReceta: Boolean(data?.requiereReceta),
    laboratorio: toOptionalText(data?.laboratorio),
    registroSanitario: toOptionalText(data?.registroSanitario),
    viaAdministracion: toOptionalText(data?.viaAdministracion),
    unidadMedida: normalizedUnitMeasure,
    measurementUnit: normalizedUnitMeasure,
    ubicacionAlmacen: toOptionalText(data?.ubicacionAlmacen),
    temperaturaConservacion: toOptionalText(data?.temperaturaConservacion),
    observaciones: toOptionalText(data?.observaciones)
  }

  if (includeStock) {
    payload.stock = Number(data?.stock ?? data?.initialStock)
  }

  if (includeExpirationDate) {
    payload.expirationDate = String(data?.expirationDate ?? data?.fechavencimiento ?? '').trim()
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

export const getAllMedicines = async (token) => {
  try {
    const response = await inventoryApi.get(ALL_PRODUCTS_ENDPOINT, {
      headers: buildAuthHeaders(token)
    })

    return Array.isArray(response.data) ? response.data.map(mapProduct) : []
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener la lista completa de medicamentos.')
  }
}

export const getMedicineById = async (id, token) => {
  try {
    const response = await inventoryApi.get(`${PRODUCTS_ENDPOINT}/${id}`, {
      headers: buildAuthHeaders(token)
    })

    return mapProduct(response.data)
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener el medicamento seleccionado.')
  }
}

const normalizeBatchDate = (value) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  const dateOnlyMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/)
  return dateOnlyMatch ? dateOnlyMatch[1] : rawValue
}

const mapBatch = (batch = {}) => ({
  id: batch?.batchId ?? batch?.id ?? null,
  batchCode: String(
    batch?.batchCode ??
      batch?.code ??
      batch?.lotCode ??
      batch?.loteCodigo ??
      batch?.batchNumber ??
      batch?.number ??
      ''
  ).trim(),
  expirationDate: normalizeBatchDate(batch?.expirationDate ?? batch?.fechavencimiento ?? ''),
  availableStock: toNumberOrDefault(batch?.availableStock ?? batch?.stockDisponible ?? batch?.stock ?? 0, 0),
  status: String(batch?.status ?? batch?.estado ?? '').trim().toUpperCase()
})

const mapFefoSnapshotItem = (item = {}) => ({
  medicineId: String(item?.productId ?? item?.medicineId ?? item?.id ?? '').trim(),
  expirationDate: normalizeBatchDate(
    item?.nextExpirationDate ??
    item?.expirationDate ??
    item?.proximoVencimiento ??
    ''
  ),
  batchCode: String(
    item?.nextBatchCode ??
    item?.batchCode ??
    item?.loteCodigo ??
    ''
  ).trim(),
  activeBatchesCount: toNumberOrDefault(
    item?.activeBatchesCount ??
    item?.lotesActivos ??
    item?.totalActiveBatches,
    0
  ),
  operationalStock: toNumberOrDefault(
    item?.operationalStock ??
    item?.stock,
    0
  )
})

export const getMedicineBatches = async (medicineId, token) => {
  try {
    const response = await inventoryApi.get(`${PRODUCTS_ENDPOINT}/${medicineId}/batches`, {
      headers: buildAuthHeaders(token)
    })

    const payload = response?.data
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : []

    return rows.map(mapBatch)
  } catch (error) {
    throw normalizeApiError(error, 'No se pudieron obtener los lotes del medicamento.')
  }
}

export const getMedicinesFefoSnapshot = async (token) => {
  try {
    const response = await inventoryApi.get(FEFO_SNAPSHOT_ENDPOINT, {
      headers: buildAuthHeaders(token)
    })

    const payload = response?.data
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : []

    return rows
      .map(mapFefoSnapshotItem)
      .filter((item) => item.medicineId)
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener el snapshot FEFO de medicamentos.')
  }
}

export const createMedicine = async (data, token) => {
  try {
    const payload = buildProductPayload(data, {
      includeCode: true,
      includeStock: true,
      includeExpirationDate: true
    })
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
    const draftPayload = buildProductPayload(data, {
      includeCode: false,
      includeStock: false,
      includeExpirationDate: false
    })

    // Backend HU-ACFE-03: vencimiento se gestiona por lotes y no debe viajar en PUT de producto.
    const payload = {
      name: draftPayload.name,
      minimumStock: draftPayload.minimumStock,
      unitPrice: draftPayload.unitPrice,
      nombreGenerico: draftPayload.nombreGenerico,
      concentracion: draftPayload.concentracion,
      formaFarmaceutica: draftPayload.formaFarmaceutica,
      presentacion: draftPayload.presentacion,
      stockMaximo: draftPayload.stockMaximo,
      precioCompra: draftPayload.precioCompra,
      precioVenta: draftPayload.precioVenta,
      requiereReceta: draftPayload.requiereReceta,
      laboratorio: draftPayload.laboratorio,
      registroSanitario: draftPayload.registroSanitario,
      viaAdministracion: draftPayload.viaAdministracion,
      unidadMedida: draftPayload.unidadMedida,
      measurementUnit: draftPayload.measurementUnit,
      ubicacionAlmacen: draftPayload.ubicacionAlmacen,
      temperaturaConservacion: draftPayload.temperaturaConservacion,
      observaciones: draftPayload.observaciones
    }

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
