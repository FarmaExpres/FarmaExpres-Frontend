import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const AUDIT_ENDPOINTS = Object.freeze({
  history: '/api/audit/history',
  inconsistencies: '/api/audit/inconsistencies',
  observations: '/api/audit/observations',
  metrics: '/api/audit/metrics',
  recalculate: '/api/audit/recalculate',
  manualCase: '/api/audit/cases/manual',
  caseNote: (caseId) => `/api/audit/cases/${caseId}/note`,
  caseStatus: (caseId) => `/api/audit/cases/${caseId}/status`,
  manualFlag: (caseId) => `/api/audit/cases/${caseId}/manual-flag`
})

const AUDIT_RETRY_DELAYS = [700, 1400, 2400]

const wait = (delay) => new Promise((resolve) => {
  window.setTimeout(resolve, delay)
})

const isTransientAuditUnavailable = (error) => {
  const status = error?.response?.status
  const payload = error?.response?.data
  const message = [
    payload?.error,
    payload?.message,
    payload?.path,
    typeof payload === 'string' ? payload : '',
    error?.message
  ].filter(Boolean).join(' ')

  return [502, 503, 504].includes(status) || /audit-service unavailable|fallback\/audit|network error/i.test(message)
}

const withAuditRetry = async (requestFactory) => {
  let lastError = null

  for (let attempt = 0; attempt <= AUDIT_RETRY_DELAYS.length; attempt += 1) {
    try {
      return await requestFactory()
    } catch (error) {
      lastError = error
      if (!isTransientAuditUnavailable(error) || attempt === AUDIT_RETRY_DELAYS.length) break
      await wait(AUDIT_RETRY_DELAYS[attempt])
    }
  }

  throw lastError
}

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeCollection = (responseData) => {
  if (Array.isArray(responseData?.data)) return responseData.data
  if (Array.isArray(responseData?.items)) return responseData.items
  if (Array.isArray(responseData?.records)) return responseData.records
  if (Array.isArray(responseData)) return responseData
  return []
}

const normalizeType = (type) => {
  const normalizedType = String(type || '').trim().toUpperCase()
  if (/ENTRANCE|ENTRY|ENTRADA/.test(normalizedType)) return 'Entrada'
  if (/EXIT|SALIDA/.test(normalizedType)) return 'Salida'
  if (/UPDATED|ACTUALIZ/.test(normalizedType)) return 'Actualización'
  if (/DELETED|ELIMIN/.test(normalizedType)) return 'Eliminación'
  return String(type || '').trim() || 'Otro'
}

const normalizeStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase()
  if (/IN_REVIEW|EN_REVISION/.test(normalizedStatus)) return 'En revisión'
  if (/REVIEWED|REVISADO/.test(normalizedStatus)) return 'Revisado'
  if (/CLOSED|CERRADO/.test(normalizedStatus)) return 'Cerrado'
  return /MARCADO|MARKED|OPEN|FLAGGED/.test(normalizedStatus) ? 'Marcado' : 'Normal'
}

const normalizePriority = (priority) => {
  const normalizedPriority = String(priority || '').trim().toUpperCase()
  if (normalizedPriority === 'HIGH') return 'Alta prioridad'
  if (normalizedPriority === 'LOW') return 'Baja prioridad'
  return 'Media prioridad'
}

const normalizeSource = (source) => {
  const normalizedSource = String(source || '').trim().toUpperCase()
  if (/MANUAL/.test(normalizedSource)) return 'MANUAL'
  if (/AUTO|SYSTEM|REGLA/.test(normalizedSource)) return 'AUTO'
  return normalizedSource
}

const normalizeUserName = (user) => {
  const normalizedUser = String(user || '').trim()
  if (!normalizedUser || /^SYSTEM(_INIT)?$/i.test(normalizedUser)) return 'Sistema'
  return normalizedUser
}

const toApiPriority = (priority) => {
  const normalizedPriority = String(priority || '').trim().toLowerCase()
  if (normalizedPriority.includes('alta') || normalizedPriority === 'high') return 'HIGH'
  if (normalizedPriority.includes('baja') || normalizedPriority === 'low') return 'LOW'
  return 'MEDIUM'
}

const toApiStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase()
  if (/IN_REVIEW|REVISION/.test(normalizedStatus)) return 'IN_REVIEW'
  if (/REVIEWED|REVISADO/.test(normalizedStatus)) return 'REVIEWED'
  if (/CLOSED|CERRADO/.test(normalizedStatus)) return 'CLOSED'
  return 'OPEN'
}

