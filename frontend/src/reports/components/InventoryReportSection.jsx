import { useMemo, useState } from 'react'
import { INVENTORY_PAGE_SIZES } from '../config/reportTabs'
import { formatCurrency, formatCurrencyCell, toNumber } from '../utils/reportFormatters'

const InventoryReportSection = ({
  rows = [],
  summary = null,
  isLoading = false,
  onExport,
  exportDisabled = false,
  isExporting = false
}) => {
  const [sortBy, setSortBy] = useState('code')
  const [sortDirection, setSortDirection] = useState('asc')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortBy === 'stock') return (toNumber(a.stock) - toNumber(b.stock)) * direction
      if (sortBy === 'totalValue') return (toNumber(a.totalValue) - toNumber(b.totalValue)) * direction
      return String(a.codigo || '').localeCompare(String(b.codigo || ''), 'es', { numeric: true, sensitivity: 'base' }) * direction
    })
  }, [rows, sortBy, sortDirection])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedRows.length / pageSize)), [sortedRows.length, pageSize])
  const safePage = Math.min(page, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [safePage, pageSize, sortedRows])

  const fallbackTotalUnits = useMemo(() => rows.reduce((sum, item) => sum + toNumber(item.stock), 0), [rows])
  const fallbackTotalValue = useMemo(
    () => rows.reduce((sum, item) => sum + (toNumber(item.totalValue) || (toNumber(item.stock) * toNumber(item.precio))), 0),
    [rows]
  )
  const totalUnits = toNumber(summary?.totalStock) || fallbackTotalUnits
  const totalValue = toNumber(summary?.totalInventoryValue) || fallbackTotalValue

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      setPage(1)
      return
    }
    setSortBy(columnKey)
    setSortDirection('asc')
    setPage(1)
  }

  const sortIndicator = (columnKey) => (sortBy !== columnKey ? '↕' : (sortDirection === 'asc' ? '↑' : '↓'))

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="fe-card border border-[#dbe4f7] bg-[#f7f9ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#657aa6]">Productos visibles</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#1f3561]">{rows.length}</p>
        </article>
        <article className="fe-card border border-[#dbe4f7] bg-[#f7f9ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#657aa6]">Unidades en inventario</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#1f3561]">{totalUnits}</p>
        </article>
        <article className="fe-card border border-[#d7e2f8] bg-gradient-to-r from-[#f6f8ff] to-[#eef3ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#6076a4]">Valor total general</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#23365e]">{formatCurrency(totalValue)}</p>
        </article>
      </div>

      <div className="fe-card overflow-hidden p-0">
        <div className="border-b border-[#e8edf8] bg-[#f7f9ff] px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[1.2rem] font-bold text-[#1f2e4d]">Reporte de Inventario Actual</h2>
              <p className="mt-1 text-sm text-[#6e7d99]">Resumen del inventario actual con stock y valor por producto.</p>
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

        <div className="fe-table-wrap">
          <table className="fe-table table-fixed text-sm">
            <colgroup>
              <col className="w-[132px]" />
              <col className="w-[36%]" />
              <col className="w-[100px]" />
              <col className="w-[170px]" />
              <col className="w-[190px]" />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left">
                  <button type="button" onClick={() => handleSort('code')} className="inline-flex items-center gap-1 font-bold tracking-wide text-inherit">
                    CÓDIGO <span className="text-[10px] opacity-80">{sortIndicator('code')}</span>
                  </button>
                </th>
                <th className="text-left">NOMBRE</th>
                <th className="text-left">
                  <button type="button" onClick={() => handleSort('stock')} className="inline-flex items-center gap-1 font-bold tracking-wide text-inherit">
                    STOCK <span className="text-[10px] opacity-80">{sortIndicator('stock')}</span>
                  </button>
                </th>
                <th className="text-left">PRECIO</th>
                <th className="text-left">
                  <button type="button" onClick={() => handleSort('totalValue')} className="inline-flex items-center gap-1 font-bold tracking-wide text-inherit">
                    VALOR TOTAL <span className="text-[10px] opacity-80">{sortIndicator('totalValue')}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="5" className="p-5 text-center text-gray-400">Cargando inventario...</td></tr>
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((item) => (
                  <tr key={item.id || `${item.codigo}-${item.nombre}`}>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex h-8 items-center rounded-lg bg-[#eef2fa] px-3 text-xs font-semibold text-[#526180]">
                        {item.codigo || '---'}
                      </span>
                    </td>
                    <td className="truncate font-semibold text-[#23365d]" title={item.nombre || 'Sin nombre'}>{item.nombre || 'Sin nombre'}</td>
                    <td className={`whitespace-nowrap text-left font-semibold tabular-nums ${toNumber(item.stock) < 20 ? 'text-red-600' : 'text-[#283b61]'}`}>{item.stock}</td>
                    <td className="whitespace-nowrap text-left font-semibold tabular-nums text-[#30456f]">{formatCurrencyCell(item.precio)}</td>
                    <td className="whitespace-nowrap text-left font-bold tabular-nums text-[#20365f]">{formatCurrencyCell(item.totalValue)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="p-5 text-center text-gray-400">No hay datos de inventario.</td></tr>
              )}
            </tbody>
            {!isLoading && rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#d7e2f8] bg-[#f6f9ff]">
                  <td />
                  <td className="font-extrabold tracking-wide text-[#23365e]">TOTAL GENERAL</td>
                  <td className="whitespace-nowrap text-left font-extrabold tabular-nums text-[#20365f]">{totalUnits}</td>
                  <td className="text-left font-semibold text-[#6076a4]">—</td>
                  <td className="whitespace-nowrap text-left font-extrabold tabular-nums text-[#20365f]">{formatCurrencyCell(totalValue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {!isLoading && rows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#e8edf8] bg-[#fbfcff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#5f729a]">
              Mostrando {(safePage - 1) * pageSize + 1} a {Math.min(safePage * pageSize, sortedRows.length)} de {sortedRows.length} productos
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="inventory-page-size" className="mb-0 text-xs font-semibold text-[#5f729a]">Filas:</label>
              <select
                id="inventory-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                className="fe-input h-9 w-[84px] py-1.5 text-sm"
              >
                {INVENTORY_PAGE_SIZES.map((size) => (<option key={size} value={size}>{size}</option>))}
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

export default InventoryReportSection
