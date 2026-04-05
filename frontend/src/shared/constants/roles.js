export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  FARMACEUTICO: 'FARMACEUTICO',
  AUDITOR: 'AUDITOR'
})

export const USER_ROLE_OPTIONS = Object.freeze([
  { value: ROLES.ADMIN, label: 'Administrador', apiValues: ['ADMIN', 'ADMINISTRADOR'] },
  { value: ROLES.FARMACEUTICO, label: 'Farmacéutico', apiValues: ['FARMACEUTICO', 'FARMACÉUTICO', 'EMPLEADO'] },
  { value: ROLES.AUDITOR, label: 'Auditor', apiValues: ['AUDITOR'] }
])

const ROLE_NORMALIZATION = {
  ADMIN: ROLES.ADMIN,
  ROLE_ADMIN: ROLES.ADMIN,
  EMPLEADO: ROLES.FARMACEUTICO,
  FARMACEUTICO: ROLES.FARMACEUTICO,
  FARMACÉUTICO: ROLES.FARMACEUTICO,
  ROLE_FARMACEUTICO: ROLES.FARMACEUTICO,
  ROLE_FARMACÉUTICO: ROLES.FARMACEUTICO,
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

export const getDefaultRouteByRole = (role) => {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === ROLES.AUDITOR) return '/movements'
  if (normalizedRole === ROLES.FARMACEUTICO) return '/alerts'
  return '/medicines'
}
