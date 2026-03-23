import { useEffect, useState } from 'react'
import { updateMedicine } from '../services/medicines.service'

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

const validateForm = (formValues) => {
  const errors = {}

  if (!formValues.commercialName.trim()) {
    errors.commercialName = 'El nombre comercial es obligatorio.'
  }

  const stock = Number(formValues.stock)
  if (formValues.stock === '' || !Number.isInteger(stock) || stock < 0) {
    errors.stock = 'El stock debe ser un entero mayor o igual a 0.'
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
  }

  return errors
}

const MedicineEditModal = ({ isOpen, medicine, onClose, onSuccess, onError }) => {
  const [form, setForm] = useState({
    code: '',
    commercialName: '',
    stock: '',
    minimumStock: '',
    unitPrice: '',
    expirationDate: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!medicine || !isOpen) return

    setForm({
      code: medicine.codigo ?? '',
      commercialName: medicine.nombre ?? '',
      stock: String(medicine.stock ?? ''),
      minimumStock: String(medicine.stockMinimo ?? 0),
      unitPrice: String(medicine.precio ?? ''),
      expirationDate: medicine.fechavencimiento ?? ''
    })
    setErrors({})
    setIsSubmitting(false)
  }, [medicine, isOpen])

  const medicineId = medicine?.id

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleClose = () => {
    setErrors({})
    setIsSubmitting(false)
    onClose()
  }

  const handleSubmit = async () => {
    if (medicine?.activo === false) {
      onError('No se permite editar medicamentos inactivos.')
      return
    }

    const validationErrors = validateForm(form)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    if (!medicineId) {
      onError('No fue posible identificar el medicamento seleccionado.')
      return
    }

    // Se envían solo campos editables para respetar el criterio de no modificar el código.
    const payload = {
      nombre: form.commercialName.trim(),
      stock: Number(form.stock),
      stockMinimo: Number(form.minimumStock),
      precio: Number(form.unitPrice),
      fechavencimiento: form.expirationDate
    }

    setIsSubmitting(true)

    try {
      await updateMedicine(medicineId, payload)
      onSuccess('Medicamento actualizado correctamente.')
    } catch (error) {
      if (error.isNotFound) {
        onError('El medicamento no existe o fue eliminado. Actualiza la lista e intenta de nuevo.')
      } else {
        onError(error.message || 'Ocurrió un error al actualizar el medicamento.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const inputClassName = 'fe-input'
  const errorClassName = 'mt-1 text-xs text-red-600'

  return (
    <div className="fe-modal-overlay">
      <div className="fe-modal-card max-w-xl">
        <button onClick={handleClose} className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600">
          ✕
        </button>

        <h2 className="mb-1 text-xl font-bold text-[#1b2946]">Actualizar Medicamento</h2>
        <p className="mb-5 text-sm text-[#7583a0]">Edita los campos permitidos para actualizar el registro.</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label htmlFor="code">Código del medicamento</label>
            <input
              id="code"
              name="code"
              value={form.code}
              className={`${inputClassName} cursor-not-allowed bg-[#f2f5fb] text-[#6c7994]`}
              readOnly
              disabled
            />
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
            <label htmlFor="stock">Stock</label>
            <input
              id="stock"
              type="number"
              name="stock"
              value={form.stock}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.stock && <p className={errorClassName}>{errors.stock}</p>}
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
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MedicineEditModal
