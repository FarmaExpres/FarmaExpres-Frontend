import { useMemo, useState } from 'react'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 30]

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getStockLevel = (item = {}) => {
  const stock = toNumber(item.stock)
  const min = Math.max(toNumber(item.stockMinimo), 1)
  return (stock / min) * 100
}

const formatCoverage = (item = {}) => `${Math.round(getStockLevel(item))}%`

const getStockVisuals = (item = {}) => {
  const level = getStockLevel(item)

  if (level <= 50) {
    return {
      tone: 'critical',
      label: 'Crítico',
      badgeClass: 'bg-red-100 text-red-700',
      textClass: 'text-red-700'
    }
  }

  return {
    tone: 'alert',
    label: 'Alerta',
    badgeClass: 'bg-amber-100 text-amber-700',
    textClass: 'text-amber-700'
  }
}

const buildSuggestion = (item = {}) => {
  const stock = toNumber(item.stock)
  const minimum = toNumber(item.stockMinimo)
  const restockUnits = Math.max((minimum * 2) - stock, 1)
  return `Reponer ${restockUnits} unidades`
}

const LowStockReportSection = ({ rows = [], isLoading = false, onExport, exportDisabled = false, isExporting = false }) => {
  const [severityFilter, setSeverityFilter] = useState('all')
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    if (severityFilter === 'all') return rows

    return rows.filter((item) => {
      const { tone } = getStockVisuals(item)
      if (severityFilter === 'critical') return tone === 'critical'
      if (severityFilter === 'alert') return tone === 'alert'
      return true
    })
  }, [rows, severityFilter])

  const summary = useMemo(() => {
    return rows.reduce((acc, item) => {
      const { tone } = getStockVisuals(item)
      const stock = toNumber(item.stock)
      const min = toNumber(item.stockMinimo)
      const restockUnits = Math.max((min * 2) - stock, 1)

      acc.total += 1
      acc.unitsCompromised += stock
      acc.restockSuggestion += restockUnits
      if (tone === 'critical') acc.critical += 1
      if (tone === 'alert') acc.alert += 1

      return acc
    }, { total: 0, critical: 0, alert: 0, unitsCompromised: 0, restockSuggestion: 0 })
  }, [rows])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRows.length / pageSize)), [filteredRows.length, pageSize])
  const safePage = Math.min(page, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, pageSize, safePage])

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="fe-card border border-[#dbe4f7] bg-[#f7f9ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#657aa6]">Productos en bajo stock</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#1f3561]">{summary.total}</p>
        </article>
        <article className="fe-card border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Nivel crítico</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-red-800">{summary.critical}</p>
        </article>
        <article className="fe-card border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Nivel alerta</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-amber-800">{summary.alert}</p>
        </article>
        <article className="fe-card border border-[#d7e2f8] bg-gradient-to-r from-[#f6f8ff] to-[#eef3ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6076a4]">Sugerencia total de reposición</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#23365e]">{summary.restockSuggestion}</p>
        </article>
      </div>

      <div className="fe-card overflow-hidden p-0">
        <div className="border-b border-[#e8edf8] bg-[#f7f9ff] px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[1.2rem] font-bold text-[#1f2e4d]">Reporte de Bajo Stock</h2>
              <p className="mt-1 text-sm text-[#6e7d99]">Productos con nivel de inventario por debajo del mínimo configurado.</p>
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
                setSeverityFilter('all')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${severityFilter === 'all' ? 'bg-[#e8eefe] text-[#355189]' : 'bg-slate-100 text-slate-700'}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => {
                setSeverityFilter('critical')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${severityFilter === 'critical' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}
            >
              Crítico
            </button>
            <button
              type="button"
              onClick={() => {
                setSeverityFilter('alert')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${severityFilter === 'alert' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}
            >
              Alerta
            </button>
          </div>
        </div>

        <div className="fe-table-wrap">
          <table className="fe-table table-fixed text-sm">
            <colgroup>
              <col className="w-[132px]" />
              <col className="w-[30%]" />
              <col className="w-[104px]" />
              <col className="w-[104px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[26%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left">CÓDIGO</th>
                <th className="text-left">MEDICAMENTO</th>
                <th className="text-left">STOCK</th>
                <th className="text-left">MÍNIMO</th>
                <th className="text-left">COBERTURA</th>
                <th className="text-left">ESTADO</th>
                <th className="text-left">SUGERENCIA</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" className="p-5 text-center text-gray-400">Cargando bajo stock...</td></tr>
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((item) => {
                  const visuals = getStockVisuals(item)
                  return (
                    <tr key={item.id || `${item.codigo}-${item.nombre}`}>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex h-8 items-center rounded-lg bg-[#eef2fa] px-3 text-xs font-semibold text-[#526180]">
                          {item.codigo || '---'}
                        </span>
                      </td>
                      <td className="truncate font-semibold text-[#23365d]" title={item.nombre || 'Sin nombre'}>{item.nombre || 'Sin nombre'}</td>
                      <td className={`whitespace-nowrap text-left font-semibold ${visuals.textClass}`}>{toNumber(item.stock)}</td>
                      <td className="whitespace-nowrap text-left font-semibold text-[#2f4269]">{toNumber(item.stockMinimo)}</td>
                      <td className={`whitespace-nowrap text-left font-semibold ${visuals.textClass}`}>{formatCoverage(item)}</td>
                      <td className="whitespace-nowrap text-left">
                        <span className={`fe-badge-chip ${visuals.badgeClass}`}>{visuals.label}</span>
                      </td>
                      <td className="truncate text-[#8d1d1d]" title={buildSuggestion(item)}>{buildSuggestion(item)}</td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan="7" className="p-5 text-center text-gray-400">No hay productos en bajo stock para el filtro seleccionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredRows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#e8edf8] bg-[#fbfcff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#5f729a]">
              Mostrando {(safePage - 1) * pageSize + 1} a {Math.min(safePage * pageSize, filteredRows.length)} de {filteredRows.length} productos
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="low-stock-page-size" className="mb-0 text-xs font-semibold text-[#5f729a]">Filas:</label>
              <select
                id="low-stock-page-size"
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

export default LowStockReportSection
