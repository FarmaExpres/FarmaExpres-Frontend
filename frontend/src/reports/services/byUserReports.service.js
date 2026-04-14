import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'

const USERS_ACTIVITY_REPORT_ENDPOINT = '/api/movements/report/users-activity'

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeIdentity = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

const isSystemIdentity = (value = '') => {
  const normalizedValue = normalizeIdentity(value)
  return normalizedValue === 'system' || normalizedValue === 'system_init' || normalizedValue === 'sistema'
}

const normalizeUsersActivityCollection = (responseData) => {
  if (Array.isArray(responseData?.reports)) return responseData.reports
  if (Array.isArray(responseData?.data?.reports)) return responseData.data.reports
  if (Array.isArray(responseData?.items)) return responseData.items
  if (Array.isArray(responseData?.data?.items)) return responseData.data.items
  if (Array.isArray(responseData)) return responseData
  return []
}

const mapUserActivityItem = (item = {}) => {
  const rawUser = String(item?.userName ?? item?.user ?? '').trim()
  const rawRole = String(item?.userRole ?? item?.roleLabel ?? '').trim()
  const systemIdentity = isSystemIdentity(rawUser) || isSystemIdentity(rawRole)

  return {
    userId: item?.userId ?? null,
    user: systemIdentity ? 'Sistema' : (rawUser || 'No disponible'),
    roleLabel: systemIdentity ? 'Automático' : (rawRole || 'Sin rol'),
    totalMovements: toNumberOrDefault(item?.totalMovements, 0),
    entrances: toNumberOrDefault(item?.totalEntrances ?? item?.entrances, 0),
    exits: toNumberOrDefault(item?.totalExits ?? item?.exits, 0),
    activityLevel: String(item?.activityLevel ?? '').trim()
  }
}

const dedupeRows = (rows = []) => {
  const rowsByKey = new Map()

  rows.forEach((row) => {
    const key = String(row?.userId ?? `${row?.user}-${row?.roleLabel}`).trim()
    if (!key) return
    rowsByKey.set(key, row)
  })

  return Array.from(rowsByKey.values()).sort(
    (firstRow, secondRow) => secondRow.totalMovements - firstRow.totalMovements
  )
}

export const getByUserReportRows = async (token) => {
  try {
    const response = await inventoryApi.get(USERS_ACTIVITY_REPORT_ENDPOINT, {
      headers: buildAuthHeaders(token)
    })

    return dedupeRows(normalizeUsersActivityCollection(response.data).map(mapUserActivityItem))
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo obtener el reporte por usuario.')
  }
}
