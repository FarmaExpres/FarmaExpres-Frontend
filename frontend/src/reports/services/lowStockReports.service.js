import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const LOW_STOCK_REPORT_ENDPOINTS = ['/api/alerts/low-stock-batches']
const LOW_STOCK_CRITICAL_REPORT_ENDPOINTS = ['/api/alerts/low-stock-batches/critical']
const LOW_STOCK_ALERT_REPORT_ENDPOINTS = ['/api/alerts/low-stock-batches/alert']

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeLowStockCollection = (responseData) => {
  if (Array.isArray(responseData?.items)) return responseData.items
  if (Array.isArray(responseData?.data?.items)) return responseData.data.items
  if (Array.isArray(responseData?.reports)) return responseData.reports
  if (Array.isArray(responseData?.data?.reports)) return responseData.data.reports
  if (Array.isArray(responseData?.alerts)) return responseData.alerts
  if (Array.isArray(responseData?.data?.alerts)) return responseData.data.alerts
  if (Array.isArray(responseData)) return responseData
  return []
}

const shouldTryNextEndpoint = (error) => {
  const status = Number(error?.response?.status)
  return status === 404 || status === 405
}

const mapLowStockItemToRow = (item = {}) => {
  const product = item?.product || item
  const batch = item?.batch || {}
  const batchStock = toNumberOrDefault(
    item?.batchStock ?? item?.availableStock,
    0
  )
  const operationalStock = toNumberOrDefault(
    item?.operationalStock ?? product?.operationalStock ?? product?.stock,
    0
  )

  return {
    id:
      item?.id ??
      `${item?.productId ?? product?.id ?? product?.code ?? 'product'}-${item?.batchId ?? batch?.id ?? 'batch'}`,
    codigo: String(item?.productCode ?? product?.code ?? product?.codigo ?? '').trim(),
    nombre: String(item?.productName ?? product?.name ?? product?.nombre ?? '').trim(),
    loteId: item?.batchId ?? batch?.id ?? null,
    loteCodigo: String(item?.batchCode ?? batch?.code ?? '').trim(),
    batchExpirationDate: String(item?.batchExpirationDate ?? batch?.expirationDate ?? '').trim(),
    stock: batchStock,
    batchStock,
    operationalStock,
    stockMinimo: toNumberOrDefault(item?.minimumStock ?? product?.minimumStock ?? product?.stockMinimo, 0),
    coverage: toNumberOrDefault(product?.coverage ?? item?.coverage, 0),
    coverageLabel: String(product?.coverageLabel ?? item?.coverageLabel ?? '').trim(),
    severity: String(item?.severity ?? product?.severity ?? item?.lowStockLevel ?? product?.lowStockLevel ?? '').trim(),
    status: String(item?.status ?? product?.status ?? '').trim(),
    suggestion: String(product?.suggestion ?? item?.suggestion ?? '').trim()
  }
}

const dedupeRows = (rows = []) => {
  const rowsByKey = new Map()

  rows.forEach((row) => {
    const key = String(row?.loteId ?? row?.loteCodigo ?? row?.codigo ?? row?.id).trim()
    if (!key) return
    rowsByKey.set(key, row)
  })

  return Array.from(rowsByKey.values()).sort(
    (firstRow, secondRow) => {
      if (firstRow.coverage !== secondRow.coverage) return firstRow.coverage - secondRow.coverage
      return firstRow.nombre.localeCompare(secondRow.nombre)
    }
  )
}

const fetchLowStockRows = async (endpoints, token) => {
  let lastError = null

  for (const endpoint of endpoints) {
    try {
      const response = await inventoryApi.get(endpoint, {
        headers: buildAuthHeaders(token)
      })
      return dedupeRows(normalizeLowStockCollection(response.data).map(mapLowStockItemToRow))
    } catch (error) {
      lastError = error
      if (shouldTryNextEndpoint(error)) continue
      throw error
    }
  }

  throw lastError || new Error('No se encontró endpoint de reporte de bajo stock.')
}

export const getLowStockReportGroups = async (token) => {
  try {
    const [allRows, criticalRows, alertRows] = await Promise.all([
      fetchLowStockRows(LOW_STOCK_REPORT_ENDPOINTS, token),
      fetchLowStockRows(LOW_STOCK_CRITICAL_REPORT_ENDPOINTS, token),
      fetchLowStockRows(LOW_STOCK_ALERT_REPORT_ENDPOINTS, token)
    ])

    return {
      all: allRows,
      critical: dedupeRows(criticalRows),
      alert: dedupeRows(alertRows)
    }
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener el reporte de bajo stock.')
  }
}
