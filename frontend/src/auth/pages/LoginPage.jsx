import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login } from '../services/auth.service'
import { saveSession } from '../../shared/auth/session'
import FarmaShieldIconLogin from '../../shared/ui/icons/FarmaShieldIconLogin'
import './LoginPage.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const LoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = useMemo(() => {
    const from = location?.state?.from
    return typeof from === 'string' && from.trim() ? from : '/medicines'
  }, [location?.state?.from])

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [requestError, setRequestError] = useState('')
  const [recoveryNotice, setRecoveryNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const nextErrors = {}

    if (!form.email.trim()) {
      nextErrors.email = 'El correo electrónico es obligatorio.'
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      nextErrors.email = 'El correo electrónico no tiene un formato válido.'
    }

    if (!form.password) {
      nextErrors.password = 'La contraseña es obligatoria.'
    }

    return nextErrors
  }

  const handleChange = ({ target: { name, value } }) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setRequestError('')
    setRecoveryNotice('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    setRequestError('')

    try {
      const loginData = await login(form)
      saveSession(loginData)
      onLoginSuccess?.()
      navigate(fromPath, { replace: true })
    } catch (error) {
      setRequestError(error?.message || 'No fue posible iniciar sesión. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openRecovery = () => {
    setRecoveryNotice('Para recuperar tu contraseña, comunícate con el administrador del sistema.')
  }

  return (
    <div className="fe-login-page">
      <div className="fe-login-bg-orb fe-login-bg-orb-a" />
      <div className="fe-login-bg-orb fe-login-bg-orb-b" />

      <section className="fe-login-shell">
        <aside className="fe-login-brand">
          <div className="fe-login-icon-wrap">
            <FarmaShieldIconLogin className="h-[112px] w-[112px]" />
          </div>
          <h1>FarmaExpres</h1>
          <p>Sistema de Gestión Farmacéutica</p>
        </aside>

        <article className="fe-login-form-panel">
          <h2>Iniciar Sesión</h2>
          <p className="fe-login-subtitle">Ingresa tus credenciales para continuar.</p>

          <form onSubmit={handleSubmit} className="fe-login-form">
            <div className="fe-login-field">
              <label htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                className="fe-login-input"
              />
              {errors.email && <p className="fe-login-input-error">{errors.email}</p>}
            </div>

            <div className="fe-login-field fe-login-field-tight">
              <label htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="fe-login-input"
              />
              {errors.password && <p className="fe-login-input-error">{errors.password}</p>}
            </div>

            <div className="fe-login-forgot">
              <button
                type="button"
                onClick={openRecovery}
                className="fe-login-link"
              >
                ¿Olvidó su contraseña?
              </button>
            </div>

            {recoveryNotice && (
              <div className="fe-login-recovery-info">
                {recoveryNotice}
              </div>
            )}

            {requestError && (
              <div className="fe-login-request-error">
                {requestError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="fe-login-submit"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </article>
      </section>
    </div>
  )
}

export default LoginPage
