import { useCallback, useEffect, useMemo, useState } from 'react'
import MovementsTable from '../components/MovementsTable'
import {
  getExitMovements,
  registerInventoryExit
} from '../services/movements.service'
import {
  getActiveInventoryTable,
  getMedicines
} from '../../medicines/services/medicines.service'
import { getUsers } from '../../users/services/users.service'
import {
  buildProductsMap,
  buildUsersIndex
} from '../utils/movementsPage.utils'

const INITIAL_FORM = Object.freeze({
  productId: '',
  amount: '',
  reason: 'Venta',
  observation: ''
})

const EXIT_REASON_OPTIONS = Object.freeze([
  { value: 'Venta', label: 'Venta' },
  { value: 'Merma', label: 'Merma' },
  { value: 'Vencimiento', label: 'Vencimiento' },
  { value: 'Ajuste inventario', label: 'Ajuste inventario' }
])

const toSortedMedicines = (medicines = []) => (
  [...medicines].sort((firstMedicine, secondMedicine) =>
    String(firstMedicine?.nombre || '').localeCompare(String(secondMedicine?.nombre || ''), 'es', { sensitivity: 'base' })
  )
)

const normalizeDateValue = (value) => {
  const rawValue = String(value || '').trim()
  const dateOnlyMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!dateOnlyMatch) return null

  const [, year, month, day] = dateOnlyMatch
  return new Date(Number(year), Number(month) - 1, Number(day))
}

const isMedicineAvailableForExit = (medicine = {}) => {
  if (medicine?.activo === false) return false

  const expirationDate = normalizeDateValue(medicine?.proximoVencimiento)
  if (!expirationDate) return true

  const today = new Date()
  const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return expirationDate >= todayAtMidnight
}

const buildOperableMedicineKeys = (inventoryRows = []) => {
  const keys = new Set()

  inventoryRows.forEach((row) => {
    if (row?.id !== null && row?.id !== undefined) keys.add(`id:${row.id}`)
    if (row?.codigo) keys.add(`code:${String(row.codigo).trim().toLowerCase()}`)
  })

  return keys
}

const isInActiveInventory = (medicine = {}, operableKeys = new Set()) => {
  if (operableKeys.size === 0) return true
  const idKey = `id:${medicine.id}`
  const codeKey = `code:${String(medicine.codigo || '').trim().toLowerCase()}`
  return operableKeys.has(idKey) || operableKeys.has(codeKey)
}

