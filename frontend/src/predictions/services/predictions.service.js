import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const PREDICTION_ENDPOINTS = Object.freeze({
  health: '/api/predictions/health',
  ingest: '/api/predictions/ingest',
  clean: '/api/predictions/clean',
  train: '/api/predictions/train',
  recalculate: '/api/predictions/recalculate',
  predictions: '/api/predictions',
  metrics: '/api/predictions/metrics'
})

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeRiskLevel = (riskLevel) => {
  const normalizedRisk = String(riskLevel || '').trim().toUpperCase()
  if (normalizedRisk === 'OUT_OF_STOCK') return 'out'
  if (normalizedRisk === 'HIGH') return 'high'
  if (normalizedRisk === 'MEDIUM') return 'medium'
  return 'low'
}

const normalizePrediction = (item = {}) => ({
  productId: String(item.product_id ?? item.productId ?? '').trim(),
  productCode: String(item.product_code ?? item.productCode ?? '').trim(),
  productName: String(item.product_name ?? item.productName ?? 'Sin medicamento').trim(),
  category: String(item.category ?? 'Sin categoría').trim(),
  currentStock: toNumber(item.current_stock ?? item.currentStock),
  minimumStock: toNumber(item.minimum_stock ?? item.minimumStock),
  horizonDays: toNumber(item.horizon_days ?? item.horizonDays, 7),
  movingAverageDaily: toNumber(item.moving_average_daily ?? item.movingAverageDaily),
  predictedDemandUnits: toNumber(item.predicted_demand_units ?? item.predictedDemandUnits),
  estimatedStockoutDays: item.estimated_stockout_days ?? item.estimatedStockoutDays ?? null,
  riskLevel: String(item.risk_level ?? item.riskLevel ?? 'LOW').trim().toUpperCase(),
  riskKey: normalizeRiskLevel(item.risk_level ?? item.riskLevel),
  demandSignal: toNumber(item.demand_signal ?? item.demandSignal),
  method: String(item.method ?? '30_day_moving_average'),
  generatedAt: item.generated_at ?? item.generatedAt ?? null
})

const normalizeHealth = (payload = {}) => ({
  status: String(payload.status || 'degraded'),
  mongo: Boolean(payload.mongo),
  database: String(payload.database || 'sin base'),
  counts: {
    rawData: toNumber(payload.counts?.raw_data),
    cleanedData: toNumber(payload.counts?.cleaned_data),
    predictions: toNumber(payload.counts?.predictions),
    metrics: toNumber(payload.counts?.model_metrics),
    productsSnapshot: toNumber(payload.counts?.products_snapshot)
  },
  pipeline: {
    readyToClean: Boolean(payload.pipeline?.ready_to_clean),
    readyToTrain: Boolean(payload.pipeline?.ready_to_train),
    hasPredictions: Boolean(payload.pipeline?.has_predictions)
  }
})

const normalizeMetrics = (payload = {}) => {
  const training = payload.latest_training || (payload.latest?.type === 'training' ? payload.latest : null) || {}
  const cleaning = payload.latest_cleaning || (payload.latest?.type === 'cleaning' ? payload.latest : null) || {}

  return {
    explanation: payload.model_explanation || 'Predicción de demanda con promedio móvil de salidas históricas.',
    trainedAt: training.trained_at || training.trainedAt || null,
    method: training.method || '30_day_moving_average',
    horizonDays: toNumber(training.horizon_days ?? training.horizonDays, 7),
    productsEvaluated: toNumber(training.products_evaluated ?? training.productsEvaluated),
    validRecordsUsed: toNumber(training.valid_records_used ?? training.validRecordsUsed),
    averageMae: training.average_mae ?? training.averageMae ?? null,
    highRiskCount: toNumber(training.risk_high_count ?? training.riskHighCount),
    outOfStockCount: toNumber(training.risk_out_of_stock_count ?? training.riskOutOfStockCount),
    cleaning: {
      inputRecords: toNumber(cleaning.input_records ?? cleaning.inputRecords),
      cleanedRecords: toNumber(cleaning.cleaned_records ?? cleaning.cleanedRecords),
      validRecords: toNumber(cleaning.valid_records ?? cleaning.validRecords),
      invalidRecords: toNumber(cleaning.invalid_records ?? cleaning.invalidRecords),
      duplicatesRemoved: toNumber(cleaning.duplicates_removed ?? cleaning.duplicatesRemoved)
    }
  }
}

export const getPredictionHealth = async (token) => {
  try {
    const response = await inventoryApi.get(PREDICTION_ENDPOINTS.health, {
      headers: token ? buildAuthHeaders(token) : undefined
    })
    return normalizeHealth(response.data || {})
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo consultar el estado del servicio predictivo.')
  }
}

export const getPredictions = async (token, limit = 200) => {
  try {
    const response = await inventoryApi.get(PREDICTION_ENDPOINTS.predictions, {
      params: { limit },
      headers: buildAuthHeaders(token)
    })
    return Array.isArray(response.data) ? response.data.map(normalizePrediction) : []
  } catch (error) {
    throw normalizeApiError(error, 'No se pudieron cargar las predicciones.')
  }
}

export const getPredictionMetrics = async (token) => {
  try {
    const response = await inventoryApi.get(PREDICTION_ENDPOINTS.metrics, {
      headers: buildAuthHeaders(token)
    })
    return normalizeMetrics(response.data || {})
  } catch (error) {
    throw normalizeApiError(error, 'No se pudieron cargar las métricas predictivas.')
  }
}

export const ingestInventorySnapshot = async (token) => {
  try {
    const response = await inventoryApi.post(
      PREDICTION_ENDPOINTS.ingest,
      { source: 'inventory' },
      { headers: buildAuthHeaders(token) }
    )
    return response.data || {}
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo sincronizar el inventario con MongoDB.')
  }
}

export const cleanPredictionData = async (token) => {
  try {
    const response = await inventoryApi.post(PREDICTION_ENDPOINTS.clean, {}, {
      headers: buildAuthHeaders(token)
    })
    return response.data || {}
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo limpiar la información predictiva.')
  }
}

export const trainPredictionModel = async (token, horizonDays = 7) => {
  try {
    const response = await inventoryApi.post(
      PREDICTION_ENDPOINTS.train,
      { horizon_days: horizonDays },
      { headers: buildAuthHeaders(token) }
    )
    return response.data || {}
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo recalcular el modelo predictivo.')
  }
}

export const recalculatePredictions = async (token, horizonDays = 7) => {
  try {
    const response = await inventoryApi.post(
      PREDICTION_ENDPOINTS.recalculate,
      { horizon_days: horizonDays },
      { headers: buildAuthHeaders(token) }
    )
    return response.data || {}
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo recalcular el flujo predictivo.')
  }
}
