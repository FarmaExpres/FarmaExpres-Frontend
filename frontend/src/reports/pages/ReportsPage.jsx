import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getActiveInventorySummary,
  getActiveInventoryTable
} from '../../medicines/services/medicines.service'
import {
  getEntranceMovements,
  getExitMovements,
  getMovements,
  getUpdatedMovements
} from '../../movements/services/movements.service'
import { getUsers } from '../../users/services/users.service'
import ByUserReportSection from '../components/ByUserReportSection'
import ExpiringReportSection from '../components/ExpiringReportSection'
import InventoryReportSection from '../components/InventoryReportSection'
import LowStockReportSection from '../components/LowStockReportSection'
import MovementsReportSection from '../components/MovementsReportSection'
import { REPORT_TABS } from '../config/reportTabs'
import { getByUserReportRows } from '../services/byUserReports.service'
import { getExpiringReportGroups } from '../services/expiringReports.service'
import { getLowStockReportGroups } from '../services/lowStockReports.service'
import {
  buildMovementsRows,
  buildUsersIndex
} from '../utils/reportData.utils'
import { exportReportExcel } from '../utils/reportExport.utils'

const REPORTS_ACTIVE_TAB_STORAGE_KEY = 'reports:active-tab'

const ReportsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = String(location.state?.activeTab || '').trim()
    if (REPORT_TABS.some((tab) => tab.key === requestedTab)) return requestedTab

    const persistedTab = String(sessionStorage.getItem(REPORTS_ACTIVE_TAB_STORAGE_KEY) || '').trim()
    const isValidPersistedTab = REPORT_TABS.some((tab) => tab.key === persistedTab)
    return isValidPersistedTab ? persistedTab : 'inventory'
  })
  const [isExporting, setIsExporting] = useState(false)
  const [inventoryRows, setInventoryRows] = useState([])
  const [inventorySummary, setInventorySummary] = useState(null)
  const [movements, setMovements] = useState([])
  const [expiringRows, setExpiringRows] = useState([])
  const [expiredRows, setExpiredRows] = useState([])
  const [criticalExpiringRows, setCriticalExpiringRows] = useState([])
  const [mediumExpiringRows, setMediumExpiringRows] = useState([])
  const [controlledExpiringRows, setControlledExpiringRows] = useState([])
  const [lowStockRows, setLowStockRows] = useState([])
  const [criticalLowStockRows, setCriticalLowStockRows] = useState([])
  const [alertLowStockRows, setAlertLowStockRows] = useState([])
  const [entranceMovements, setEntranceMovements] = useState([])
  const [exitMovements, setExitMovements] = useState([])
  const [adjustmentMovements, setAdjustmentMovements] = useState([])
  const [byUserRows, setByUserRows] = useState([])
  const [filteredMovementsRows, setFilteredMovementsRows] = useState([])
  const [movementsFilterKey, setMovementsFilterKey] = useState(() => String(location.state?.movementFilter || 'all').trim() || 'all')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [usersData, inventoryTableData, inventorySummaryData] = await Promise.all([
          getUsers().catch(() => []),
          getActiveInventoryTable(),
          getActiveInventorySummary()
        ])

        const { usersByIdentity, usersById } = buildUsersIndex(usersData)
        const [movementsData, entranceMovementsData, exitMovementsData, adjustmentMovementsData, expiringGroups, lowStockGroups, byUserReportRows] = await Promise.all([
          getMovements({ usersByIdentity, usersById }),
          getEntranceMovements({ usersByIdentity, usersById }),
          getExitMovements({ usersByIdentity, usersById }),
          getUpdatedMovements({ usersByIdentity, usersById }),
          getExpiringReportGroups(),
          getLowStockReportGroups(),
          getByUserReportRows()
        ])

        if (!isMounted) return
        setInventoryRows(Array.isArray(inventoryTableData) ? inventoryTableData : [])
        setInventorySummary(inventorySummaryData || null)
        setMovements(Array.isArray(movementsData) ? movementsData : [])
        setExpiringRows(Array.isArray(expiringGroups?.all) ? expiringGroups.all : [])
        setExpiredRows(Array.isArray(expiringGroups?.expired) ? expiringGroups.expired : [])
        setCriticalExpiringRows(Array.isArray(expiringGroups?.critical) ? expiringGroups.critical : [])
        setMediumExpiringRows(Array.isArray(expiringGroups?.medium) ? expiringGroups.medium : [])
        setControlledExpiringRows(Array.isArray(expiringGroups?.controlled) ? expiringGroups.controlled : [])
        setLowStockRows(Array.isArray(lowStockGroups?.all) ? lowStockGroups.all : [])
        setCriticalLowStockRows(Array.isArray(lowStockGroups?.critical) ? lowStockGroups.critical : [])
        setAlertLowStockRows(Array.isArray(lowStockGroups?.alert) ? lowStockGroups.alert : [])
        setEntranceMovements(Array.isArray(entranceMovementsData) ? entranceMovementsData : [])
        setExitMovements(Array.isArray(exitMovementsData) ? exitMovementsData : [])
        setAdjustmentMovements(Array.isArray(adjustmentMovementsData) ? adjustmentMovementsData : [])
        setByUserRows(Array.isArray(byUserReportRows) ? byUserReportRows : [])
      } catch (loadError) {
        if (!isMounted) return
        setInventoryRows([])
        setInventorySummary(null)
        setMovements([])
        setExpiringRows([])
        setExpiredRows([])
        setCriticalExpiringRows([])
        setMediumExpiringRows([])
        setControlledExpiringRows([])
        setLowStockRows([])
        setCriticalLowStockRows([])
        setAlertLowStockRows([])
        setEntranceMovements([])
        setExitMovements([])
        setAdjustmentMovements([])
        setByUserRows([])
        setError(loadError.message || 'No se pudieron cargar los reportes.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => { isMounted = false }
  }, [])

  const movementsRows = useMemo(() => buildMovementsRows(movements), [movements])

  useEffect(() => {
    setFilteredMovementsRows(movementsRows)
  }, [movementsRows])

  const exportDisabled = useMemo(() => {
    if (activeTab === 'inventory') return inventoryRows.length === 0
    if (activeTab === 'movements') return filteredMovementsRows.length === 0
    if (activeTab === 'expiring') return expiringRows.length === 0
    if (activeTab === 'lowstock') return lowStockRows.length === 0
    return byUserRows.length === 0
  }, [activeTab, byUserRows.length, expiringRows.length, filteredMovementsRows.length, inventoryRows.length, lowStockRows.length])

  const handleExportExcel = async () => {
    if (exportDisabled || isExporting) return
    setIsExporting(true)

    try {
      await exportReportExcel({
        tab: activeTab,
        inventoryRows,
        movementsRows: activeTab === 'movements' ? filteredMovementsRows : movementsRows,
        movementsFilterKey: activeTab === 'movements' ? movementsFilterKey : 'all',
        expiringRows,
        lowStockRows,
        byUserRows
      })
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    sessionStorage.setItem(REPORTS_ACTIVE_TAB_STORAGE_KEY, activeTab)
  }, [activeTab])

  useEffect(() => {
    const requestedTab = String(location.state?.activeTab || '').trim()
    const requestedMovementFilter = String(location.state?.movementFilter || '').trim()
    const hasRequestedTab = REPORT_TABS.some((tab) => tab.key === requestedTab)
    const hasRequestedMovementFilter = ['all', 'entrance', 'exit', 'adjustment'].includes(requestedMovementFilter)

    if (hasRequestedTab) setActiveTab(requestedTab)
    if (hasRequestedMovementFilter) setMovementsFilterKey(requestedMovementFilter)

    if (hasRequestedTab || hasRequestedMovementFilter) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  return (
    <div className="fe-page-shell">
      <div className="fe-page-head">
        <div>
          <h1 className="fe-page-title">Reportes del sistema</h1>
        </div>
      </div>

      <section className="mb-4 flex flex-wrap gap-2">
        {REPORT_TABS.map((tab) => {
          const isActive = activeTab === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-gradient-to-r from-[var(--fe-brand-a)] to-[var(--fe-brand-b)] text-white'
                  : 'bg-white text-[#4f638b] hover:bg-[#f2f6ff]'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </section>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'inventory' && (
        <InventoryReportSection
          rows={inventoryRows}
          summary={inventorySummary}
          isLoading={isLoading}
          onExport={handleExportExcel}
          exportDisabled={exportDisabled}
          isExporting={isExporting}
        />
      )}
      {activeTab === 'movements' && (
        <MovementsReportSection
          key={movementsFilterKey}
          rows={movementsRows}
          entranceRows={entranceMovements}
          exitRows={exitMovements}
          adjustmentRows={adjustmentMovements}
          isLoading={isLoading}
          initialTypeFilter={movementsFilterKey}
          onRowsForExportChange={setFilteredMovementsRows}
          onFilterForExportChange={setMovementsFilterKey}
          onExport={handleExportExcel}
          exportDisabled={exportDisabled}
          isExporting={isExporting}
        />
      )}
      {activeTab === 'expiring' && (
        <ExpiringReportSection
          rows={expiringRows}
          expiredRows={expiredRows}
          criticalRows={criticalExpiringRows}
          mediumRows={mediumExpiringRows}
          controlledRows={controlledExpiringRows}
          isLoading={isLoading}
          onExport={handleExportExcel}
          exportDisabled={exportDisabled}
          isExporting={isExporting}
        />
      )}
      {activeTab === 'lowstock' && (
        <LowStockReportSection
          rows={lowStockRows}
          criticalRows={criticalLowStockRows}
          alertRows={alertLowStockRows}
          isLoading={isLoading}
          onExport={handleExportExcel}
          exportDisabled={exportDisabled}
          isExporting={isExporting}
        />
      )}
      {activeTab === 'byuser' && (
        <ByUserReportSection
          rows={byUserRows}
          isLoading={isLoading}
          onExport={handleExportExcel}
          exportDisabled={exportDisabled}
          isExporting={isExporting}
        />
      )}
    </div>
  )
}

export default ReportsPage
