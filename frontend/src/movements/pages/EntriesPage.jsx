import { useCallback, useEffect, useMemo, useState } from 'react'
import MovementsTable from '../components/MovementsTable'
import {
  getEntranceMovements,
  registerInventoryEntry
} from '../services/movements.service'
import {
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
  expirationDate: '',
  reason: 'Compra proveedor',
  observation: ''
})

const ENTRY_REASON_OPTIONS = Object.freeze([
  'Compra proveedor',
  'Devolucion',
  'Donacion',
  'Ajuste inventario'
])

const toSortedMedicines = (medicines = []) => (
  [...medicines].sort((firstMedicine, secondMedicine) =>
    String(firstMedicine?.nombre || '').localeCompare(String(secondMedicine?.nombre || ''), 'es', { sensitivity: 'base' })
  )
)

const buildAutomaticBatchCode = (medicine, expirationDate) => {
  const medicineCode = String(medicine?.codigo || medicine?.nombre || 'MED').trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 18) || 'MED'

  const normalizedExpirationDate = String(expirationDate || '').trim().replace(/-/g, '')
  const today = new Date()
  const generatedAt = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('')

  return `${medicineCode}-${normalizedExpirationDate || generatedAt}`
}

const EntriesPage = () => {
  const [form, setForm] = useState(INITIAL_FORM)
  const [medicines, setMedicines] = useState([])
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const medicineOptions = useMemo(() => toSortedMedicines(medicines), [medicines])
  const selectedMedicine = useMemo(
    () => medicineOptions.find((medicine) => String(medicine.id) === String(form.productId)) || null,
    [form.productId, medicineOptions]
  )
  const autoBatchCode = useMemo(
    () => (selectedMedicine ? buildAutomaticBatchCode(selectedMedicine, form.expirationDate) : ''),
    [form.expirationDate, selectedMedicine]
  )

  const loadEntriesView = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const [medicinesData, usersData] = await Promise.all([
        getMedicines(),
        getUsers().catch(() => [])
      ])

      const normalizedMedicines = Array.isArray(medicinesData) ? medicinesData : []
      const productsById = buildProductsMap(normalizedMedicines)
      const { usersByIdentity, usersById } = buildUsersIndex(usersData)
      const entriesData = await getEntranceMovements({
        productsById,
        usersByIdentity,
        usersById
      })

      setMedicines(normalizedMedicines)
      setEntries(Array.isArray(entriesData) ? entriesData : [])
    } catch (loadError) {
      setMedicines([])
      setEntries([])
      setError(loadError.message || 'No se pudo cargar la vista de entradas.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEntriesView()
  }, [loadEntriesView])

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
      setError('Selecciona un medicamento para registrar la entrada.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('La cantidad debe ser un numero mayor a 0.')
      return
    }

    if (!form.expirationDate) {
      setError('La fecha de vencimiento es obligatoria para registrar la entrada.')
      return
    }

    if (!String(form.reason || '').trim()) {
      setError('Debes indicar el motivo de la entrada.')
      return
    }

    setIsSubmitting(true)

    try {
      await registerInventoryEntry({
        productId: Number(form.productId),
        amount,
        batchCode: autoBatchCode,
        expirationDate: form.expirationDate,
        reason: form.reason,
        observation: form.observation
      })

      setForm(INITIAL_FORM)
      setSuccessMessage('Entrada registrada correctamente. El historial ya fue actualizado.')
      await loadEntriesView()
    } catch (submitError) {
      setError(submitError.message || 'No se pudo registrar la entrada.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fe-page-shell">
      <div className="fe-page-head">
        <div>
          <h1 className="fe-page-title">Registrar Entrada de Inventario</h1>
          <p className="fe-section-subtitle">
            Registra ingresos al inventario y consulta las ultimas entradas registradas.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <section className="fe-card p-4 md:p-5">
          <div className="mb-4">
            <h2 className="fe-section-title text-[1.18rem]">Nueva entrada</h2>
            <p className="fe-section-subtitle">
              Completa los datos del lote y envia la novedad al backend.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="entry-productId">Medicamento</label>
              <select
                id="entry-productId"
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
              <label htmlFor="entry-amount">Cantidad</label>
              <input
                id="entry-amount"
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
              <label htmlFor="entry-expirationDate">Fecha de vencimiento</label>
              <input
                id="entry-expirationDate"
                name="expirationDate"
                type="date"
                value={form.expirationDate}
                onChange={handleChange}
                className="fe-input"
                disabled={isLoading || isSubmitting}
                required
              />
            </div>

            <div>
              <label htmlFor="entry-reason">Motivo</label>
              <select
                id="entry-reason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                className="fe-input"
                disabled={isLoading || isSubmitting}
                required
              >
                {ENTRY_REASON_OPTIONS.map((reasonOption) => (
                  <option key={reasonOption} value={reasonOption}>
                    {reasonOption}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="entry-observation">Observacion (opcional)</label>
              <textarea
                id="entry-observation"
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
                <p>Proximo vencimiento: {selectedMedicine.proximoVencimiento || 'Sin referencia'}</p>
                <p>Lote generado automaticamente: {autoBatchCode || 'Pendiente por fecha de vencimiento'}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="fe-btn-primary"
                disabled={isLoading || isSubmitting || medicineOptions.length === 0}
              >
                {isSubmitting ? 'Registrando entrada...' : 'Registrar entrada'}
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
                <h2 className="fe-section-title text-[1.18rem]">Ultimas entradas</h2>
                <p className="fe-section-subtitle">
                  Historial reciente de movimientos de entrada consumido desde backend.
                </p>
              </div>
              <p className="text-sm font-medium text-[#6b7896]">
                Registros visibles: <span className="font-semibold text-[#24314a]">{entries.length}</span>
              </p>
            </div>
          </div>

          <MovementsTable movements={entries} isLoading={isLoading} />
        </section>
      </div>
    </div>
  )
}

export default EntriesPage
