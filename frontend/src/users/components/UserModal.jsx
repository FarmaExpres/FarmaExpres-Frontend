import { useState } from 'react'
import { USER_ROLE_OPTIONS } from '../../shared/constants/roles'
import { createUser } from '../services/users.service'

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: USER_ROLE_OPTIONS[0].value
}

const MIN_PASSWORD_LENGTH = 8

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim())
const isLowercaseEmail = (value) => String(value || '').trim() === String(value || '').trim().toLowerCase()

const validateForm = (values, existingEmails = []) => {
  const errors = {}
  const normalizedEmail = values.email.trim().toLowerCase()
  const existingEmailsSet = new Set(existingEmails.map((email) => String(email || '').trim().toLowerCase()))

  if (!values.fullName.trim()) {
    errors.fullName = 'El nombre completo es obligatorio.'
  }

  if (!values.email.trim()) {
    errors.email = 'El correo electrónico es obligatorio.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'El correo electrónico no tiene un formato válido.'
  } else if (!isLowercaseEmail(values.email)) {
    errors.email = 'El correo debe escribirse en minúsculas.'
  } else if (existingEmailsSet.has(normalizedEmail)) {
    errors.email = 'El correo ya está registrado. Usa un correo diferente.'
  }

  if (!values.password) {
    errors.password = 'La contraseña es obligatoria.'
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'La confirmación de contraseña es obligatoria.'
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.'
  }

  if (!values.role) {
    errors.role = 'Debes seleccionar un rol.'
  }

  return errors
}

const UserModal = ({ isOpen, onClose, onSuccess, onError, existingEmails = [] }) => {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleClose = () => {
    setForm(initialForm)
    setErrors({})
    setIsSubmitting(false)
    onClose()
  }

  const handleSubmit = async () => {
    // Las reglas se validan en frontend para evitar solicitudes inválidas y mejorar claridad para el usuario.
    const validationErrors = validateForm(form, existingEmails)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)

    try {
      const createdUser = await createUser(form)
      onSuccess(createdUser)
      setForm(initialForm)
      setErrors({})
    } catch (error) {
      if (error.isForbidden) {
        onError('No tienes permisos para crear usuarios. Debes iniciar sesión con rol Administrador.')
      } else if (error.isDuplicateEmail) {
        onError('El correo ya está registrado. Usa un correo diferente.')
      } else {
        onError(error.message || 'Ocurrió un error al crear el usuario.')
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
      <div className="fe-modal-card max-w-lg">
        <button onClick={handleClose} className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600" aria-label="Cerrar modal">
          ✕
        </button>

        <h2 className="mb-1 text-xl font-bold text-[#1b2946]">Crear Usuario</h2>
        <p className="mb-5 text-sm text-[#7583a0]">Registra un nuevo usuario y define sus permisos de acceso.</p>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="fullName">Nombre completo</label>
            <input
              id="fullName"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.fullName && <p className={errorClassName}>{errors.fullName}</p>}
          </div>

          <div>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.email && <p className={errorClassName}>{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.password && <p className={errorClassName}>{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.confirmPassword && <p className={errorClassName}>{errors.confirmPassword}</p>}
          </div>

          <div>
            <label htmlFor="role">Rol</label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className={inputClassName}
            >
              {USER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.role && <p className={errorClassName}>{errors.role}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={handleClose} className="fe-btn-muted" disabled={isSubmitting}>
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="fe-btn-primary"
          >
            {isSubmitting ? 'Creando...' : 'Crear Usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserModal
