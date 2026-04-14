import { getRoleLabel, normalizeRole, ROLES } from '../../shared/constants/roles'

const getInitials = (name = '') => {
  const tokens = String(name || '').trim().split(/\s+/).filter(Boolean)
  return tokens.slice(0, 2).map((token) => token[0]?.toUpperCase() || '').join('') || 'US'
}

const isUserActive = (user) => String(user?.estado || 'ACTIVO').toUpperCase() === 'ACTIVO'

const UsersTable = ({
  users = [],
  isLoading = false,
  isAdministrator = false,
  currentUserEmail = '',
  onEdit,
  onChangePassword,
  onToggleStatus,
  isProcessingId = null
}) => {
  const normalizedCurrentUserEmail = String(currentUserEmail || '').trim().toLowerCase()

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3 2xl:gap-5">
      {isLoading && (
        <div className="fe-card col-span-full p-5 text-center text-gray-400">
          Cargando usuarios...
        </div>
      )}

      {!isLoading && users.length === 0 && (
        <div className="fe-card col-span-full p-5 text-center text-gray-400">
          No hay usuarios cargados. Los nuevos registros aparecerán aquí.
        </div>
      )}

      {!isLoading && users.map((user, index) => {
        const userEmail = String(user.email || '').trim().toLowerCase()
        const isCurrentUser = userEmail && userEmail === normalizedCurrentUserEmail
        const userIsActive = isUserActive(user)
        const disableToggle = !isAdministrator || (isCurrentUser && normalizeRole(user.rol) === ROLES.ADMIN)
        const isProcessing = isProcessingId === user.id

        return (
          <article
            key={user.id || `${user.email}-${index}`}
            className={`fe-card border p-4 2xl:p-5 ${userIsActive ? 'border-emerald-100' : 'border-red-200 bg-red-50/30'}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e9d8ff] text-base font-bold text-[#6a3cf1] 2xl:h-14 2xl:w-14">
                {getInitials(user.nombre)}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[1.05rem] font-semibold text-[#1b2b4a] 2xl:text-[1.12rem]">{user.nombre || 'Sin nombre'}</h3>
                <p className="truncate text-sm text-[#7b89a5] 2xl:text-[0.95rem]">{user.email || '---'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex h-8 items-center rounded-full bg-[#ebf1ff] px-3 text-xs font-semibold text-[#4565a8]">
                    {getRoleLabel(user.rol)}
                  </span>
                  <span className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold ${
                    userIsActive
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : 'border-red-200 bg-red-100 text-red-700'
                  }`}
                  >
                    {userIsActive ? 'Habilitado' : 'Deshabilitado'}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="fe-user-action fe-user-action-edit"
                  title="Editar usuario"
                  aria-label="Editar usuario"
                  disabled={!isAdministrator || isProcessing}
                  onClick={() => onEdit?.(user)}
                >
                  ✎
                </button>

                <button
                  type="button"
                  className="fe-user-action fe-user-action-password"
                  title="Cambiar contraseña"
                  aria-label="Cambiar contraseña"
                  disabled={!isAdministrator || isProcessing}
                  onClick={() => onChangePassword?.(user)}
                >
                  🔒
                </button>

                <button
                  type="button"
                  className={`fe-user-action ${userIsActive ? 'fe-user-action-toggle-off' : 'fe-user-action-toggle-on'}`}
                  title={userIsActive ? 'Desactivar usuario' : 'Activar usuario'}
                  aria-label={userIsActive ? 'Desactivar usuario' : 'Activar usuario'}
                  disabled={disableToggle || isProcessing}
                  onClick={() => onToggleStatus?.(user)}
                >
                  {userIsActive ? '◉' : '○'}
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default UsersTable
