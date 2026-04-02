import {
  buildAuthHeaders,
  inventoryApi,
  normalizeApiError
} from '../../shared/services/api.service'
import { getRoleLabel } from '../../shared/constants/roles'

const MOVEMENTS_ENDPOINT_CANDIDATES = ['/api/movements', '/api/motions', '/api/Motion', '/movements']

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
  } catch (error) {
    return undefined
  }
}

const CLIENT_TIME_ZONE = getClientTimeZone()

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
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
  const hasExplicitTimezone = /([zZ]|[+\-]\d{2}:\d{2})$/.test(rawDateText)
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

const normalizeIdentity = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

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
  const roleLabel = rawRole
    ? (() => {
      const normalizedRoleLabel = getRoleLabel(rawRole)
      return normalizedRoleLabel === 'Sin rol' ? String(rawRole).trim() : normalizedRoleLabel
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
    user: userInfo.name,
    userId: userInfo.id,
    userRoleLabel: userInfo.roleLabel,
    userIdentityKey: userInfo.identityKey,
    status: normalizedStatus,
    statusLabel: getStatusLabel(normalizedStatus),
    productId,
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

export const getMovements = ({ filters = {}, productsById = {}, usersByIdentity = {}, usersById = {}, token } = {}) => {
  const movementMapper = (movement) => mapMovement(movement, productsById, usersByIdentity, usersById)
  return fetchMovementsInternal({ filters, token, movementMapper })
}

const fetchMovementsInternal = async ({ filters = {}, token, movementMapper }) => {
  const headers = buildAuthHeaders(token)
  const params = buildMovementQueryParams(filters)
  let lastKnownError = null

  for (const endpoint of MOVEMENTS_ENDPOINT_CANDIDATES) {
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
      const normalizedError = normalizeApiError(error, 'No se pudo cargar el historial de movimientos.')
      lastKnownError = normalizedError

      // Compatibilidad: si el endpoint no existe en esta versión de backend, se intenta el siguiente.
      if (normalizedError?.status === 404) continue

      throw normalizedError
    }
  }

  throw lastKnownError || {
    message: 'No se encontró un endpoint disponible para consultar movimientos.',
    status: 404
  }
}

export const MOVEMENT_TYPES = MOVEMENT_TYPE
