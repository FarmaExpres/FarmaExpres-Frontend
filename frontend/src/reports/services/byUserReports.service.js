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

const normalizeUsersActivityCollection = (responseData) => {
  if (Array.isArray(responseData?.reports)) return responseData.reports
  if (Array.isArray(responseData?.data?.reports)) return responseData.data.reports
  if (Array.isArray(responseData?.items)) return responseData.items
  if (Array.isArray(responseData?.data?.items)) return responseData.data.items
  if (Array.isArray(responseData)) return responseData
  return []
}

const mapUserActivityItem = (item = {}) => ({
  userId: item?.userId ?? null,
  user: String(item?.userName ?? item?.user ?? 'No disponible').trim() || 'No disponible',
  roleLabel: String(item?.userRole ?? item?.roleLabel ?? 'Sin rol').trim() || 'Sin rol',
  totalMovements: toNumberOrDefault(item?.totalMovements, 0),
  entrances: toNumberOrDefault(item?.totalEntrances ?? item?.entrances, 0),
  exits: toNumberOrDefault(item?.totalExits ?? item?.exits, 0),
  activityLevel: String(item?.activityLevel ?? '').trim()
})

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
