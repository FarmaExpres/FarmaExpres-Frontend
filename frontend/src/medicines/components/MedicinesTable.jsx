import { useEffect, useState } from 'react'
import { getMedicines } from '../services/medicines.service'

const MedicinesTable = ({ reload, searchTerm = '', onError, onEdit }) => {
  const [medicines, setMedicines] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const filteredMedicines = medicines.filter((medicine) => {
    if (!normalizedSearchTerm) return true

    const code = String(medicine?.codigo ?? '').toLowerCase()
    const name = String(medicine?.nombre ?? '').toLowerCase()

    return code.includes(normalizedSearchTerm) || name.includes(normalizedSearchTerm)
  })

  useEffect(() => {
    let isMounted = true

    const loadMedicines = async () => {
      setIsLoading(true)

      try {
        const data = await getMedicines()
        if (isMounted) setMedicines(data || [])
      } catch (error) {
        if (onError) onError(error.message || 'No se pudieron cargar los medicamentos.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadMedicines()

    return () => {
      isMounted = false
    }
  }, [reload, onError])

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="p-3 text-left">CÓDIGO</th>
            <th className="p-3 text-left">NOMBRE</th>
            <th className="p-3 text-left">STOCK</th>
            <th className="p-3 text-left">STOCK MÍNIMO</th>
            <th className="p-3 text-left">PRECIO</th>
            <th className="p-3 text-left">VENCIMIENTO</th>
            <th className="p-3 text-left">ACCIONES</th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="7" className="p-6 text-center text-gray-400">
                Cargando medicamentos...
              </td>
            </tr>
          ) : Array.isArray(filteredMedicines) && filteredMedicines.length > 0 ? (
            filteredMedicines.map((medicine, index) => (
              <tr key={medicine.id || index} className="border-t">
                <td className="p-3">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {medicine.codigo || '---'}
                  </span>
                </td>

                <td className="p-3">{medicine.nombre || '---'}</td>

                <td className={`p-3 ${medicine.stock < 20 ? 'text-red-500 font-bold' : ''}`}>
                  {medicine.stock ?? 0}
                </td>

                <td className="p-3">{medicine.stockMinimo ?? 0}</td>

                <td className="p-3">$ {medicine.precio ?? 0}</td>
                <td className="p-3 text-red-500">{medicine.fechavencimiento || '---'}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => onEdit?.(medicine)}
                    disabled={!medicine?.id}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="p-6 text-center text-gray-400">
                {Array.isArray(medicines) && medicines.length > 0
                  ? 'No se encontraron coincidencias para la búsqueda.'
                  : 'No hay medicamentos registrados'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default MedicinesTable