const normalizeHistoryRow = (row = {}) => ({
  id: row.id ?? row.auditCaseId ?? row.caseId ?? row.movementId ?? '---',
  caseId: row.auditCaseId ?? row.caseId ?? row.id ?? null,
  movementId: row.movementId ?? row.movimientoId ?? row.id ?? '---',
  date: String(row.date ?? row.fecha ?? '').trim() || '---',
  time: String(row.time ?? row.hora ?? '').trim(),
  type: normalizeType(row.type ?? row.tipo),
  medicine: String(row.medicine ?? row.medicamento ?? row.productName ?? '').trim() || 'Sin medicamento',
  quantity: toNumber(row.quantity ?? row.amount ?? row.cantidad),
  absoluteQuantity: Math.abs(toNumber(row.absoluteQuantity ?? row.quantity ?? row.amount ?? row.cantidad)),
  user: normalizeUserName(row.user ?? row.usuario ?? row.userName),
  reason: String(row.reason ?? row.motivo ?? '').trim() || 'Sin motivo',
  status: normalizeStatus(row.auditStatus ?? row.status),
  auditSource: normalizeSource(row.auditSource ?? row.source),
  auditPriority: normalizePriority(row.auditPriority ?? row.priority),
  auditReason: String(row.auditReason ?? row.reasonAudit ?? '').trim(),
  auditNote: String(row.auditNote ?? row.note ?? '').trim(),
  riskScore: toNumber(row.riskScore)
})

const normalizeInconsistencyRow = (row = {}) => ({
  id: row.id ?? row.auditCaseId ?? row.caseId ?? row.movementId ?? '---',
  caseId: row.auditCaseId ?? row.caseId ?? row.id ?? null,
  movementId: row.movementId ?? row.movimientoId ?? row.id ?? '---',
  medicine: String(row.medicine ?? row.medicamento ?? '').trim() || 'Sin medicamento',
  type: normalizeType(row.type ?? row.tipo),
  quantity: Math.abs(toNumber(row.quantity ?? row.amount ?? row.cantidad)),
  user: normalizeUserName(row.user ?? row.usuario ?? row.userName),
  reason: String(row.reason ?? row.razon ?? row.cause ?? '').trim() || 'Movimiento inusual',
  priority: normalizePriority(row.priority),
  source: normalizeSource(row.source),
  riskScore: toNumber(row.riskScore),
  status: normalizeStatus(row.status),
  rawStatus: String(row.status ?? '').trim().toUpperCase()
})

const normalizeObservationRow = (row = {}) => ({
  id: row.id ?? row.observationId ?? row.auditCaseId ?? row.movementId ?? '---',
  caseId: row.auditCaseId ?? row.caseId ?? null,
  auditCaseId: row.auditCaseId ?? row.caseId ?? null,
  priority: normalizePriority(row.priority ?? row.prioridad),
  movementId: row.movementId ?? row.movimientoId ?? '---',
  description: String(row.description ?? row.descripcion ?? row.note ?? '').trim() || 'Observación de auditoría sin descripción.',
  user: normalizeUserName(row.user ?? row.usuario ?? row.relatedUser),
  createdBy: normalizeUserName(row.createdBy ?? row.creadoPor),
  createdAt: row.createdAt ?? null
})

const normalizeMetricNumber = (row = {}, preferredKey) =>
  toNumber(row[preferredKey] ?? row.total ?? row.count ?? row.movements ?? row.units ?? row.value)

const normalizeMetricRows = (rows) => (Array.isArray(rows) ? rows : [])