const ExitsPage = () => {
  const [form, setForm] = useState(INITIAL_FORM)
  const [medicines, setMedicines] = useState([])
  const [exits, setExits] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const medicineOptions = useMemo(
    () => toSortedMedicines(medicines.filter(isMedicineAvailableForExit)),
    [medicines]
  )
  const selectedMedicine = useMemo(
    () => medicineOptions.find((medicine) => String(medicine.id) === String(form.productId)) || null,
    [form.productId, medicineOptions]
  )

  const loadExitsView = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [medicinesData, activeInventoryRows, usersData] = await Promise.all([
        getMedicines(),
        getActiveInventoryTable().catch(() => []),
        getUsers().catch(() => [])
      ])

      const normalizedMedicines = Array.isArray(medicinesData) ? medicinesData : []
      const operableKeys = buildOperableMedicineKeys(Array.isArray(activeInventoryRows) ? activeInventoryRows : [])
      const operableMedicines = normalizedMedicines.filter((medicine) =>
        isMedicineAvailableForExit(medicine) && isInActiveInventory(medicine, operableKeys)
      )
      const productsById = buildProductsMap(normalizedMedicines)
      const { usersByIdentity, usersById } = buildUsersIndex(usersData)
      const exitsData = await getExitMovements({
        productsById,
        usersByIdentity,
        usersById
      })

      setMedicines(operableMedicines)
      setExits(Array.isArray(exitsData) ? exitsData : [])
    } catch (loadError) {
      setMedicines([])
      setExits([])
      setError(loadError.message || 'No se pudo cargar la vista de salidas.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExitsView()
  }, [loadExitsView])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const amount = Number(form.amount)

    if (!form.productId) {
      setError('Selecciona un medicamento para registrar la salida.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('La cantidad debe ser un número mayor a 0.')
      return
    }

    if (!String(form.reason || '').trim()) {
      setError('Debes indicar el motivo de la salida.')
      return
    }

    setIsSubmitting(true)

    try {
      await registerInventoryExit({
        productId: Number(form.productId),
        amount,
        reason: form.reason,
        observation: form.observation
      })

      setForm(INITIAL_FORM)
      setSuccessMessage('Salida registrada correctamente. El historial ya fue actualizado.')
      await loadExitsView()
    } catch (submitError) {
      setError(submitError.message || 'No se pudo registrar la salida.')
      if (submitError?.isInventoryConflict) {
        await loadExitsView()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fe-page-shell">
      <div className="fe-page-head">
        <div>
          <h1 className="fe-page-title">Registrar salida de inventario</h1>
        </div>
      </div>

      <div className="space-y-4">
        <section className="fe-card p-4 md:p-5">
          <div className="mb-4">
            <h2 className="fe-section-title text-[1.18rem]">Nueva salida</h2>
            <p className="fe-section-subtitle">
              Selecciona el medicamento, la cantidad y el motivo del egreso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="exit-productId">Medicamento</label>
              <select
                id="exit-productId"
                name="productId"
                value={form.productId}
                onChange={handleChange}
                className="fe-input"
                disabled={isLoading || isSubmitting}
                required
              >
                <option value="">Selecciona un medicamento</option>
                {medicineOptions.map((medicine) => (
                  <option key={medicine.id} value={medicine.id}>
                    {medicine.nombre} {medicine.codigo ? `(${medicine.codigo})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="exit-amount">Cantidad</label>
              <input
                id="exit-amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={handleChange}
                className="fe-input"
                disabled={isLoading || isSubmitting}
                placeholder="Cantidad de unidades"
                required
              />
            </div>

            <div>
              <label htmlFor="exit-reason">Motivo</label>
              <select
                id="exit-reason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                className="fe-input"
                disabled={isLoading || isSubmitting}
                required
              >
                {EXIT_REASON_OPTIONS.map((reasonOption) => (
                  <option key={reasonOption.value} value={reasonOption.value}>
                    {reasonOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="exit-observation">Observación (opcional)</label>
              <textarea
                id="exit-observation"
                name="observation"
                value={form.observation}
                onChange={handleChange}
                className="fe-input min-h-24 resize-y"
                disabled={isLoading || isSubmitting}
                placeholder="Notas adicionales..."
              />
            </div>

            {selectedMedicine && (
              <div className="rounded-xl border border-[#e9eef8] bg-[#f7f9ff] px-4 py-3 text-sm text-[#5f6e8d]">
                <p className="font-semibold text-[#24314a]">{selectedMedicine.nombre}</p>
                <p>Stock actual: {selectedMedicine.stock}</p>
                <p>Próximo vencimiento: {selectedMedicine.proximoVencimiento || 'Sin referencia'}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="fe-btn-primary"
                disabled={isLoading || isSubmitting || medicineOptions.length === 0}
              >
                {isSubmitting ? 'Registrando salida...' : 'Registrar salida'}
              </button>

              <button
                type="button"
                className="fe-btn-muted"
                onClick={() => {
                  setForm(INITIAL_FORM)
                  setError('')
                  setSuccessMessage('')
                }}
                disabled={isSubmitting}
              >
                Limpiar formulario
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!error && successMessage && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="fe-card p-4 md:p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="fe-section-title text-[1.18rem]">Últimas salidas</h2>
              </div>
              <p className="text-sm font-medium text-[#6b7896]">
                Registros visibles: <span className="font-semibold text-[#24314a]">{exits.length}</span>
              </p>
            </div>
          </div>

          <MovementsTable movements={exits} isLoading={isLoading} />
        </section>
      </div>
    </div>
  )
}

export default ExitsPage
