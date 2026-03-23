import { useState } from 'react'
import { USER_ROLE_OPTIONS } from '../../shared/constants/roles'

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim())
const isLowercaseEmail = (value) => String(value || '').trim() === String(value || '').trim().toLowerCase()

const buildInitialForm = (user) => ({
  fullName: user?.nombre || '',
  email: user?.email || '',
  role: user?.rol || USER_ROLE_OPTIONS[0].value
})

const UserEditModal = ({ isOpen, onClose, user, onSubmit, existingEmails = [], isSubmitting = false }) => {
  const [form, setForm] = useState(() => buildInitialForm(user))
  const [errors, setErrors] = useState({})

  if (!isOpen || !user) return null

  const normalizedCurrentEmail = String(user.email || '').trim().toLowerCase()
  const existingEmailSet = new Set(
    existingEmails
      .map((email) => String(email || '').trim().toLowerCase())
      .filter((email) => email !== normalizedCurrentEmail)
  )

  const validate = () => {
    const nextErrors = {}
    const normalizedEmail = form.email.trim().toLowerCase()

    if (!form.fullName.trim()) nextErrors.fullName = 'El nombre completo es obligatorio.'
    if (!form.email.trim()) nextErrors.email = 'El correo electrónico es obligatorio.'
    else if (!isValidEmail(form.email)) nextErrors.email = 'El correo electrónico no tiene un formato válido.'
    else if (!isLowercaseEmail(form.email)) nextErrors.email = 'El correo debe escribirse en minúsculas.'
    else if (existingEmailSet.has(normalizedEmail)) nextErrors.email = 'El correo ya está registrado.'
    if (!form.role) nextErrors.role = 'Debes seleccionar un rol.'

    return nextErrors
  }

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleSave = () => {
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit(form)
  }

  return (
    <div className="fe-modal-overlay">
      <div className="fe-modal-card max-w-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        <h2 className="mb-1 text-xl font-bold text-[#1b2946]">Editar Usuario</h2>
        <p className="mb-5 text-sm text-[#7583a0]">Actualiza la información principal del usuario.</p>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="edit-fullName">Nombre completo</label>
            <input
              id="edit-fullName"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="fe-input"
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
          </div>

          <div>
            <label htmlFor="edit-email">Correo electrónico</label>
            <input
              id="edit-email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="fe-input"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="edit-role">Rol</label>
            <select
              id="edit-role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="fe-input"
            >
              {USER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="fe-btn-muted" disabled={isSubmitting}>
            Cancelar
          </button>
          <button onClick={handleSave} className="fe-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserEditModal
