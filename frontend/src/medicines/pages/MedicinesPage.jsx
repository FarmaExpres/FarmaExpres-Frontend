import { useCallback, useEffect, useState } from 'react'
import MedicinesTable from '../components/MedicinesTable'
import MedicineModal from '../components/MedicineModal'
import MedicineEditModal from '../components/MedicineEditModal'
import DeactivateMedicineModal from '../components/DeactivateMedicineModal'
import { deactivateMedicine } from '../services/medicines.service'

const MedicinesPage = () => {
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [openEditModal, setOpenEditModal] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const [medicineToDeactivate, setMedicineToDeactivate] = useState(null)
  const [openDeactivateModal, setOpenDeactivateModal] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('code')
  const [reloadKey, setReloadKey] = useState(0)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!feedback) return undefined

    const timeoutId = setTimeout(() => {
      setFeedback(null)
    }, 3500)

    return () => clearTimeout(timeoutId)
  }, [feedback])

  const handleOpenCreate = () => {
    setFeedback(null)
    setOpenCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setOpenCreateModal(false)
  }

  const handleOpenEdit = (medicine) => {
    if (medicine?.activo === false) {
      setFeedback({
        type: 'error',
        message: 'No se permite editar medicamentos inactivos.'
      })
      return
    }

    setFeedback(null)
    setSelectedMedicine(medicine)
    setOpenEditModal(true)
  }

  const handleCloseEditModal = () => {
    setOpenEditModal(false)
    setSelectedMedicine(null)
  }

  const handleCreateSuccess = useCallback((message) => {
    setOpenCreateModal(false)
    setReloadKey((current) => current + 1)
    setFeedback({ type: 'success', message })
  }, [])

  const handleUpdateSuccess = useCallback((message) => {
    setOpenEditModal(false)
    setSelectedMedicine(null)
    setReloadKey((current) => current + 1)
    setFeedback({ type: 'success', message })
  }, [])

  const handleError = useCallback((message) => {
    setFeedback({ type: 'error', message })
  }, [])

  const handleDeactivate = useCallback((medicine) => {
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
  }, [])

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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestión de Medicamentos</h1>

        <button
          onClick={handleOpenCreate}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg"
        >
          + Agregar medicamento
        </button>
      </div>

      {feedback && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-[90vw] sm:w-auto">
          <div
            className={`rounded-lg px-4 py-3 text-sm shadow-lg ${
              feedback.type === 'success'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            {feedback.message}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por código o nombre..."
          className="border px-3 py-2 rounded-lg w-full sm:w-1/3"
        />

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="border px-3 py-2 rounded-lg w-full sm:w-auto"
        >
          <option value="code">Ordenar por código (asc)</option>
          <option value="name">Ordenar por nombre (A-Z)</option>
        </select>
      </div>

      <MedicinesTable
        reload={reloadKey}
        searchTerm={searchTerm}
        sortBy={sortBy}
        onError={handleError}
        onEdit={handleOpenEdit}
        onDeactivate={handleDeactivate}
      />

      <MedicineModal
        isOpen={openCreateModal}
        onClose={handleCloseCreateModal}
        onSuccess={handleCreateSuccess}
        onError={handleError}
      />

      <MedicineEditModal
        isOpen={openEditModal}
        medicine={selectedMedicine}
        onClose={handleCloseEditModal}
        onSuccess={handleUpdateSuccess}
        onError={handleError}
      />

      <DeactivateMedicineModal
        isOpen={openDeactivateModal}
        medicine={medicineToDeactivate}
        isSubmitting={isDeactivating}
        onCancel={handleCancelDeactivate}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  )
}

export default MedicinesPage
