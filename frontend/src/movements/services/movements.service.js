import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'
import { getRoleLabel } from '../../shared/constants/roles'
import { normalizeIdentity } from '../../shared/utils/text.utils'

const MOVEMENTS_ENDPOINT = '/api/movements'
const MOVEMENTS_ENTRIES_ENDPOINT = '/api/movements/entries'
const MOVEMENTS_ENTRANCE_ENDPOINT = '/api/movements/entrance'
const MOVEMENTS_EXIT_ENDPOINT = '/api/movements/exit'
const MOVEMENTS_UPDATED_ENDPOINT = '/api/movements/updated'

const MOVEMENT_TYPE = Object.freeze({
  ENTRANCE: 'ENTRANCE',
  EXIT: 'EXIT',
  UPDATED: 'UPDATED',
  DELETED: 'DELETED',
  UNKNOWN: 'UNKNOWN'
})

const MOVEMENT_STATUS = Object.freeze({
  NORMAL: 'NORMAL',
  MARKED: 'MARKED'
})

const getClientTimeZone = () => {
  try {
    const resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return String(resolvedTimeZone || '').trim() || undefined
  } catch {
    return undefined
  }
}

const CLIENT_TIME_ZONE = getClientTimeZone()

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeDateOnly = (value) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  const dateOnlyMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/)
  return dateOnlyMatch ? dateOnlyMatch[1] : rawValue
}

const normalizeMovementType = (value) => {
  const normalizedValue = String(value || '').trim().toUpperCase()

  if (/ENTRANCE|ENTRY|ENTRADA/i.test(normalizedValue)) return MOVEMENT_TYPE.ENTRANCE
  if (/EXIT|SALIDA/i.test(normalizedValue)) return MOVEMENT_TYPE.EXIT
  if (/UPDATED|UPDATE|AJUSTE|MODIFICADO/i.test(normalizedValue)) return MOVEMENT_TYPE.UPDATED
  if (/DELETED|DELETE|ELIMINADO/i.test(normalizedValue)) return MOVEMENT_TYPE.DELETED

  return MOVEMENT_TYPE.UNKNOWN
}

const normalizeMovementStatus = (movement = {}) => {
  const markedFlag = movement?.marked ?? movement?.isMarked ?? movement?.flagged
  if (typeof markedFlag === 'boolean') {
    return markedFlag ? MOVEMENT_STATUS.MARKED : MOVEMENT_STATUS.NORMAL
  }

  const rawStatus = String(movement?.status ?? movement?.estado ?? '').trim().toUpperCase()
  if (/MARKED|MARCADO|FLAGGED/i.test(rawStatus)) return MOVEMENT_STATUS.MARKED

  return MOVEMENT_STATUS.NORMAL
}

const hasNonEmptyField = (value) => String(value ?? '').trim().length > 0

const hasUserNameFromApi = (movement = {}) =>
  hasNonEmptyField(movement?.userName) ||
  hasNonEmptyField(movement?.username) ||
  hasNonEmptyField(movement?.user) ||
  hasNonEmptyField(movement?.usuario)

const hasUserRoleFromApi = (movement = {}) =>
  hasNonEmptyField(movement?.userRole) ||
  hasNonEmptyField(movement?.role) ||
  hasNonEmptyField(movement?.rol) ||
  hasNonEmptyField(movement?.perfil)

const hasStatusFromApi = (movement = {}) =>
  hasNonEmptyField(movement?.status) ||
  hasNonEmptyField(movement?.estado) ||
  typeof movement?.marked === 'boolean' ||
  typeof movement?.isMarked === 'boolean' ||
  typeof movement?.flagged === 'boolean'

