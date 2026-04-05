import { useEffect, useMemo, useState } from 'react'
import { getMedicines, getMedicinesFefoSnapshot } from '../services/medicines.service'

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <path d="M12 20h9" />
    <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
  </svg>
)

const DisableIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
    <path d="M18 6 6 18" />
    <circle cx="12" cy="12" r="9" />
  </svg>
)

const getStockVisualState = (stockValue, minimumStockValue) => {
  const stock = Number(stockValue)
  const minimumStock = Number(minimumStockValue)

  if (!Number.isFinite(stock)) {
    return 'normal'
  }

  if (Number.isFinite(minimumStock) && minimumStock > 0) {
    if (stock < minimumStock) {
      return stock <= minimumStock * 0.5 ? 'critical' : 'warning'
    }
    return 'normal'
  }

  // Respaldo para registros sin stock mínimo válido.
  return stock < 20 ? 'critical' : 'normal'
}

const formatDisplayDate = (value) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return ''
  const date = new Date(`${rawValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return rawValue
  return date.toLocaleDateString('es-CO')
}

const isExpiredDate = (value) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return false

  const targetDate = new Date(`${rawValue}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) return false

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return targetDate < startOfToday
}

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
  const [fefoByMedicineId, setFefoByMedicineId] = useState({})

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

  useEffect(() => {
    let isMounted = true

    const loadFefoReferences = async () => {
      if (!Array.isArray(medicines) || medicines.length === 0) {
        if (isMounted) setFefoByMedicineId({})
        return
      }

      try {
        const snapshots = await getMedicinesFefoSnapshot()
        if (!isMounted) return

        const nextMap = {}
        snapshots.forEach((item) => {
          if (!item?.medicineId) return
          nextMap[item.medicineId] = {
            expirationDate: String(item?.expirationDate || '').trim(),
            batchCode: String(item?.batchCode || '').trim(),
            activeBatchesCount: Number(item?.activeBatchesCount ?? 0),
            operationalStock: Number(item?.operationalStock ?? 0)
          }
        })

        setFefoByMedicineId(nextMap)
      } catch {
        // Si el snapshot FEFO falla, se conserva render con la información base del producto.
        if (isMounted) setFefoByMedicineId({})
      }
    }

    loadFefoReferences()

    return () => {
      isMounted = false
    }
  }, [medicines])

  return (
    <div className="fe-card fe-table-wrap">
      <table className="fe-table text-sm 2xl:text-[15px]">
        <thead>
          <tr>
            <th className="text-left">CÓDIGO</th>
            <th className="text-left">NOMBRE</th>
            <th className="text-center" title="Stock utilizable (operativo)">
              STOCK UTIL.
            </th>
            <th className="text-center">STOCK MÍNIMO</th>
            <th className="text-center">PRECIO</th>
            <th className="text-left">REFERENCIA FEFO</th>
            <th className="text-center">ESTADO</th>
            <th className="text-center">ACCIONES</th>
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan="8" className="p-5 text-center text-gray-400">
                Cargando medicamentos...
              </td>
            </tr>
          ) : Array.isArray(filteredMedicines) && filteredMedicines.length > 0 ? (
            filteredMedicines.map((medicine, index) => {
              const fefoReference = fefoByMedicineId[String(medicine?.id)] || null
              const operationalStock = Number(fefoReference?.operationalStock ?? medicine?.stock ?? 0)
              const stockState = getStockVisualState(operationalStock, medicine.stockMinimo)
              const referenceDate =
                fefoReference?.expirationDate ||
                medicine.proximoVencimiento ||
                ''
              const referenceBatchCode =
                fefoReference?.batchCode ||
                medicine.loteFefo ||
                ''
              const activeBatchesCount = Number(
                fefoReference?.activeBatchesCount ?? medicine.lotesActivos ?? 0
              )
              const hasReferenceDate = Boolean(referenceDate)
              const isExpiredReference = hasReferenceDate && isExpiredDate(referenceDate)

              return (
                <tr
                  key={medicine.id || index}
                  className={medicine.activo === false ? 'bg-[#f6f7fb] text-gray-500' : ''}
                >
                <td className="whitespace-nowrap">
                  <span className="inline-flex h-8 items-center rounded-lg bg-[#eef2fa] px-3 text-xs font-semibold text-[#526180] 2xl:text-[12px]">
                    {medicine.codigo || '---'}
                  </span>
                </td>

                <td className="max-w-[250px] truncate" title={medicine.nombre || '---'}>
                  {medicine.nombre || '---'}
                </td>

                <td
                  className={`whitespace-nowrap text-center ${
                    stockState === 'critical'
                      ? 'font-bold text-red-500'
                      : stockState === 'warning'
                        ? 'font-semibold text-amber-600'
                        : 'text-[#283b61]'
                  }`}
                >
                  {operationalStock}
                </td>

                <td className="whitespace-nowrap text-center">{medicine.stockMinimo ?? 0}</td>

                <td className="whitespace-nowrap text-center font-semibold text-[#30456f]">$ {medicine.precio ?? 0}</td>
                <td className="max-w-[250px] py-2">
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-sm font-semibold text-[#30456f]">
                      <span className={isExpiredReference ? 'text-red-600' : 'text-[#30456f]'}>
                        {hasReferenceDate ? formatDisplayDate(referenceDate) : 'Sin lote activo'}
                      </span>
                    </span>
                    <span className={`mt-1 text-xs ${isExpiredReference ? 'text-red-500' : 'text-[#6f83aa]'}`}>
                      Lote: {referenceBatchCode || 'Sin lote activo'}
                    </span>
                    {activeBatchesCount > 0 && hasReferenceDate && (
                      <span className="mt-0.5 text-[11px] text-[#8b9cc0]">
                        {activeBatchesCount} lote(s) activo(s)
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap text-center">
                  <span
                    className={`inline-flex h-8 min-w-[86px] items-center justify-center rounded-lg px-3 text-xs font-semibold 2xl:text-[12px] ${
                      medicine.activo === false
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {medicine.activo === false ? 'Inactivo' : 'Activo'}
                  </span>
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(medicine)}
                      title="Editar medicamento"
                      aria-label="Editar medicamento"
                      disabled={!medicine?.id || medicine.activo === false}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#316dff] text-white transition hover:bg-[#295de0] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <EditIcon />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeactivate?.(medicine)}
                      title="Desactivar medicamento"
                      aria-label="Desactivar medicamento"
                      disabled={!medicine?.id || medicine.activo === false}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#eb4e68] text-white transition hover:bg-[#d9405a] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <DisableIcon />
                    </button>
                  </div>
                </td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan="8" className="p-5 text-center text-gray-400">
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
