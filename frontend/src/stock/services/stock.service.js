import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'
import { getMedicines } from '../../medicines/services/medicines.service'

const STOCK_SUMMARY_ENDPOINTS = [
  '/api/inventory/stock-summary',
  '/inventory/stock-summary'
]

const CRITICAL_PRODUCTS_ENDPOINTS = [
  '/api/inventory/critical-products',
  '/inventory/critical-products'
]

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeCollection = (responseData) => {
  if (Array.isArray(responseData?.products)) return responseData.products
  if (Array.isArray(responseData?.data?.products)) return responseData.data.products
  if (Array.isArray(responseData?.criticalProducts)) return responseData.criticalProducts
  if (Array.isArray(responseData?.data?.criticalProducts)) return responseData.data.criticalProducts
  if (Array.isArray(responseData?.items)) return responseData.items
  if (Array.isArray(responseData?.data?.items)) return responseData.data.items
  if (Array.isArray(responseData?.rows)) return responseData.rows
  if (Array.isArray(responseData?.data?.rows)) return responseData.data.rows
  if (Array.isArray(responseData)) return responseData
  return []
}

const shouldTryNextEndpoint = (error) => {
  const status = Number(error?.response?.status)
  return status === 404 || status === 405
}

const getStockLevel = ({ stock, minimumStock }) => {
  if (minimumStock <= 0) return stock > 0 ? 100 : 0
  return Math.round((stock / minimumStock) * 100)
}

export const getStockStatus = ({ stock, minimumStock, status }) => {
  const normalizedStatus = String(status || '').trim().toUpperCase()

  if (normalizedStatus === 'CRITICO' || normalizedStatus === 'CRÍTICO' || normalizedStatus === 'CRITICAL') {
    return 'critical'
  }

  if (normalizedStatus === 'BAJO' || normalizedStatus === 'LOW' || normalizedStatus === 'ALERTA') {
    return 'low'
  }

  if (normalizedStatus === 'ADECUADO' || normalizedStatus === 'OK' || normalizedStatus === 'ADEQUATE') {
    return 'adequate'
  }

  if (minimumStock > 0 && stock < minimumStock) return 'critical'
  if (minimumStock > 0 && stock < minimumStock * 1.5) return 'low'
  return 'adequate'
}

const buildRestockSuggestion = ({ stock, minimumStock }) => {
  const unitsToRestock = Math.max(Math.ceil(minimumStock - stock), 1)
  return `Reponer ${unitsToRestock} unidades para alcanzar el mínimo operativo.`
}

const mapStockProduct = (item = {}) => {
  const product = item?.product || item
  const activeFromStatus = String(item?.status ?? item?.estado ?? product?.status ?? product?.estado ?? '').trim().toUpperCase()
  const hasBooleanActive =
    typeof item?.active === 'boolean' ||
    typeof item?.activo === 'boolean' ||
    typeof product?.active === 'boolean' ||
    typeof product?.activo === 'boolean'
  const isActive = hasBooleanActive
    ? Boolean(item?.active ?? item?.activo ?? product?.active ?? product?.activo)
    : activeFromStatus
      ? activeFromStatus !== 'INACTIVE' && activeFromStatus !== 'INACTIVO'
      : true
  const stock = toNumberOrDefault(
    item?.currentStock ??
      item?.stockActual ??
      item?.operationalStock ??
      item?.stock ??
      product?.currentStock ??
      product?.stockActual ??
      product?.operationalStock ??
      product?.stock,
    0
  )
  const minimumStock = toNumberOrDefault(
    item?.minimumStock ??
      item?.stockMinimo ??
      product?.minimumStock ??
      product?.stockMinimo,
    0
  )
  const level = toNumberOrDefault(
    item?.level ??
      item?.nivel ??
      item?.coverage ??
      item?.percentage ??
      item?.porcentaje,
    getStockLevel({ stock, minimumStock })
  )
  const status = getStockStatus({
    stock,
    minimumStock,
    status: item?.status ?? item?.estado ?? product?.status ?? product?.estado
  })

  return {
    id: item?.id ?? product?.id ?? product?.code ?? product?.codigo ?? `${product?.name ?? product?.nombre}-${stock}`,
    code: String(item?.code ?? item?.codigo ?? product?.code ?? product?.codigo ?? '').trim(),
    name: String(item?.name ?? item?.nombre ?? product?.name ?? product?.nombre ?? '').trim(),
    stock,
    minimumStock,
    level: Math.max(0, Math.round(level)),
    status,
    active: isActive,
    suggestion: buildRestockSuggestion({
      stock,
      minimumStock
    })
  }
}