const resolveDateDetails = (movement = {}) => {
  const rawDate =
    movement?.dateTime ??
    movement?.date ??
    movement?.fecha ??
    movement?.createdAt ??
    movement?.timestamp ??
    null

  if (!rawDate) {
    return {
      value: null,
      raw: null,
      parseMode: 'empty',
      hasExplicitTimezone: false
    }
  }

  // Si backend envía epoch, se soporta tanto en segundos como milisegundos.
  if (typeof rawDate === 'number' && Number.isFinite(rawDate)) {
    const epochValue = rawDate < 1_000_000_000_000 ? rawDate * 1000 : rawDate
    const parsedEpochDate = new Date(epochValue)
    return {
      value: Number.isNaN(parsedEpochDate.getTime()) ? null : parsedEpochDate,
      raw: String(rawDate),
      parseMode: 'epoch',
      hasExplicitTimezone: true
    }
  }

  const rawDateText = String(rawDate).trim()
  if (!rawDateText) {
    return {
      value: null,
      raw: null,
      parseMode: 'empty',
      hasExplicitTimezone: false
    }
  }

  // Si viene sin zona horaria (LocalDateTime), se interpreta en zona local
  // para evitar desplazamientos de fecha por UTC implícito.
  const localDateTimeMatch = rawDateText.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/
  )

  if (localDateTimeMatch) {
    const [, year, month, day, hours, minutes, seconds = '0', millis = '0'] = localDateTimeMatch
    const parsedLocalDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
      Number(millis.padEnd(3, '0'))
    )
    return {
      value: Number.isNaN(parsedLocalDate.getTime()) ? null : parsedLocalDate,
      raw: rawDateText,
      parseMode: 'local-no-timezone',
      hasExplicitTimezone: false
    }
  }

  const parsedDate = new Date(rawDateText)
  const hasExplicitTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(rawDateText)
  return {
    value: Number.isNaN(parsedDate.getTime()) ? null : parsedDate,
    raw: rawDateText,
    parseMode: 'native',
    hasExplicitTimezone
  }
}

const formatDate = (dateValue) => {
  if (!dateValue) return '---'

  return dateValue.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(CLIENT_TIME_ZONE ? { timeZone: CLIENT_TIME_ZONE } : {})
  })
}

const formatTime = (dateValue) => {
  if (!dateValue) return '---'

  return dateValue.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...(CLIENT_TIME_ZONE ? { timeZone: CLIENT_TIME_ZONE } : {})
  })
}

const resolveMedicineName = (movement = {}, productsById = {}) => {
  const directName =
    movement?.medicineName ??
    movement?.productName ??
    movement?.product?.name ??
    movement?.medicamento ??
    movement?.producto ??
    ''

  if (String(directName).trim()) return String(directName).trim()

  const productId = movement?.productId ?? movement?.product?.id ?? movement?.medicineId
  if (!productId) return 'No disponible'

  return String(productsById[productId] || 'No disponible')
}

const resolveReason = (movement = {}, normalizedType) => {
  const rawReason =
    movement?.reason ??
    movement?.motive ??
    movement?.motivo ??
    movement?.description ??
    movement?.detail ??
    ''

  if (String(rawReason).trim()) return String(rawReason).trim()

  if (normalizedType === MOVEMENT_TYPE.ENTRANCE) return 'Ingreso de inventario'
  if (normalizedType === MOVEMENT_TYPE.EXIT) return 'Salida de inventario'
  if (normalizedType === MOVEMENT_TYPE.DELETED) return 'Eliminación lógica de medicamento'
  if (normalizedType === MOVEMENT_TYPE.UPDATED) return 'Ajuste por actualización de inventario'

  return 'No especificado'
}

const parseAdjustmentDetail = (rawDetail) => {
  if (!rawDetail) return []

  if (Array.isArray(rawDetail)) {
    return rawDetail.filter((item) => item && typeof item === 'object')
  }

  if (typeof rawDetail === 'string') {
    try {
      const parsed = JSON.parse(rawDetail)
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : []
    } catch {
      return []
    }
  }

  return []
}

