import { getRoleLabel } from '../../shared/constants/roles'
import { normalizeIdentity } from '../../shared/utils/text.utils'

export const INITIAL_FILTERS = Object.freeze({
  type: '',
  fromDate: '',
  toDate: '',
  user: ''
})

export const hasActiveFilters = (filters = {}) =>
  Boolean(filters.type || filters.fromDate || filters.toDate || filters.user)

export const buildProductsMap = (medicines = []) => {
  const productsMap = {}

  medicines.forEach((medicine) => {
    if (!medicine?.id) return
    productsMap[medicine.id] = medicine.nombre || medicine.name || ''
  })

  return productsMap
}

const startsAtDay = (dateValue) => {
  const normalizedDate = new Date(dateValue)
  normalizedDate.setHours(0, 0, 0, 0)
  return normalizedDate
}

const endsAtDay = (dateValue) => {
  const normalizedDate = new Date(dateValue)
  normalizedDate.setHours(23, 59, 59, 999)
  return normalizedDate
}

export const filterMovementsLocally = (movements = [], filters = {}) => {
  const normalizedUserFilter = String(filters.user || '').trim().toLowerCase()
  const isUserIdFilter = normalizedUserFilter.startsWith('uid:')
  const selectedUserId = isUserIdFilter ? Number(normalizedUserFilter.slice(4)) : null
  const fromDate = filters.fromDate ? startsAtDay(filters.fromDate) : null
  const toDate = filters.toDate ? endsAtDay(filters.toDate) : null

  return movements.filter((movement) => {
    if (filters.type && movement.type !== filters.type) return false

    if (normalizedUserFilter) {
      if (isUserIdFilter) {
        if (!Number.isFinite(selectedUserId) || Number(movement.userId) !== selectedUserId) return false
      } else {
        const movementUserIdentity = normalizeIdentity(movement.userIdentityKey || movement.user)
        if (movementUserIdentity !== normalizeIdentity(normalizedUserFilter)) return false
      }
    }

    if (fromDate || toDate) {
      if (!movement.dateValue) return false
      const movementTime = movement.dateValue.getTime()
      if (fromDate && movementTime < fromDate.getTime()) return false
      if (toDate && movementTime > toDate.getTime()) return false
    }

    return true
  })
}

export const buildUsersIndex = (users = []) => {
  const usersByIdentity = {}
  const usersById = {}
  const usersBySelectValue = new Map()

  users.forEach((user) => {
    const numericId = Number(user?.id)
    const name = String(user?.nombre || '').trim()
    const email = String(user?.email || '').trim().toLowerCase()
    const roleLabel = getRoleLabel(user?.rol || '')
    const selectValue = Number.isFinite(numericId) ? `uid:${numericId}` : normalizeIdentity(email || name)
    const displayName = name || email

    if (!selectValue || !displayName) return

    const option = {
      id: Number.isFinite(numericId) ? numericId : null,
      value: selectValue,
      label: `${displayName} (${roleLabel})`,
      roleLabel,
      email,
      displayName
    }

    usersBySelectValue.set(selectValue, option)

    usersByIdentity[normalizeIdentity(selectValue)] = option
    if (email) usersByIdentity[normalizeIdentity(email)] = option
    if (name) usersByIdentity[normalizeIdentity(name)] = option
    if (Number.isFinite(numericId)) usersById[numericId] = option
  })

  const userOptions = Array.from(usersBySelectValue.values()).sort((firstUser, secondUser) =>
    firstUser.label.localeCompare(secondUser.label, 'es', { sensitivity: 'base' })
  )

  return {
    usersByIdentity,
    usersById,
    userOptions
  }
}

