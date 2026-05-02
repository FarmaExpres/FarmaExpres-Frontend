import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALERTS_OPEN_SECTION_STORAGE_KEY } from '../../alerts/pages/AlertsPage'
import {
  canAccessAlerts,
  canAccessMedicines,
  canAccessMovements,
  canAccessReports,
  getDefaultRouteByRole,
  getRoleLabel,
  normalizeRole,
  ROLES
} from '../../shared/constants/roles'
import { getDashboardData } from '../services/dashboard.service'

const INITIAL_BLOCK = Object.freeze({
  status: 'loading',
  data: null,
  error: ''
})

const INITIAL_DASHBOARD_STATE = Object.freeze({
  kpis: INITIAL_BLOCK,
  movements: INITIAL_BLOCK,
  alerts: INITIAL_BLOCK,
  audit: INITIAL_BLOCK,
  topMoved: INITIAL_BLOCK
})

const numberFormatter = new Intl.NumberFormat('es-CO')
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
})

const formatNumber = (value) => numberFormatter.format(Number(value) || 0)
const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0)

const IconPill = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <path d="M9 3a6 6 0 0 0-4.2 10.2l6 6A6 6 0 1 0 19.2 10l-6-6A6 6 0 0 0 9 3Z" />
    <path d="m7.5 7.5 9 9" />
  </svg>
)

const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="m4 7.5 8 4.5 8-4.5" />
    <path d="M12 12v9" />
  </svg>
)

const IconMoney = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M7 10v4M17 10v4" />
  </svg>
)

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <path d="M12 4 3.8 18.2a1.2 1.2 0 0 0 1 1.8h14.4a1.2 1.2 0 0 0 1-1.8L12 4Z" />
    <path d="M12 9v4" />
    <path d="M12 16.5h.01" />
  </svg>
)

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
    <path d="M12 3 5 6v6c0 5 3.4 8.6 7 9.8 3.6-1.2 7-4.8 7-9.8V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

const KPI_CONFIG = [
  {
    key: 'medicinesCount',
    label: 'Medicamentos',
    icon: IconPill,
    tone: 'bg-[#efe5ff] text-[#8a4cf6]',
    formatter: formatNumber,
    target: 'medicines'
  },
  {
    key: 'totalStock',
    label: 'Unidades en Stock',
    icon: IconBox,
    tone: 'bg-[#e2eeff] text-[#316dff]',
    formatter: formatNumber,
    target: 'stock'
  },
  {
    key: 'totalInventoryValue',
    label: 'Valor Inventario',
    icon: IconMoney,
    tone: 'bg-[#dcf9e7] text-[#15935f]',
    formatter: formatCurrency,
    target: 'reports'
  },
  {
    key: 'activeAlerts',
    label: 'Alertas Activas',
    icon: IconAlert,
    tone: 'bg-[#fff2cc] text-[#ef8c00]',
    formatter: (value) => value === null ? 'N/D' : formatNumber(value),
    target: 'alerts'
  }
]

const PHARMACIST_KPI_CONFIG = [
  {
    key: 'medicinesCount',
    label: 'Medicamentos',
    icon: IconPill,
    tone: 'bg-[#efe5ff] text-[#8a4cf6]',
    formatter: formatNumber,
    target: 'medicines'
  },
  {
    key: 'totalStock',
    label: 'Unidades en Stock',
    icon: IconBox,
    tone: 'bg-[#e2eeff] text-[#316dff]',
    formatter: formatNumber,
    target: 'stock'
  },
  {
    key: 'activeAlerts',
    label: 'Alertas Activas',
    icon: IconAlert,
    tone: 'bg-[#fff2cc] text-[#ef8c00]',
    formatter: (value) => value === null ? 'N/D' : formatNumber(value),
    target: 'alerts'
  }
]

const AUDITOR_KPI_CONFIG = [
  ...KPI_CONFIG.slice(0, 3),
  {
    key: 'auditEvents',
    label: 'Eventos Auditables',
    icon: IconShield,
    tone: 'bg-[#e8f1ff] text-[#315da8]',
    formatter: (value) => value === null ? 'N/D' : formatNumber(value),
    target: 'audit'
  }
]

