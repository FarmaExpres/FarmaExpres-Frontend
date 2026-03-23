import AlertTriangleIcon from '../../shared/ui/icons/AlertTriangleIcon'

const DeactivateMedicineModal = ({ isOpen, medicine, isSubmitting, onCancel, onConfirm }) => {
  if (!isOpen || !medicine) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <div className="mb-3 flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangleIcon className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-semibold">Confirmar desactivación</h2>
        </div>

        <p className="text-sm text-gray-700 mb-2">
          ¿Desea desactivar este medicamento? Esta acción no se puede deshacer.
        </p>
        <p className="text-sm text-amber-700 mb-4">
          El medicamento quedará inactivo y no podrá editarse desde esta vista.
        </p>

        <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <p>
            <span className="font-medium">Código:</span> {medicine.codigo || '---'}
          </p>
          <p>
            <span className="font-medium">Nombre:</span> {medicine.nombre || '---'}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="border px-4 py-2 rounded disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {isSubmitting ? 'Desactivando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeactivateMedicineModal
