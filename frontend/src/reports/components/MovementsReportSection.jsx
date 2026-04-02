import { useEffect, useMemo, useState } from 'react'

const getMovementVisuals = (movement) => {
  const type = String(movement?.type || '').toUpperCase()
  const label = String(movement?.typeLabel || '').toLowerCase()

  if (type === 'ENTRANCE' || label.includes('entrada')) {
    return {
      badgeClass: 'bg-emerald-100 text-emerald-700',
      quantityClass: 'text-emerald-700'
    }
  }

  if (type === 'EXIT' || type === 'DELETED' || label.includes('salida')) {
    return {
      badgeClass: 'bg-red-100 text-red-700',
      quantityClass: 'text-red-700'
    }
  }

  if (type === 'UPDATED' || label.includes('ajuste') || label.includes('actualiz')) {
    return {
      badgeClass: 'bg-blue-100 text-blue-700',
      quantityClass: 'text-blue-700'
    }
  }

  return {
    badgeClass: 'bg-slate-100 text-slate-700',
    quantityClass: 'text-slate-600'
  }
}

const formatQuantity = (quantity) => {
  const amount = Number(quantity) || 0
  if (amount > 0) return `+${amount}`
  return `${amount}`
}

const getReasonText = (movement = {}) => {
  if (movement.type === 'UPDATED') return movement.reason || 'Ajuste de producto'
  return movement.reason || 'No especificado'
}

const getAdjustmentDetailText = (movement = {}) => {
  if (movement.type !== 'UPDATED') return ''
  return movement.adjustmentDetailText || movement.adjustmentSummary || 'Sin detalle específico del ajuste'
}

