import { getDaysUntilDate, getFileTimestamp, getReportTimestamp, toNumber } from '../reportFormatters'

export const REPORT_THEMES = Object.freeze({
  inventory: { headerColor: 'FF6D3FF1', stripeColor: 'FFF8FAFF', totalColor: 'FFE9EEFF', tabColor: 'FF6D3FF1' },
  movements: { headerColor: 'FF3366CC', stripeColor: 'FFF5F9FF', totalColor: 'FFE8F2FF', tabColor: 'FF3366CC' },
  expiring: { headerColor: 'FFB36B00', stripeColor: 'FFFFFAF2', totalColor: 'FFFFF1DB', tabColor: 'FFB36B00' },
  lowstock: { headerColor: 'FFB4232D', stripeColor: 'FFFFF6F7', totalColor: 'FFFFE8EB', tabColor: 'FFB4232D' },
  byuser: { headerColor: 'FF0F766E', stripeColor: 'FFF3FCFA', totalColor: 'FFE4F7F4', tabColor: 'FF0F766E' }
})

const MOVEMENTS_FILTER_SUFFIX = Object.freeze({
  all: 'todos',
  entrance: 'entradas',
  exit: 'salidas',
  adjustment: 'ajustes'
})

const resolveExpiringStatus = (daysUntilExpiration) => {
  const days = Number(daysUntilExpiration)

  if (!Number.isFinite(days)) return 'Sin fecha'
  if (days < 0) return 'Vencido'
  if (days <= 7) return 'Crítico'
  if (days <= 15) return 'Alto'
  if (days <= 30) return 'Medio'
  return 'Controlado'
}

const resolveLowStockStatus = (item = {}) => {
  const backendSeverity = String(item.severity || item.lowStockLevel || '').trim()
  if (backendSeverity) return backendSeverity

  const backendStatus = String(item.status || '').trim()
  if (backendStatus) return backendStatus
  return 'Sin clasificación'
}

const resolveLowStockSuggestion = (item = {}) => {
  const backendSuggestion = String(item.suggestion || '').trim()
  if (backendSuggestion) return backendSuggestion
  const shortage = Math.max((toNumber(item.stockMinimo) * 2) - toNumber(item.stock), 1)
  return `Reponer ${shortage} unidades`
}

const resolveUserActivity = (row = {}) => {
  const backendActivityLevel = String(row.activityLevel || '').trim()
  if (backendActivityLevel) return backendActivityLevel
  const totalMovements = toNumber(row.totalMovements)
  if (totalMovements >= 20) return 'Alta'
  if (totalMovements >= 8) return 'Media'
  return 'Baja'
}

const toContentWidth = (rows = [], selector, { min = 16, max = 60, padding = 2, header = '' } = {}) => {
  const longest = rows.reduce((currentMax, row) => {
    const value = String(selector(row) || '')
    return Math.max(currentMax, value.length)
  }, String(header || '').length)

  return Math.max(min, Math.min(max, longest + padding))
}

const resolveBatchCode = (item = {}) =>
  String(
    item?.loteCodigo ??
    item?.batchCode ??
    item?.batch?.code ??
    item?.lotCode ??
    ''
  ).trim()

const resolveBatchExpiration = (item = {}) =>
  String(
    item?.batchExpirationDate ??
    item?.fechavencimiento ??
    item?.expirationDate ??
    item?.batch?.expirationDate ??
    ''
  ).trim()

const buildWorksheetRows = ({ reportTitle, header, rows }) => ([
  ['Reporte', reportTitle],
  ['Generado', getReportTimestamp()],
  [],
  header,
  ...rows
])

const buildSummaryWorksheet = ({ reportTitle, summaryItems = [] }) => {
  const summaryRows = [
    ['Resumen Ejecutivo', reportTitle],
    ['Generado', getReportTimestamp()],
    []
  ]
  const formats = []

  summaryItems.forEach((item) => {
    summaryRows.push([item.label, item.value])
    const rowNumber = summaryRows.length
    if (item?.numFmt) formats.push({ row: rowNumber, col: 2, numFmt: item.numFmt })
  })

  return {
    rows: summaryRows,
    cols: [{ wch: 34 }, { wch: 30 }, { wch: 24 }],
    formats
  }
}

export const buildInventoryWorksheet = (rowsData = []) => {
  const header = ['Codigo', 'Nombre', 'Stock', 'Precio Unitario (COP)', 'Valor Total (COP)']
  const rows = rowsData.map((item) => [item.codigo, item.nombre, toNumber(item.stock), toNumber(item.precio), null])
  rows.push([])
  rows.push(['', '', '', 'TOTAL GENERAL', null])

  const dataStartRow = 5
  const dataEndRow = 4 + rowsData.length
  const totalRow = rowsData.length > 0 ? rowsData.length + 6 : null

  return {
    rows: buildWorksheetRows({ reportTitle: 'Inventario Actual', header, rows }),
    cols: [
      { wch: toContentWidth(rowsData, (item) => item.codigo, { min: 12, max: 22, header: header[0] }) },
      { wch: toContentWidth(rowsData, (item) => item.nombre, { min: 24, max: 46, header: header[1] }) },
      { wch: toContentWidth(rowsData, (item) => String(toNumber(item.stock)), { min: 10, max: 16, header: header[2] }) },
      { wch: toContentWidth(rowsData, (item) => String(toNumber(item.precio)), { min: 18, max: 24, header: header[3] }) },
      { wch: 22 }
    ],
    formulas: rowsData.length > 0
      ? { valueTotalColumn: 5, stockColumn: 3, priceColumn: 4, dataStartRow, dataEndRow, totalRow }
      : null,
    summary: buildSummaryWorksheet({
      reportTitle: 'Inventario Actual',
      summaryItems: rowsData.length > 0
        ? [
          { label: 'Productos visibles', value: { formula: `COUNTA(Inventario!A${dataStartRow}:A${dataEndRow})` }, numFmt: '#,##0' },
          { label: 'Unidades en inventario', value: { formula: `SUM(Inventario!C${dataStartRow}:C${dataEndRow})` }, numFmt: '#,##0' },
          { label: 'Valor total general (COP)', value: { formula: `SUM(Inventario!E${dataStartRow}:E${dataEndRow})` }, numFmt: '"$" #,##0' }
        ]
        : [
          { label: 'Productos visibles', value: 0, numFmt: '#,##0' },
          { label: 'Unidades en inventario', value: 0, numFmt: '#,##0' },
          { label: 'Valor total general (COP)', value: 0, numFmt: '"$" #,##0' }
        ]
    }),
    numericColumns: [3],
    currencyColumns: [4, 5],
    theme: REPORT_THEMES.inventory,
    fileName: `reporte-inventario-actual-${getFileTimestamp()}.xlsx`,
    sheetName: 'Inventario'
  }
}

