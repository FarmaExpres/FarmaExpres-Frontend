import { useState } from 'react'
import { createMedicine } from '../services/medicines.service'

const initialForm = {
  code: '',
  commercialName: '',
  initialStock: '',
  minimumStock: '',
  unitPrice: '',
  expirationDate: ''
}

const getTodayIsoDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

const isDateInPast = (value) => {
  const selectedDate = new Date(`${value}T00:00:00`)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return selectedDate < startOfToday
}

const validateForm = (formValues) => {
  const errors = {}

  if (!formValues.code.trim()) {
    errors.code = 'El código es obligatorio.'
  }

  if (!formValues.commercialName.trim()) {
    errors.commercialName = 'El nombre comercial es obligatorio.'
  }

  const stock = Number(formValues.initialStock)
  if (formValues.initialStock === '' || !Number.isInteger(stock) || stock < 0) {
    errors.initialStock = 'El stock inicial debe ser un entero mayor o igual a 0.'
  }

  const minimumStock = Number(formValues.minimumStock)
  if (formValues.minimumStock === '' || !Number.isInteger(minimumStock) || minimumStock < 0) {
    errors.minimumStock = 'El stock mínimo debe ser un entero mayor o igual a 0.'
  }

  const unitPrice = Number(formValues.unitPrice)
  if (formValues.unitPrice === '' || Number.isNaN(unitPrice) || unitPrice < 0) {
    errors.unitPrice = 'El precio unitario debe ser un número mayor o igual a 0.'
  }

  if (!isValidDate(formValues.expirationDate)) {
    errors.expirationDate = 'La fecha de vencimiento es obligatoria y debe ser válida.'
  } else if (isDateInPast(formValues.expirationDate)) {
    errors.expirationDate = 'No se permite registrar medicamentos con fecha de vencimiento anterior a hoy.'
  }

  return errors
}

const MedicineModal = ({ isOpen, onClose, onSuccess, onError }) => {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const minExpirationDate = getTodayIsoDate()

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleSubmit = async () => {
    // Se valida en frontend para evitar solicitudes incompletas y mejorar la experiencia de usuario.
    const validationErrors = validateForm(form)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    // Se mapea el modelo interno (inglés) al contrato que espera el backend.
    const payload = {
      codigo: form.code.trim(),
      nombre: form.commercialName.trim(),
      stock: Number(form.initialStock),
      stockMinimo: Number(form.minimumStock),
      precio: Number(form.unitPrice),
      fechavencimiento: form.expirationDate,
      activo: true
    }

    setIsSubmitting(true)

    try {
      await createMedicine(payload)
      onSuccess('Medicamento registrado correctamente.')
      setForm(initialForm)
      setErrors({})
    } catch (error) {
      if (error.isDuplicateCode) {
        onError('El código del medicamento ya existe. Usa un código diferente.')
      } else {
        onError(error.message || 'Ocurrió un error al registrar el medicamento.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName = 'fe-input'
  const errorClassName = 'mt-1 text-xs text-red-600'

  const handleClose = () => {
    // Al cerrar el modal se limpia el estado para iniciar siempre con formulario en blanco.
    setForm(initialForm)
    setErrors({})
    setIsSubmitting(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fe-modal-overlay">
      <div className="fe-modal-card max-w-xl">
        <button onClick={handleClose} className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600">
          ✕
        </button>

        <h2 className="mb-1 text-xl font-bold text-[#1b2946]">Nuevo Medicamento</h2>
        <p className="mb-5 text-sm text-[#7583a0]">Completa los datos para registrar el medicamento en inventario.</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="code">Código del medicamento</label>
            <input
              id="code"
              name="code"
              value={form.code}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.code && <p className={errorClassName}>{errors.code}</p>}
          </div>

          <div className="col-span-2">
            <label htmlFor="commercialName">Nombre comercial</label>
            <input
              id="commercialName"
              name="commercialName"
              value={form.commercialName}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.commercialName && <p className={errorClassName}>{errors.commercialName}</p>}
          </div>

          <div>
            <label htmlFor="initialStock">Stock inicial</label>
            <input
              id="initialStock"
              type="number"
              name="initialStock"
              value={form.initialStock}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.initialStock && <p className={errorClassName}>{errors.initialStock}</p>}
          </div>

          <div>
            <label htmlFor="minimumStock">Stock mínimo</label>
            <input
              id="minimumStock"
              type="number"
              name="minimumStock"
              value={form.minimumStock}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.minimumStock && <p className={errorClassName}>{errors.minimumStock}</p>}
          </div>

          <div className="col-span-2">
            <label htmlFor="unitPrice">Precio unitario</label>
            <input
              id="unitPrice"
              type="number"
              step="0.01"
              name="unitPrice"
              value={form.unitPrice}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.unitPrice && <p className={errorClassName}>{errors.unitPrice}</p>}
          </div>

          <div className="col-span-2">
            <label htmlFor="expirationDate">Fecha de vencimiento</label>
            <input
              id="expirationDate"
              type="date"
              name="expirationDate"
              value={form.expirationDate}
              onChange={handleChange}
              min={minExpirationDate}
              className={inputClassName}
            />
            {errors.expirationDate && <p className={errorClassName}>{errors.expirationDate}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={handleClose} className="fe-btn-muted">
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="fe-btn-primary"
          >
            {isSubmitting ? 'Registrando...' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MedicineModal
