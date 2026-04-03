import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const LOW_STOCK_ALERTS_ENDPOINT = '/api/alerts/low-stock'

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeAlertsCollection = (responseData) => {
  if (Array.isArray(responseData?.alerts)) return responseData.alerts
  if (Array.isArray(responseData?.data?.alerts)) return responseData.data.alerts
  if (Array.isArray(responseData)) return responseData
  return []
}

const mapAlertProductToLowStockRow = (alert = {}) => {
  const product = alert?.product || {}

  return {
    id: product?.id ?? product?.code ?? alert?.id ?? null,
    codigo: String(product?.code ?? product?.codigo ?? '').trim(),
    nombre: String(product?.name ?? product?.nombre ?? '').trim(),
    stock: toNumberOrDefault(product?.stock, 0),
    stockMinimo: toNumberOrDefault(product?.minimumStock ?? product?.stockMinimo, 0)
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
    (firstRow, secondRow) => (firstRow.stock - firstRow.stockMinimo) - (secondRow.stock - secondRow.stockMinimo)
  )
}

export const getLowStockReportRows = async (token) => {
  try {
    const response = await inventoryApi.get(LOW_STOCK_ALERTS_ENDPOINT, {
      headers: buildAuthHeaders(token)
    })

    return dedupeRows(normalizeAlertsCollection(response.data).map(mapAlertProductToLowStockRow))
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener el reporte de bajo stock.')
  }
}