export const buildMovementsWorksheet = (rowsData = [], movementsFilterKey = 'all') => {
  const header = ['Fecha', 'Hora', 'Tipo', 'Medicamento', 'Cantidad', 'Código de lote', 'Vencimiento de lote', 'Motivo', 'Detalle de ajuste', 'Usuario']

  return ({
    rows: buildWorksheetRows({
      reportTitle: 'Movimientos',
      header,
      rows: rowsData.map((item) => [
        item.date,
        item.time,
        item.typeLabel,
        item.medicine,
        item.quantity,
        resolveBatchCode(item) || 'Sin lote',
        resolveBatchExpiration(item) || '---',
        item.type === 'UPDATED' ? (item.reason || 'Ajuste de producto') : (item.reason || 'No especificado'),
        item.type === 'UPDATED'
          ? (item.adjustmentDetailText || item.adjustmentSummary || 'Sin detalle específico del ajuste')
          : '',
        item.user
      ])
    }),
    cols: [
      { wch: toContentWidth(rowsData, (item) => item.date, { min: 12, max: 16, header: header[0] }) },
      { wch: toContentWidth(rowsData, (item) => item.time, { min: 10, max: 14, header: header[1] }) },
      { wch: toContentWidth(rowsData, (item) => item.typeLabel, { min: 10, max: 16, header: header[2] }) },
      { wch: toContentWidth(rowsData, (item) => item.medicine, { min: 22, max: 40, header: header[3] }) },
      { wch: toContentWidth(rowsData, (item) => String(item.quantity ?? ''), { min: 12, max: 16, header: header[4] }) },
      { wch: toContentWidth(rowsData, (item) => resolveBatchCode(item) || 'Sin lote', { min: 16, max: 24, header: header[5] }) },
      { wch: toContentWidth(rowsData, (item) => resolveBatchExpiration(item) || '---', { min: 16, max: 22, header: header[6] }) },
      { wch: toContentWidth(rowsData, (item) => (item.type === 'UPDATED' ? (item.reason || 'Ajuste de producto') : (item.reason || 'No especificado')), { min: 24, max: 52, header: header[7] }) },
      { wch: toContentWidth(rowsData, (item) => (item.type === 'UPDATED' ? (item.adjustmentDetailText || item.adjustmentSummary || 'Sin detalle específico del ajuste') : ''), { min: 30, max: 72, header: header[8] }) },
      { wch: toContentWidth(rowsData, (item) => item.user, { min: 18, max: 30, header: header[9] }) }
    ],
  summary: buildSummaryWorksheet({
    reportTitle: 'Movimientos',
    summaryItems: [{ label: 'Registros exportados', value: rowsData.length }]
  }),
  numericColumns: [5],
  wrapTextColumns: [8, 9],
  theme: REPORT_THEMES.movements,
  fileName: `reporte-movimientos-${MOVEMENTS_FILTER_SUFFIX[movementsFilterKey] || MOVEMENTS_FILTER_SUFFIX.all}-${getFileTimestamp()}.xlsx`,
  sheetName: 'Movimientos'
  })
}

export const buildExpiringWorksheet = (rowsData = []) => {
  const header = ['Codigo', 'Medicamento', 'Lote', 'Vencimiento', 'Dias restantes', 'Stock', 'Estado']

  return ({
    rows: buildWorksheetRows({
      reportTitle: 'Proximos a Vencer',
      header,
      rows: rowsData.map((item) => {
        const expirationDate = resolveBatchExpiration(item) || '---'
        const daysUntilExpiration = getDaysUntilDate(expirationDate)
        return [
          item.codigo,
          item.nombre,
          resolveBatchCode(item) || 'Sin lote',
          expirationDate,
          daysUntilExpiration,
          item.batchStock ?? item.stock,
          resolveExpiringStatus(daysUntilExpiration)
        ]
      })
    }),
    cols: [
      { wch: toContentWidth(rowsData, (item) => item.codigo, { min: 12, max: 20, header: header[0] }) },
      { wch: toContentWidth(rowsData, (item) => item.nombre, { min: 22, max: 40, header: header[1] }) },
      { wch: toContentWidth(rowsData, (item) => resolveBatchCode(item) || 'Sin lote', { min: 14, max: 24, header: header[2] }) },
      { wch: toContentWidth(rowsData, (item) => resolveBatchExpiration(item) || '---', { min: 14, max: 20, header: header[3] }) },
      { wch: toContentWidth(rowsData, (item) => String(getDaysUntilDate(resolveBatchExpiration(item) || '')), { min: 14, max: 18, header: header[4] }) },
      { wch: toContentWidth(rowsData, (item) => String(item.batchStock ?? item.stock ?? ''), { min: 10, max: 14, header: header[5] }) },
      { wch: toContentWidth(rowsData, (item) => resolveExpiringStatus(getDaysUntilDate(resolveBatchExpiration(item) || '---')), { min: 12, max: 18, header: header[6] }) }
    ],
  summary: buildSummaryWorksheet({
    reportTitle: 'Proximos a Vencer',
    summaryItems: [{ label: 'Productos en ventana de vencimiento', value: rowsData.length }]
  }),
  numericColumns: [5, 6],
  theme: REPORT_THEMES.expiring,
  fileName: `reporte-proximos-vencer-${getFileTimestamp()}.xlsx`,
  sheetName: 'ProximosVencer'
  })
}

