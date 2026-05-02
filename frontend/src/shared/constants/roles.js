export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  FARMACEUTICO: 'FARMACEUTICO',
  AUDITOR: 'AUDITOR'
})

export const USER_ROLE_OPTIONS = Object.freeze([
  { value: ROLES.ADMIN, label: 'Administrador', apiValues: ['ADMIN', 'ADMINISTRADOR'] },
  { value: ROLES.FARMACEUTICO, label: 'Farmacéutico', apiValues: ['FARMACEUTICO', 'FARMACÉUTICO', 'PHARMACIST', 'EMPLEADO'] },
  { value: ROLES.AUDITOR, label: 'Auditor', apiValues: ['AUDITOR'] }
])

const ROLE_NORMALIZATION = {
  ADMIN: ROLES.ADMIN,
  ADMINISTRADOR: ROLES.ADMIN,
  ROLE_ADMIN: ROLES.ADMIN,
  ROLE_ADMINISTRADOR: ROLES.ADMIN,
  EMPLEADO: ROLES.FARMACEUTICO,
  FARMACEUTICO: ROLES.FARMACEUTICO,
  FARMACÉUTICO: ROLES.FARMACEUTICO,
  PHARMACIST: ROLES.FARMACEUTICO,
  ROLE_FARMACEUTICO: ROLES.FARMACEUTICO,
  ROLE_FARMACÉUTICO: ROLES.FARMACEUTICO,
  ROLE_PHARMACIST: ROLES.FARMACEUTICO,
  AUDITOR: ROLES.AUDITOR,
  ROLE_AUDITOR: ROLES.AUDITOR
}

export const normalizeRole = (role) => {
  const normalizedRole = String(role || '').trim().toUpperCase()
  return ROLE_NORMALIZATION[normalizedRole] || ''
}

export const mapRoleToApiValue = (role) => {
  const normalizedRole = normalizeRole(role)
  const roleOption = USER_ROLE_OPTIONS.find((option) => option.value === normalizedRole)
  return roleOption?.apiValues?.[0] || 'ADMIN'
}

export const getRoleApiCandidates = (role) => {
  const normalizedRole = normalizeRole(role)
  const roleOption = USER_ROLE_OPTIONS.find((option) => option.value === normalizedRole)
  return roleOption?.apiValues?.length ? roleOption.apiValues : ['ADMIN']
}

export const getRoleLabel = (role) => {
  const normalizedRole = normalizeRole(role)
  const roleOption = USER_ROLE_OPTIONS.find((option) => option.value === normalizedRole)
  return roleOption?.label || 'Sin rol'
}

export const canAccessMedicines = (role) => {
  const normalizedRole = normalizeRole(role)
  return [ROLES.ADMIN, ROLES.FARMACEUTICO, ROLES.AUDITOR].includes(normalizedRole)
}

export const canManageMedicines = (role) => normalizeRole(role) === ROLES.ADMIN

export const canAccessEntries = (role) => {
  const normalizedRole = normalizeRole(role)
  return [ROLES.ADMIN, ROLES.FARMACEUTICO].includes(normalizedRole)
}

export const canAccessExits = (role) => {
  const normalizedRole = normalizeRole(role)
  return [ROLES.ADMIN, ROLES.FARMACEUTICO].includes(normalizedRole)
}

export const canAccessMovements = (role) => {
  const normalizedRole = normalizeRole(role)
  return [ROLES.ADMIN, ROLES.AUDITOR].includes(normalizedRole)
}

export const canAccessReports = (role) => {
  const normalizedRole = normalizeRole(role)
  return [ROLES.ADMIN, ROLES.AUDITOR].includes(normalizedRole)
}

export const canAccessAlerts = (role) => {
  const normalizedRole = normalizeRole(role)
  return [ROLES.ADMIN, ROLES.FARMACEUTICO].includes(normalizedRole)
}

export const canAccessStockControl = (role) => {
  const normalizedRole = normalizeRole(role)
  return [ROLES.ADMIN, ROLES.FARMACEUTICO].includes(normalizedRole)
}

export const getDefaultRouteByRole = (role) => {
  const normalizedRole = normalizeRole(role)
  if ([ROLES.ADMIN, ROLES.FARMACEUTICO, ROLES.AUDITOR].includes(normalizedRole)) return '/dashboard'
  return '/medicines'
}