const fetchFirstAvailable = async (endpoints, token) => {
  let lastError = null

  for (const endpoint of endpoints) {
    try {
      const response = await inventoryApi.get(endpoint, {
        headers: buildAuthHeaders(token)
      })
      return response.data
    } catch (error) {
      lastError = error
      if (shouldTryNextEndpoint(error)) continue
      throw error
    }
  }

  throw lastError || new Error('No se encontró endpoint disponible.')
}

const normalizeSummary = (payload = {}, products = []) => {
  const source = payload?.data && !Array.isArray(payload.data) ? payload.data : payload
  const criticalCount = toNumberOrDefault(
    source?.criticalProducts ??
      source?.productosCriticos ??
      source?.criticalCount ??
      source?.totalCritical,
    products.filter((product) => product.status === 'critical').length
  )
  const adequateCount = toNumberOrDefault(
    source?.adequateStock ??
      source?.stockAdecuado ??
      source?.adequateCount ??
      source?.totalAdequate,
    products.filter((product) => product.status === 'adequate').length
  )
  const lowStockCount = toNumberOrDefault(
    source?.lowStock ??
      source?.stockBajo ??
      source?.lowCount ??
      source?.totalLow,
    products.filter((product) => product.status === 'low').length
  )
  const totalUnits = toNumberOrDefault(
    source?.totalUnits ??
      source?.totalUnidades ??
      source?.totalStock,
    products.reduce((sum, product) => sum + product.stock, 0)
  )

  return {
    criticalProducts: criticalCount,
    lowStock: lowStockCount,
    adequateStock: adequateCount,
    totalUnits
  }
}

const sortStockProducts = (products = []) => {
  const statusWeight = {
    critical: 0,
    low: 1,
    adequate: 2
  }

  return [...products].sort((firstProduct, secondProduct) => {
    const weightDifference = statusWeight[firstProduct.status] - statusWeight[secondProduct.status]
    if (weightDifference !== 0) return weightDifference
    if (firstProduct.level !== secondProduct.level) return firstProduct.level - secondProduct.level
    return firstProduct.name.localeCompare(secondProduct.name)
  })
}

const filterActiveProducts = (products = []) => products.filter((product) => product?.active !== false)

export const getStockControlData = async (token) => {
  try {
    const [summaryResult, criticalResult, medicinesResult] = await Promise.allSettled([
      fetchFirstAvailable(STOCK_SUMMARY_ENDPOINTS, token),
      fetchFirstAvailable(CRITICAL_PRODUCTS_ENDPOINTS, token),
      getMedicines(token)
    ])

    if (summaryResult.status === 'rejected' && criticalResult.status === 'rejected' && medicinesResult.status === 'rejected') {
      throw summaryResult.reason
    }

    const medicineProducts = medicinesResult.status === 'fulfilled'
      ? filterActiveProducts(medicinesResult.value.map(mapStockProduct))
      : []
    const summaryProducts = summaryResult.status === 'fulfilled'
      ? filterActiveProducts(normalizeCollection(summaryResult.value).map(mapStockProduct))
      : []
    const criticalProducts = criticalResult.status === 'fulfilled'
      ? filterActiveProducts(normalizeCollection(criticalResult.value).map(mapStockProduct))
      : []

    const productsByKey = new Map()

    ;[...medicineProducts, ...summaryProducts, ...criticalProducts].forEach((product) => {
      const key = String(product.id ?? product.code ?? product.name).trim()
      if (!key) return
      productsByKey.set(key, product)
    })

    const products = sortStockProducts(Array.from(productsByKey.values()))
    const normalizedCriticalProducts = sortStockProducts(
      criticalProducts.length > 0
        ? criticalProducts
        : products.filter((product) => product.status === 'critical')
    )

    return {
      summary: normalizeSummary(
        summaryResult.status === 'fulfilled' ? summaryResult.value : {},
        products
      ),
      criticalProducts: normalizedCriticalProducts,
      products,
      partialWarning: [
        summaryResult.status === 'rejected' ? 'resumen' : '',
        criticalResult.status === 'rejected' ? 'productos críticos' : ''
      ].filter(Boolean).join(', ')
    }
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo cargar el control inteligente de stock.')
  }
}
