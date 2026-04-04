import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const LOW_STOCK_REPORT_ENDPOINT = '/api/products/low-stock-report'
const LOW_STOCK_CRITICAL_REPORT_ENDPOINT = '/api/products/low-stock-report/critical'
const LOW_STOCK_ALERT_REPORT_ENDPOINT = '/api/products/low-stock-report/alert'

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeLowStockCollection = (responseData) => {
  if (Array.isArray(responseData?.reports)) return responseData.reports
  if (Array.isArray(responseData?.data?.reports)) return responseData.data.reports
  if (Array.isArray(responseData?.alerts)) return responseData.alerts
  if (Array.isArray(responseData?.data?.alerts)) return responseData.data.alerts
  if (Array.isArray(responseData)) return responseData
  return []
}

const mapLowStockItemToRow = (item = {}) => {
  const product = item?.product || item

  return {
    id: product?.id ?? product?.code ?? item?.id ?? null,
    codigo: String(product?.code ?? product?.codigo ?? '').trim(),
    nombre: String(product?.name ?? product?.nombre ?? '').trim(),
    stock: toNumberOrDefault(product?.stock, 0),
    stockMinimo: toNumberOrDefault(product?.minimumStock ?? product?.stockMinimo, 0),
    coverage: toNumberOrDefault(product?.coverage ?? item?.coverage, 0),
    coverageLabel: String(product?.coverageLabel ?? item?.coverageLabel ?? '').trim(),
    status: String(product?.status ?? item?.status ?? '').trim(),
    suggestion: String(product?.suggestion ?? item?.suggestion ?? '').trim()
  }
}

const dedupeRows = (rows = []) => {
  const rowsByKey = new Map()

  rows.forEach((row) => {
    const key = String(row?.codigo || row?.id || `${row?.nombre}-${row?.stockMinimo}`).trim()
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

const fetchLowStockRows = async (endpoint, token) => {
  const response = await inventoryApi.get(endpoint, {
    headers: buildAuthHeaders(token)
  })

  return dedupeRows(normalizeLowStockCollection(response.data).map(mapLowStockItemToRow))
}

export const getLowStockReportGroups = async (token) => {
  try {
    const [allRows, criticalRows, alertRows] = await Promise.all([
      fetchLowStockRows(LOW_STOCK_REPORT_ENDPOINT, token),
      fetchLowStockRows(LOW_STOCK_CRITICAL_REPORT_ENDPOINT, token),
      fetchLowStockRows(LOW_STOCK_ALERT_REPORT_ENDPOINT, token)
    ])

    return {
      all: allRows,
      critical: criticalRows,
      alert: alertRows
    }
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener el reporte de bajo stock.')
  }
}
