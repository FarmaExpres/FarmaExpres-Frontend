const NAME_ALLOWED_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/
const EMAIL_ALLOWED_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/

export const isValidPersonName = (value) => {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return false
  return NAME_ALLOWED_PATTERN.test(normalizedValue)
}

export const sanitizePersonNameInput = (value) =>
  String(value || '')
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '')
    .replace(/\s{2,}/g, ' ')

export const isValidBusinessEmail = (value) => {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return false
  if (!EMAIL_ALLOWED_PATTERN.test(normalizedValue)) return false

  const domainPart = normalizedValue.split('@')[1] || ''
  const domainLabels = domainPart.toLowerCase().split('.').filter(Boolean)
  const hasPunycodeLabel = domainLabels.some((label) => label.startsWith('xn--'))
  const hasInvalidDomainLabel = domainLabels.some((label) => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
  const topLevelDomain = domainLabels[domainLabels.length - 1] || ''
  const isInvalidTopLevelDomain = !/^[a-z]{2,}$/.test(topLevelDomain)

  // Se restringe dominio internacionalizado para evitar guardar correos
  // transformados automáticamente (ej. "gmailñ.com" -> "xn--...").
  if (hasPunycodeLabel) return false
  if (hasInvalidDomainLabel) return false
  if (isInvalidTopLevelDomain) return false

  return true
}
