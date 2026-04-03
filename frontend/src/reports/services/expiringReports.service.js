import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const EXPIRED_ALERTS_ENDPOINT = '/api/alerts/expired'
const EXPIRING_SOON_ALERTS_ENDPOINT = '/api/alerts/expiring-soon'
const EXPIRING_HALF_MONTH_ALERTS_ENDPOINT = '/api/alerts/expiring-half-month'
const EXPIRING_MONTH_ALERTS_ENDPOINT = '/api/alerts/expiring-month'

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeExpirationDate = (value) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  const dateOnlyMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/)
  return dateOnlyMatch ? dateOnlyMatch[1] : rawValue
}

const getDaysUntilDate = (isoDate) => {
  if (!isoDate) return Number.POSITIVE_INFINITY
  const normalizedDate = normalizeExpirationDate(isoDate)
  const targetDate = new Date(`${normalizedDate}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) return Number.POSITIVE_INFINITY

  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const msDiff = targetDate.getTime() - startToday.getTime()
  return Math.floor(msDiff / (1000 * 60 * 60 * 24))
}

const normalizeAlertsCollection = (responseData) => {
  if (Array.isArray(responseData?.alerts)) return responseData.alerts
  if (Array.isArray(responseData?.data?.alerts)) return responseData.data.alerts
  if (Array.isArray(responseData)) return responseData
  return []
}

const mapAlertProductToExpiringRow = (alert = {}) => {
  const product = alert?.product || {}
  const expirationDate = normalizeExpirationDate(
    product?.expirationDate ?? product?.fechavencimiento ?? alert?.expirationDate ?? ''
  )

  return {
    id: product?.id ?? product?.code ?? alert?.id ?? null,
    codigo: String(product?.code ?? product?.codigo ?? '').trim(),
    nombre: String(product?.name ?? product?.nombre ?? '').trim(),
    stock: toNumberOrDefault(product?.stock, 0),
    fechavencimiento: expirationDate,
    daysUntilExpiration: getDaysUntilDate(expirationDate)
  }
}

const dedupeRows = (rows = []) => {
  const rowsByKey = new Map()

  rows.forEach((row) => {
    const key = String(row?.codigo || row?.id || `${row?.nombre}-${row?.fechavencimiento}`).trim()
    if (!key) return
    rowsByKey.set(key, row)
  })

  return Array.from(rowsByKey.values()).sort(
    (firstRow, secondRow) => firstRow.daysUntilExpiration - secondRow.daysUntilExpiration
  )
}

const fetchExpiringRowsByEndpoint = async (endpoint, token) => {
  const response = await inventoryApi.get(endpoint, {
    headers: buildAuthHeaders(token)
  })

  return normalizeAlertsCollection(response.data).map(mapAlertProductToExpiringRow)
}

export const getExpiringReportGroups = async (token) => {
  try {
    const [expiredRows, criticalRows, mediumRows, controlledRows] = await Promise.all([
      fetchExpiringRowsByEndpoint(EXPIRED_ALERTS_ENDPOINT, token),
      fetchExpiringRowsByEndpoint(EXPIRING_SOON_ALERTS_ENDPOINT, token),
      fetchExpiringRowsByEndpoint(EXPIRING_HALF_MONTH_ALERTS_ENDPOINT, token),
      fetchExpiringRowsByEndpoint(EXPIRING_MONTH_ALERTS_ENDPOINT, token)
    ])

    return {
      all: dedupeRows([...expiredRows, ...criticalRows, ...mediumRows, ...controlledRows]),
      expired: dedupeRows(expiredRows),
      critical: dedupeRows(criticalRows),
      medium: dedupeRows(mediumRows),
      controlled: dedupeRows(controlledRows)
    }
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener el reporte de proximos a vencer.')
  }
}
