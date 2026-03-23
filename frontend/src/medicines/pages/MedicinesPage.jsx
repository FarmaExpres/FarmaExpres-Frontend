import { useCallback, useState } from 'react'
import MedicinesTable from '../components/MedicinesTable'
import MedicineModal from '../components/MedicineModal'
import MedicineEditModal from '../components/MedicineEditModal'

const MedicinesPage = () => {
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [openEditModal, setOpenEditModal] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [feedback, setFeedback] = useState(null)

  const handleOpenCreate = () => {
    setFeedback(null)
    setOpenCreateModal(true)
  }

  const handleCloseCreateModal = () => {
    setOpenCreateModal(false)
  }

  const handleOpenEdit = (medicine) => {
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
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mb-4">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por código o nombre..."
          className="border px-3 py-2 rounded-lg w-1/3"
        />
      </div>

      <MedicinesTable
        reload={reloadKey}
        searchTerm={searchTerm}
        onError={handleError}
        onEdit={handleOpenEdit}
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
    </div>
  )
}

export default MedicinesPage
