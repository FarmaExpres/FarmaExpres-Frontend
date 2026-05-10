// Start JFBM
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ErrorBoundary from '../../shared/components/ErrorBoundary'
import AlertsSummaryBar from '../components/AlertsSummaryBar'
import ExpiredAlertsSection from '../components/sections/ExpiredAlertsSection'
import ExpiringAlertsSection from '../components/sections/ExpiringAlertsSection'
import LowStockAlertsSection from '../components/sections/LowStockAlertsSection'
import OutOfStockAlertsSection from '../components/sections/OutOfStockAlertsSection'
import {
  ALERTS_EMPTY_DATA,
  ALERTS_SECTION_ORDER
} from '../config/alertsSections.config'
import { getAlertsCenterData } from '../services/alerts.service'
import { toSortedRows } from '../utils/alertsFormatters'

const SECTION_COMPONENTS = {
  expired: ExpiredAlertsSection,
  expiringSoon: ExpiringAlertsSection,
  lowStock: LowStockAlertsSection,
  outOfStock: OutOfStockAlertsSection
}

export const ALERTS_OPEN_SECTION_STORAGE_KEY = 'alerts:open-section'

const buildInitialOpenSections = (openSectionKey = '') =>
  ALERTS_SECTION_ORDER.reduce((accumulator, section) => {
    accumulator[section.key] = section.key === openSectionKey
    return accumulator
  }, {})

const isValidAlertSection = (sectionKey) =>
  ALERTS_SECTION_ORDER.some((section) => section.key === sectionKey)

const readPendingOpenSection = () => {
  try {
    return String(sessionStorage.getItem(ALERTS_OPEN_SECTION_STORAGE_KEY) || '').trim()
  } catch {
    return ''
  }
}

const readSectionFromSearch = (search = '') => {
  try {
    return String(new URLSearchParams(search).get('section') || '').trim()
  } catch {
    return ''
  }
}

const clearPendingOpenSection = () => {
  try {
    sessionStorage.removeItem(ALERTS_OPEN_SECTION_STORAGE_KEY)
  } catch {
    // no-op
  }
}

const AlertsPage = () => {
  const location = useLocation()
  const requestedSectionFromNavigation =
    readSectionFromSearch(location.search) ||
    String(location.state?.openSection || '').trim() ||
    readPendingOpenSection()
  const [sectionsData, setSectionsData] = useState(ALERTS_EMPTY_DATA)
  const [openSections, setOpenSections] = useState(() => buildInitialOpenSections(requestedSectionFromNavigation))
  const [pendingOpenSection, setPendingOpenSection] = useState(requestedSectionFromNavigation)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedAlerts, setHasLoadedAlerts] = useState(false)
  const [error, setError] = useState('')
  const [partialWarning, setPartialWarning] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadAlertsData = async () => {
      setIsLoading(true)
      setHasLoadedAlerts(false)
      setError('')
      setPartialWarning('')

      try {
        const data = await getAlertsCenterData()
        if (!isMounted) return

        setSectionsData({
          expired: toSortedRows(data.expired),
          expiringSoon: toSortedRows(data.expiringSoon),
          lowStock: toSortedRows(data.lowStock),
          outOfStock: toSortedRows(data.outOfStock)
        })

        if (Array.isArray(data.failedSections) && data.failedSections.length > 0) {
          const failedLabels = ALERTS_SECTION_ORDER
            .filter((section) => data.failedSections.includes(section.key))
            .map((section) => section.title)
          setPartialWarning(`No se pudieron cargar completamente: ${failedLabels.join(', ')}.`)
        }
      } catch (loadError) {
        if (!isMounted) return
        setSectionsData(ALERTS_EMPTY_DATA)
        setError(loadError?.message || 'No se pudo cargar el centro de alertas.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setHasLoadedAlerts(true)
        }
      }
    }

    loadAlertsData()

    return () => {
      isMounted = false
    }
  }, [])

  const totalAlerts = useMemo(
    () => Object.values(sectionsData).reduce((sum, rows) => sum + rows.length, 0),
    [sectionsData]
  )

  const hasAnyAlert = totalAlerts > 0

  useEffect(() => {
    const requestedSection =
      readSectionFromSearch(location.search) ||
      String(location.state?.openSection || '').trim()
    if (requestedSection) setPendingOpenSection(requestedSection)
  }, [location.search, location.state])

  useEffect(() => {
    const requestedSection = String(pendingOpenSection || readPendingOpenSection()).trim()
    if (!requestedSection || isLoading || !hasLoadedAlerts) return
    if (!isValidAlertSection(requestedSection)) {
      clearPendingOpenSection()
      setPendingOpenSection('')
      return
    }

    setOpenSections((current) => ({ ...current, [requestedSection]: true }))
    window.setTimeout(() => {
      const targetElement = document.getElementById(`alerts-${requestedSection}`)
      targetElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
      clearPendingOpenSection()
    }, 0)
  }, [hasLoadedAlerts, isLoading, pendingOpenSection])

  const handleToggleSection = (sectionKey) => {
    setOpenSections((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey]
    }))
  }

  const handleNavigateToSection = (sectionKey) => {
    document.getElementById(`alerts-${sectionKey}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
    setOpenSections((current) => ({ ...current, [sectionKey]: true }))
  }

  return (
    <ErrorBoundary
      title="Centro de alertas"
      message="Ocurrio un error al mostrar el centro de alertas."
    >
      <div className="fe-page-shell">
        <div className="fe-page-head">
          <div>
            <h1 className="fe-page-title">Centro de alertas</h1>
          </div>
        </div>

        <AlertsSummaryBar
          totalAlerts={totalAlerts}
          sectionsData={sectionsData}
          onNavigateToSection={handleNavigateToSection}
        />

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && partialWarning && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {partialWarning}
          </div>
        )}

        {ALERTS_SECTION_ORDER.map((section) => {
          const SectionComponent = SECTION_COMPONENTS[section.key]
          return (
            <SectionComponent
              key={section.key}
              section={section}
              rows={sectionsData[section.key] || []}
              isOpen={openSections[section.key] || requestedSectionFromNavigation === section.key}
              isLoading={isLoading}
              onToggle={handleToggleSection}
            />
          )
        })}

        {!error && !isLoading && !hasAnyAlert && (
          <section className="fe-card border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            No hay alertas activas en este momento. El inventario se encuentra en estado controlado.
          </section>
        )}
      </div>
    </ErrorBoundary>
  )
}

export default AlertsPage
// End JFBM
