import { useEffect, useState } from 'react'

const MIN_PASSWORD_LENGTH = 8

const buildInitialForm = () => ({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const UserPasswordModal = ({ isOpen, onClose, user, onSubmit, isSubmitting = false, errorMessage = '' }) => {
  const [form, setForm] = useState(buildInitialForm)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  })

  useEffect(() => {
    if (!isOpen) return
    setForm(buildInitialForm())
    setErrors({})
    setShowPassword({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false
    })
  }, [isOpen, user?.id])

  if (!isOpen || !user) return null

  const validate = () => {
    const nextErrors = {}

    if (!form.currentPassword) {
      nextErrors.currentPassword = 'La contraseña actual es obligatoria.'
    }

    if (!form.newPassword) {
      nextErrors.newPassword = 'La nueva contraseña es obligatoria.'
    } else if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      nextErrors.newPassword = `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Debes confirmar la nueva contraseña.'
    } else if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden.'
    }

    return nextErrors
  }

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const togglePasswordVisibility = (field) => {
    setShowPassword((current) => ({ ...current, [field]: !current[field] }))
  }

  const handleSave = () => {
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword
    })
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

        <h2 className="mb-1 text-xl font-bold text-[#1b2946]">Cambiar Contraseña</h2>
        <p className="mb-1 text-sm text-[#7583a0]">Actualiza la contraseña del usuario seleccionado.</p>
        <p className="mb-5 text-sm font-medium text-[#1b2946]">
          {user.nombre || 'Sin nombre'} ({user.email || 'sin correo'})
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="currentPassword">Contraseña actual</label>
            <div className="relative">
              <input
                id="currentPassword"
                name="currentPassword"
                type={showPassword.currentPassword ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={handleChange}
                className="fe-input pr-24"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('currentPassword')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-[#4f5f82] transition hover:bg-slate-100"
                aria-label={showPassword.currentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword.currentPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.currentPassword && <p className="mt-1 text-xs text-red-600">{errors.currentPassword}</p>}
          </div>

          <div>
            <label htmlFor="newPassword">Nueva contraseña</label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword.newPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={handleChange}
                className="fe-input pr-24"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('newPassword')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-[#4f5f82] transition hover:bg-slate-100"
                aria-label={showPassword.newPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword.newPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="mt-1 text-xs text-[#6f7c98]">Mínimo 8 caracteres.</p>
            {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword.confirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange}
                className="fe-input pr-24"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirmPassword')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-[#4f5f82] transition hover:bg-slate-100"
                aria-label={showPassword.confirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword.confirmPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="fe-btn-muted" disabled={isSubmitting}>
            Cancelar
          </button>
          <button onClick={handleSave} className="fe-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserPasswordModal
