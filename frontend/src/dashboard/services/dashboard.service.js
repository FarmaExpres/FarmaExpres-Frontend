import { getAlertsCenterData } from '../../alerts/services/alerts.service'
import {
  getActiveInventorySummary,
  getActiveInventoryTable,
  getMedicines
} from '../../medicines/services/medicines.service'
import {
  getEntranceMovements,
  getExitMovements,
  getMovements
} from '../../movements/services/movements.service'
import { buildProductsMap } from '../../movements/utils/movementsPage.utils'
import { getExpiringReportGroups } from '../../reports/services/expiringReports.service'
import { getLowStockReportGroups } from '../../reports/services/lowStockReports.service'
import { canAccessAlerts, normalizeRole, ROLES } from '../../shared/constants/roles'

const ALERT_SECTION_LABELS = Object.freeze({
  expired: 'Vencidos',
  expiringSoon: 'Próximos a vencer',
  lowStock: 'Bajo stock',
  outOfStock: 'Agotados'
})

const DAY_LABELS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']

const toNumberOrDefault = (value, fallback = 0) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const normalizeKey = (value) => String(value ?? '').trim().toLowerCase()

const getMovementProductKeys = (movement = {}) => [
  normalizeKey(movement?.productId),
  normalizeKey(movement?.medicineId),
  normalizeKey(movement?.productCode),
  normalizeKey(movement?.code),
  normalizeKey(movement?.codigo),
  normalizeKey(movement?.medicine)
].filter(Boolean)

const buildActiveMedicineIndex = (medicines = []) => {
  const activeKeys = new Set()

  medicines.forEach((medicine) => {
    if (medicine?.activo === false) return

    ;[
      medicine?.id,
      medicine?.codigo,
      medicine?.code,
      medicine?.nombre,
      medicine?.name
    ].forEach((value) => {
      const key = normalizeKey(value)
      if (key) activeKeys.add(key)
    })
  })

  return activeKeys
}

const filterActiveMedicines = (medicines = []) => medicines.filter((medicine) => medicine?.activo !== false)

const isMovementFromActiveMedicine = (movement = {}, activeMedicineKeys = new Set()) => {
  if (activeMedicineKeys.size === 0) return true
  const movementProductKeys = getMovementProductKeys(movement)
  return movementProductKeys.some((key) => activeMedicineKeys.has(key))
}

const countAlerts = (alertsData = {}) =>
  ['expired', 'expiringSoon', 'lowStock', 'outOfStock'].reduce(
    (sum, sectionKey) => sum + (Array.isArray(alertsData?.[sectionKey]) ? alertsData[sectionKey].length : 0),
    0
  )

const buildAlertSummaryRows = (alertsData = {}) =>
  Object.keys(ALERT_SECTION_LABELS).map((sectionKey) => ({
    key: sectionKey,
    label: ALERT_SECTION_LABELS[sectionKey],
    count: Array.isArray(alertsData?.[sectionKey]) ? alertsData[sectionKey].length : 0
  }))

const getStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const getMondayOfCurrentWeek = () => {
  const today = getStartOfDay(new Date())
  const dayIndex = today.getDay()
  const daysFromMonday = dayIndex === 0 ? 6 : dayIndex - 1
  today.setDate(today.getDate() - daysFromMonday)
  return today
}

const toDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildLastSevenDays = () => {
  const weekStart = getMondayOfCurrentWeek()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)

    return {
      key: toDateKey(date),
      label: DAY_LABELS[date.getDay()],
      entrances: 0,
      exits: 0
    }
  })
}

const buildMovementsByDay = ({ entranceMovements = [], exitMovements = [] } = {}) => {
  const days = buildLastSevenDays()
  const daysByKey = days.reduce((accumulator, day) => {
    accumulator[day.key] = day
    return accumulator
  }, {})

  entranceMovements.forEach((movement) => {
    if (!movement?.dateValue) return
    const key = toDateKey(movement.dateValue)
    if (daysByKey[key]) daysByKey[key].entrances += Math.abs(toNumberOrDefault(movement.quantity, 0))
  })

  exitMovements.forEach((movement) => {
    if (!movement?.dateValue) return
    const key = toDateKey(movement.dateValue)
    if (daysByKey[key]) daysByKey[key].exits += Math.abs(toNumberOrDefault(movement.quantity, 0))
  })

  return days
}

const buildTopMovedMedicines = (movements = [], activeMedicineKeys = new Set()) => {
  const totalsByMedicine = new Map()

  movements.forEach((movement) => {
    if (!isMovementFromActiveMedicine(movement, activeMedicineKeys)) return

    const medicineName = String(movement?.medicine || '').trim()
    const fallbackKey = String(movement?.productId || movement?.id || '').trim()
    const key = medicineName && medicineName !== 'No disponible' ? medicineName : fallbackKey
    if (!key) return

    const currentRow = totalsByMedicine.get(key) || {
      key,
      name: medicineName && medicineName !== 'No disponible' ? medicineName : 'Medicamento sin nombre',
      units: 0
    }

    currentRow.units += Math.abs(toNumberOrDefault(movement?.quantity, 0))
    totalsByMedicine.set(key, currentRow)
  })

  return Array.from(totalsByMedicine.values())
    .filter((row) => row.units > 0)
    .sort((firstRow, secondRow) => secondRow.units - firstRow.units)
    .slice(0, 5)
}

const getDaysAgo = (days) => {
  const date = getStartOfDay(new Date())
  date.setDate(date.getDate() - days)
  return date
}

const countUniqueProducts = (rows = []) => {
  const productKeys = new Set()

  rows.forEach((row) => {
    const key = String(
      row?.productId ??
      row?.medicineId ??
      row?.codigo ??
      row?.productCode ??
      row?.nombre ??
      row?.productName ??
      row?.id ??
      ''
    ).trim()

    if (key) productKeys.add(key)
  })

  return productKeys.size
}

const buildOperationalActivity = ({ entranceMovements = [], exitMovements = [] } = {}) => {
  const thresholdDate = getDaysAgo(6)
  const recentEntranceMovements = entranceMovements.filter((movement) => movement?.dateValue && movement.dateValue >= thresholdDate)
  const recentExitMovements = exitMovements.filter((movement) => movement?.dateValue && movement.dateValue >= thresholdDate)
  const entranceUnits = recentEntranceMovements.reduce((sum, movement) => sum + Math.abs(toNumberOrDefault(movement?.quantity, 0)), 0)
  const exitUnits = recentExitMovements.reduce((sum, movement) => sum + Math.abs(toNumberOrDefault(movement?.quantity, 0)), 0)
  const totalUnits = entranceUnits + exitUnits

  return {
    days: 7,
    entries: {
      count: recentEntranceMovements.length,
      units: entranceUnits,
      target: 'entries',
      percent: totalUnits > 0 ? Math.round((entranceUnits / totalUnits) * 100) : 0
    },
    exits: {
      count: recentExitMovements.length,
      units: exitUnits,
      target: 'exits',
      percent: totalUnits > 0 ? Math.round((exitUnits / totalUnits) * 100) : 0
    },
    totalOperations: recentEntranceMovements.length + recentExitMovements.length,
    totalUnits
  }
}

const buildAuditSummary = (movements = []) => {
  const summary = movements.reduce(
    (accumulator, movement) => {
      accumulator.total += 1

      if (movement?.typeLabel === 'Entrada') accumulator.entrances += 1
      if (movement?.typeLabel === 'Salida') accumulator.exits += 1
      if (movement?.typeLabel === 'Ajuste') accumulator.adjustments += 1
      if (movement?.statusLabel === 'Marcado') accumulator.marked += 1

      return accumulator
    },
    { total: 0, entrances: 0, exits: 0, adjustments: 0, marked: 0 }
  )

  return {
    total: summary.total,
    rows: [
      { key: 'movements', label: 'Movimientos auditables', count: summary.total, target: 'movements' },
      { key: 'entries', label: 'Entradas registradas', count: summary.entrances, target: 'reports-entries' },
      { key: 'exits', label: 'Salidas registradas', count: summary.exits, target: 'reports-exits' },
      { key: 'lowStock', label: 'Bajo stock', count: summary.adjustments, target: 'reports-lowstock' },
      { key: 'expiring', label: 'Próximos a vencer', count: summary.marked, target: 'reports-expiring' }
    ]
  }
}

const buildAuditSummaryWithReports = ({ movements = [], lowStockRows = [], expiringRows = [] } = {}) => {
  const auditSummary = buildAuditSummary(movements)
  const lowStockCount = countUniqueProducts(lowStockRows)
  const expiringCount = countUniqueProducts(expiringRows)

  return {
    ...auditSummary,
    rows: auditSummary.rows.map((row) => {
      if (row.key === 'lowStock') return { ...row, count: lowStockCount }
      if (row.key === 'expiring') return { ...row, count: expiringCount }
      return row
    })
  }
}

const resolveBlock = (settledResult, fallbackMessage) => {
  if (settledResult.status === 'fulfilled') {
    return {
      status: 'success',
      data: settledResult.value,
      error: ''
    }
  }

  return {
    status: 'error',
    data: null,
    error: settledResult.reason?.message || fallbackMessage
  }
}

