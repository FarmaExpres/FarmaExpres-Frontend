import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import MedicineWorkspaceForm from '../components/MedicineWorkspaceForm'
import { getMedicineBatches, getMedicineById, getMedicines, updateMedicine } from '../services/medicines.service'

const EMPTY_VALUES = {
  code: '',
  commercialName: '',
  nombreGenerico: '',
  concentracion: '',
  formaFarmaceutica: '',
  presentacion: '',
  unidadMedida: '',
  viaAdministracion: '',
  ubicacionAlmacen: '',
  temperaturaConservacion: '',
  stockMaximo: '',
  stock: '',
  minimumStock: '',
  precioCompra: '',
  precioVenta: '',
  expirationDate: '',
  requiereReceta: '',
  laboratorio: '',
  registroSanitario: '',
  observaciones: ''
}

const toComparableText = (value) => String(value ?? '').trim()
const toComparableNumber = (value) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const buildComparablePayload = (payload = {}) => ({
  name: toComparableText(payload?.name),
  minimumStock: toComparableNumber(payload?.minimumStock),
  unitPrice: toComparableNumber(payload?.unitPrice),
  nombreGenerico: toComparableText(payload?.nombreGenerico),
  concentracion: toComparableText(payload?.concentracion),
  formaFarmaceutica: toComparableText(payload?.formaFarmaceutica),
  presentacion: toComparableText(payload?.presentacion),
  stockMaximo: toComparableNumber(payload?.stockMaximo),
  precioCompra: toComparableNumber(payload?.precioCompra),
  precioVenta: toComparableNumber(payload?.precioVenta),
  requiereReceta: Boolean(payload?.requiereReceta),
  laboratorio: toComparableText(payload?.laboratorio),
  registroSanitario: toComparableText(payload?.registroSanitario),
  viaAdministracion: toComparableText(payload?.viaAdministracion),
  unidadMedida: toComparableText(payload?.unidadMedida),
  measurementUnit: toComparableText(payload?.measurementUnit ?? payload?.unidadMedida),
  ubicacionAlmacen: toComparableText(payload?.ubicacionAlmacen),
  temperaturaConservacion: toComparableText(payload?.temperaturaConservacion),
  observaciones: toComparableText(payload?.observaciones)
})

const buildComparableFromMedicine = (medicine = {}) => ({
  name: toComparableText(medicine?.nombre),
  minimumStock: toComparableNumber(medicine?.stockMinimo),
  unitPrice: toComparableNumber(medicine?.precioVenta ?? medicine?.precio),
  nombreGenerico: toComparableText(medicine?.nombreGenerico),
  concentracion: toComparableText(medicine?.concentracion),
  formaFarmaceutica: toComparableText(medicine?.formaFarmaceutica),
  presentacion: toComparableText(medicine?.presentacion),
  stockMaximo: toComparableNumber(medicine?.stockMaximo),
  precioCompra: toComparableNumber(medicine?.precioCompra),
  precioVenta: toComparableNumber(medicine?.precioVenta ?? medicine?.precio),
  requiereReceta: Boolean(medicine?.requiereReceta),
  laboratorio: toComparableText(medicine?.laboratorio),
  registroSanitario: toComparableText(medicine?.registroSanitario),
  viaAdministracion: toComparableText(medicine?.viaAdministracion),
  unidadMedida: toComparableText(medicine?.unidadMedida),
  measurementUnit: toComparableText(medicine?.unidadMedida),
  ubicacionAlmacen: toComparableText(medicine?.ubicacionAlmacen),
  temperaturaConservacion: toComparableText(medicine?.temperaturaConservacion),
  observaciones: toComparableText(medicine?.observaciones)
})

const hasChanges = (nextPayload, currentMedicine) =>
  JSON.stringify(buildComparablePayload(nextPayload)) !== JSON.stringify(buildComparableFromMedicine(currentMedicine))

