import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const ALERTS_ENDPOINTS = Object.freeze({
  expired: ['/api/alerts/expired-batches'],
  expiringSoon: ['/api/alerts/expiring-batches'],
  lowStock: ['/api/alerts/low-stock-batches'],
  outOfStock: ['/api/alerts/out-of-stock-batches']
})

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeCollection = (responseData) => {
  if (Array.isArray(responseData?.alerts)) return responseData.alerts
  if (Array.isArray(responseData?.data?.alerts)) return responseData.data.alerts
  if (Array.isArray(responseData?.reports)) return responseData.reports
  if (Array.isArray(responseData?.data?.reports)) return responseData.data.reports
  if (Array.isArray(responseData?.items)) return responseData.items
  if (Array.isArray(responseData?.data?.items)) return responseData.data.items
  if (Array.isArray(responseData)) return responseData
  return []
}

const shouldTryNextEndpoint = (error) => {
  const status = Number(error?.response?.status)
  return status === 404 || status === 405
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
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const msDifference = targetDate.getTime() - startOfToday.getTime()
  return Math.floor(msDifference / (1000 * 60 * 60 * 24))
}

const mapAlertItem = (item = {}) => {
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
    product?.fechavencimiento
  )

  return {
    id:
      item?.id ??
      `${item?.productId ?? product?.id ?? product?.code ?? 'product'}-${item?.batchId ?? batch?.id ?? 'batch'}`,
    productId: item?.productId ?? product?.id ?? null,
    codigo: String(item?.productCode ?? product?.code ?? product?.codigo ?? '').trim(),
    nombre: String(item?.productName ?? product?.name ?? product?.nombre ?? '').trim(),
    loteId: item?.batchId ?? batch?.id ?? null,
    loteCodigo: String(item?.batchCode ?? batch?.code ?? '').trim(),
    stock: batchStock,
    batchStock,
    operationalStock,
    stockMinimo: toNumberOrDefault(item?.minimumStock ?? product?.minimumStock ?? product?.stockMinimo, 0),
    fechavencimiento: expirationDate,
    diasRestantes: toNumberOrDefault(
      product?.daysUntilExpiration ?? product?.diasRestantes ?? item?.daysUntilExpiration ?? item?.diasRestantes,
      getDaysUntilDate(expirationDate)
    ),
    estado: String(item?.status ?? item?.estado ?? '').trim()
  }
}

const getProductKey = (row = {}) => {
  const productId = String(row?.productId ?? '').trim()
  if (productId) return `id:${productId}`

  const code = String(row?.codigo ?? '').trim().toLowerCase()
  if (code) return `code:${code}`

  return `name:${String(row?.nombre ?? row?.id ?? '').trim().toLowerCase()}`
}

const getOperationalStock = (row = {}) => {
  const operationalStock = Number(row?.operationalStock)
  if (Number.isFinite(operationalStock)) return operationalStock
  return Number(row?.stock ?? row?.batchStock ?? 0) || 0
}

const hasOperationalStock = (row = {}) => Number.isFinite(Number(row?.operationalStock))

const aggregateProductStockRows = (rows = []) => {
  const rowsByProduct = new Map()

  rows.forEach((row) => {
    const productKey = getProductKey(row)
    const currentRow = rowsByProduct.get(productKey)
    const rowStock = getOperationalStock(row)
    const rowBatchStock = Number(row?.batchStock ?? row?.stock ?? 0) || 0
    const rowHasOperationalStock = hasOperationalStock(row)

    if (!currentRow) {
      rowsByProduct.set(productKey, {
        ...row,
        id: productKey,
        stock: rowStock,
        hasOperationalStock: rowHasOperationalStock,
        batchStock: rowBatchStock,
        lotesCount: row?.loteCodigo ? 1 : 0,
        loteCodigo: row?.loteCodigo || 'Sin lote',
        fechavencimiento: row?.fechavencimiento || ''
      })
      return
    }

    const currentExpiration = String(currentRow.fechavencimiento || '')
    const rowExpiration = String(row?.fechavencimiento || '')
    const nextExpiration = !currentExpiration || (rowExpiration && rowExpiration < currentExpiration)
      ? rowExpiration
      : currentExpiration

    const hasProductOperationalStock = Boolean(currentRow.hasOperationalStock || rowHasOperationalStock)
    const totalBatchStock = (Number(currentRow.batchStock) || 0) + rowBatchStock

    rowsByProduct.set(productKey, {
      ...currentRow,
      stock: hasProductOperationalStock ? Math.max(Number(currentRow.stock) || 0, rowStock) : totalBatchStock,
      hasOperationalStock: hasProductOperationalStock,
      batchStock: totalBatchStock,
      lotesCount: (Number(currentRow.lotesCount) || 0) + (row?.loteCodigo ? 1 : 0),
      loteCodigo: `${(Number(currentRow.lotesCount) || 0) + (row?.loteCodigo ? 1 : 0)} lotes`,
      fechavencimiento: nextExpiration
    })
  })

  return Array.from(rowsByProduct.values()).map((row) => ({
    ...row,
    loteCodigo: Number(row.lotesCount) > 1 ? `${row.lotesCount} lotes` : row.loteCodigo
  }))
}

const fetchSection = async (sectionKey, token) => {
  const endpoints = ALERTS_ENDPOINTS[sectionKey] || []
  let lastError = null

  for (const endpoint of endpoints) {
    try {
      const response = await inventoryApi.get(endpoint, {
        headers: buildAuthHeaders(token)
      })
      return normalizeCollection(response.data).map(mapAlertItem)
    } catch (error) {
      lastError = error
      if (shouldTryNextEndpoint(error)) continue
      throw error
    }
  }

  throw lastError || new Error(`No se encontró endpoint para la sección ${sectionKey}.`)
}

const normalizeSectionRows = ({ sectionKey, rows }) => {
  const normalizedRows = Array.isArray(rows) ? rows : []
  const rowsWithBatchStock = normalizedRows.filter((row) => Number(row?.batchStock ?? row?.stock ?? 0) > 0)

  if (sectionKey === 'lowStock') {
    // Bajo stock se evalua por medicamento: el stock operativo total debe estar por debajo del minimo.
    return aggregateProductStockRows(normalizedRows).filter((row) => {
      const stock = Number(row?.stock) || 0
      const minimumStock = Number(row?.stockMinimo) || 0
      return stock > 0 && minimumStock > 0 && stock < minimumStock
    })
  }

  if (sectionKey === 'outOfStock') {
    // Agotados tambien se evalua por medicamento para evitar duplicados por lote.
    return aggregateProductStockRows(normalizedRows).filter((row) => Number(row?.stock) === 0)
  }

  if (sectionKey === 'expiringSoon') return rowsWithBatchStock

  if (sectionKey === 'expired') {
    return rowsWithBatchStock
  }

  return normalizedRows
}

export const getAlertsCenterData = async (token) => {
  const sectionEntries = Object.keys(ALERTS_ENDPOINTS)
  const settledSections = await Promise.allSettled(
    sectionEntries.map(async (sectionKey) => ({
      key: sectionKey,
      rows: await fetchSection(sectionKey, token)
    }))
  )

  const result = {
    expired: [],
    expiringSoon: [],
    lowStock: [],
    outOfStock: [],
    failedSections: []
  }

  settledSections.forEach((settledResult, index) => {
    const sectionKey = sectionEntries[index]

    if (settledResult.status === 'fulfilled') {
      result[settledResult.value.key] = settledResult.value.rows
      return
    }

    result.failedSections.push(sectionKey)
  })

  result.expired = normalizeSectionRows({
    sectionKey: 'expired',
    rows: result.expired
  })
  result.expiringSoon = normalizeSectionRows({
    sectionKey: 'expiringSoon',
    rows: result.expiringSoon
  })
  result.lowStock = normalizeSectionRows({
    sectionKey: 'lowStock',
    rows: result.lowStock
  })
  result.outOfStock = normalizeSectionRows({
    sectionKey: 'outOfStock',
    rows: result.outOfStock
  })

  if (result.failedSections.length === sectionEntries.length) {
    const firstError = settledSections.find((item) => item.status === 'rejected')?.reason
    throw normalizeApiError(firstError, 'No se pudo cargar el centro de alertas.')
  }

  return result
}
