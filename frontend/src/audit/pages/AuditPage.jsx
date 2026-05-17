import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ErrorBoundary from '../../shared/components/ErrorBoundary'
import { INVENTORY_CHANGED_EVENT } from '../../shared/events/inventory.events'
import {
  createManualAuditCase,
  deleteManualAuditFlag,
  getAuditModuleData,
  recalculateAudit,
  updateAuditCaseNote,
  updateAuditCaseStatus
} from '../services/audit.service'
import {
  exportAuditHistory,
  exportAuditObservations
} from '../utils/auditExport.utils'

const AUDIT_TABS = Object.freeze([
  { key: 'history', label: 'Historial' },
  { key: 'inconsistencies', label: 'Inconsistencias' },
  { key: 'observations', label: 'Observaciones' },
  { key: 'metrics', label: 'Métricas' }
])

const PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 30, 50])

const INITIAL_AUDIT_DATA = Object.freeze({
  history: [],
  inconsistencies: [],
  observations: [],
  metrics: {
    summary: {
      totalMovements: 0,
      marked: 0,
      observations: 0,
      users: 0
    },
    activityByUser: [],
    monthlyTrend: [],
    topMedicines: [],
    casesByUser: [],
    casesByMedicine: [],
    casesByPriority: [],
    casesBySource: [],
    caseMonthlyTrend: [],
    topRiskMedicines: []
  }
})

const toNumber = (value) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

const formatNumber = (value) => new Intl.NumberFormat('es-CO').format(toNumber(value))

const isAuditableMovement = (row = {}) => /entrada|salida|entrance|entry|exit/i.test(row.type)

const includesSearch = (row = {}, searchTerm = '') => {
  const normalizedSearch = searchTerm.trim().toLowerCase()
  if (!normalizedSearch) return true
  return [
    row.id,
    row.date,
    row.type,
    row.medicine,
    row.user,
    row.reason,
    row.status
  ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch))
}

const getMovementSortValue = (row = {}) => {
  if (row.updatedAt) {
    const updatedTime = Date.parse(row.updatedAt)
    if (Number.isFinite(updatedTime)) return updatedTime
  }
  if (row.dateValue instanceof Date && !Number.isNaN(row.dateValue.getTime())) return row.dateValue.getTime()
  const parsedDate = Date.parse(row.date)
  if (Number.isFinite(parsedDate)) return parsedDate
  const parsedId = Number(row.movementId ?? row.id)
  return Number.isFinite(parsedId) ? parsedId : 0
}

const ACTIVE_AUDIT_STATUSES = new Set(['Marcado', 'En revisión'])

const sortAuditPriority = (firstRow = {}, secondRow = {}) => {
  const firstMarked = ACTIVE_AUDIT_STATUSES.has(firstRow.status) || firstRow.reason === 'Marcado' || firstRow.reason === 'Nota auditoría'
  const secondMarked = ACTIVE_AUDIT_STATUSES.has(secondRow.status) || secondRow.reason === 'Marcado' || secondRow.reason === 'Nota auditoría'
  if (firstMarked !== secondMarked) return firstMarked ? -1 : 1
  return getMovementSortValue(secondRow) - getMovementSortValue(firstRow)
}

const StatusBadge = ({ status }) => {
  const normalizedStatus = String(status || '').toLowerCase()
  const isMarked = normalizedStatus.includes('marcado')
  const isReview = normalizedStatus.includes('revisión')
  const isReviewed = normalizedStatus.includes('revisado')
  const isClosed = normalizedStatus.includes('cerrado')
  const className = isMarked
    ? 'bg-red-100 text-red-700'
    : isReview
      ? 'bg-amber-100 text-amber-700'
      : isReviewed
        ? 'bg-blue-100 text-blue-700'
        : isClosed
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-700'
  return (
    <span className={`fe-badge-chip ${className}`}>
      {status || 'Normal'}
    </span>
  )
}

const SourceBadge = ({ source }) => {
  const normalizedSource = String(source || '').toUpperCase()
  if (!normalizedSource || normalizedSource === 'N/D') return null
  const label = normalizedSource === 'MANUAL' ? 'Manual' : 'Automático'
  const className = normalizedSource === 'MANUAL'
    ? 'bg-purple-100 text-purple-700'
    : 'bg-blue-100 text-blue-700'
  return <span className={`fe-badge-chip ${className}`}>{label}</span>
}

const RiskScore = ({ value, source }) => {
  const risk = toNumber(value)
  const isManual = String(source || '').toUpperCase() === 'MANUAL'
  if (isManual) return <span className="text-xs font-semibold text-purple-700">Revisión manual</span>
  if (!risk) return <span className="text-xs font-semibold text-[#8a98b4]">Sin alerta</span>
  const className = risk >= 80
    ? 'text-red-700'
    : risk >= 50
      ? 'text-amber-700'
      : 'text-blue-700'
  return <span className={`text-xs font-extrabold ${className}`}>Patrón inusual</span>
}

