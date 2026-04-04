import { MOVEMENT_TYPES } from '../../movements/services/movements.service'
import { getRoleLabel } from '../../shared/constants/roles'
import { normalizeIdentity, toNumber } from './reportFormatters'

export const buildUsersIndex = (users = []) => {
  const usersByIdentity = {}
  const usersById = {}

  users.forEach((user) => {
    const numericId = Number(user?.id)
    const name = String(user?.nombre || '').trim()
    const email = String(user?.email || '').trim().toLowerCase()
    const roleLabel = getRoleLabel(user?.rol || '')

    const normalizedKeys = new Set([name, email].filter(Boolean).map(normalizeIdentity))
    const userInfo = {
      id: Number.isFinite(numericId) ? numericId : null,
      displayName: name || email || 'No disponible',
      email,
      roleLabel
    }

    normalizedKeys.forEach((key) => {
      usersByIdentity[key] = userInfo
    })
    if (Number.isFinite(numericId)) usersById[numericId] = userInfo
  })

  return { usersByIdentity, usersById }
}

export const buildInventoryRows = (medicines = []) =>
  medicines.filter((item) => item.activo !== false)

const resolveMovementTimestamp = (movement = {}) => {
  if (movement?.dateValue instanceof Date && !Number.isNaN(movement.dateValue.getTime())) {
    return movement.dateValue.getTime()
  }

  const rawDate = String(movement?.date || '').trim()
  const rawTime = String(movement?.time || '').trim()
  const dateMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const timeMatch = rawTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)

  if (!dateMatch) return 0

  const day = Number(dateMatch[1])
  const month = Number(dateMatch[2]) - 1
  const year = Number(dateMatch[3])
  const hour = timeMatch ? Number(timeMatch[1]) : 0
  const minute = timeMatch ? Number(timeMatch[2]) : 0
  const second = timeMatch ? Number(timeMatch[3] || 0) : 0

  const parsedDate = new Date(year, month, day, hour, minute, second)
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime()
}

export const buildMovementsRows = (movements = []) =>
  [...movements]
    .sort((first, second) => resolveMovementTimestamp(second) - resolveMovementTimestamp(first))
    .slice(0, 300)

export const buildLowStockRows = (medicines = []) =>
  medicines
    .filter((item) => item.activo !== false && toNumber(item.stock) <= toNumber(item.stockMinimo))
    .sort((first, second) => (first.stock - first.stockMinimo) - (second.stock - second.stockMinimo))

export const buildByUserRows = (movements = []) => {
  const summary = new Map()

  movements.forEach((item) => {
    const key = `${normalizeIdentity(item.user)}|${normalizeIdentity(item.userRoleLabel)}`
    if (!summary.has(key)) {
      summary.set(key, {
        user: item.user || 'No disponible',
        roleLabel: item.userRoleLabel || 'Sin rol',
        totalMovements: 0,
        entrances: 0,
        exits: 0
      })
    }

    const userSummary = summary.get(key)
    userSummary.totalMovements += 1

    if (item.type === MOVEMENT_TYPES.ENTRANCE) userSummary.entrances += 1
    if (item.type === MOVEMENT_TYPES.EXIT || item.type === MOVEMENT_TYPES.DELETED) userSummary.exits += 1
  })

  return Array.from(summary.values()).sort((first, second) => second.totalMovements - first.totalMovements)
}
