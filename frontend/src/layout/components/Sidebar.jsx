import { getRoleLabel, normalizeRole, ROLES } from '../../shared/constants/roles'

const iconClassName = 'h-5 w-5 shrink-0'

const IconLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <path d="M10 13a5 5 0 0 1 0-7l1.7-1.7a5 5 0 1 1 7.1 7.1L17 13" />
    <path d="M14 11a5 5 0 0 1 0 7l-1.7 1.7a5 5 0 0 1-7.1-7.1L7 11" />
  </svg>
)

const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </svg>
)

const IconPill = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <path d="M9 3a6 6 0 0 0-4.2 10.2l6 6A6 6 0 1 0 19.2 10l-6-6A6 6 0 0 0 9 3Z" />
    <path d="m7.5 7.5 9 9" />
  </svg>
)

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 18a5.5 5.5 0 0 1 11 0" />
    <circle cx="17.5" cy="9" r="2.5" />
    <path d="M14.5 18a4 4 0 0 1 6 0" />
  </svg>
)

const IconPulse = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <path d="M3 12h4l2.2-4.5L13 17l2.2-5H21" />
  </svg>
)

const IconDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <path d="M7 3h7l5 5v13H7z" />
    <path d="M14 3v6h5" />
    <path d="M10 13h6M10 17h6" />
  </svg>
)

const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <path d="M12 4a5 5 0 0 0-5 5v2.5L5.5 14v1h13v-1L17 11.5V9a5 5 0 0 0-5-5Z" />
    <path d="M10 18a2 2 0 0 0 4 0" />
  </svg>
)

const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="m4 7.5 8 4.5 8-4.5" />
    <path d="M12 12v9" />
  </svg>
)

const IconInventory = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <rect x="5" y="3.5" width="14" height="17" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </svg>
)

const IconDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <circle cx="12" cy="12" r="8" />
    <path d="m8.5 11.5 3.5 3.5 3.5-3.5M12 8.5v6.5" />
  </svg>
)

const IconUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <circle cx="12" cy="12" r="8" />
    <path d="m8.5 12.5 3.5-3.5 3.5 3.5M12 15.5V9" />
  </svg>
)

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <path d="M12 3 5 6v6c0 5 3.4 8.6 7 9.8 3.6-1.2 7-4.8 7-9.8V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 1 1 8 0v3" />
  </svg>
)

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName}>
    <path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" />
    <path d="m14 8 5 4-5 4" />
    <path d="M19 12H9" />
  </svg>
)

const iconMap = {
  dashboard: IconGrid,
  medicines: IconPill,
  users: IconUsers,
  movements: IconPulse,
  reports: IconDoc,
  alerts: IconBell,
  stock: IconBox,
  inventory: IconInventory,
  entries: IconDown,
  exits: IconUp,
  audit: IconShield
}

const MENU_BY_ROLE = {
  [ROLES.ADMIN]: [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'medicines', label: 'Medicamentos', moduleKey: 'medicines' },
    { key: 'users', label: 'Usuarios', moduleKey: 'users' },
    { key: 'movements', label: 'Movimientos' },
    { key: 'reports', label: 'Reportes' },
    { key: 'alerts', label: 'Alertas', badge: '24' },
    { key: 'stock', label: 'Control Stock' }
  ],
  [ROLES.EMPLEADO]: [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'inventory', label: 'Inventario' },
    { key: 'entries', label: 'Entradas' },
    { key: 'exits', label: 'Salidas' },
    { key: 'alerts', label: 'Alertas', badge: '24' },
    { key: 'stock', label: 'Control Stock' }
  ],
  [ROLES.AUDITOR]: [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'inventory', label: 'Inventario' },
    { key: 'movements', label: 'Movimientos' },
    { key: 'reports', label: 'Reportes' },
    { key: 'audit', label: 'Auditoria' }
  ]
}

const getInitials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

const getDefaultNameByRole = (role) => {
  if (role === ROLES.EMPLEADO) return 'Usuario Farmaceutico'
  if (role === ROLES.AUDITOR) return 'Usuario Auditor'
  return 'Usuario Administrador'
}

const Sidebar = ({ activeModule, role, user, onNavigate, onLogout }) => {
  const normalizedRole = normalizeRole(role) || ROLES.ADMIN
  const roleMenu = MENU_BY_ROLE[normalizedRole] || MENU_BY_ROLE[ROLES.ADMIN]
  const displayName = (user?.name || '').trim() || getDefaultNameByRole(normalizedRole)
  const initials = getInitials(displayName) || 'US'

  return (
    <aside className="w-full border-r border-[#e7e9ef] bg-[#f6f7fb] md:sticky md:top-0 md:h-screen md:w-[238px] md:flex md:flex-col md:overflow-y-auto">
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7b5cff] to-[#6d34f4] text-white shadow-sm">
            <IconLink />
          </span>
          <div>
            <p className="text-2xl leading-none font-semibold text-[#21314d]">FarmaExpres</p>
            <p className="mt-1 text-sm text-[#95a0b8]">ERP Farmacia</p>
          </div>
        </div>
      </div>

      <nav className="px-3 py-2">
        {roleMenu.map((item) => {
          const Icon = iconMap[item.key] || IconGrid
          const isActive = item.moduleKey && activeModule === item.moduleKey
          const isInteractive = Boolean(item.moduleKey)

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => isInteractive && onNavigate(item.moduleKey)}
              className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                isActive
                  ? 'bg-gradient-to-r from-[#6d3ff1] to-[#7f4fff] text-white shadow-sm'
                  : isInteractive
                    ? 'text-[#73819f] hover:bg-white hover:text-[#3c4a65]'
                    : 'text-[#73819f]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon />
                <span className="font-semibold">{item.label}</span>
              </span>

              {item.badge && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#ffe4ea] text-[#f95d74]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto border-t border-[#e7e9ef] p-3">
        <div className="mb-2.5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e9d9ff] text-sm font-bold text-[#7d47f8]">
            {initials}
          </span>
          <div>
            <p className="text-sm font-bold text-[#24314a]">{displayName}</p>
            <p className="text-sm text-[#94a1ba]">{getRoleLabel(normalizedRole)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eadcff] text-[#884df8]"
            aria-label="Cambiar contraseña"
          >
            <IconLock />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#f9ecef] text-sm font-semibold text-[#f0546d]"
          >
            <IconLogout />
            Salir
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