export const buildLowStockWorksheet = (rowsData = []) => {
  const header = ['Codigo', 'Medicamento', 'Lote', 'Vencimiento lote', 'Stock', 'Minimo', 'Estado', 'Sugerencia de reposicion']

  return ({
    rows: buildWorksheetRows({
      reportTitle: 'Bajo Stock',
      header,
      rows: rowsData.map((item) => [
        item.codigo,
        item.nombre,
        resolveBatchCode(item) || 'Sin lote',
        resolveBatchExpiration(item) || '---',
        item.batchStock ?? item.stock,
        item.stockMinimo,
        resolveLowStockStatus(item),
        resolveLowStockSuggestion(item)
      ])
    }),
    cols: [
      { wch: toContentWidth(rowsData, (item) => item.codigo, { min: 12, max: 20, header: header[0] }) },
      { wch: toContentWidth(rowsData, (item) => item.nombre, { min: 22, max: 40, header: header[1] }) },
      { wch: toContentWidth(rowsData, (item) => resolveBatchCode(item) || 'Sin lote', { min: 14, max: 24, header: header[2] }) },
      { wch: toContentWidth(rowsData, (item) => resolveBatchExpiration(item) || '---', { min: 14, max: 20, header: header[3] }) },
      { wch: toContentWidth(rowsData, (item) => String(item.batchStock ?? item.stock ?? ''), { min: 10, max: 14, header: header[4] }) },
      { wch: toContentWidth(rowsData, (item) => String(item.stockMinimo ?? ''), { min: 10, max: 14, header: header[5] }) },
      { wch: toContentWidth(rowsData, (item) => resolveLowStockStatus(item), { min: 12, max: 18, header: header[6] }) },
      { wch: toContentWidth(rowsData, (item) => resolveLowStockSuggestion(item), { min: 26, max: 52, header: header[7] }) }
    ],
  summary: buildSummaryWorksheet({
    reportTitle: 'Bajo Stock',
    summaryItems: [{ label: 'Productos en bajo stock', value: rowsData.length }]
  }),
  numericColumns: [5, 6],
  theme: REPORT_THEMES.lowstock,
  fileName: `reporte-bajo-stock-${getFileTimestamp()}.xlsx`,
  sheetName: 'BajoStock'
  })
}

export const buildByUserWorksheet = (rowsData = []) => ({
  rows: buildWorksheetRows({
    reportTitle: 'Por Usuario',
    header: ['Usuario', 'Rol', 'Movimientos', 'Entradas', 'Salidas', 'Actividad'],
    rows: rowsData.map((row) => [
      row.user,
      row.roleLabel,
      row.totalMovements,
      row.entrances,
      row.exits,
      resolveUserActivity(row)
    ])
  }),
  cols: [
    { wch: toContentWidth(rowsData, (row) => row.user, { min: 20, max: 38, header: 'Usuario' }) },
    { wch: toContentWidth(rowsData, (row) => row.roleLabel, { min: 12, max: 22, header: 'Rol' }) },
    { wch: toContentWidth(rowsData, (row) => String(row.totalMovements ?? ''), { min: 12, max: 16, header: 'Movimientos' }) },
    { wch: toContentWidth(rowsData, (row) => String(row.entrances ?? ''), { min: 10, max: 14, header: 'Entradas' }) },
    { wch: toContentWidth(rowsData, (row) => String(row.exits ?? ''), { min: 10, max: 14, header: 'Salidas' }) },
    { wch: toContentWidth(rowsData, (row) => resolveUserActivity(row), { min: 10, max: 14, header: 'Actividad' }) }
  ],
  summary: buildSummaryWorksheet({
    reportTitle: 'Por Usuario',
    summaryItems: [
      { label: 'Usuarios con movimientos', value: rowsData.length },
      { label: 'Movimientos consolidados', value: rowsData.reduce((sum, row) => sum + row.totalMovements, 0) }
    ]
  }),
  numericColumns: [3, 4, 5],
  theme: REPORT_THEMES.byuser,
  fileName: `reporte-por-usuario-${getFileTimestamp()}.xlsx`,
  sheetName: 'PorUsuario'
})
