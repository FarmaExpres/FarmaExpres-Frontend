import { useEffect, useMemo, useState } from 'react'
import { getStockControlData } from '../services/stock.service'
import { INVENTORY_CHANGED_EVENT } from '../../shared/events/inventory.events'

const numberFormatter = new Intl.NumberFormat('es-CO')
const formatNumber = (value) => numberFormatter.format(Number(value) || 0)

const INITIAL_STOCK_DATA = Object.freeze({
  summary: {
    criticalProducts: 0,
    lowStock: 0,
    adequateStock: 0,
    totalUnits: 0
  },
  criticalProducts: [],
  products: [],
  partialWarning: ''
})

const STATUS_CONFIG = {
  critical: {
    label: 'Crítico',
    tableLabel: 'Crítico',
    summaryLabel: 'Productos críticos',
    badgeClass: 'bg-red-100 text-red-700',
    chipClass: 'border-red-200 bg-red-50 text-red-700',
    textClass: 'text-red-700',
    barClass: 'bg-red-500'
  },
  low: {
    label: 'Bajo',
    tableLabel: 'Bajo',
    summaryLabel: 'Stock bajo',
    badgeClass: 'bg-amber-100 text-amber-700',
    chipClass: 'border-amber-200 bg-amber-50 text-amber-700',
    textClass: 'text-amber-700',
    barClass: 'bg-amber-400'
  },
  adequate: {
    label: 'Adecuado',
    tableLabel: 'Adecuado',
    summaryLabel: 'Stock adecuado',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    textClass: 'text-emerald-700',
    barClass: 'bg-emerald-500'
  }
}

const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'critical', label: 'Crítico' },
  { key: 'low', label: 'Bajo' },
  { key: 'adequate', label: 'Adecuado' }
]

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50]

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.adequate

const normalizeSearchText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const getPercent = (value, total) => {
  if (!total) return 0
  return Math.round((Number(value || 0) / total) * 100)
}

const getShortage = (product = {}) => Math.max(Number(product.minimumStock || 0) - Number(product.stock || 0), 0)

const BlockMessage = ({ type = 'empty', children }) => {
  const toneClass = type === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-slate-200 bg-slate-50 text-slate-600'

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${toneClass}`}>
      {children}
    </div>
  )
}

const LevelBar = ({ level, status, compact = false }) => {
  const safeLevel = Math.min(Math.max(Number(level) || 0, 0), 160)
  const visualWidth = Math.min(safeLevel, 100)
  const config = getStatusConfig(status)

  return (
    <div className={compact ? 'min-w-[118px]' : 'min-w-[152px]'}>
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#61708f]">
        <span>{formatNumber(safeLevel)}%</span>
        {!compact && <span className={config.textClass}>{config.label}</span>}
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#edf1f8]">
        <div className={`h-full rounded-full transition-[width] ${config.barClass}`} style={{ width: `${visualWidth}%` }} />
      </div>
    </div>
  )
}

const SummarySkeleton = () => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className="fe-card h-[98px] animate-pulse p-4">
        <div className="h-4 w-36 rounded bg-slate-100" />
        <div className="mt-4 h-7 w-20 rounded bg-slate-100" />
      </div>
    ))}
  </div>
)

const SummaryGrid = ({ summary, totalProducts }) => {
  const cards = [
    {
      key: 'criticalProducts',
      label: 'Productos críticos',
      value: summary.criticalProducts,
      percent: getPercent(summary.criticalProducts, totalProducts),
      tone: STATUS_CONFIG.critical.chipClass,
      valueClass: 'text-red-800'
    },
    {
      key: 'lowStock',
      label: 'Stock bajo',
      value: summary.lowStock,
      percent: getPercent(summary.lowStock, totalProducts),
      tone: STATUS_CONFIG.low.chipClass,
      valueClass: 'text-amber-800'
    },
    {
      key: 'adequateStock',
      label: 'Stock adecuado',
      value: summary.adequateStock,
      percent: getPercent(summary.adequateStock, totalProducts),
      tone: STATUS_CONFIG.adequate.chipClass,
      valueClass: 'text-emerald-800'
    },
    {
      key: 'totalUnits',
      label: 'Total de unidades',
      value: summary.totalUnits,
      percent: null,
      tone: 'border-[#dbe4f7] bg-[#f7f9ff] text-[#60739a]',
      valueClass: 'text-[#1f3561]'
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.key} className={`rounded-xl border p-4 ${card.tone}`}>
          <p className="text-xs font-bold uppercase tracking-wide">{card.label}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className={`text-2xl font-extrabold tracking-tight ${card.valueClass}`}>{formatNumber(card.value)}</p>
            {card.percent !== null && (
              <span className="mb-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-extrabold">
                {card.percent}%
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

const StockDistribution = ({ summary, totalProducts }) => {
  const segments = [
    { key: 'critical', value: summary.criticalProducts },
    { key: 'low', value: summary.lowStock },
    { key: 'adequate', value: summary.adequateStock }
  ]

  return (
    <section className="mt-4 rounded-xl border border-[#e4eaf6] bg-white px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-[#18243d]">Distribución del inventario</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {segments.map((segment) => {
            const config = getStatusConfig(segment.key)
            return (
              <span key={segment.key} className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${config.chipClass}`}>
                {config.label}: {formatNumber(segment.value)}
              </span>
            )
          })}
        </div>
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#edf1f8]">
        {segments.map((segment) => {
          const config = getStatusConfig(segment.key)
          const width = getPercent(segment.value, totalProducts)
          return (
            <span
              key={segment.key}
              className={config.barClass}
              style={{ width: `${width}%` }}
              title={`${config.label}: ${width}%`}
            />
          )
        })}
      </div>
    </section>
  )
}

const CriticalProductsPanel = ({ rows = [], isLoading }) => {
  if (isLoading) {
    return (
      <section className="fe-card min-h-[360px] animate-pulse p-5">
        <div className="h-5 w-52 rounded bg-slate-100" />
        <div className="mt-5 space-y-3">
          <div className="h-24 rounded bg-slate-100" />
          <div className="h-24 rounded bg-slate-100" />
          <div className="h-24 rounded bg-slate-100" />
        </div>
      </section>
    )
  }

  const shortageTotal = rows.reduce((sum, product) => sum + getShortage(product), 0)

  return (
    <section className="fe-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#0c1830]">Reposición prioritaria</h2>
        </div>
        <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-extrabold text-red-700">
          Faltan {formatNumber(shortageTotal)} uds
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <BlockMessage>No hay productos críticos en este momento.</BlockMessage>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.slice(0, 7).map((product) => (
            <article key={product.id || product.name} className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                    <p className="truncate text-sm font-extrabold text-red-900" title={product.name}>{product.name || 'Sin nombre'}</p>
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-red-700">
                    Stock {formatNumber(product.stock)} / mínimo {formatNumber(product.minimumStock)}
                  </p>
                </div>
                <div className="w-full sm:w-[156px]">
                  <LevelBar level={product.level} status="critical" compact />
                </div>
              </div>
              <p className="mt-3 rounded-md bg-white/75 px-3 py-2 text-xs font-semibold text-red-800">
                {product.suggestion}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

const StockTable = ({
  rows = [],
  totalRows = 0,
  isLoading,
  statusFilter,
  searchTerm,
  pageSize,
  currentPage,
  totalPages,
  onStatusFilterChange,
  onSearchChange,
  onPageSizeChange,
  onPageChange
}) => (
  <section className="fe-card overflow-hidden p-0">
    <div className="border-b border-[#e8edf8] bg-[#f7f9ff] px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-[#0c1830]">Tabla general de stock</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar medicamento..."
            className="fe-input h-10 w-full sm:w-[230px]"
          />
          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="fe-input h-10 w-full sm:w-[150px]"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.key} value={filter.key}>{filter.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>

    <div className="fe-table-wrap">
      <table className="fe-table table-fixed">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[108px]" />
          <col className="w-[108px]" />
          <col className="w-[184px]" />
          <col className="w-[132px]" />
        </colgroup>
        <thead>
          <tr>
            <th className="text-left">Medicamento</th>
            <th className="text-left">Stock</th>
            <th className="text-left">Mínimo</th>
            <th className="text-left">Nivel</th>
            <th className="text-left">Estado</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan="5" className="p-5 text-center text-gray-400">Cargando control de stock...</td></tr>
          ) : rows.length > 0 ? (
            rows.map((product) => {
              const config = getStatusConfig(product.status)
              return (
                <tr key={product.id || `${product.code}-${product.name}`}>
                  <td className="truncate font-semibold text-[#23365d]" title={product.name || 'Sin nombre'}>
                    {product.name || 'Sin nombre'}
                  </td>
                  <td className={`font-extrabold tabular-nums ${config.textClass}`}>{formatNumber(product.stock)}</td>
                  <td className="font-semibold tabular-nums text-[#2f4269]">{formatNumber(product.minimumStock)}</td>
                  <td><LevelBar level={product.level} status={product.status} /></td>
                  <td>
                    <span className={`fe-badge-chip min-w-[92px] ${config.badgeClass}`}>{config.tableLabel}</span>
                  </td>
                </tr>
              )
            })
          ) : (
            <tr><td colSpan="5" className="p-5 text-center text-gray-400">No hay productos que coincidan con los filtros.</td></tr>
          )}
        </tbody>
      </table>
    </div>

    {!isLoading && totalRows > 0 && (
      <div className="flex flex-col gap-3 border-t border-[#e8edf8] bg-[#fbfcff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#5f729a]">
          Mostrando {formatNumber(rows.length)} de {formatNumber(totalRows)} productos filtrados
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="stock-page-size" className="mb-0 text-xs font-semibold text-[#5f729a]">Filas:</label>
          <select
            id="stock-page-size"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="fe-input h-9 w-[84px] py-1.5 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (<option key={size} value={size}>{size}</option>))}
          </select>
          <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="fe-btn-muted h-9 px-3 py-1.5 text-sm disabled:opacity-50">Anterior</button>
          <span className="rounded-md bg-[#eef3ff] px-3 py-1.5 text-sm font-semibold text-[#405a8b]">{currentPage} / {totalPages}</span>
          <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="fe-btn-muted h-9 px-3 py-1.5 text-sm disabled:opacity-50">Siguiente</button>
        </div>
      </div>
    )}
  </section>
)

const StockControlPage = () => {
  const [stockData, setStockData] = useState(INITIAL_STOCK_DATA)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let isMounted = true

    const runInitialLoad = async () => {
      setIsLoading(true)
      setError('')

      try {
        const data = await getStockControlData()
        if (!isMounted) return
        setStockData(data)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError?.message || 'No se pudo cargar el control inteligente de stock.')
        setStockData(INITIAL_STOCK_DATA)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    runInitialLoad()
    window.addEventListener(INVENTORY_CHANGED_EVENT, runInitialLoad)

    return () => {
      isMounted = false
      window.removeEventListener(INVENTORY_CHANGED_EVENT, runInitialLoad)
    }
  }, [])

  const totalProducts = stockData.products.length

  const filteredProducts = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm)

    return stockData.products.filter((product) => {
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter
      const matchesSearch = !normalizedSearchTerm ||
        normalizeSearchText(`${product.name} ${product.code}`).includes(normalizedSearchTerm)
      return matchesStatus && matchesSearch
    })
  }, [searchTerm, statusFilter, stockData.products])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visibleProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, pageSize, safePage])

  useEffect(() => {
    setPage(1)
  }, [pageSize, searchTerm, statusFilter])

  const statusSummary = {
    ...stockData.summary,
    lowStock: stockData.summary.lowStock ?? stockData.products.filter((product) => product.status === 'low').length
  }

  return (
    <div className="fe-page-shell">
      <div className="fe-page-head">
        <div>
          <h1 className="fe-page-title">Control de stock</h1>
        </div>
      </div>

      {isLoading && totalProducts === 0 ? (
        <SummarySkeleton />
      ) : (
        <>
          <SummaryGrid summary={statusSummary} totalProducts={totalProducts} />
          <StockDistribution summary={statusSummary} totalProducts={totalProducts} />
        </>
      )}

      {error && (
        <div className="mt-4">
          <BlockMessage type="error">{error}</BlockMessage>
        </div>
      )}

      {!error && stockData.partialWarning && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          Información parcial: no se pudo cargar {stockData.partialWarning}. Se muestran datos disponibles del inventario.
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(330px,0.78fr)_minmax(0,1.62fr)]">
        <CriticalProductsPanel rows={stockData.criticalProducts} isLoading={isLoading && totalProducts === 0} />
        <StockTable
          rows={visibleProducts}
          totalRows={filteredProducts.length}
          isLoading={isLoading && totalProducts === 0}
          statusFilter={statusFilter}
          searchTerm={searchTerm}
          pageSize={pageSize}
          currentPage={safePage}
          totalPages={totalPages}
          onStatusFilterChange={setStatusFilter}
          onSearchChange={setSearchTerm}
          onPageSizeChange={setPageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}

export default StockControlPage
