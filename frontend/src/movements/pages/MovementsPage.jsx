import { useCallback, useEffect, useMemo, useState } from 'react'
import MovementsTable from '../components/MovementsTable'
import { getMovements, MOVEMENT_TYPES } from '../services/movements.service'
import { getMedicines } from '../../medicines/services/medicines.service'
import { getUsers } from '../../users/services/users.service'
import {
  buildProductsMap,
  buildUsersIndex,
  filterMovementsLocally,
  hasActiveFilters,
  INITIAL_FILTERS
} from '../utils/movementsPage.utils'

const MovementsPage = () => {
  const [filterForm, setFilterForm] = useState(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS)
  const [movements, setMovements] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [contractWarning, setContractWarning] = useState('')
  const [dateWarning, setDateWarning] = useState('')

  const filteredMovements = useMemo(
    () => filterMovementsLocally(movements, appliedFilters),
    [movements, appliedFilters]
  )

  const fallbackUserOptions = useMemo(() => {
    const uniqueOptions = new Map()

    movements.forEach((movement) => {
      const rawValue = String(movement?.userIdentityKey || movement?.user || '').trim()
      const displayUser = String(movement?.user || '').trim()
      const roleLabel = String(movement?.userRoleLabel || 'Sin rol').trim()

      if (!rawValue || !displayUser || displayUser === 'No disponible') return

      uniqueOptions.set(rawValue, {
        value: rawValue,
        label: `${displayUser} (${roleLabel})`
      })
    })

    return Array.from(uniqueOptions.values()).sort((firstOption, secondOption) =>
      firstOption.label.localeCompare(secondOption.label, 'es', { sensitivity: 'base' })
    )
  }, [movements])

  const availableUserOptions = userOptions.length > 0 ? userOptions : fallbackUserOptions

  const loadMovements = useCallback(async (filters) => {
    setIsLoading(true)
    setError('')
    setContractWarning('')
    setDateWarning('')

    try {
      const [medicines, users] = await Promise.all([
        getMedicines().catch(() => []),
        getUsers().catch(() => [])
      ])
      const productsById = buildProductsMap(medicines)
      const { usersByIdentity, usersById, userOptions: nextUserOptions } = buildUsersIndex(users)
      const movementsData = await getMovements({
        filters,
        productsById,
        usersByIdentity,
        usersById
      })
      const parsedMovements = Array.isArray(movementsData) ? movementsData : []
      const missingContractCounters = parsedMovements.reduce(
        (accumulator, movement) => {
          if (!movement?.contract?.hasUserName) accumulator.userName += 1
          if (!movement?.contract?.hasUserRole) accumulator.userRole += 1
          if (!movement?.contract?.hasStatus) accumulator.status += 1
          return accumulator
        },
        { userName: 0, userRole: 0, status: 0 }
      )
      const implicitTimezoneCount = parsedMovements.filter(
        (movement) => movement?.rawDateValue && movement?.hasExplicitTimezone === false
      ).length
      const hasMissingContractFields =
        missingContractCounters.userName > 0 ||
        missingContractCounters.userRole > 0 ||
        missingContractCounters.status > 0

      setUserOptions(nextUserOptions)
      setMovements(parsedMovements)

      if (hasMissingContractFields) {
        setContractWarning(
          `Atención: ${missingContractCounters.userName} movimientos sin userName, ` +
          `${missingContractCounters.userRole} sin userRole y ${missingContractCounters.status} sin status desde backend.`
        )
      }

      if (import.meta.env.DEV && implicitTimezoneCount > 0) {
        setDateWarning(
          `Debug fecha: ${implicitTimezoneCount} movimientos llegan sin zona horaria explícita. ` +
          'Esto puede causar desfases de fecha/hora entre ambientes.'
        )
      }
    } catch (loadError) {
      setMovements([])
      setError(loadError.message || 'No se pudo cargar el historial de movimientos.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMovements(appliedFilters)
  }, [appliedFilters, loadMovements])

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilterForm((currentFilters) => ({
      ...currentFilters,
      [name]: value
    }))
  }

  const handleApplyFilters = (event) => {
    event.preventDefault()

    if (
      filterForm.fromDate &&
      filterForm.toDate &&
      filterForm.fromDate > filterForm.toDate
    ) {
      setError('La fecha inicial no puede ser mayor que la fecha final.')
      return
    }

    setAppliedFilters({
      type: filterForm.type,
      fromDate: filterForm.fromDate,
      toDate: filterForm.toDate,
      user: String(filterForm.user || '').trim()
    })
  }

  const handleClearFilters = () => {
    setError('')
    setFilterForm(INITIAL_FILTERS)
    setAppliedFilters(INITIAL_FILTERS)
  }

  return (
    <div className="fe-page-shell">
      <div className="fe-page-head">
        <div>
          <h1 className="fe-page-title">Historial de Movimientos</h1>
          <p className="fe-section-subtitle">
            Total de movimientos visibles: <span className="font-semibold text-[#24314a]">{filteredMovements.length}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleApplyFilters} className="mb-3 fe-card p-3 md:p-3.5 lg:p-4 2xl:p-5">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="movement-type">Tipo de movimiento</label>
            <select
              id="movement-type"
              name="type"
              value={filterForm.type}
              onChange={handleFilterChange}
              className="fe-input 2xl:h-12 2xl:text-base"
            >
              <option value="">Todos</option>
              <option value={MOVEMENT_TYPES.ENTRANCE}>Entrada</option>
              <option value={MOVEMENT_TYPES.EXIT}>Salida</option>
            </select>
          </div>

          <div>
            <label htmlFor="movement-from-date">Desde</label>
            <input
              id="movement-from-date"
              name="fromDate"
              type="date"
              value={filterForm.fromDate}
              onChange={handleFilterChange}
              className="fe-input 2xl:h-12 2xl:text-base"
            />
          </div>

          <div>
            <label htmlFor="movement-to-date">Hasta</label>
            <input
              id="movement-to-date"
              name="toDate"
              type="date"
              value={filterForm.toDate}
              onChange={handleFilterChange}
              className="fe-input 2xl:h-12 2xl:text-base"
            />
          </div>

          <div>
            <label htmlFor="movement-user">Usuario</label>
            <select
              id="movement-user"
              name="user"
              value={filterForm.user}
              onChange={handleFilterChange}
              className="fe-input 2xl:h-12 2xl:text-base"
            >
              <option value="">Todos</option>
              {availableUserOptions.map((user) => (
                <option key={user.value} value={user.value}>
                  {user.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="submit" className="fe-btn-primary 2xl:h-12 2xl:px-6 2xl:text-base">
            Aplicar filtros
          </button>

          <button type="button" onClick={handleClearFilters} className="fe-btn-muted 2xl:h-12 2xl:px-6 2xl:text-base">
            Limpiar filtros
          </button>

          {hasActiveFilters(appliedFilters) && (
            <p className="hidden text-sm text-[#6b7896] xl:block">
              Mostrando resultados filtrados.
            </p>
          )}
        </div>
      </form>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && contractWarning && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {contractWarning}
        </div>
      )}

      {!error && dateWarning && (
        <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {dateWarning}
        </div>
      )}

      <MovementsTable movements={filteredMovements} isLoading={isLoading} />
    </div>
  )
}

export default MovementsPage