const isConsumableActiveBatch = (batch = {}) => {
  const stock = Number(batch?.availableStock)
  const expirationDate = String(batch?.expirationDate || '').trim()
  const status = String(batch?.status || '').trim().toUpperCase()

  if (!Number.isFinite(stock) || stock <= 0) return false
  if (!expirationDate) return false
  if (status && status !== 'ACTIVE') return false

  const targetDate = new Date(`${expirationDate}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) return false

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return targetDate >= startOfToday
}

const MedicineEditPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { medicineId } = useParams()
  const [medicine, setMedicine] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [expirationReferenceLabel, setExpirationReferenceLabel] = useState('')
  const [nextBatchCode, setNextBatchCode] = useState('')
  const [stockFromBatches, setStockFromBatches] = useState('')
  const returnContext = location.state?.returnContext
  const draftStorageKey = medicineId ? `medicines:draft:edit:${medicineId}` : ''

  const formatDisplayDate = (isoDate) => {
    const dateText = String(isoDate || '').trim()
    if (!dateText) return ''
    const date = new Date(`${dateText}T00:00:00`)
    if (Number.isNaN(date.getTime())) return dateText
    return date.toLocaleDateString('es-CO')
  }

  useEffect(() => {
    let isMounted = true

    const loadNextBatchReference = async (productId) => {
      try {
        const batches = await getMedicineBatches(productId)
        if (!isMounted) return

        const consumableActiveBatches = (Array.isArray(batches) ? batches : []).filter(isConsumableActiveBatch)
        const totalAvailableStock = consumableActiveBatches.reduce((accumulator, item) => {
          const value = Number(item?.availableStock)
          return Number.isFinite(value) ? accumulator + value : accumulator
        }, 0)
        setStockFromBatches(String(totalAvailableStock))

        const activeBatches = consumableActiveBatches
          .sort((a, b) => String(a.expirationDate).localeCompare(String(b.expirationDate)))

        if (activeBatches.length > 0) {
          setExpirationReferenceLabel(formatDisplayDate(activeBatches[0].expirationDate))
          const resolvedBatchCode = String(activeBatches[0].batchCode || '').trim()
          const resolvedBatchId = String(activeBatches[0].id || '').trim()
          setNextBatchCode(resolvedBatchCode || (resolvedBatchId ? `Lote #${resolvedBatchId}` : ''))
        }
      } catch {
        // No se bloquea edición si lotes falla; se usa fallback visual.
      }
    }

    const loadMedicine = async () => {
      if (!medicineId) {
        setLoadingError('No se recibió un identificador de medicamento válido.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadingError('')
      setExpirationReferenceLabel('')
      setNextBatchCode('')
      setStockFromBatches('')

      const medicineFromState = location.state?.medicine
      if (medicineFromState && String(medicineFromState.id) === String(medicineId)) {
        setMedicine(medicineFromState)
        await loadNextBatchReference(medicineId)
        setIsLoading(false)
        return
      }

      try {
        const response = await getMedicineById(medicineId)
        if (!isMounted) return

        if (response.activo === false) {
          setLoadingError('No se permite editar medicamentos inactivos.')
          setIsLoading(false)
          return
        }

        setMedicine(response)
        await loadNextBatchReference(medicineId)
      } catch (error) {
        // Fallback: algunos entornos no exponen GET /products/{id}; se busca en listado.
        try {
          const medicines = await getMedicines()
          if (!isMounted) return

          const fallbackMedicine = medicines.find((item) => String(item.id) === String(medicineId))
          if (!fallbackMedicine) {
            setLoadingError(error.message || 'No se pudo cargar el medicamento seleccionado.')
            return
          }

          if (fallbackMedicine.activo === false) {
            setLoadingError('No se permite editar medicamentos inactivos.')
            return
          }

          setMedicine(fallbackMedicine)
          await loadNextBatchReference(medicineId)
        } catch (fallbackError) {
          if (!isMounted) return
          setLoadingError(fallbackError.message || error.message || 'No se pudo cargar el medicamento seleccionado.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadMedicine()
    return () => {
      isMounted = false
    }
  }, [location.state, medicineId])

  const initialValues = useMemo(() => {
    if (!medicine) return EMPTY_VALUES

    return {
      code: medicine.codigo ?? '',
      commercialName: medicine.nombre ?? '',
      nombreGenerico: medicine.nombreGenerico ?? '',
      concentracion: medicine.concentracion ?? '',
      formaFarmaceutica: medicine.formaFarmaceutica ?? '',
      presentacion: medicine.presentacion ?? '',
      unidadMedida: medicine.unidadMedida ?? '',
      viaAdministracion: medicine.viaAdministracion ?? '',
      ubicacionAlmacen: medicine.ubicacionAlmacen ?? '',
      temperaturaConservacion: medicine.temperaturaConservacion ?? '',
      stockMaximo: String(medicine.stockMaximo ?? 0),
      stock: stockFromBatches || String(medicine.stock ?? ''),
      minimumStock: String(medicine.stockMinimo ?? 0),
      precioCompra: String(medicine.precioCompra ?? 0),
      precioVenta: String(medicine.precioVenta ?? medicine.precio ?? 0),
      expirationDate: medicine.fechavencimiento ?? '',
      requiereReceta: medicine.requiereReceta ? 'SI' : 'NO',
      laboratorio: medicine.laboratorio ?? '',
      registroSanitario: medicine.registroSanitario ?? '',
      observaciones: medicine.observaciones ?? ''
    }
  }, [medicine, stockFromBatches])

  const clearDraft = () => {
    if (!draftStorageKey) return
    try {
      sessionStorage.removeItem(draftStorageKey)
    } catch {
      // no-op
    }
  }

  const handleCancel = () => {
    clearDraft()
    navigate('/medicines', {
      state: returnContext ? { restoreContext: returnContext } : null
    })
  }

  const handleSubmit = async (payload) => {
    if (!medicineId) return
    if (!hasChanges(payload, medicine)) {
      return
    }

    setIsSaving(true)
    setSubmitError('')

    try {
      const sanitizedPayload = { ...(payload || {}) }
      delete sanitizedPayload.expirationDate
      delete sanitizedPayload.fechavencimiento
      delete sanitizedPayload.nextExpirationDate
      delete sanitizedPayload.batchExpirationDate

      await updateMedicine(medicineId, sanitizedPayload)
      clearDraft()
      navigate('/medicines', {
        state: {
          feedback: {
            type: 'success',
            message: 'Medicamento actualizado correctamente.'
          },
          ...(returnContext ? { restoreContext: returnContext } : {})
        }
      })
    } catch (error) {
      if (error.isNotFound) {
        setSubmitError('El medicamento no existe o fue eliminado. Actualiza la lista e intenta de nuevo.')
      } else if (error.status === 422) {
        setSubmitError(
          error.message ||
          'No se pudo actualizar. El stock y vencimiento se gestionan por lotes desde Entradas/Salidas.'
        )
      } else {
        setSubmitError(error.message || 'Ocurrió un error al actualizar el medicamento.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fe-page-shell">
      {isLoading ? (
        <section className="fe-card border border-[#dde6f3] p-6 text-sm text-[#6d7da0]">
          Cargando datos del medicamento...
        </section>
      ) : loadingError ? (
        <section className="fe-card border border-red-200 bg-red-100 p-6 text-sm text-red-700">
          <p>{loadingError}</p>
          <button type="button" onClick={handleCancel} className="fe-btn-muted mt-4">
            Volver al listado
          </button>
        </section>
      ) : (
        <MedicineWorkspaceForm
          key={`medicine-edit-form-${medicineId}`}
          title="Actualizar Medicamento"
          submitLabel="Guardar cambios"
          initialValues={initialValues}
          draftStorageKey={draftStorageKey}
          isCreate={false}
          isSaving={isSaving}
          submitError={submitError}
          inventoryReadOnlyExpirationLabel={expirationReferenceLabel}
          inventoryReadOnlyBatchCode={nextBatchCode}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

export default MedicineEditPage
