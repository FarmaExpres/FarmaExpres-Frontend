export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  EMPLEADO: 'EMPLEADO',
  AUDITOR: 'AUDITOR'
})

export const USER_ROLE_OPTIONS = Object.freeze([
  { value: ROLES.ADMIN, label: 'Administrador', apiValues: ['ADMIN', 'ADMINISTRADOR'] },
  { value: ROLES.EMPLEADO, label: 'Farmacéutico', apiValues: ['EMPLEADO', 'FARMACEUTICO', 'FARMACÉUTICO'] },
  { value: ROLES.AUDITOR, label: 'Auditor', apiValues: ['AUDITOR'] }
])

const ROLE_NORMALIZATION = {
  ADMIN: ROLES.ADMIN,
  ROLE_ADMIN: ROLES.ADMIN,
  EMPLEADO: ROLES.EMPLEADO,
  FARMACEUTICO: ROLES.EMPLEADO,
  FARMACÉUTICO: ROLES.EMPLEADO,
  ROLE_FARMACEUTICO: ROLES.EMPLEADO,
  ROLE_FARMACÉUTICO: ROLES.EMPLEADO,
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