const ALERT_TONES = {
  expired: {
    card: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    icon: 'bg-red-100 text-red-600',
    dot: 'bg-red-500'
  },
  expiringSoon: {
    card: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
    icon: 'bg-amber-100 text-amber-600',
    dot: 'bg-amber-500'
  },
  lowStock: {
    card: 'border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100',
    icon: 'bg-orange-100 text-orange-600',
    dot: 'bg-orange-500'
  },
  outOfStock: {
    card: 'border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100',
    icon: 'bg-rose-100 text-rose-600',
    dot: 'bg-rose-500'
  }
}

const BlockMessage = ({ type = 'empty', message }) => {
  const toneClass = type === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${toneClass}`}>
      {message}
    </div>
  )
}

const getKpiConfigByRole = ({ isAuditor = false, isPharmacist = false } = {}) => {
  if (isAuditor) return AUDITOR_KPI_CONFIG
  if (isPharmacist) return PHARMACIST_KPI_CONFIG
  return KPI_CONFIG
}

const KpiSkeleton = ({ isAuditor = false, isPharmacist = false }) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
    {getKpiConfigByRole({ isAuditor, isPharmacist }).map((item) => (
      <div key={item.key} className="fe-card h-[82px] animate-pulse px-5 py-4">
        <div className="h-4 w-28 rounded bg-slate-100" />
        <div className="mt-3 h-6 w-20 rounded bg-slate-100" />
      </div>
    ))}
  </div>
)

const KpiGrid = ({ block, auditBlock, isAuditor = false, isPharmacist = false, onNavigate }) => {
  if (block.status === 'loading' || (isAuditor && auditBlock.status === 'loading')) return <KpiSkeleton isAuditor={isAuditor} isPharmacist={isPharmacist} />
  if (block.status === 'error') return <BlockMessage type="error" message={block.error} />

  const data = {
    ...(block.data || {}),
    auditEvents: auditBlock.status === 'success' ? auditBlock.data?.total : null
  }
  const kpiConfig = getKpiConfigByRole({ isAuditor, isPharmacist })

  return (
    <div>
      <div className={`grid grid-cols-1 gap-3 md:grid-cols-3 ${isPharmacist ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
        {kpiConfig.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.target)}
              className="fe-card flex min-h-[82px] items-center gap-4 px-5 py-4 text-left transition hover:border-[#cdb8ff] hover:bg-[#fbf8ff] focus:outline-none focus:ring-2 focus:ring-[#d9c8ff]"
              aria-label={`Abrir ${item.label}`}
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                <Icon />
              </span>
              <div>
                <p className="text-xs font-semibold text-[#8b97b2]">{item.label}</p>
                <p className="mt-1 text-xl font-extrabold tracking-tight text-[#0c1830]">
                  {item.formatter(data[item.key])}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {data.partialWarning && (
        <p className="mt-2 text-xs font-medium text-amber-700">{data.partialWarning}</p>
      )}
    </div>
  )
}

