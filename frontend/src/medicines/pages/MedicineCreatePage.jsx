import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MedicineWorkspaceForm from '../components/MedicineWorkspaceForm'
import { createMedicine } from '../services/medicines.service'

const MEDICINE_CREATE_DRAFT_STORAGE_KEY = 'medicines:draft:create'

const INITIAL_VALUES = {
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

const MedicineCreatePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isSaving, setIsSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const returnContext = location.state?.returnContext

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(MEDICINE_CREATE_DRAFT_STORAGE_KEY)
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
    setIsSaving(true)
    setSubmitError('')

    try {
      await createMedicine(payload)
      clearDraft()
      navigate('/medicines', {
        state: {
          feedback: {
            type: 'success',
            message: 'Medicamento registrado correctamente.'
          },
          ...(returnContext ? { restoreContext: returnContext } : {})
        }
      })
    } catch (error) {
      if (error.isDuplicateCode) {
        setSubmitError('El código del medicamento ya existe. Usa un código diferente.')
      } else {
        setSubmitError(error.message || 'Ocurrió un error al registrar el medicamento.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fe-page-shell">
      <MedicineWorkspaceForm
        key="medicine-create-form"
        title="Nuevo Medicamento"
        submitLabel="Crear medicamento"
        initialValues={INITIAL_VALUES}
        draftStorageKey={MEDICINE_CREATE_DRAFT_STORAGE_KEY}
        isCreate
        isSaving={isSaving}
        submitError={submitError}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default MedicineCreatePage
