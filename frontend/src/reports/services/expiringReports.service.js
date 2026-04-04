import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const EXPIRING_REPORT_ENDPOINT = '/api/alerts/expiring-report'

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

const normalizeExpiringCollection = (responseData) => {
  if (Array.isArray(responseData?.reports)) return responseData.reports
  if (Array.isArray(responseData?.data?.reports)) return responseData.data.reports
  if (Array.isArray(responseData?.alerts)) return responseData.alerts
  if (Array.isArray(responseData?.data?.alerts)) return responseData.data.alerts
  if (Array.isArray(responseData)) return responseData
  return []
}

const mapExpiringItemToRow = (item = {}) => {
  const product = item?.product || item
  const expirationDate = normalizeExpirationDate(
    product?.expirationDate ?? product?.fechavencimiento ?? item?.expirationDate ?? ''
  )
  const daysUntilExpiration = toNumberOrDefault(
    product?.diasRestantes ?? item?.diasRestantes,
    getDaysUntilDate(expirationDate)
  )

  return {
    id: product?.id ?? product?.code ?? item?.id ?? null,
    codigo: String(product?.code ?? product?.codigo ?? '').trim(),
    nombre: String(product?.name ?? product?.nombre ?? '').trim(),
    stock: toNumberOrDefault(product?.stock, 0),
    fechavencimiento: expirationDate,
    daysUntilExpiration,
    expirationStatus: String(product?.estado ?? item?.estado ?? '').trim()
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

const getExpiringGroupKey = (row = {}) => {
  const status = String(row?.expirationStatus || '').trim().toUpperCase()
  const days = Number(row?.daysUntilExpiration)

  if (status === 'VENCIDO' || (Number.isFinite(days) && days < 0)) return 'expired'
  if (status === 'CRITICO' || (Number.isFinite(days) && days <= 15)) return 'critical'
  if (status === 'MEDIO' || (Number.isFinite(days) && days <= 30)) return 'medium'
  if (status === 'CONTROLADO' || (Number.isFinite(days) && days <= 60)) return 'controlled'
  return 'all'
}

const fetchExpiringRows = async (token) => {
  const response = await inventoryApi.get(EXPIRING_REPORT_ENDPOINT, {
    headers: buildAuthHeaders(token)
  })

  return normalizeExpiringCollection(response.data).map(mapExpiringItemToRow)
}

export const getExpiringReportGroups = async (token) => {
  try {
    const allRows = dedupeRows(await fetchExpiringRows(token))
    const groupedRows = allRows.reduce((acc, row) => {
      const groupKey = getExpiringGroupKey(row)
      if (groupKey !== 'all') acc[groupKey].push(row)
      return acc
    }, { expired: [], critical: [], medium: [], controlled: [] })

    return {
      all: allRows,
      expired: dedupeRows(groupedRows.expired),
      critical: dedupeRows(groupedRows.critical),
      medium: dedupeRows(groupedRows.medium),
      controlled: dedupeRows(groupedRows.controlled)
    }
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener el reporte de proximos a vencer.')
  }
}