const normalizeMetrics = (metrics = {}) => {
  const summary = metrics.summary || {}
  const activityByUser = normalizeMetricRows(metrics.activityByUser)
  const monthlyTrend = normalizeMetricRows(metrics.monthlyTrend)
  const topMedicines = normalizeMetricRows(metrics.topMedicines)
  const casesByUser = normalizeMetricRows(metrics.casesByUser)
  const casesByMedicine = normalizeMetricRows(metrics.casesByMedicine)
  const casesByPriority = normalizeMetricRows(metrics.casesByPriority)
  const casesBySource = normalizeMetricRows(metrics.casesBySource)
  const caseMonthlyTrend = normalizeMetricRows(metrics.caseMonthlyTrend)
  const topRiskMedicines = normalizeMetricRows(metrics.topRiskMedicines)

  return {
    summary: {
      totalMovements: toNumber(summary.totalMovements),
      marked: toNumber(summary.marked),
      observations: toNumber(summary.observations),
      users: toNumber(summary.users),
      automaticCases: toNumber(summary.automaticCases),
      manualCases: toNumber(summary.manualCases),
      openCases: toNumber(summary.openCases),
      inReviewCases: toNumber(summary.inReviewCases),
      reviewedCases: toNumber(summary.reviewedCases),
      closedCases: toNumber(summary.closedCases),
      highPriorityCases: toNumber(summary.highPriorityCases),
      mediumPriorityCases: toNumber(summary.mediumPriorityCases),
      lowPriorityCases: toNumber(summary.lowPriorityCases)
    },
    activityByUser: activityByUser.map((row) => ({
      user: normalizeUserName(row.user ?? row.name),
      movements: normalizeMetricNumber(row, 'movements'),
      units: normalizeMetricNumber(row, 'units')
    })),
    monthlyTrend: monthlyTrend.map((row) => ({
      month: String(row.month ?? row.period ?? 'N/D'),
      entries: toNumber(row.entries ?? row.total),
      exits: toNumber(row.exits)
    })),
    topMedicines: topMedicines.map((row) => ({
      medicine: String(row.medicine ?? row.name ?? 'Sin medicamento'),
      units: normalizeMetricNumber(row, 'units')
    })),
    casesByUser: casesByUser.map((row) => ({
      user: normalizeUserName(row.user ?? row.name),
      cases: normalizeMetricNumber(row, 'cases')
    })),
    casesByMedicine: casesByMedicine.map((row) => ({
      medicine: String(row.medicine ?? row.name ?? 'Sin medicamento'),
      cases: normalizeMetricNumber(row, 'cases')
    })),
    casesByPriority: casesByPriority.map((row) => ({
      priority: normalizePriority(row.priority ?? row.name ?? row.label),
      cases: normalizeMetricNumber(row, 'cases')
    })),
    casesBySource: casesBySource.map((row) => ({
      source: normalizeSource(row.source ?? row.name ?? row.label ?? 'N/D'),
      cases: normalizeMetricNumber(row, 'cases')
    })),
    caseMonthlyTrend: caseMonthlyTrend.map((row) => ({
      month: String(row.month ?? row.period ?? 'N/D'),
      cases: normalizeMetricNumber(row, 'cases')
    })),
    topRiskMedicines: topRiskMedicines.map((row) => ({
      medicine: String(row.medicine ?? row.name ?? 'Sin medicamento'),
      cases: normalizeMetricNumber(row, 'cases'),
      riskScore: toNumber(row.riskScore ?? row.risk ?? row.score)
    }))
  }
}

const fetchAuditCollection = async (endpoint, token) => {
  const response = await withAuditRetry(() => inventoryApi.get(endpoint, {
    headers: buildAuthHeaders(token)
  }))
  return normalizeCollection(response.data)
}

export const getAuditModuleData = async (token) => {
  try {
    const [history, inconsistencies, observations, metricsResponse] = await Promise.all([
      fetchAuditCollection(AUDIT_ENDPOINTS.history, token),
      fetchAuditCollection(AUDIT_ENDPOINTS.inconsistencies, token),
      fetchAuditCollection(AUDIT_ENDPOINTS.observations, token),
      withAuditRetry(() => inventoryApi.get(AUDIT_ENDPOINTS.metrics, { headers: buildAuthHeaders(token) }))
    ])

    return {
      history: history.map(normalizeHistoryRow),
      inconsistencies: inconsistencies.map(normalizeInconsistencyRow),
      observations: observations.map(normalizeObservationRow),
      metrics: normalizeMetrics(metricsResponse.data || {})
    }
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo cargar el módulo de auditoría.')
  }
}

export const createManualAuditCase = async ({ movementId, note, priority }, token) => {
  try {
    const response = await inventoryApi.post(
      AUDIT_ENDPOINTS.manualCase,
      { movementId, note, priority: toApiPriority(priority) },
      { headers: buildAuthHeaders(token) }
    )
    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo marcar el movimiento en auditoría.')
  }
}

export const updateAuditCaseNote = async ({ caseId, note, priority }, token) => {
  try {
    const response = await inventoryApi.patch(
      AUDIT_ENDPOINTS.caseNote(caseId),
      { note, priority: toApiPriority(priority) },
      { headers: buildAuthHeaders(token) }
    )
    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo actualizar la nota de auditoría.')
  }
}

export const updateAuditCaseStatus = async ({ caseId, status }, token) => {
  try {
    const response = await inventoryApi.patch(
      AUDIT_ENDPOINTS.caseStatus(caseId),
      { status: toApiStatus(status) },
      { headers: buildAuthHeaders(token) }
    )
    return response.data
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo actualizar el estado del caso de auditoría.')
  }
}

export const recalculateAudit = async (token) => {
  try {
    const response = await withAuditRetry(() => inventoryApi.post(
      AUDIT_ENDPOINTS.recalculate,
      {},
      { headers: buildAuthHeaders(token) }
    ))
    return response.data || {}
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo recalcular la auditoría.')
  }
}

export const deleteManualAuditFlag = async (caseId, token) => {
  try {
    await inventoryApi.delete(AUDIT_ENDPOINTS.manualFlag(caseId), {
      headers: buildAuthHeaders(token)
    })
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo quitar la marca manual.')
  }
}
