import { useEffect, useState } from 'react'
import { getMedicines } from '../services/medicines.service'

const MedicinesTable = ({ reload, onError }) => {
  const [medicines, setMedicines] = useState([])
  const [isLoading, setIsLoading] = useState(false)

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
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="6" className="p-6 text-center text-gray-400">
                Cargando medicamentos...
              </td>
            </tr>
          ) : Array.isArray(medicines) && medicines.length > 0 ? (
            medicines.map((medicine, index) => (
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
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="p-6 text-center text-gray-400">
                No hay medicamentos registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default MedicinesTable