const formatAdjustmentValue = (value, format) => {
  if (value === null || value === undefined || value === '') return '---'

  if (format === 'currency') {
    const numericValue = toNumberOrDefault(value, 0)
    return `$${numericValue.toLocaleString('es-CO')}`
  }

  if (format === 'number') {
    const numericValue = toNumberOrDefault(value, 0)
    return numericValue.toLocaleString('es-CO')
  }

  return String(value)
}

const buildAdjustmentDetailText = (adjustmentDetail = []) =>
  adjustmentDetail
    .map((item) => {
      const label = item?.label || item?.field || 'Campo'
      const beforeValue = formatAdjustmentValue(item?.before, item?.format)
      const afterValue = formatAdjustmentValue(item?.after, item?.format)
      return `${label}: ${beforeValue} -> ${afterValue}`
    })
    .join(' | ')

const isSystemSeedUser = (value) => {
  const normalizedValue = normalizeIdentity(value).replace(/[\s-]+/g, '_')
  return normalizedValue === 'system_init' || normalizedValue === 'system'
}

const resolveUserInfo = (movement = {}, usersByIdentity = {}, usersById = {}) => {
  const rawUser =
    movement?.user ??
    movement?.userName ??
    movement?.username ??
    movement?.email ??
    movement?.performedBy ??
    movement?.actor ??
    movement?.usuario ??
    ''

  const rawRole =
    movement?.role ??
    movement?.userRole ??
    movement?.rol ??
    movement?.perfil ??
    ''

  const normalizedUser = String(rawUser).trim()
  const movementUserId = Number(movement?.userId ?? movement?.usuarioId ?? movement?.actorId)
  const userById = Number.isFinite(movementUserId) ? usersById[movementUserId] : null
  const userLookup = usersByIdentity[normalizeIdentity(normalizedUser)] || userById
  const isSystemUser = isSystemSeedUser(normalizedUser) || isSystemSeedUser(userLookup?.displayName) || isSystemSeedUser(userLookup?.email)

  const userDisplayName = isSystemUser
    ? 'Sistema'
    : (normalizedUser || userLookup?.displayName || 'No disponible')

  const normalizeRawRoleLabel = (value = '') => {
    const normalizedValue = String(value || '').trim().toUpperCase()
    if (['SYSTEM', 'SYSTEM_INIT', 'SISTEMA'].includes(normalizedValue)) return 'Automático'
    return String(value || '').trim()
  }

  const roleLabel = rawRole
    ? (() => {
      const normalizedRoleLabel = getRoleLabel(rawRole)
      if (normalizedRoleLabel !== 'Sin rol') return normalizedRoleLabel
      if (isSystemUser) return 'Automático'
      return normalizeRawRoleLabel(rawRole)
    })()
    : (
      isSystemUser
        ? 'Automático'
        : (userLookup?.roleLabel || (userDisplayName === 'No disponible' ? 'No disponible' : 'Sin rol'))
    )

  return {
    name: userDisplayName,
    roleLabel,
    identityKey: normalizeIdentity(normalizedUser || userLookup?.email || userDisplayName),
    id: Number.isFinite(movementUserId) ? movementUserId : (Number.isFinite(Number(userLookup?.id)) ? Number(userLookup.id) : null)
  }
}

const getTypeLabel = (normalizedType) => {
  if (normalizedType === MOVEMENT_TYPE.ENTRANCE) return 'Entrada'
  if (normalizedType === MOVEMENT_TYPE.EXIT) return 'Salida'
  if (normalizedType === MOVEMENT_TYPE.DELETED) return 'Salida'
  if (normalizedType === MOVEMENT_TYPE.UPDATED) return 'Ajuste'
  return 'Otro'
}

const getStatusLabel = (normalizedStatus) =>
  normalizedStatus === MOVEMENT_STATUS.MARKED ? 'Marcado' : 'Normal'

