import { useEffect, useMemo, useState } from 'react'
import { getMedicines } from '../../medicines/services/medicines.service'
import { getMovements } from '../../movements/services/movements.service'
import { getUsers } from '../../users/services/users.service'
import ByUserReportSection from '../components/ByUserReportSection'
import ExpiringReportSection from '../components/ExpiringReportSection'
import InventoryReportSection from '../components/InventoryReportSection'
import LowStockReportSection from '../components/LowStockReportSection'
import MovementsReportSection from '../components/MovementsReportSection'
import { REPORT_TABS } from '../config/reportTabs'
import {
  buildByUserRows,
  buildExpiringRows,
  buildInventoryRows,
  buildLowStockRows,
  buildMovementsRows,
  buildUsersIndex
} from '../utils/reportData.utils'

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('inventory')
  const [medicines, setMedicines] = useState([])
  const [movements, setMovements] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [medicinesData, usersData] = await Promise.all([
          getMedicines(),
          getUsers().catch(() => [])
        ])

        const { usersByIdentity, usersById } = buildUsersIndex(usersData)
        const movementsData = await getMovements({ usersByIdentity, usersById })

        if (!isMounted) return
        setMedicines(Array.isArray(medicinesData) ? medicinesData : [])
        setMovements(Array.isArray(movementsData) ? movementsData : [])
      } catch (loadError) {
        if (!isMounted) return
        setMedicines([])
        setMovements([])
        setError(loadError.message || 'No se pudieron cargar los reportes.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadData()
    return () => { isMounted = false }
  }, [])

  const inventoryRows = useMemo(() => buildInventoryRows(medicines), [medicines])
  const movementsRows = useMemo(() => buildMovementsRows(movements), [movements])
  const expiringRows = useMemo(() => buildExpiringRows(medicines), [medicines])
  const lowStockRows = useMemo(() => buildLowStockRows(medicines), [medicines])
  const byUserRows = useMemo(() => buildByUserRows(movements), [movements])

  return (
    <div className="fe-page-shell">
      <div className="fe-page-head">
        <div>
          <h1 className="fe-page-title">Reportes del Sistema</h1>
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

      {activeTab === 'inventory' && <InventoryReportSection rows={inventoryRows} isLoading={isLoading} />}
      {activeTab === 'movements' && <MovementsReportSection rows={movementsRows} isLoading={isLoading} />}
      {activeTab === 'expiring' && <ExpiringReportSection rows={expiringRows} isLoading={isLoading} />}
      {activeTab === 'lowstock' && <LowStockReportSection rows={lowStockRows} isLoading={isLoading} />}
      {activeTab === 'byuser' && <ByUserReportSection rows={byUserRows} isLoading={isLoading} />}
    </div>
  )
}

export default ReportsPage