const MovementsReportSection = ({
  rows = [],
  isLoading = false,
  onRowsForExportChange,
  onFilterForExportChange,
  onExport,
  exportDisabled = false,
  isExporting = false
}) => {
  const [typeFilter, setTypeFilter] = useState('all')
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    if (typeFilter === 'all') return rows
    return rows.filter((movement) => {
      const visuals = getMovementVisuals(movement)
      if (typeFilter === 'entrance') return visuals.badgeClass.includes('emerald')
      if (typeFilter === 'exit') return visuals.badgeClass.includes('red')
      if (typeFilter === 'adjustment') return visuals.badgeClass.includes('blue')
      return true
    })
  }, [rows, typeFilter])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRows.length / pageSize)), [filteredRows.length, pageSize])
  const safePage = Math.min(page, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, pageSize, safePage])

  const summary = useMemo(() => {
    return rows.reduce((acc, movement) => {
      const { badgeClass } = getMovementVisuals(movement)
      acc.total += 1
      if (badgeClass.includes('emerald')) acc.entrances += 1
      if (badgeClass.includes('red')) acc.exits += 1
      if (badgeClass.includes('blue')) acc.adjustments += 1
      return acc
    }, { total: 0, entrances: 0, exits: 0, adjustments: 0 })
  }, [rows])

  useEffect(() => {
    if (typeof onRowsForExportChange === 'function') {
      onRowsForExportChange(filteredRows)
    }
  }, [filteredRows, onRowsForExportChange])

  useEffect(() => {
    if (typeof onFilterForExportChange === 'function') {
      onFilterForExportChange(typeFilter)
    }
  }, [typeFilter, onFilterForExportChange])

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <article className="fe-card border border-[#dbe4f7] bg-[#f7f9ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#657aa6]">Movimientos visibles</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#1f3561]">{summary.total}</p>
        </article>
        <article className="fe-card border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Entradas</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-800">{summary.entrances}</p>
        </article>
        <article className="fe-card border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Salidas</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-red-800">{summary.exits}</p>
        </article>
        <article className="fe-card border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Ajustes</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-blue-800">{summary.adjustments}</p>
        </article>
      </div>

      <div className="fe-card overflow-hidden p-0">
        <div className="border-b border-[#e8edf8] bg-[#f7f9ff] px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[1.2rem] font-bold text-[#1f2e4d]">Reporte de Movimientos</h2>
              <p className="mt-1 text-sm text-[#6e7d99]">Historial de entradas, salidas y ajustes del inventario con clasificación visual por tipo.</p>
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
                  setTypeFilter('all')
                  setPage(1)
                }}
                className={`fe-badge-chip h-9 px-4 ${typeFilter === 'all' ? 'bg-[#e8eefe] text-[#355189]' : 'bg-slate-100 text-slate-700'}`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('entrance')
                  setPage(1)
                }}
                className={`fe-badge-chip h-9 px-4 ${typeFilter === 'entrance' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}
              >
                Entradas
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('exit')
                  setPage(1)
                }}
                className={`fe-badge-chip h-9 px-4 ${typeFilter === 'exit' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}
              >
                Salidas
              </button>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('adjustment')
                  setPage(1)
                }}
                className={`fe-badge-chip h-9 px-4 ${typeFilter === 'adjustment' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}
              >
                Ajustes
              </button>
          </div>
        </div>

        <div className="fe-table-wrap">
          <table className="fe-table table-fixed text-sm">
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[18%]" />
              <col className="w-[8%]" />
              <col className="w-[19%]" />
              <col className="w-[27%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left">FECHA</th>
                <th className="text-left">HORA</th>
                <th className="text-left">TIPO</th>
                <th className="text-left">MEDICAMENTO</th>
                <th className="text-left">CANTIDAD</th>
                <th className="text-left">MOTIVO</th>
                <th className="text-left">USUARIO</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" className="p-5 text-center text-gray-400">Cargando movimientos...</td></tr>
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((item, index) => {
                  const visuals = getMovementVisuals(item)

                  return (
                    <tr key={item.id || `${item.date}-${item.time}-${index}`}>
                      <td className="whitespace-nowrap">{item.date || '---'}</td>
                      <td className="whitespace-nowrap">{item.time || '---'}</td>
                      <td className="whitespace-nowrap">
                        <span className={`fe-badge-chip ${visuals.badgeClass}`}>
                          {item.typeLabel || 'Sin tipo'}
                        </span>
                      </td>
                      <td className="font-medium text-[#23365d]">{item.medicine || 'No disponible'}</td>
                      <td className={`whitespace-nowrap text-left font-bold tabular-nums ${visuals.quantityClass}`}>
                        {formatQuantity(item.quantity)}
                      </td>
                      <td title={getAdjustmentDetailText(item) || getReasonText(item)}>
                        <p className={`max-w-[250px] truncate ${item.type === 'UPDATED' ? 'font-semibold text-blue-700' : 'text-[#30456f]'}`}>
                          {getReasonText(item)}
                        </p>
                        {item.type === 'UPDATED' && (
                          <p className="max-w-[250px] truncate text-xs text-[#6f86b8]">
                            {item.adjustmentDetail?.length > 0
                              ? `${item.adjustmentDetail.length} cambio(s): ${getAdjustmentDetailText(item)}`
                              : getAdjustmentDetailText(item)}
                          </p>
                        )}
                      </td>
                      <td title={`${item.user || 'No disponible'} (${item.userRoleLabel || 'Sin rol'})`}>
                        <p className="truncate font-semibold text-[#2f3f62]">{item.user || 'No disponible'}</p>
                        <p className="truncate text-xs text-[#8c97b3]">{item.userRoleLabel || 'Sin rol'}</p>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan="7" className="p-5 text-center text-gray-400">No hay movimientos para el filtro seleccionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredRows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#e8edf8] bg-[#fbfcff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#5f729a]">
              Mostrando {(safePage - 1) * pageSize + 1} a {Math.min(safePage * pageSize, filteredRows.length)} de {filteredRows.length} movimientos
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="movements-page-size" className="mb-0 text-xs font-semibold text-[#5f729a]">Filas:</label>
              <select
                id="movements-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                className="fe-input h-9 w-[84px] py-1.5 text-sm"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
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

export default MovementsReportSection
