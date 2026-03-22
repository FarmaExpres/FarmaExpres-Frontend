import { useCallback, useState } from 'react'
import MedicinesTable from '../components/MedicinesTable'
import MedicineModal from '../components/MedicineModal'

const MedicinesPage = () => {
  const [openModal, setOpenModal] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [feedback, setFeedback] = useState(null)

  const handleOpenCreate = () => {
    setFeedback(null)
    setOpenModal(true)
  }

  const handleCloseModal = () => {
    setOpenModal(false)
  }

  const handleCreateSuccess = useCallback((message) => {
    setOpenModal(false)
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
          placeholder="Buscar..."
          className="border px-3 py-2 rounded-lg w-1/3"
        />
      </div>

      <MedicinesTable reload={reloadKey} onError={handleError} />

      <MedicineModal
        isOpen={openModal}
        onClose={handleCloseModal}
        onSuccess={handleCreateSuccess}
        onError={handleError}
      />
    </div>
  )
}

export default MedicinesPage