const TypeBadge = ({ type }) => {
  const isEntry = /entrada/i.test(type)
  const isExit = /salida/i.test(type)
  const className = isEntry
    ? 'bg-emerald-100 text-emerald-700'
    : isExit
      ? 'bg-red-100 text-red-700'
      : 'bg-blue-100 text-blue-700'

  return <span className={`fe-badge-chip ${className}`}>{type || 'Otro'}</span>
}

const BlockMessage = ({ children }) => (
  <div className="rounded-lg border border-dashed border-[#d8e0ef] bg-[#fbfcff] px-4 py-5 text-center text-sm font-semibold text-[#7181a2]">
    {children}
  </div>
)

const movementLabel = (row = {}) => `Mov. ${row.movementId ?? row.id ?? '---'}`

const paginateRows = (rows = [], currentPage = 1, pageSize = 10) => {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(Math.max(1, currentPage), totalPages)
  const start = (page - 1) * pageSize
  return {
    page,
    totalPages,
    rows: rows.slice(start, start + pageSize)
  }
}

const PaginationControls = ({ totalItems, currentPage, pageSize, onPageChange, onPageSizeChange }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const page = Math.min(Math.max(1, currentPage), totalPages)

  return (
    <div className="flex flex-col gap-3 border-t border-[#eef2f8] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="font-semibold text-[#7181a2]">
        Mostrando {totalItems === 0 ? 0 : ((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalItems)} de {formatNumber(totalItems)}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <label className="m-0 text-xs font-extrabold uppercase text-[#7b89a6]" htmlFor="audit-page-size">Filas</label>
        <select
          id="audit-page-size"
          value={pageSize}
          onChange={(event) => {
            onPageSizeChange(Number(event.target.value))
            onPageChange(1)
          }}
          className="h-9 rounded-md border border-[#dbe3f1] bg-white px-2 text-sm font-semibold text-[#33476d]"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-9 rounded-md border border-[#dbe3f1] bg-white px-3 text-sm font-semibold text-[#52658b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="rounded-md bg-[#f3f6fb] px-3 py-2 text-sm font-extrabold text-[#52658b]">
          {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-9 rounded-md border border-[#dbe3f1] bg-white px-3 text-sm font-semibold text-[#52658b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}

const AuditActionButtons = ({ row, onToggleMark, onViewNote }) => {
  const isActiveCase = ACTIVE_AUDIT_STATUSES.has(row.status)
  const isClosedCase = ['Revisado', 'Cerrado'].includes(row.status)
  const hasCase = row.status !== 'Normal'

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={() => onToggleMark(row)}
        disabled={isClosedCase}
        className={`h-8 whitespace-nowrap rounded-md px-3 text-xs font-extrabold ${
          isActiveCase
            ? 'bg-amber-100 text-amber-700'
            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isActiveCase ? 'Quitar' : 'Marcar'}
      </button>
      {hasCase && (
        <button
          type="button"
          onClick={() => onViewNote(row)}
          className="h-8 whitespace-nowrap rounded-md bg-purple-50 px-3 text-xs font-extrabold text-purple-700 hover:bg-purple-100"
        >
          Ver nota
        </button>
      )}
    </div>
  )
}

const AuditSummary = ({ summary = INITIAL_AUDIT_DATA.metrics.summary }) => (
  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[
      ['Movimientos', summary.totalMovements, 'text-[#0f766e]'],
      ['Marcados', summary.marked, 'text-[#b42318]'],
      ['Observaciones', summary.observations, 'text-[#6d3ff1]'],
      ['Usuarios', summary.users, 'text-[#2454a6]']
    ].map(([label, value, className]) => (
      <article key={label} className="rounded-lg border border-[#e7edf7] bg-white px-4 py-3">
        <p className={`text-2xl font-extrabold tabular-nums ${className}`}>{formatNumber(value)}</p>
        <p className="mt-1 text-xs font-extrabold uppercase tracking-normal text-[#7b89a6]">{label}</p>
      </article>
    ))}
  </section>
)

const CaseActionMenu = ({ row, updatingCaseId, onOpenCaseNote }) => {
  const buttonRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const isUpdating = updatingCaseId === row.caseId
  const actions = [
    {
      key: 'IN_REVIEW',
      label: row.status === 'En revisión' ? 'Revisión iniciada' : 'Iniciar revisión',
      disabled: row.status === 'En revisión' || row.status === 'Cerrado',
      className: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
      title: 'Iniciar revisión'
    },
    {
      key: 'REVIEWED',
      label: 'Revisado',
      disabled: row.status === 'Revisado' || row.status === 'Cerrado',
      className: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
      title: 'Marcar revisado'
    },
    {
      key: 'CLOSED',
      label: 'Cerrar',
      disabled: row.status === 'Cerrado',
      className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      title: 'Cerrar caso'
    },
    {
      key: 'NOTE',
      label: 'Nota',
      disabled: false,
      className: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
      title: 'Editar nota'
    }
  ]

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const menuWidth = 184
    const left = Math.min(
      Math.max(12, rect.right - menuWidth),
      window.innerWidth - menuWidth - 12
    )
    setMenuPosition({
      top: rect.bottom + 6,
      left
    })
    setIsOpen((currentValue) => !currentValue)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    const closeMenu = (event) => {
      if (buttonRef.current?.contains(event.target)) return
      setIsOpen(false)
    }
    window.addEventListener('click', closeMenu)
    window.addEventListener('scroll', closeMenu, true)
    window.addEventListener('resize', closeMenu)
    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
      window.removeEventListener('resize', closeMenu)
    }
  }, [isOpen])

  const menu = isOpen ? createPortal(
    <div
      className="fixed z-[70] rounded-lg border border-[#e5ebf5] bg-white p-2 shadow-xl"
      style={{ top: menuPosition.top, left: menuPosition.left, width: 184 }}
    >
      <div className="space-y-1">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            title={action.title}
            onClick={() => {
              if (action.disabled) return
              setIsOpen(false)
              onOpenCaseNote(row, action.key)
            }}
            disabled={action.disabled}
            className={`h-8 w-full rounded-md px-3 text-left text-xs font-extrabold ${action.className} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        onClick={openMenu}
        disabled={isUpdating}
        className="h-9 w-32 rounded-md border border-[#dbe3f1] bg-white px-3 text-center text-xs font-extrabold text-[#52658b] hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        Acción
      </button>
      {menu}
    </div>
  )
}

const HistoryTab = ({ rows = [], isLoading = false, onToggleMark, onViewNote }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const filteredRows = useMemo(
    () => rows.filter((row) => includesSearch(row, searchTerm)),
    [rows, searchTerm]
  )
  const paginated = paginateRows(filteredRows, currentPage, pageSize)

  return (
    <section className="overflow-hidden rounded-lg border border-[#e5ebf5] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#e8edf8] bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="fe-input md:max-w-sm"
          placeholder="Buscar en movimientos..."
        />
        <button
          type="button"
          onClick={() => exportAuditHistory(filteredRows)}
          className="fe-btn-primary h-10 px-4 text-sm"
          disabled={filteredRows.length === 0}
        >
          Exportar
        </button>
      </div>

      <div className="fe-table-wrap">
        <table className="fe-table w-full text-sm">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[8%]" />
            <col className="w-[15%]" />
            <col className="w-[17%]" />
            <col className="w-[9%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">MOVIMIENTO</th>
              <th className="text-left">MEDICAMENTO</th>
              <th className="text-left">CANTIDAD</th>
              <th className="text-left">RESPONSABLE</th>
              <th className="text-left">MOTIVO</th>
              <th className="text-left">ESTADO</th>
              <th className="text-right">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" className="p-5 text-center text-gray-400">Cargando historial de auditoría...</td></tr>
            ) : filteredRows.length > 0 ? (
              paginated.rows.map((row) => (
                <tr key={row.id} className={`transition hover:bg-[#f8faff] ${ACTIVE_AUDIT_STATUSES.has(row.status) ? 'bg-red-50/40' : ''}`}>
                  <td>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-[#33476d]">{movementLabel(row)}</span>
                        <TypeBadge type={row.type} />
                        <SourceBadge source={row.auditSource} />
                      </div>
                      <span className="whitespace-nowrap text-xs font-semibold text-[#7181a2]">{row.date}</span>
                    </div>
                  </td>
                  <td className="truncate font-semibold text-[#23365d]" title={row.medicine}>{row.medicine}</td>
                  <td className="font-extrabold tabular-nums text-[#263b63]">{formatNumber(row.absoluteQuantity)}</td>
                  <td className="truncate text-[#33476d]" title={row.user}>{row.user}</td>
                  <td className="truncate text-[#33476d]" title={row.reason}>{row.reason}</td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={row.status} />
                      <RiskScore value={row.riskScore} source={row.auditSource} />
                    </div>
                  </td>
                  <td>
                    <AuditActionButtons row={row} onToggleMark={onToggleMark} onViewNote={onViewNote} />
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="p-5"><BlockMessage>No hay entradas o salidas para los filtros aplicados.</BlockMessage></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        totalItems={filteredRows.length}
        currentPage={paginated.page}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  )
}

const InconsistenciesTab = ({ rows = [], isLoading = false, onOpenCaseNote, updatingCaseId = null }) => {
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesStatus = statusFilter === 'all' || row.status === statusFilter
    const matchesSource = sourceFilter === 'all' || row.source === sourceFilter
    const matchesPriority = priorityFilter === 'all' || row.priority === priorityFilter
    return matchesStatus && matchesSource && matchesPriority
  }), [priorityFilter, rows, sourceFilter, statusFilter])
  const paginated = paginateRows(filteredRows, currentPage, pageSize)

  return (
    <section className="overflow-hidden rounded-lg border border-amber-200 bg-white">
      <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-extrabold text-amber-800">Casos de revisión</h2>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-extrabold text-amber-700">Casos pendientes de seguimiento</span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="fe-input h-10 text-sm">
            <option value="all">Todos los estados</option>
            <option value="Marcado">Marcado</option>
            <option value="En revisión">En revisión</option>
            <option value="Revisado">Revisado</option>
            <option value="Cerrado">Cerrado</option>
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="fe-input h-10 text-sm">
            <option value="all">Todos los orígenes</option>
            <option value="AUTO">Automático</option>
            <option value="MANUAL">Manual</option>
          </select>
          <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="fe-input h-10 text-sm">
            <option value="all">Todas las prioridades</option>
            <option value="Alta prioridad">Alta prioridad</option>
            <option value="Media prioridad">Media prioridad</option>
            <option value="Baja prioridad">Baja prioridad</option>
          </select>
        </div>
      </div>

      <div className="fe-table-wrap">
        <table className="fe-table w-full text-sm">
          <colgroup>
            <col className="w-[21%]" />
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[21%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left">MOVIMIENTO</th>
              <th className="text-left">MEDICAMENTO</th>
              <th className="text-left">CANTIDAD</th>
              <th className="text-left">USUARIO</th>
              <th className="text-left">ORIGEN</th>
              <th className="text-right">SEGUIMIENTO</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" className="p-5 text-center text-gray-400">Cargando inconsistencias...</td></tr>
            ) : filteredRows.length > 0 ? (
              paginated.rows.map((row) => (
                <tr key={`${row.id}-${row.reason}`} className="bg-amber-50/25 transition hover:bg-amber-50/60">
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-[#8a6116]">{movementLabel(row)}</span>
                      <TypeBadge type={row.type} />
                      <SourceBadge source={row.source} />
                    </div>
                  </td>
                  <td className="truncate font-semibold text-[#23365d]" title={row.medicine}>{row.medicine}</td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold tabular-nums text-amber-700">{formatNumber(row.quantity)}</span>
                      <RiskScore value={row.riskScore} source={row.source} />
                    </div>
                  </td>
                  <td className="truncate text-[#33476d]" title={row.user}>{row.user}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceBadge source={row.source} />
                      <span className="fe-badge-chip bg-white text-[#7b89a6]">{row.priority}</span>
                      <StatusBadge status={row.status} />
                    </div>
                  </td>
                  <td>
                    <CaseActionMenu row={row} updatingCaseId={updatingCaseId} onOpenCaseNote={onOpenCaseNote} />
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="p-5"><BlockMessage>No se detectaron inconsistencias para los filtros aplicados.</BlockMessage></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        totalItems={filteredRows.length}
        currentPage={paginated.page}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  )
}

const NoteModal = ({
  movement,
  initialNote = '',
  initialPriority = 'Media prioridad',
  mode = 'mark',
  readOnly = false,
  onClose,
  onSave
}) => {
  const [note, setNote] = useState(initialNote)
  const [priority, setPriority] = useState(initialPriority)

  if (!movement) return null

  const titleByMode = {
    mark: 'Marcar movimiento',
    IN_REVIEW: 'Iniciar revisión',
    REVIEWED: 'Marcar como revisado',
    CLOSED: 'Cerrar caso',
    NOTE: 'Nota del caso',
    view: 'Nota del caso'
  }

  const hintByMode = {
    mark: 'Explica por qué este movimiento debe quedar marcado para auditoría.',
    IN_REVIEW: 'Indica qué se va a revisar y qué validación queda pendiente.',
    REVIEWED: 'Registra qué se revisó y por qué el caso queda revisado.',
    CLOSED: 'Registra por qué se cierra el caso y cuál fue la conclusión.',
    NOTE: 'Actualiza la nota principal del caso.',
    view: 'Consulta de solo lectura desde historial.'
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-6">
      <section className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-[#17233d]">{titleByMode[mode] || 'Nota de auditoría'}</h2>
          <p className="mt-1 text-sm font-medium text-[#657391]">
            {movementLabel(movement)} · {movement.type} de {formatNumber(movement.absoluteQuantity || movement.quantity)} uds · {movement.medicine}
          </p>
          <p className="mt-2 text-xs font-semibold text-[#7b89a6]">
            {hintByMode[mode] || hintByMode.mark}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="audit-note-priority">Prioridad</label>
            <select
              id="audit-note-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="fe-input"
              disabled={readOnly}
            >
              <option value="Alta prioridad">Alta prioridad</option>
              <option value="Media prioridad">Media prioridad</option>
              <option value="Baja prioridad">Baja prioridad</option>
            </select>
          </div>
          <div>
            <label htmlFor="audit-note-description">Descripción</label>
            <textarea
              id="audit-note-description"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="fe-input min-h-28 resize-y"
              placeholder="Describe por qué este movimiento debe revisarse..."
              readOnly={readOnly}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="fe-btn-muted">
            Cancelar
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onSave({ note, priority })}
              className="fe-btn-primary"
              disabled={!note.trim()}
            >
              Guardar nota
            </button>
          )}
        </div>
      </section>
    </div>
  )

  if (typeof document === 'undefined') return modalContent
  return createPortal(modalContent, document.body)
}

const ObservationsTab = ({ rows = [], isLoading = false }) => {
  const [statusFilter, setStatusFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredRows = useMemo(() => rows.filter((row) => {
    const status = row.movement?.status || ''
    const date = row.movement?.date || ''
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    const matchesFrom = !fromDate || date >= fromDate
    const matchesTo = !toDate || date <= toDate
    const search = searchTerm.trim().toLowerCase()
    const matchesSearch = !search || [
      row.description,
      row.user,
      row.createdBy,
      row.movement?.medicine,
      row.movement?.reason
    ].some((value) => String(value ?? '').toLowerCase().includes(search))
    return matchesStatus && matchesFrom && matchesTo && matchesSearch
  }), [fromDate, rows, searchTerm, statusFilter, toDate])
  const paginated = paginateRows(filteredRows, currentPage, pageSize)

  return (
    <section className="fe-card p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-base font-extrabold text-[#0c1830]">Observaciones registradas</h2>
        <button
          type="button"
          onClick={() => exportAuditObservations(filteredRows)}
          className="fe-btn-primary h-10 px-4 text-sm"
          disabled={filteredRows.length === 0}
        >
          Exportar filtradas
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="fe-input h-10 text-sm"
          placeholder="Buscar observación..."
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="fe-input h-10 text-sm">
          <option value="all">Todos los estados</option>
          <option value="Marcado">Marcados</option>
          <option value="En revisión">En revisión</option>
          <option value="Revisado">Revisados</option>
          <option value="Cerrado">Cerrados</option>
        </select>
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="fe-input h-10 text-sm" />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="fe-input h-10 text-sm" />
      </div>

      {isLoading ? (
        <BlockMessage>Cargando observaciones...</BlockMessage>
      ) : filteredRows.length > 0 ? (
        <div className="space-y-3">
          {paginated.rows.map((row) => (
          <article key={`${row.id}-${row.description}`} className="rounded-lg border border-amber-200 bg-white px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="fe-badge-chip bg-amber-100 text-amber-700">{row.priority}</span>
              <span className="text-xs font-bold text-[#8a98b4]">Mov: {row.movementId}</span>
              {row.movement?.type && <TypeBadge type={row.movement.type} />}
              {row.movement?.status && <StatusBadge status={row.movement.status} />}
            </div>
            {row.movement && (
              <div className="mb-2 grid grid-cols-1 gap-2 text-xs font-semibold text-[#52658b] md:grid-cols-4">
                <span className="truncate" title={row.movement.medicine}>Medicamento: {row.movement.medicine}</span>
                <span>Cantidad: {formatNumber(row.movement.absoluteQuantity)} uds</span>
                <span className="truncate" title={row.movement.reason}>Motivo: {row.movement.reason}</span>
                <span>Fecha: {row.movement.date}</span>
              </div>
            )}
            <p className="text-sm font-semibold text-[#1f2e4d]">{row.description}</p>
            <p className="mt-2 text-xs font-semibold text-[#74839e]">
              Usuario relacionado: {row.user}
              {row.createdBy ? ` · Registrada por ${row.createdBy}` : ''}
            </p>
          </article>
          ))}
        </div>
      ) : (
        <BlockMessage>No hay observaciones para los filtros aplicados.</BlockMessage>
      )}
      <PaginationControls
        totalItems={filteredRows.length}
        currentPage={paginated.page}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  )
}

const Bar = ({ value, max, className = 'bg-[#7c3aed]' }) => {
  const width = max > 0 ? Math.max(6, Math.round((toNumber(value) / max) * 100)) : 0
  return (
    <div className="h-2.5 rounded-full bg-white/70">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${width}%` }} />
    </div>
  )
}

const MetricsTab = ({ metrics = INITIAL_AUDIT_DATA.metrics, isLoading = false }) => {
  const summary = metrics.summary || INITIAL_AUDIT_DATA.metrics.summary
  const activityByUser = Array.isArray(metrics.activityByUser) ? metrics.activityByUser : []
  const monthlyTrend = Array.isArray(metrics.monthlyTrend) ? metrics.monthlyTrend : []
  const topMedicines = Array.isArray(metrics.topMedicines) ? metrics.topMedicines : []
  const casesByMedicine = Array.isArray(metrics.casesByMedicine) ? metrics.casesByMedicine : []
  const maxUserMovements = Math.max(...activityByUser.map((row) => toNumber(row.movements)), 0)
  const maxMedicineUnits = Math.max(...topMedicines.map((row) => toNumber(row.units)), 0)
  const maxMonth = Math.max(...monthlyTrend.map((row) => toNumber(row.entries) + toNumber(row.exits)), 0)
  const maxCasesByMedicine = Math.max(...casesByMedicine.map((row) => toNumber(row.cases)), 0)

  if (isLoading) return <section className="fe-card p-4"><BlockMessage>Cargando métricas...</BlockMessage></section>

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article className="rounded-xl border border-[#e7edf7] bg-white p-4 xl:col-span-2">
        <h2 className="text-base font-extrabold text-[#17233d]">Resumen de revisión</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            ['Movimientos', summary.totalMovements, 'text-[#0f766e]', 'bg-emerald-50'],
            ['Pendientes', toNumber(summary.openCases) + toNumber(summary.inReviewCases), 'text-amber-700', 'bg-amber-50'],
            ['Revisados', summary.reviewedCases, 'text-blue-700', 'bg-blue-50'],
            ['Cerrados', summary.closedCases, 'text-emerald-700', 'bg-emerald-50'],
            ['Automáticos', summary.automaticCases, 'text-[#2454a6]', 'bg-blue-50'],
            ['Manuales', summary.manualCases, 'text-[#6d3ff1]', 'bg-purple-50']
          ].map(([label, value, textClass, bgClass]) => (
            <div key={label} className={`rounded-lg px-4 py-4 ${bgClass}`}>
              <p className={`text-2xl font-extrabold tabular-nums ${textClass}`}>{formatNumber(value)}</p>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-normal text-[#647397]">{label}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-xl bg-purple-50 p-4">
        <h2 className="text-base font-extrabold text-purple-800">Actividad por usuario</h2>
        <div className="mt-4 space-y-4">
          {activityByUser.length > 0 ? activityByUser.map((row) => (
            <div key={row.user}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[#22365d]">{row.user}</span>
                <span className="text-xs font-semibold text-[#647397]">{formatNumber(row.movements)} mov · {formatNumber(row.units)} uds</span>
              </div>
              <Bar value={row.movements} max={maxUserMovements} className="bg-purple-500" />
            </div>
          )) : <BlockMessage>No hay actividad por usuario.</BlockMessage>}
        </div>
      </article>

      <article className="rounded-xl bg-blue-50 p-4">
        <h2 className="text-base font-extrabold text-blue-800">Tendencia mensual</h2>
        <div className="mt-4 flex h-40 items-end gap-4">
          {monthlyTrend.length > 0 ? monthlyTrend.map((row) => {
            const total = toNumber(row.entries) + toNumber(row.exits)
            const height = maxMonth > 0 ? Math.max(12, Math.round((total / maxMonth) * 128)) : 0
            return (
              <div key={row.month} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div className="w-full rounded-t-lg bg-blue-500" style={{ height: `${height}px` }} title={`${formatNumber(total)} movimientos`} />
                <span className="text-xs font-semibold text-[#647397]">{row.month}</span>
              </div>
            )
          }) : <BlockMessage>No hay tendencia mensual.</BlockMessage>}
        </div>
      </article>

      <article className="rounded-xl bg-amber-50 p-4">
        <h2 className="text-base font-extrabold text-amber-800">Medicamentos más movidos</h2>
        <div className="mt-4 space-y-3">
          {topMedicines.length > 0 ? topMedicines.map((row, index) => (
            <div key={row.medicine}>
              <div className="mb-1.5 flex items-center gap-3 text-sm">
                <span className="w-5 text-xs font-bold text-[#8a98b4]">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-[#22365d]" title={row.medicine}>{row.medicine}</span>
                <span className="text-xs font-semibold text-amber-700">{formatNumber(row.units)} uds</span>
              </div>
              <Bar value={row.units} max={maxMedicineUnits} className="bg-amber-500" />
            </div>
          )) : <BlockMessage>No hay medicamentos movidos.</BlockMessage>}
        </div>
      </article>

      <article className="rounded-xl bg-rose-50 p-4">
        <h2 className="text-base font-extrabold text-rose-800">Medicamentos a revisar</h2>
        <div className="mt-4 space-y-3">
          {casesByMedicine.length > 0 ? casesByMedicine.slice(0, 6).map((row) => (
            <div key={row.medicine}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-[#22365d]" title={row.medicine}>{row.medicine}</span>
                <span className="text-xs font-semibold text-rose-700">{formatNumber(row.cases)} casos</span>
              </div>
              <Bar value={row.cases} max={maxCasesByMedicine} className="bg-rose-500" />
            </div>
          )) : <BlockMessage>No hay medicamentos con casos.</BlockMessage>}
        </div>
      </article>
    </section>
  )
}

const AuditPage = () => {
  const [activeTab, setActiveTab] = useState('history')
  const [auditData, setAuditData] = useState(INITIAL_AUDIT_DATA)
  const [noteMovement, setNoteMovement] = useState(null)
  const [noteMode, setNoteMode] = useState('mark')
  const [isNoteReadOnly, setIsNoteReadOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [updatingCaseId, setUpdatingCaseId] = useState(null)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const historyRows = useMemo(() => (
    auditData.history
      .filter(isAuditableMovement)
      .sort(sortAuditPriority)
  ), [auditData.history])

  const inconsistencyRows = useMemo(
    () => [...auditData.inconsistencies].sort(sortAuditPriority),
    [auditData.inconsistencies]
  )

  const historyByMovementId = useMemo(() => {
    const rowsByMovement = new Map()
    auditData.history.forEach((row) => {
      rowsByMovement.set(String(row.movementId), row)
    })
    return rowsByMovement
  }, [auditData.history])

  const observationRows = useMemo(
    () => {
      const rowsByMovement = new Map()

      auditData.observations.forEach((row) => {
        const movement = historyByMovementId.get(String(row.movementId)) || null
        const normalizedRow = { ...row, movement }
        const groupKey = String(row.movementId || row.auditCaseId || row.caseId || row.id)
        const currentRow = rowsByMovement.get(groupKey)

        if (!currentRow) {
          rowsByMovement.set(groupKey, normalizedRow)
          return
        }

        const currentTime = Date.parse(currentRow.createdAt || '')
        const nextTime = Date.parse(normalizedRow.createdAt || '')
        const shouldReplace =
          (Number.isFinite(nextTime) && Number.isFinite(currentTime) && nextTime > currentTime) ||
          (Number.isFinite(nextTime) && !Number.isFinite(currentTime))

        if (shouldReplace) {
          rowsByMovement.set(groupKey, normalizedRow)
        }
      })

      return [...rowsByMovement.values()].sort((firstRow, secondRow) => {
        const firstTime = Date.parse(firstRow.createdAt || '')
        const secondTime = Date.parse(secondRow.createdAt || '')
        if (Number.isFinite(firstTime) && Number.isFinite(secondTime) && firstTime !== secondTime) {
          return secondTime - firstTime
        }
        return sortAuditPriority(firstRow, secondRow)
      })
    },
    [auditData.observations, historyByMovementId]
  )

  const metrics = useMemo(() => ({
    ...auditData.metrics,
    summary: {
      ...(auditData.metrics?.summary || {}),
      totalMovements: historyRows.length,
      marked: inconsistencyRows.length,
      observations: observationRows.length
    }
  }), [auditData.metrics, historyRows.length, inconsistencyRows.length, observationRows.length])

  const loadAuditData = useCallback(async ({ recalculateFirst = false } = {}) => {
    setIsLoading(true)
    setError('')

    try {
      if (recalculateFirst) {
        setIsRecalculating(true)
        await recalculateAudit()
      }
      const data = await getAuditModuleData()
      setAuditData(data)
    } catch (loadError) {
      setAuditData(INITIAL_AUDIT_DATA)
      setError(loadError?.message || 'No se pudo cargar el módulo de auditoría.')
    } finally {
      setIsLoading(false)
      setIsRecalculating(false)
    }
  }, [])

  const handleToggleMark = async (movement) => {
    if (!ACTIVE_AUDIT_STATUSES.has(movement.status)) {
      setNoteMode('mark')
      setIsNoteReadOnly(false)
      setNoteMovement(movement)
      return
    }

    if (movement.auditSource !== 'MANUAL') {
      setError('Las marcas automáticas no se eliminan desde el historial. Puedes agregar o editar la nota de revisión.')
      return
    }

    const caseId = movement.caseId || movement.id
    if (!caseId) return

    try {
      await deleteManualAuditFlag(caseId)
      setActionMessage('Marca manual retirada correctamente.')
      await loadAuditData({ recalculateFirst: true })
    } catch (deleteError) {
      setError(deleteError?.message || 'No se pudo quitar la marca manual.')
    }
  }

  const openCaseNote = (row, mode = 'NOTE') => {
    setNoteMode(mode)
    setIsNoteReadOnly(false)
    const movement = historyByMovementId.get(String(row.movementId)) || row
    setNoteMovement({
      ...movement,
      ...row,
      absoluteQuantity: movement.absoluteQuantity ?? row.quantity,
      auditNote: movement.auditNote || row.auditNote || '',
      auditPriority: movement.auditPriority || row.priority || 'Media prioridad'
    })
  }

  const openReadOnlyNote = (row) => {
    setNoteMode('view')
    setIsNoteReadOnly(true)
    setNoteMovement(row)
  }

  const handleUpdateCaseStatus = async (row, status, note, priority) => {
    const caseId = row.caseId || row.id
    if (!caseId) return

    setUpdatingCaseId(caseId)
    setError('')
    setActionMessage('')

    try {
      if (note?.trim()) {
        await updateAuditCaseNote({ caseId, note: note.trim(), priority })
      }
      await updateAuditCaseStatus({ caseId, status })
      setActionMessage('Estado del caso actualizado correctamente.')
      setNoteMovement(null)
      await loadAuditData({ recalculateFirst: true })
    } catch (statusError) {
      setError(statusError?.message || 'No se pudo actualizar el estado del caso.')
    } finally {
      setUpdatingCaseId(null)
    }
  }

  const handleSaveNote = async ({ note, priority }) => {
    if (!noteMovement) return

    try {
      const caseId = noteMovement.caseId || (ACTIVE_AUDIT_STATUSES.has(noteMovement.status) ? noteMovement.id : null)
      if (noteMode !== 'mark' && caseId) {
        if (noteMode === 'NOTE') {
          await updateAuditCaseNote({ caseId, note: note.trim(), priority })
        } else {
          await handleUpdateCaseStatus(noteMovement, noteMode, note.trim(), priority)
          return
        }
      } else if (caseId && ACTIVE_AUDIT_STATUSES.has(noteMovement.status)) {
        await updateAuditCaseNote({ caseId, note: note.trim(), priority })
      } else {
        await createManualAuditCase({ movementId: noteMovement.movementId || noteMovement.id, note: note.trim(), priority })
      }
      setActionMessage('Nota de auditoría guardada correctamente.')
      setNoteMovement(null)
      setActiveTab('observations')
      await loadAuditData({ recalculateFirst: true })
    } catch (saveError) {
      setError(saveError?.message || 'No se pudo guardar la nota de auditoría.')
    }
  }

  useEffect(() => {
    let isMounted = true

    const safeLoadAuditData = async () => {
      if (isMounted) await loadAuditData({ recalculateFirst: true })
    }

    safeLoadAuditData()
    window.addEventListener(INVENTORY_CHANGED_EVENT, safeLoadAuditData)

    return () => {
      isMounted = false
      window.removeEventListener(INVENTORY_CHANGED_EVENT, safeLoadAuditData)
    }
  }, [loadAuditData])

  useEffect(() => {
    if (!error && !actionMessage) return undefined
    const timer = window.setTimeout(() => {
      setError('')
      setActionMessage('')
    }, 4200)
    return () => window.clearTimeout(timer)
  }, [actionMessage, error])

  return (
    <ErrorBoundary title="No se pudo renderizar Auditoría" message="La vista de auditoría encontró un problema inesperado.">
      <div className="fe-page-shell">
        <div className="fe-page-head">
          <div>
            <h1 className="fe-page-title">Módulo de Auditoría</h1>
          </div>
          {isRecalculating && (
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-extrabold text-[#6d3ff1]">
              Sincronizando auditoría...
            </span>
          )}
        </div>

        <AuditSummary summary={metrics.summary} />

        <div className="my-4 flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-[#e7edf7] bg-white p-1">
          {AUDIT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`h-9 rounded-md px-4 text-sm font-extrabold transition ${
                activeTab === tab.key
                  ? 'bg-[#7c3aed] text-white shadow-sm'
                  : 'text-[#52658b] hover:bg-[#f4f0ff] hover:text-[#6d3ff1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="fixed right-5 top-5 z-50 max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-lg">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="fixed right-5 top-5 z-50 max-w-md rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg">
            {actionMessage}
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryTab
            rows={historyRows}
            isLoading={isLoading}
            onToggleMark={handleToggleMark}
            onViewNote={openReadOnlyNote}
          />
        )}
        {activeTab === 'inconsistencies' && (
          <InconsistenciesTab
            rows={inconsistencyRows}
            isLoading={isLoading}
            onOpenCaseNote={openCaseNote}
            updatingCaseId={updatingCaseId}
          />
        )}
        {activeTab === 'observations' && <ObservationsTab rows={observationRows} isLoading={isLoading} />}
        {activeTab === 'metrics' && <MetricsTab metrics={metrics} isLoading={isLoading} />}
        <NoteModal
          key={noteMovement ? `${noteMovement.movementId || noteMovement.id}-${noteMovement.caseId || 'new'}` : 'empty-note'}
          movement={noteMovement}
          initialNote={noteMovement?.auditNote || ''}
          initialPriority={noteMovement?.auditPriority || noteMovement?.priority || 'Media prioridad'}
          mode={noteMode}
          readOnly={isNoteReadOnly}
          onClose={() => {
            setNoteMovement(null)
            setIsNoteReadOnly(false)
          }}
          onSave={handleSaveNote}
        />
      </div>
    </ErrorBoundary>
  )
}

export default AuditPage
