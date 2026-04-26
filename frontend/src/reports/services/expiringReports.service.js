import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const EXPIRING_REPORT_ENDPOINT = '/api/alerts/expiring-batches/report'

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
  if (Array.isArray(responseData?.items)) return responseData.items
  if (Array.isArray(responseData?.data?.items)) return responseData.data.items
  if (Array.isArray(responseData?.reports)) return responseData.reports
  if (Array.isArray(responseData?.data?.reports)) return responseData.data.reports
  if (Array.isArray(responseData?.alerts)) return responseData.alerts
  if (Array.isArray(responseData?.data?.alerts)) return responseData.data.alerts
  if (Array.isArray(responseData)) return responseData
  return []
}

const mapExpiringItemToRow = (item = {}) => {
  const product = item?.product || item
  const batch = item?.batch || {}
  const batchStock = toNumberOrDefault(
    item?.batchStock ?? item?.expiredBatchStock ?? item?.availableStock,
    0
  )
  const operationalStock = toNumberOrDefault(
    item?.operationalStock ?? product?.operationalStock ?? product?.stock,
    0
  )
  const expirationDate = normalizeExpirationDate(
    item?.expirationDate ??
      item?.batchExpirationDate ??
      batch?.expirationDate ??
      product?.expirationDate ??
      product?.fechavencimiento ??
      ''
  )
  const daysUntilExpiration = toNumberOrDefault(
    product?.diasRestantes ?? item?.diasRestantes ?? item?.daysUntilExpiration,
    getDaysUntilDate(expirationDate)
  )

  return {
    id:
      item?.id ??
      `${item?.productId ?? product?.id ?? product?.code ?? 'product'}-${item?.batchId ?? batch?.id ?? 'batch'}`,
    codigo: String(item?.productCode ?? product?.code ?? product?.codigo ?? '').trim(),
    nombre: String(item?.productName ?? product?.name ?? product?.nombre ?? '').trim(),
    loteId: item?.batchId ?? batch?.id ?? null,
    loteCodigo: String(item?.batchCode ?? batch?.code ?? '').trim(),
    stock: batchStock,
    batchStock,
    operationalStock,
    fechavencimiento: expirationDate,
    daysUntilExpiration,
    expirationStatus: String(item?.status ?? product?.estado ?? item?.estado ?? '').trim()
  }
}

const dedupeRows = (rows = []) => {
  const rowsByKey = new Map()

  rows.forEach((row) => {
    const key = String(row?.loteId ?? row?.loteCodigo ?? row?.id ?? `${row?.codigo}-${row?.fechavencimiento}`).trim()
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
    const rawRows = dedupeRows(await fetchExpiringRows(token))
    const allRows = rawRows.filter((row) => {
      const groupKey = getExpiringGroupKey(row)
      if (groupKey !== 'expired') return true
      return Number(row?.batchStock ?? row?.stock ?? 0) > 0
    })
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
    throw normalizeApiError(error, 'No se pudo obtener el reporte de próximos a vencer.')
  }
}