const getSignedQuantity = (rawAmount, normalizedType) => {
  const numericAmount = toNumberOrDefault(rawAmount, 0)
  const absoluteAmount = Math.abs(numericAmount)

  if (normalizedType === MOVEMENT_TYPE.ENTRANCE) return absoluteAmount
  if (normalizedType === MOVEMENT_TYPE.EXIT || normalizedType === MOVEMENT_TYPE.DELETED) return -absoluteAmount

  return numericAmount
}

const mapMovement = (movement = {}, productsById = {}, usersByIdentity = {}, usersById = {}) => {
  const normalizedType = normalizeMovementType(
    movement?.type ?? movement?.Type ?? movement?.movementType ?? movement?.tipo
  )
  const normalizedStatus = normalizeMovementStatus(movement)
  const dateDetails = resolveDateDetails(movement)
  const dateValue = dateDetails.value
  const productId = movement?.productId ?? movement?.product?.id ?? movement?.medicineId ?? null
  const signedQuantity = getSignedQuantity(movement?.amount ?? movement?.quantity ?? movement?.cantidad, normalizedType)
  const adjustmentDetail = parseAdjustmentDetail(movement?.adjustmentDetail ?? movement?.adjustment_detail)
  const adjustmentSummaryRaw = String(movement?.adjustmentSummary ?? movement?.adjustment_summary ?? '').trim()
  const adjustmentSummary =
    adjustmentSummaryRaw ||
    (adjustmentDetail.length > 0 ? buildAdjustmentDetailText(adjustmentDetail) : '')

  const fallbackId = [
    movement?.dateTime ?? movement?.date ?? movement?.fecha ?? 'movement',
    movement?.productId ?? movement?.product?.id ?? movement?.medicineId ?? 'product',
    movement?.amount ?? movement?.quantity ?? movement?.cantidad ?? 'amount'
  ].join('-')

  const userInfo = resolveUserInfo(movement, usersByIdentity, usersById)

  return {
    id: movement?.id ?? fallbackId,
    dateValue,
    date: formatDate(dateValue),
    time: formatTime(dateValue),
    type: normalizedType,
    typeLabel: getTypeLabel(normalizedType),
    medicine: resolveMedicineName(movement, productsById),
    quantity: signedQuantity,
    reason: resolveReason(movement, normalizedType),
    adjustmentSummary,
    adjustmentDetail,
    adjustmentDetailText: buildAdjustmentDetailText(adjustmentDetail),
    user: userInfo.name,
    userId: userInfo.id,
    userRoleLabel: userInfo.roleLabel,
    userIdentityKey: userInfo.identityKey,
    status: normalizedStatus,
    statusLabel: getStatusLabel(normalizedStatus),
    productId,
    batchId: movement?.batchId ?? movement?.batch?.id ?? null,
    batchCode: String(movement?.batchCode ?? movement?.batch?.code ?? '').trim(),
    batchExpirationDate: normalizeDateOnly(
      movement?.batchExpirationDate ?? movement?.expirationDate ?? movement?.batch?.expirationDate
    ),
    rawDateValue: dateDetails.raw,
    dateParseMode: dateDetails.parseMode,
    hasExplicitTimezone: dateDetails.hasExplicitTimezone,
    contract: {
      hasUserName: hasUserNameFromApi(movement),
      hasUserRole: hasUserRoleFromApi(movement),
      hasStatus: hasStatusFromApi(movement)
    }
  }
}

const normalizeMovementsCollection = (responseData) => {
  if (Array.isArray(responseData)) return responseData
  if (Array.isArray(responseData?.data)) return responseData.data
  if (Array.isArray(responseData?.items)) return responseData.items
  if (Array.isArray(responseData?.content)) return responseData.content
  if (Array.isArray(responseData?.results)) return responseData.results
  return []
}

const mapFilterTypeToApiValue = (filterType) => {
  if (filterType === MOVEMENT_TYPE.ENTRANCE) return 'Entrance'
  if (filterType === MOVEMENT_TYPE.EXIT) return 'Exit'
  return ''
}

