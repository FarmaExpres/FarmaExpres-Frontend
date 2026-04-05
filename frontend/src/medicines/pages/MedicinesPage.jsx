import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MedicinesTable from '../components/MedicinesTable'
import DeactivateMedicineModal from '../components/DeactivateMedicineModal'
import { deactivateMedicine } from '../services/medicines.service'
import { canManageMedicines } from '../../shared/constants/roles'

const MEDICINES_SEARCH_STORAGE_KEY = 'medicines:search-term'
const MEDICINES_SORT_STORAGE_KEY = 'medicines:sort-by'
const MEDICINES_RETURN_CONTEXT_STORAGE_KEY = 'medicines:return-context'

const readStoredValue = (key, fallback) => {
  try {
    const value = sessionStorage.getItem(key)
    return value ?? fallback
  } catch {
    return fallback
  }
}

const readStoredReturnContext = () => {
  try {
    const raw = sessionStorage.getItem(MEDICINES_RETURN_CONTEXT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const storeReturnContext = (context) => {
  try {
    sessionStorage.setItem(MEDICINES_RETURN_CONTEXT_STORAGE_KEY, JSON.stringify(context))
  } catch {
    // no-op
  }
}

const clearStoredReturnContext = () => {
  try {
    sessionStorage.removeItem(MEDICINES_RETURN_CONTEXT_STORAGE_KEY)
  } catch {
    // no-op
  }
}

const MedicinesPage = ({ role }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isReadOnly = !canManageMedicines(role)
  const [medicineToDeactivate, setMedicineToDeactivate] = useState(null)
  const [openDeactivateModal, setOpenDeactivateModal] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [searchTerm, setSearchTerm] = useState(() => readStoredValue(MEDICINES_SEARCH_STORAGE_KEY, ''))
  const [sortBy, setSortBy] = useState(() => readStoredValue(MEDICINES_SORT_STORAGE_KEY, 'code'))
  const [reloadKey, setReloadKey] = useState(0)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const feedbackFromNavigation = location.state?.feedback
    const restoreContext = location.state?.restoreContext || readStoredReturnContext()

    if (feedbackFromNavigation) {
      setFeedback(feedbackFromNavigation)
    }

    if (restoreContext) {
      setSearchTerm(String(restoreContext.searchTerm || ''))
      setSortBy(String(restoreContext.sortBy || 'code'))

      const scrollY = Number(restoreContext.scrollY)
      if (Number.isFinite(scrollY) && scrollY >= 0) {
        window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'auto' }))
      }
      clearStoredReturnContext()
    }

    if (feedbackFromNavigation || restoreContext) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    try {
      sessionStorage.setItem(MEDICINES_SEARCH_STORAGE_KEY, searchTerm)
    } catch {
      // no-op: storage could be unavailable in some contexts
    }
  }, [searchTerm])

  useEffect(() => {
    try {
      sessionStorage.setItem(MEDICINES_SORT_STORAGE_KEY, sortBy)
    } catch {
      // no-op: storage could be unavailable in some contexts
    }
  }, [sortBy])

  useEffect(() => {
    if (!feedback) return undefined

    const timeoutId = setTimeout(() => {
      setFeedback(null)
    }, 3500)

    return () => clearTimeout(timeoutId)
  }, [feedback])

  const handleOpenCreate = () => {
    if (isReadOnly) return

    const returnContext = {
      searchTerm,
      sortBy,
      scrollY: window.scrollY
    }
    storeReturnContext(returnContext)

    navigate('/medicines/new', {
      state: {
        returnContext
      }
    })
  }

  const handleOpenEdit = (medicine) => {
    if (isReadOnly) return

    if (medicine?.activo === false) {
      setFeedback({
        type: 'error',
        message: 'No se permite editar medicamentos inactivos.'
      })
      return
    }

    const returnContext = {
      searchTerm,
      sortBy,
      scrollY: window.scrollY
    }
    storeReturnContext(returnContext)

    navigate(`/medicines/${medicine.id}/edit`, {
      state: {
        medicine,
        returnContext
      }
    })
  }

  const handleError = useCallback((message) => {
    setFeedback({ type: 'error', message })
  }, [])

  const handleDeactivate = useCallback((medicine) => {
    if (isReadOnly) return

    if (!medicine?.id) {
      setFeedback({ type: 'error', message: 'No fue posible identificar el medicamento seleccionado.' })
      return
    }

    if (medicine.activo === false) {
      setFeedback({ type: 'error', message: 'El medicamento ya se encuentra inactivo.' })
      return
    }

    setFeedback(null)
    setMedicineToDeactivate(medicine)
    setOpenDeactivateModal(true)
  }, [isReadOnly])

  const handleCancelDeactivate = useCallback(() => {
    if (isDeactivating) return
    setOpenDeactivateModal(false)
    setMedicineToDeactivate(null)
  }, [isDeactivating])

  const handleConfirmDeactivate = useCallback(async () => {
    if (!medicineToDeactivate?.id) {
      setFeedback({ type: 'error', message: 'No fue posible identificar el medicamento seleccionado.' })
      setOpenDeactivateModal(false)
      setMedicineToDeactivate(null)
      return
    }

    setIsDeactivating(true)
    try {
      await deactivateMedicine(medicineToDeactivate.id)
      setOpenDeactivateModal(false)
      setMedicineToDeactivate(null)
      setReloadKey((current) => current + 1)
      setFeedback({ type: 'success', message: 'Medicamento desactivado correctamente.' })
    } catch (error) {
      if (error.isNotFound) {
        setFeedback({
          type: 'error',
          message: 'El medicamento no existe o ya fue eliminado. Actualiza la lista e intenta de nuevo.'
        })
      } else {
        setFeedback({
          type: 'error',
          message: error.message || 'Ocurrió un error al desactivar el medicamento.'
        })
      }
    } finally {
      setIsDeactivating(false)
    }
  }, [medicineToDeactivate])

  return (
    <div className="fe-page-shell">
      <div className="fe-page-head">
        <div>
          <h1 className="fe-page-title">{isReadOnly ? 'Inventario' : 'Gestión de Medicamentos'}</h1>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenCreate}
            className="fe-btn-primary 2xl:h-12 2xl:px-6 2xl:text-base"
          >
            + Agregar medicamento
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`fe-toast ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-100 text-green-700'
              : 'border-red-200 bg-red-100 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por código o nombre..."
          className="fe-input w-full sm:w-[310px] 2xl:h-12 2xl:text-base"
        />

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="fe-input w-full sm:w-[300px] 2xl:h-12 2xl:text-base"
        >
          <option value="code">Ordenar por código (asc)</option>
          <option value="name">Ordenar por nombre (A-Z)</option>
        </select>
      </div>

      <MedicinesTable
        reload={reloadKey}
        searchTerm={searchTerm}
        sortBy={sortBy}
        readOnly={isReadOnly}
        onError={handleError}
        onEdit={handleOpenEdit}
        onDeactivate={handleDeactivate}
      />

      {!isReadOnly && (
        <DeactivateMedicineModal
          isOpen={openDeactivateModal}
          medicine={medicineToDeactivate}
          isSubmitting={isDeactivating}
          onCancel={handleCancelDeactivate}
          onConfirm={handleConfirmDeactivate}
        />
      )}
    </div>
  )
}

export default MedicinesPage