const fetchKpisBlock = async ({ includeAlerts = true, role } = {}) => {
  const normalizedRole = normalizeRole(role)
  const isPharmacist = normalizedRole === ROLES.FARMACEUTICO
  const [inventoryRowsResult, summaryResult, medicinesResult, entranceResult, exitResult, alertsResult] = await Promise.allSettled([
    getActiveInventoryTable(),
    getActiveInventorySummary(),
    getMedicines(),
    isPharmacist ? getEntranceMovements() : Promise.resolve([]),
    isPharmacist ? getExitMovements() : Promise.resolve([]),
    includeAlerts ? getAlertsCenterData() : Promise.resolve(null)
  ])

  const inventoryRows = inventoryRowsResult.status === 'fulfilled' && Array.isArray(inventoryRowsResult.value)
    ? inventoryRowsResult.value
    : []
  const medicines = medicinesResult.status === 'fulfilled' && Array.isArray(medicinesResult.value)
    ? medicinesResult.value
    : []
  const activeMedicines = filterActiveMedicines(medicines)
  const entranceMovements = entranceResult.status === 'fulfilled' && Array.isArray(entranceResult.value)
    ? entranceResult.value
    : []
  const exitMovements = exitResult.status === 'fulfilled' && Array.isArray(exitResult.value)
    ? exitResult.value
    : []
  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null
  const alertsData = alertsResult.status === 'fulfilled' ? alertsResult.value : null
  const hasInventoryData = inventoryRowsResult.status === 'fulfilled' || summaryResult.status === 'fulfilled' || medicinesResult.status === 'fulfilled'
  const hasAlertsData = includeAlerts && alertsResult.status === 'fulfilled'
  const medicinesSource = inventoryRows.length > 0 ? inventoryRows : activeMedicines
  const totalStockFromMedicines = activeMedicines.reduce((sum, row) => sum + toNumberOrDefault(row.stock, 0), 0)

  if (!hasInventoryData && !hasAlertsData) {
    throw new Error('No se pudieron cargar los indicadores principales.')
  }

  return {
    medicinesCount: medicinesSource.length,
    totalStock: isPharmacist
      ? totalStockFromMedicines
      : toNumberOrDefault(summary?.totalStock, inventoryRows.reduce((sum, row) => sum + toNumberOrDefault(row.stock, 0), 0)),
    totalInventoryValue: isPharmacist
      ? null
      : toNumberOrDefault(
        summary?.totalInventoryValue,
        inventoryRows.reduce((sum, row) => sum + toNumberOrDefault(row.totalValue, 0), 0)
      ),
    entriesCount: entranceMovements.length,
    exitsCount: exitMovements.length,
    activeAlerts: alertsData ? countAlerts(alertsData) : null,
    partialWarning: includeAlerts && alertsResult.status === 'rejected' ? 'Alertas no disponibles para el indicador.' : ''
  }
}

const fetchMovementsBlock = async () => {
  const medicines = await getMedicines().catch(() => [])
  const productsById = buildProductsMap(medicines)
  const [entranceMovements, exitMovements] = await Promise.all([
    getEntranceMovements({ productsById }),
    getExitMovements({ productsById })
  ])

  return buildMovementsByDay({ entranceMovements, exitMovements })
}

const fetchAlertsBlock = async () => {
  const alertsData = await getAlertsCenterData()
  return {
    total: countAlerts(alertsData),
    rows: buildAlertSummaryRows(alertsData),
    failedSections: Array.isArray(alertsData?.failedSections) ? alertsData.failedSections : []
  }
}

const fetchAuditBlock = async () => {
  const medicines = await getMedicines().catch(() => [])
  const productsById = buildProductsMap(medicines)
  const [movements, lowStockGroups, expiringGroups] = await Promise.all([
    getMovements({ productsById }),
    getLowStockReportGroups().catch(() => ({ all: [] })),
    getExpiringReportGroups().catch(() => ({ all: [] }))
  ])

  return buildAuditSummaryWithReports({
    movements,
    lowStockRows: Array.isArray(lowStockGroups?.all) ? lowStockGroups.all : [],
    expiringRows: Array.isArray(expiringGroups?.all) ? expiringGroups.all : []
  })
}

const fetchTopMovedBlock = async () => {
  const medicines = await getMedicines().catch(() => [])
  const productsById = buildProductsMap(medicines)
  const activeMedicineKeys = buildActiveMedicineIndex(medicines)
  const movements = await getMovements({ productsById })
  return buildTopMovedMedicines(movements, activeMedicineKeys)
}

const fetchOperationalBlock = async () => {
  const [entranceMovements, exitMovements] = await Promise.all([
    getEntranceMovements(),
    getExitMovements()
  ])

  return buildOperationalActivity({ entranceMovements, exitMovements })
}

export const getDashboardData = async ({ role } = {}) => {
  const includeAlerts = canAccessAlerts(role)
  const normalizedRole = normalizeRole(role)
  const isPharmacist = normalizedRole === ROLES.FARMACEUTICO
  const [kpisResult, movementsResult, alertsResult, topMovedResult, auditResult, operationalResult] = await Promise.allSettled([
    fetchKpisBlock({ includeAlerts, role }),
    fetchMovementsBlock(),
    includeAlerts ? fetchAlertsBlock() : Promise.resolve(null),
    isPharmacist ? Promise.resolve([]) : fetchTopMovedBlock(),
    fetchAuditBlock(),
    isPharmacist ? fetchOperationalBlock() : Promise.resolve([])
  ])

  return {
    kpis: resolveBlock(kpisResult, 'No se pudieron cargar los indicadores principales.'),
    movements: resolveBlock(movementsResult, 'No se pudieron cargar los movimientos recientes.'),
    alerts: resolveBlock(alertsResult, 'No se pudo cargar el resumen de alertas.'),
    topMoved: resolveBlock(isPharmacist ? operationalResult : topMovedResult, 'No se pudo cargar la actividad operativa.'),
    audit: resolveBlock(auditResult, 'No se pudo cargar el resumen de auditoría.')
  }
}
