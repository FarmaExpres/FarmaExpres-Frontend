import { useMemo, useState } from 'react'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 30]

const getExpirationVisuals = (daysUntilExpiration) => {
  const days = Number(daysUntilExpiration)

  if (!Number.isFinite(days)) {
    return {
      tone: 'neutral',
      label: 'Sin fecha',
      badgeClass: 'bg-slate-100 text-slate-700',
      textClass: 'text-slate-600',
      rowClass: ''
    }
  }

  if (days < 0) {
    return {
      tone: 'expired',
      label: 'Vencido',
      badgeClass: 'bg-red-100 text-red-700',
      textClass: 'text-red-700',
      rowClass: 'bg-red-50/50'
    }
  }

  if (days <= 7) {
    return {
      tone: 'critical',
      label: 'Crítico',
      badgeClass: 'bg-rose-100 text-rose-700',
      textClass: 'text-rose-700',
      rowClass: ''
    }
  }

  if (days <= 15) {
    return {
      tone: 'high',
      label: 'Alto',
      badgeClass: 'bg-orange-100 text-orange-700',
      textClass: 'text-orange-700',
      rowClass: ''
    }
  }

  if (days <= 30) {
    return {
      tone: 'medium',
      label: 'Medio',
      badgeClass: 'bg-amber-100 text-amber-700',
      textClass: 'text-amber-700',
      rowClass: ''
    }
  }

  return {
    tone: 'controlled',
    label: 'Controlado',
    badgeClass: 'bg-blue-100 text-blue-700',
    textClass: 'text-blue-700',
    rowClass: ''
  }
}

const formatDaysLabel = (daysUntilExpiration) => {
  const days = Number(daysUntilExpiration)

  if (!Number.isFinite(days)) return '---'
  if (days < 0) return `${Math.abs(days)} día(s) vencido`
  if (days === 0) return 'VENCE HOY'
  return `${days} día(s)`
}

const ExpiringReportSection = ({
  rows = [],
  expiredRows = [],
  criticalRows = [],
  mediumRows = [],
  controlledRows = [],
  isLoading = false,
  onExport,
  exportDisabled = false,
  isExporting = false
}) => {
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    if (urgencyFilter === 'expired') return expiredRows
    if (urgencyFilter === 'critical') return criticalRows
    if (urgencyFilter === 'medium') return mediumRows
    if (urgencyFilter === 'controlled') return controlledRows
    return rows
  }, [controlledRows, criticalRows, expiredRows, mediumRows, rows, urgencyFilter])
  const stockColumnLabel = urgencyFilter === 'expired' ? 'STOCK VENC.' : 'STOCK LOTE'

  const summary = useMemo(() => {
    return rows.reduce((acc, item) => {
      const { tone } = getExpirationVisuals(item.daysUntilExpiration)
      acc.total += 1
      acc.totalStock += Number(item.stock) || 0

      if (tone === 'expired') acc.expired += 1
      if (tone === 'critical' || tone === 'high') acc.critical += 1
      if (tone === 'medium') acc.medium += 1
      if (tone === 'controlled') acc.controlled += 1

      return acc
    }, { total: 0, totalStock: 0, expired: 0, critical: 0, medium: 0, controlled: 0 })
  }, [rows])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / pageSize)),
    [filteredRows.length, pageSize]
  )
  const safePage = Math.min(page, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, pageSize, safePage])

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="fe-card border border-[#dbe4f7] bg-[#f7f9ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#657aa6]">Medicamentos visibles</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#1f3561]">{summary.total}</p>
        </article>
        <article className="fe-card border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Vencidos</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-red-800">{summary.expired}</p>
        </article>
        <article className="fe-card border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Riesgo alto (0-15 días)</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-orange-800">{summary.critical}</p>
        </article>
        <article className="fe-card border border-[#d7e2f8] bg-gradient-to-r from-[#f6f8ff] to-[#eef3ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6076a4]">Unidades comprometidas</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#23365e]">{summary.totalStock}</p>
        </article>
      </div>

      <div className="fe-card overflow-hidden p-0">
        <div className="border-b border-[#e8edf8] bg-[#f7f9ff] px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[1.2rem] font-bold text-[#1f2e4d]">Reporte de próximos a vencer</h2>
              <p className="mt-1 text-sm text-[#6e7d99]">Listado de productos próximos a vencer con su nivel de prioridad.</p>
            </div>
            <button
              type="button"
              onClick={onExport}
              disabled={exportDisabled || isExporting}
              className="fe-btn-primary h-10 px-4 text-sm disabled:opacity-50"
            >
              {isExporting ? 'Exportando...' : 'Exportar Excel'}
            </button>
          </div>
        </div>

        <div className="border-b border-[#e8edf8] bg-[#fbfcff] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setUrgencyFilter('all')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${urgencyFilter === 'all' ? 'bg-[#e8eefe] text-[#355189]' : 'bg-slate-100 text-slate-700'}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => {
                setUrgencyFilter('expired')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${urgencyFilter === 'expired' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}
            >
              Vencidos
            </button>
            <button
              type="button"
              onClick={() => {
                setUrgencyFilter('critical')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${urgencyFilter === 'critical' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}
            >
              0-15 días
            </button>
            <button
              type="button"
              onClick={() => {
                setUrgencyFilter('medium')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${urgencyFilter === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}
            >
              16-30 días
            </button>
            <button
              type="button"
              onClick={() => {
                setUrgencyFilter('controlled')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${urgencyFilter === 'controlled' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}
            >
              31-60 días
            </button>
          </div>
        </div>

        <div className="fe-table-wrap">
          <table className="fe-table table-fixed text-sm">
            <colgroup>
              <col className="w-[132px]" />
              <col className="w-[26%]" />
              <col className="w-[150px]" />
              <col className="w-[148px]" />
              <col className="w-[188px]" />
              <col className="w-[116px]" />
              <col className="w-[140px]" />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left">CÓDIGO</th>
                <th className="text-left">MEDICAMENTO</th>
                <th className="text-left">LOTE</th>
                <th className="text-left">VENCIMIENTO</th>
                <th className="text-left">DÍAS RESTANTES</th>
                <th className="text-left">{stockColumnLabel}</th>
                <th className="text-left">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" className="p-5 text-center text-gray-400">Cargando próximos a vencer...</td></tr>
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((item) => {
                  const visuals = getExpirationVisuals(item.daysUntilExpiration)
                  const days = Number(item.daysUntilExpiration)

                  return (
                    <tr key={item.id || `${item.codigo}-${item.nombre}`} className={visuals.rowClass}>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex h-8 items-center rounded-lg bg-[#eef2fa] px-3 text-xs font-semibold text-[#526180]">
                          {item.codigo || '---'}
                        </span>
                      </td>
                      <td className="truncate font-semibold text-[#23365d]" title={item.nombre || 'Sin nombre'}>{item.nombre || 'Sin nombre'}</td>
                      <td className="whitespace-nowrap text-left font-medium text-[#30456f]">{item.loteCodigo || 'Sin lote'}</td>
                      <td className="whitespace-nowrap text-left font-medium text-[#30456f]">{item.fechavencimiento || '---'}</td>
                      <td className={`whitespace-nowrap text-left font-bold ${visuals.textClass}`}>
                        {days === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                            VENCE HOY
                          </span>
                        ) : (
                          formatDaysLabel(item.daysUntilExpiration)
                        )}
                      </td>
                      <td
                        className="whitespace-nowrap text-left font-semibold text-[#283b61]"
                        title={`Stock operativo producto: ${item.operationalStock ?? 0}`}
                      >
                        {item.batchStock ?? item.stock ?? 0}
                      </td>
                      <td className="whitespace-nowrap text-left">
                        <span className={`fe-badge-chip ${visuals.badgeClass}`}>
                          {visuals.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan="7" className="p-5 text-center text-gray-400">No hay medicamentos próximos a vencer para el filtro seleccionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredRows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#e8edf8] bg-[#fbfcff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#5f729a]">
              Mostrando {(safePage - 1) * pageSize + 1} a {Math.min(safePage * pageSize, filteredRows.length)} de {filteredRows.length} medicamentos
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="expiring-page-size" className="mb-0 text-xs font-semibold text-[#5f729a]">Filas:</label>
              <select
                id="expiring-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                className="fe-input h-9 w-[84px] py-1.5 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (<option key={size} value={size}>{size}</option>))}
              </select>
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={safePage <= 1} className="fe-btn-muted h-9 px-3 py-1.5 text-sm disabled:opacity-50">Anterior</button>
              <span className="rounded-md bg-[#eef3ff] px-3 py-1.5 text-sm font-semibold text-[#405a8b]">{safePage} / {totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={safePage >= totalPages} className="fe-btn-muted h-9 px-3 py-1.5 text-sm disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default ExpiringReportSection
