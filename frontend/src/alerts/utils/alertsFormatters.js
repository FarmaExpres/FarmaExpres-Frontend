export const formatDaysLabel = (days) => {
  const numericDays = Number(days)
  if (!Number.isFinite(numericDays)) return '---'
  if (numericDays < 0) return `${Math.abs(numericDays)} día(s) vencido`
  if (numericDays === 0) return 'Vence hoy'
  return `${numericDays} día(s)`
}

export const toSortedRows = (rows = []) =>
  [...rows].sort((firstRow, secondRow) => {
    if (firstRow.fechavencimiento && secondRow.fechavencimiento) {
      const dateDiff = String(firstRow.fechavencimiento).localeCompare(String(secondRow.fechavencimiento))
      if (dateDiff !== 0) return dateDiff
    }

    const codeDiff = String(firstRow.codigo || '').localeCompare(String(secondRow.codigo || ''), 'es', {
      sensitivity: 'base'
    })
    if (codeDiff !== 0) return codeDiff

    return String(firstRow.loteCodigo || '').localeCompare(String(secondRow.loteCodigo || ''), 'es', {
      sensitivity: 'base'
    })
  })

export const toRestockSuggestion = (row = {}) => {
  const stock = Number(row.stock || row.batchStock || 0)
  const minimumStock = Number(row.stockMinimo || 0)
  return `+${Math.max(minimumStock - stock, 1)} uds`
}
