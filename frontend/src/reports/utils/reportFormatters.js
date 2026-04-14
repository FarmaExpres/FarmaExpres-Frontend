import { normalizeIdentity as normalizeIdentityText } from '../../shared/utils/text.utils'

export const normalizeIdentity = (value) => normalizeIdentityText(value)

export const toNumber = (value) => {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

export const formatCurrency = (value) => {
  const parsedValue = Number(value) || 0
  return parsedValue.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

export const formatCurrencyCell = (value) => `$ ${formatCurrency(value)}`

export const getDaysUntilDate = (isoDate) => {
  if (!isoDate) return Number.POSITIVE_INFINITY
  const targetDate = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) return Number.POSITIVE_INFINITY

  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const msDiff = targetDate.getTime() - startToday.getTime()
  return Math.floor(msDiff / (1000 * 60 * 60 * 24))
}

export const getReportTimestamp = () => new Date().toLocaleString('es-CO', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

export const getFileTimestamp = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  return `${year}${month}${day}-${hour}${minute}`
}
