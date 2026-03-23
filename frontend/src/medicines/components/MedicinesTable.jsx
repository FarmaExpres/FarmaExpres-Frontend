import { useEffect, useMemo, useState } from 'react'
import { getMedicines } from '../services/medicines.service'

const MedicinesTable = ({
  reload,
  searchTerm = '',
  sortBy = 'code',
  onError,
  onEdit,
  onDeactivate
}) => {
  const [medicines, setMedicines] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const filteredMedicines = useMemo(() => {
    const matchesSearch = (medicine) => {
      if (!normalizedSearchTerm) return true

      const code = String(medicine?.codigo ?? '').toLowerCase()
      const name = String(medicine?.nombre ?? '').toLowerCase()

      return code.includes(normalizedSearchTerm) || name.includes(normalizedSearchTerm)
    }

    return medicines
      .map((medicine, index) => ({ medicine, index }))
      .filter(({ medicine }) => matchesSearch(medicine))
      .sort((a, b) => {
        const aInactive = a.medicine?.activo === false
        const bInactive = b.medicine?.activo === false

        // Primero se muestran activos; los inactivos siempre van al final.
        if (aInactive !== bInactive) return aInactive ? 1 : -1
        // Los inactivos permanecen al final en su orden original.
        if (aInactive && bInactive) return a.index - b.index

        const aCode = String(a.medicine?.codigo ?? '')
        const bCode = String(b.medicine?.codigo ?? '')
        const aName = String(a.medicine?.nombre ?? '')
        const bName = String(b.medicine?.nombre ?? '')

        if (sortBy === 'name') {
          const nameDiff = aName.localeCompare(bName, 'es', {
            sensitivity: 'base',
            numeric: true
          })
          if (nameDiff !== 0) return nameDiff

          const codeDiff = aCode.localeCompare(bCode, 'es', {
            sensitivity: 'base',
            numeric: true
          })
          if (codeDiff !== 0) return codeDiff
        } else {
          const codeDiff = aCode.localeCompare(bCode, 'es', {
            sensitivity: 'base',
            numeric: true
          })
          if (codeDiff !== 0) return codeDiff

          const nameDiff = aName.localeCompare(bName, 'es', {
            sensitivity: 'base',
            numeric: true
          })
          if (nameDiff !== 0) return nameDiff
        }

        const aId = Number(a.medicine?.id)
        const bId = Number(b.medicine?.id)
        const hasValidIds = Number.isFinite(aId) && Number.isFinite(bId)

        // Se mantiene orden estable por id para evitar saltos visuales tras editar.
        if (hasValidIds && aId !== bId) return aId - bId

        return a.index - b.index
      })
      .map(({ medicine }) => medicine)
  }, [medicines, normalizedSearchTerm, sortBy])

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
            <th className="p-3 text-center">STOCK</th>
            <th className="p-3 text-center">STOCK MÍNIMO</th>
            <th className="p-3 text-center">PRECIO</th>
            <th className="p-3 text-center">VENCIMIENTO</th>
            <th className="p-3 text-center">ESTADO</th>
            <th className="p-3 text-center">ACCIONES</th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="8" className="p-6 text-center text-gray-400">
                Cargando medicamentos...
              </td>
            </tr>
          ) : Array.isArray(filteredMedicines) && filteredMedicines.length > 0 ? (
            filteredMedicines.map((medicine, index) => (
              <tr
                key={medicine.id || index}
                className={`border-t ${medicine.activo === false ? 'bg-gray-50 text-gray-500' : ''}`}
              >
                <td className="p-3">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {medicine.codigo || '---'}
                  </span>
                </td>

                <td className="p-3">{medicine.nombre || '---'}</td>

                <td className={`p-3 text-center ${medicine.stock < 20 ? 'text-red-500 font-bold' : ''}`}>
                  {medicine.stock ?? 0}
                </td>

                <td className="p-3 text-center">{medicine.stockMinimo ?? 0}</td>

                <td className="p-3 text-center">$ {medicine.precio ?? 0}</td>
                <td className="p-3 text-center text-red-500">{medicine.fechavencimiento || '---'}</td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      medicine.activo === false
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {medicine.activo === false ? 'Inactivo' : 'Activo'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(medicine)}
                      disabled={!medicine?.id || medicine.activo === false}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeactivate?.(medicine)}
                      disabled={!medicine?.id || medicine.activo === false}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Desactivar
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="p-6 text-center text-gray-400">
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
