import { useMemo, useState } from 'react'

const PAGE_SIZE_OPTIONS = [10, 15, 20, 30]

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeRole = (value = '') => String(value || '').trim().toLowerCase()

const getRoleTone = (roleLabel = '') => {
  const normalizedRole = normalizeRole(roleLabel)

  if (normalizedRole.includes('admin')) return { key: 'admin', badgeClass: 'bg-violet-100 text-violet-700' }
  if (normalizedRole.includes('audit')) return { key: 'auditor', badgeClass: 'bg-fuchsia-100 text-fuchsia-700' }
  if (normalizedRole.includes('auto') || normalizedRole.includes('system') || normalizedRole.includes('sistema')) {
    return { key: 'automatic', badgeClass: 'bg-slate-200 text-slate-700' }
  }
  return { key: 'operator', badgeClass: 'bg-teal-100 text-teal-700' }
}

const getActivityVisuals = (row = {}) => {
  const backendActivityLevel = String(row.activityLevel || '').trim().toLowerCase()

  if (backendActivityLevel === 'alta') {
    return {
      label: 'Alta',
      tone: 'high',
      badgeClass: 'bg-blue-100 text-blue-700'
    }
  }

  if (backendActivityLevel === 'media') {
    return {
      label: 'Media',
      tone: 'medium',
      badgeClass: 'bg-amber-100 text-amber-700'
    }
  }

  if (backendActivityLevel === 'baja') {
    return {
      label: 'Baja',
      tone: 'low',
      badgeClass: 'bg-slate-100 text-slate-700'
    }
  }

  const totalMovements = toNumber(row.totalMovements)

  if (totalMovements >= 20) {
    return {
      label: 'Alta',
      tone: 'high',
      badgeClass: 'bg-blue-100 text-blue-700'
    }
  }

  if (totalMovements >= 8) {
    return {
      label: 'Media',
      tone: 'medium',
      badgeClass: 'bg-amber-100 text-amber-700'
    }
  }

  return {
    label: 'Baja',
    tone: 'low',
    badgeClass: 'bg-slate-100 text-slate-700'
  }
}

const ByUserReportSection = ({ rows = [], isLoading = false, onExport, exportDisabled = false, isExporting = false }) => {
  const [roleFilter, setRoleFilter] = useState('all')
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    if (roleFilter === 'all') return rows

    return rows.filter((row) => getRoleTone(row.roleLabel).key === roleFilter)
  }, [rows, roleFilter])

  const summary = useMemo(() => {
    return rows.reduce((acc, row) => {
      const totalMovements = toNumber(row.totalMovements)
      const entrances = toNumber(row.entrances)
      const exits = toNumber(row.exits)
      const roleKey = getRoleTone(row.roleLabel).key
      const activityTone = getActivityVisuals(row).tone

      acc.users += 1
      acc.movements += totalMovements
      acc.entrances += entrances
      acc.exits += exits
      if (roleKey === 'admin') acc.admins += 1
      if (activityTone === 'high') acc.highActivity += 1
      return acc
    }, { users: 0, movements: 0, entrances: 0, exits: 0, admins: 0, highActivity: 0 })
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
          <p className="text-xs font-bold uppercase tracking-wide text-[#657aa6]">Usuarios visibles</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#1f3561]">{summary.users}</p>
        </article>
        <article className="fe-card border border-[#dbe4f7] bg-[#f7f9ff] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-[#657aa6]">Movimientos consolidados</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#1f3561]">{summary.movements}</p>
        </article>
        <article className="fe-card border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Entradas</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-800">{summary.entrances}</p>
        </article>
        <article className="fe-card border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Salidas</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-red-800">{summary.exits}</p>
        </article>
      </div>

      <div className="fe-card overflow-hidden p-0">
        <div className="border-b border-[#e8edf8] bg-[#f7f9ff] px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[1.2rem] font-bold text-[#1f2e4d]">Reporte por Usuario</h2>
              <p className="mt-1 text-sm text-[#6e7d99]">Resumen de movimientos por usuario y rol.</p>
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
                setRoleFilter('all')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${roleFilter === 'all' ? 'bg-[#e8eefe] text-[#355189]' : 'bg-slate-100 text-slate-700'}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleFilter('admin')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${roleFilter === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}
            >
              Administradores
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleFilter('operator')
                setPage(1)
              }}
              className={`fe-badge-chip h-9 px-4 ${roleFilter === 'operator' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-700'}`}
            >
              Operativos
            </button>
          </div>
        </div>

        <div className="fe-table-wrap">
          <table className="fe-table table-fixed text-sm">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[17%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left">USUARIO</th>
                <th className="text-left">ROL</th>
                <th className="text-left">MOVIMIENTOS</th>
                <th className="text-left">ENTRADAS</th>
                <th className="text-left">SALIDAS</th>
                <th className="text-left">ACTIVIDAD</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" className="p-5 text-center text-gray-400">Cargando reporte por usuario...</td></tr>
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((row, index) => {
                  const activityVisuals = getActivityVisuals(row)
                  const roleVisuals = getRoleTone(row.roleLabel)
                  return (
                    <tr key={`${row.user}-${row.roleLabel}-${index}`}>
                      <td className="truncate font-semibold text-[#23365d]" title={row.user || 'No disponible'}>{row.user || 'No disponible'}</td>
                      <td className="whitespace-nowrap">
                        <span className={`fe-badge-chip ${roleVisuals.badgeClass}`}>
                          {row.roleLabel || 'Sin rol'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-left font-semibold text-[#2f4269]">{toNumber(row.totalMovements)}</td>
                      <td className="whitespace-nowrap text-left font-semibold text-emerald-700">{toNumber(row.entrances)}</td>
                      <td className="whitespace-nowrap text-left font-semibold text-red-700">{toNumber(row.exits)}</td>
                      <td className="whitespace-nowrap text-left">
                        <span className={`fe-badge-chip ${activityVisuals.badgeClass}`}>
                          {activityVisuals.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan="6" className="p-5 text-center text-gray-400">No hay datos por usuario para el filtro seleccionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredRows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#e8edf8] bg-[#fbfcff] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#5f729a]">
              Mostrando {(safePage - 1) * pageSize + 1} a {Math.min(safePage * pageSize, filteredRows.length)} de {filteredRows.length} usuarios
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="by-user-page-size" className="mb-0 text-xs font-semibold text-[#5f729a]">Filas:</label>
              <select
                id="by-user-page-size"
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

export default ByUserReportSection