const buildMovementQueryParams = (filters = {}) => {
  const nextParams = {}
  const typeParam = mapFilterTypeToApiValue(filters.type)
  const fromDate = String(filters?.fromDate || '').trim()
  const toDate = String(filters?.toDate || '').trim()
  const user = String(filters?.user || '').trim()

  if (typeParam) nextParams.type = typeParam
  if (fromDate) nextParams.fromDate = fromDate
  if (toDate) nextParams.toDate = toDate
  if (user) nextParams.user = user

  return nextParams
}

const buildInventoryEntryPayload = (data = {}) => {
  const productId = Number(data?.productId)
  const amount = Number(data?.amount)
  const reason = String(data?.reason || '').trim()
  const batchCode = String(data?.batchCode || '').trim()
  const expirationDate = String(data?.expirationDate || '').trim()
  const observation = String(data?.observation ?? data?.observacion ?? '').trim()
  const normalizedQuantity = Number.isFinite(amount) ? amount : 0

  return {
    productId: Number.isFinite(productId) ? productId : null,
    amount: normalizedQuantity,
    quantity: normalizedQuantity,
    reason,
    ...(observation ? { observation, observacion: observation } : {}),
    ...(batchCode ? { batchCode } : {}),
    ...(expirationDate ? { expirationDate } : {})
  }
}

export const getMovements = ({ filters = {}, productsById = {}, usersByIdentity = {}, usersById = {}, token } = {}) => {
  const movementMapper = (movement) => mapMovement(movement, productsById, usersByIdentity, usersById)
  return fetchMovementsInternal({ endpoint: MOVEMENTS_ENDPOINT, filters, token, movementMapper })
}

export const getEntranceMovements = ({ productsById = {}, usersByIdentity = {}, usersById = {}, token } = {}) => {
  const movementMapper = (movement) => mapMovement(movement, productsById, usersByIdentity, usersById)
  return fetchMovementsInternal({ endpoint: MOVEMENTS_ENTRANCE_ENDPOINT, token, movementMapper })
}

export const getExitMovements = ({ productsById = {}, usersByIdentity = {}, usersById = {}, token } = {}) => {
  const movementMapper = (movement) => mapMovement(movement, productsById, usersByIdentity, usersById)
  return fetchMovementsInternal({ endpoint: MOVEMENTS_EXIT_ENDPOINT, token, movementMapper })
}

export const getUpdatedMovements = ({ productsById = {}, usersByIdentity = {}, usersById = {}, token } = {}) => {
  const movementMapper = (movement) => mapMovement(movement, productsById, usersByIdentity, usersById)
  return fetchMovementsInternal({ endpoint: MOVEMENTS_UPDATED_ENDPOINT, token, movementMapper })
}

export const registerInventoryEntry = async (data, token) => {
  try {
    const payload = buildInventoryEntryPayload(data)
    const response = await inventoryApi.post(MOVEMENTS_ENTRIES_ENDPOINT, payload, {
      headers: buildAuthHeaders(token)
    })

    return response?.data ?? null
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo registrar la entrada de inventario.')
  }
}

const fetchMovementsInternal = async ({ endpoint = MOVEMENTS_ENDPOINT, filters = {}, token, movementMapper }) => {
  const headers = buildAuthHeaders(token)
  const params = buildMovementQueryParams(filters)

  try {
    const response = await inventoryApi.get(endpoint, {
      headers,
      params
    })

    const movements = normalizeMovementsCollection(response.data)
      .map(movementMapper)
      .sort((firstMovement, secondMovement) => {
        const firstTimestamp = firstMovement.dateValue ? firstMovement.dateValue.getTime() : 0
        const secondTimestamp = secondMovement.dateValue ? secondMovement.dateValue.getTime() : 0
        return secondTimestamp - firstTimestamp
      })

    return movements
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo cargar el historial de movimientos.')
  }
}

export const MOVEMENT_TYPES = MOVEMENT_TYPE