const MovementsChart = ({ block }) => {
  const chartSummary = useMemo(() => {
    const rows = Array.isArray(block.data) ? block.data : []
    const maxValue = rows.reduce((max, day) => Math.max(max, Number(day?.entrances || 0), Number(day?.exits || 0)), 0)
    const totals = rows.reduce(
      (summary, day) => ({
        entrances: summary.entrances + Number(day?.entrances || 0),
        exits: summary.exits + Number(day?.exits || 0)
      }),
      { entrances: 0, exits: 0 }
    )

    return {
      rows,
      maxValue,
      totals
    }
  }, [block.data])

  if (block.status === 'loading') {
    return (
      <section className="fe-card min-h-[306px] animate-pulse px-5 py-5">
        <div className="h-5 w-60 rounded bg-slate-100" />
        <div className="mt-12 h-40 rounded bg-slate-100" />
      </section>
    )
  }

  if (block.status === 'error') {
    return (
      <section className="fe-card px-5 py-5">
        <h2 className="text-base font-extrabold text-[#0c1830]">Movimientos - Últimos 7 días</h2>
        <div className="mt-4">
          <BlockMessage type="error" message={block.error} />
        </div>
      </section>
    )
  }

  const rows = chartSummary.rows
  const hasData = rows.some((day) => day.entrances > 0 || day.exits > 0)

  return (
    <section className="fe-card px-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#0c1830]">Movimientos - Últimos 7 días</h2>
          <p className="mt-1 text-xs font-semibold text-[#74809a]">Comparativo diario de entradas y salidas.</p>
        </div>

        {hasData && (
          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg bg-[#eefbf6] px-3 py-2">
              <span className="text-[10px] font-extrabold uppercase text-emerald-700">Entradas</span>
              <span className="ml-2 text-sm font-black text-emerald-800">{formatNumber(chartSummary.totals.entrances)}</span>
            </div>
            <div className="rounded-lg bg-[#f0f2ff] px-3 py-2">
              <span className="text-[10px] font-extrabold uppercase text-indigo-700">Salidas</span>
              <span className="ml-2 text-sm font-black text-indigo-800">{formatNumber(chartSummary.totals.exits)}</span>
            </div>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="mt-4">
          <BlockMessage message="No hay movimientos registrados en los últimos 7 días." />
        </div>
      ) : (
        <>
          <div className="mt-5 flex h-[224px] items-end justify-between gap-3 rounded-xl bg-[#fafbff] px-4 pb-4 pt-5 sm:gap-5">
            {rows.map((day) => {
              const entrances = Number(day.entrances || 0)
              const exits = Number(day.exits || 0)
              const entranceHeight = chartSummary.maxValue > 0 ? Math.max(8, (entrances / chartSummary.maxValue) * 142) : 8
              const exitHeight = chartSummary.maxValue > 0 ? Math.max(8, (exits / chartSummary.maxValue) * 142) : 8
              return (
                <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-7 items-center justify-center gap-1 text-[11px] font-extrabold leading-none">
                    <span className={`rounded-full px-2 py-1 ${entrances > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f1f3f8] text-[#9aa5ba]'}`}>
                      {formatNumber(entrances)}
                    </span>
                    <span className={`rounded-full px-2 py-1 ${exits > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-[#f1f3f8] text-[#9aa5ba]'}`}>
                      {formatNumber(exits)}
                    </span>
                  </div>

                  <div className="flex h-[150px] w-full items-end justify-center gap-1.5 px-1 pb-1">
                    <span
                      className="w-full max-w-[34px] rounded-t-lg bg-emerald-400 transition-[height]"
                      style={{ height: `${entranceHeight}px`, opacity: entrances > 0 ? 1 : 0.25 }}
                      title={`${formatNumber(entrances)} entradas`}
                    />
                    <span
                      className="w-full max-w-[34px] rounded-t-lg bg-indigo-400 transition-[height]"
                      style={{ height: `${exitHeight}px`, opacity: exits > 0 ? 1 : 0.25 }}
                      title={`${formatNumber(exits)} salidas`}
                    />
                  </div>

                  <span className="text-xs font-extrabold text-[#8995ad]">{day.label}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#52617f]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-400" />
              Entradas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-indigo-400" />
              Salidas
            </span>
          </div>
        </>
      )}
    </section>
  )
}

const AlertMiniIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
    <circle cx="12" cy="12" r="9" />
  </svg>
)

const AlertsSummary = ({ block, onNavigateToSection }) => {
  if (block.status === 'loading') {
    return (
      <section className="fe-card min-h-[306px] animate-pulse px-5 py-5">
        <div className="h-5 w-44 rounded bg-slate-100" />
        <div className="mt-5 space-y-3">
          <div className="h-16 rounded bg-slate-100" />
          <div className="h-16 rounded bg-slate-100" />
          <div className="h-16 rounded bg-slate-100" />
        </div>
      </section>
    )
  }

  if (block.status === 'error') {
    return (
      <section className="fe-card px-5 py-5">
        <h2 className="text-base font-extrabold text-[#0c1830]">Resumen de Alertas</h2>
        <div className="mt-4">
          <BlockMessage type="error" message={block.error} />
        </div>
      </section>
    )
  }

  const rows = Array.isArray(block.data?.rows) ? block.data.rows : []
  const hasData = rows.some((row) => row.count > 0)

  return (
    <section className="fe-card px-5 py-5">
      <h2 className="text-base font-extrabold text-[#0c1830]">Resumen de Alertas</h2>

      {!hasData ? (
        <div className="mt-4">
          <BlockMessage message="No hay alertas activas en este momento." />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3">
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={() => onNavigateToSection(row.key)}
              className={`group flex min-h-[64px] w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${ALERT_TONES[row.key]?.card || ALERT_TONES.lowStock.card}`}
              aria-label={`Abrir alertas ${row.label}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ALERT_TONES[row.key]?.icon || ALERT_TONES.lowStock.icon}`}>
                  <AlertMiniIcon />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold">{row.label}</span>
                  <span className="mt-0.5 block text-xs font-semibold opacity-75">Ver detalle</span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${ALERT_TONES[row.key]?.dot || ALERT_TONES.lowStock.dot}`} />
                <span className="text-xl font-extrabold tabular-nums">{formatNumber(row.count)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {Array.isArray(block.data?.failedSections) && block.data.failedSections.length > 0 && (
        <p className="mt-3 text-xs font-medium text-amber-700">Algunas secciones no pudieron cargarse.</p>
      )}
    </section>
  )
}

const AUDIT_TONES = {
  movements: 'border-blue-100 bg-blue-50 text-blue-700',
  entries: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  exits: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  lowStock: 'border-amber-100 bg-amber-50 text-amber-700',
  expiring: 'border-rose-100 bg-rose-50 text-rose-700'
}

const AuditSummary = ({ block, onNavigate }) => {
  if (block.status === 'loading') {
    return (
      <section className="fe-card min-h-[306px] animate-pulse px-5 py-5">
        <div className="h-5 w-48 rounded bg-slate-100" />
        <div className="mt-5 space-y-3">
          <div className="h-14 rounded bg-slate-100" />
          <div className="h-14 rounded bg-slate-100" />
          <div className="h-14 rounded bg-slate-100" />
        </div>
      </section>
    )
  }

  if (block.status === 'error') {
    return (
      <section className="fe-card px-5 py-5">
        <h2 className="text-base font-extrabold text-[#0c1830]">Resumen de Auditoría</h2>
        <div className="mt-4">
          <BlockMessage type="error" message={block.error} />
        </div>
      </section>
    )
  }

  const rows = Array.isArray(block.data?.rows) ? block.data.rows : []

  return (
    <section className="fe-card px-5 py-5">
      <h2 className="text-base font-extrabold text-[#0c1830]">Resumen de Auditoría</h2>

      {rows.length === 0 || block.data?.total === 0 ? (
        <div className="mt-4">
          <BlockMessage message="No hay movimientos auditables registrados." />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={() => onNavigate(row.target)}
              className={`flex min-h-[52px] w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition hover:brightness-[0.98] ${AUDIT_TONES[row.key] || AUDIT_TONES.movements}`}
              aria-label={`Abrir ${row.label}`}
            >
              <span className="text-sm font-bold">{row.label}</span>
              <span className="text-lg font-extrabold">{formatNumber(row.count)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

const TopMovedMedicines = ({
  block,
  title = 'Medicamentos con Mayor Movimiento',
  emptyMessage = 'No hay movimientos suficientes para calcular el ranking.',
  unitLabel = 'uds',
  onNavigate
}) => {
  if (block.status === 'loading') {
    return (
      <section className="fe-card animate-pulse px-5 py-5">
        <div className="h-5 w-72 rounded bg-slate-100" />
        <div className="mt-5 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-8 rounded bg-slate-100" />
          ))}
        </div>
      </section>
    )
  }

  if (block.status === 'error') {
    return (
      <section className="fe-card px-5 py-5">
        <h2 className="text-base font-extrabold text-[#0c1830]">{title}</h2>
        <div className="mt-4">
          <BlockMessage type="error" message={block.error} />
        </div>
      </section>
    )
  }

  const rows = Array.isArray(block.data) ? block.data : []
  const maxUnits = rows.reduce((max, row) => Math.max(max, row.units), 0)

  return (
    <section className="fe-card px-5 py-5">
      <h2 className="text-base font-extrabold text-[#0c1830]">{title}</h2>

      {rows.length === 0 ? (
        <div className="mt-4">
          <BlockMessage message={emptyMessage} />
        </div>
      ) : (
        <div className="mt-5 space-y-3.5">
          {rows.map((row, index) => {
            const width = maxUnits > 0 ? Math.max(8, (row.units / maxUnits) * 100) : 0
            const Wrapper = row.target ? 'button' : 'div'

            return (
              <Wrapper
                key={row.key}
                type={row.target ? 'button' : undefined}
                onClick={row.target && typeof onNavigate === 'function' ? () => onNavigate(row.target) : undefined}
                className="grid w-full grid-cols-[34px_1fr_auto] items-center gap-3 rounded-lg text-left transition hover:bg-[#fbf8ff]"
              >
                <span className="text-sm font-extrabold text-[#9aa5ba]">#{index + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold text-[#273956]">{row.name}</p>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-[#f0e6fb]">
                    <div className="h-2 rounded-full bg-[#8a4cf6]" style={{ width: `${width}%` }} />
                  </div>
                </div>
                <span className="whitespace-nowrap text-sm font-extrabold text-[#7438f4]">{formatNumber(row.units)} {unitLabel}</span>
              </Wrapper>
            )
          })}
        </div>
      )}
    </section>
  )
}

const OperationalActivityPanel = ({ block, onNavigate }) => {
  if (block.status === 'loading') {
    return (
      <section className="fe-card animate-pulse px-5 py-5">
        <div className="h-5 w-64 rounded bg-slate-100" />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="h-24 rounded bg-slate-100" />
          <div className="h-24 rounded bg-slate-100" />
          <div className="h-24 rounded bg-slate-100" />
        </div>
      </section>
    )
  }

  if (block.status === 'error') {
    return (
      <section className="fe-card px-5 py-5">
        <h2 className="text-base font-extrabold text-[#0c1830]">Actividad Operativa</h2>
        <div className="mt-4">
          <BlockMessage type="error" message={block.error} />
        </div>
      </section>
    )
  }

  const data = block.data || {}
  const entries = data.entries || {}
  const exits = data.exits || {}

  return (
    <section className="fe-card px-5 py-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h2 className="text-base font-extrabold text-[#0c1830]">Actividad Operativa</h2>
        <span className="text-xs font-bold uppercase tracking-wide text-[#8b97b2]">Últimos {data.days || 7} días</span>
      </div>

      {Number(data.totalOperations || 0) === 0 ? (
        <div className="mt-4">
          <BlockMessage message={`No hay entradas o salidas registradas en los últimos ${data.days || 7} días.`} />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1.2fr]">
          <button
            type="button"
            onClick={() => onNavigate('entries')}
            className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-4 text-left transition hover:bg-emerald-100"
          >
            <p className="text-xs font-bold uppercase text-emerald-700">Entradas</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-800">{formatNumber(entries.units)} uds</p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">{formatNumber(entries.count)} registros</p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('exits')}
            className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-4 text-left transition hover:bg-indigo-100"
          >
            <p className="text-xs font-bold uppercase text-indigo-700">Salidas</p>
            <p className="mt-2 text-2xl font-extrabold text-indigo-800">{formatNumber(exits.units)} uds</p>
            <p className="mt-1 text-xs font-semibold text-indigo-700">{formatNumber(exits.count)} registros</p>
          </button>

          <div className="rounded-lg border border-[#e8edf8] bg-[#fbfcff] px-4 py-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-[#657391]">
              <span>Balance operativo</span>
              <span>{formatNumber(data.totalOperations)} operaciones</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-emerald-400" style={{ width: `${entries.percent || 0}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#657391]">
              <span>Entradas {entries.percent || 0}%</span>
              <span>Salidas {exits.percent || 0}%</span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const DashboardPage = ({ session }) => {
  const navigate = useNavigate()
  const [dashboardState, setDashboardState] = useState(INITIAL_DASHBOARD_STATE)
  const normalizedRole = normalizeRole(session?.role)
  const isAuditor = normalizedRole === ROLES.AUDITOR
  const isPharmacist = normalizedRole === ROLES.FARMACEUTICO

  const navigateToFallback = () => {
    const fallbackRoute = getDefaultRouteByRole(session?.role)
    navigate(fallbackRoute === '/dashboard' ? '/medicines' : fallbackRoute)
  }

  const handleNavigate = (target) => {
    if (target === 'medicines' || target === 'stock') {
      if (target === 'stock' && !isAuditor) navigate('/stock')
      else if (target === 'stock' && canAccessMedicines(session?.role)) navigate('/medicines')
      else if (canAccessMedicines(session?.role)) navigate('/medicines')
      else navigateToFallback()
      return
    }

    if (target === 'entries') {
      navigate('/entries')
      return
    }

    if (target === 'exits') {
      navigate('/exits')
      return
    }

    if (target === 'audit') {
      navigate('/audit')
      return
    }

    if (target === 'reports') {
      if (canAccessReports(session?.role)) navigate('/reports', { state: { activeTab: 'inventory' } })
      else if (canAccessMedicines(session?.role)) navigate('/medicines')
      else navigateToFallback()
      return
    }

    if (target === 'movements') {
      if (canAccessMovements(session?.role)) navigate('/movements')
      else if (canAccessMedicines(session?.role)) navigate('/medicines')
      else navigateToFallback()
      return
    }

    if (target === 'reports-entries') {
      if (canAccessReports(session?.role)) navigate('/reports', { state: { activeTab: 'movements', movementFilter: 'entrance' } })
      else navigateToFallback()
      return
    }

    if (target === 'reports-exits') {
      if (canAccessReports(session?.role)) navigate('/reports', { state: { activeTab: 'movements', movementFilter: 'exit' } })
      else navigateToFallback()
      return
    }

    if (target === 'reports-adjustments') {
      if (canAccessReports(session?.role)) navigate('/reports', { state: { activeTab: 'movements', movementFilter: 'adjustment' } })
      else navigateToFallback()
      return
    }

    if (target === 'reports-expiring') {
      if (canAccessReports(session?.role)) navigate('/reports', { state: { activeTab: 'expiring' } })
      else navigateToFallback()
      return
    }

    if (target === 'reports-lowstock') {
      if (canAccessReports(session?.role)) navigate('/reports', { state: { activeTab: 'lowstock' } })
      else navigateToFallback()
      return
    }

    if (target === 'alerts') {
      if (canAccessAlerts(session?.role)) navigate('/alerts')
      else navigateToFallback()
      return
    }

    navigateToFallback()
  }

  const handleNavigateToAlertSection = (sectionKey) => {
    if (canAccessAlerts(session?.role)) {
      try {
        sessionStorage.setItem(ALERTS_OPEN_SECTION_STORAGE_KEY, sectionKey)
      } catch {
        // no-op
      }
      navigate(`/alerts?section=${encodeURIComponent(sectionKey)}`, { state: { openSection: sectionKey } })
      return
    }

    navigateToFallback()
  }

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setDashboardState(INITIAL_DASHBOARD_STATE)
      const data = await getDashboardData({ role: session?.role })
      if (isMounted) setDashboardState(data)
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [session?.role])

  const displayName = String(session?.user?.name || '').trim() || 'Usuario'
  const roleLabel = getRoleLabel(session?.role)

  return (
    <div className="fe-page-shell">
      <div className="fe-page-head">
        <div>
          <h1 className="fe-page-title">Dashboard</h1>
          <p className="fe-section-subtitle">Bienvenido, {displayName}</p>
        </div>
        <span className="inline-flex h-9 items-center rounded-full bg-[#ead9ff] px-5 text-sm font-extrabold text-[#7a35e8]">
          {roleLabel}
        </span>
      </div>

      <KpiGrid
        block={dashboardState.kpis}
        auditBlock={dashboardState.audit}
        isAuditor={isAuditor}
        isPharmacist={isPharmacist}
        onNavigate={handleNavigate}
      />

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.95fr)]">
        <MovementsChart block={dashboardState.movements} />
        {isAuditor
          ? <AuditSummary block={dashboardState.audit} onNavigate={handleNavigate} />
          : <AlertsSummary block={dashboardState.alerts} onNavigateToSection={handleNavigateToAlertSection} />}
      </div>

      <div className="mt-5">
        {isPharmacist
          ? <OperationalActivityPanel block={dashboardState.topMoved} onNavigate={handleNavigate} />
          : (
            <TopMovedMedicines
              block={dashboardState.topMoved}
              onNavigate={handleNavigate}
            />
            )}
      </div>
    </div>
  )
}

export default DashboardPage
