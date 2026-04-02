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
  const stock = toNumber(item.stock)
  const minimum = Math.max(toNumber(item.stockMinimo), 1)
  const level = (stock / minimum) * 100
  return level <= 50 ? 'Crítico' : 'Alerta'
}

const toContentWidth = (rows = [], selector, { min = 16, max = 60, padding = 2 } = {}) => {
  const longest = rows.reduce((currentMax, row) => {
    const value = String(selector(row) || '')
    return Math.max(currentMax, value.length)
  }, 0)

  return Math.max(min, Math.min(max, longest + padding))
}

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
    cols: [{ wch: 14 }, { wch: 36 }, { wch: 12 }, { wch: 20 }, { wch: 22 }],
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

export const buildMovementsWorksheet = (rowsData = [], movementsFilterKey = 'all') => ({
  rows: buildWorksheetRows({
    reportTitle: 'Movimientos',
    header: ['Fecha', 'Hora', 'Tipo', 'Medicamento', 'Cantidad', 'Motivo', 'Detalle Ajuste', 'Usuario'],
    rows: rowsData.map((item) => [
      item.date,
      item.time,
      item.typeLabel,
      item.medicine,
      item.quantity,
      item.type === 'UPDATED' ? (item.reason || 'Ajuste de producto') : (item.reason || 'No especificado'),
      item.type === 'UPDATED'
        ? (item.adjustmentDetailText || item.adjustmentSummary || 'Sin detalle específico del ajuste')
        : '',
      item.user
    ])
  }),
  cols: [
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 30 },
    { wch: 12 },
    { wch: toContentWidth(rowsData, (item) => (item.type === 'UPDATED' ? (item.reason || 'Ajuste de producto') : (item.reason || 'No especificado')), { min: 28, max: 50 }) },
    { wch: toContentWidth(rowsData, (item) => (item.type === 'UPDATED' ? (item.adjustmentDetailText || item.adjustmentSummary || 'Sin detalle específico del ajuste') : ''), { min: 34, max: 72 }) },
    { wch: 22 }
  ],
  summary: buildSummaryWorksheet({
    reportTitle: 'Movimientos',
    summaryItems: [{ label: 'Registros exportados', value: rowsData.length }]
  }),
  numericColumns: [5],
  wrapTextColumns: [6, 7],
  theme: REPORT_THEMES.movements,
  fileName: `reporte-movimientos-${MOVEMENTS_FILTER_SUFFIX[movementsFilterKey] || MOVEMENTS_FILTER_SUFFIX.all}-${getFileTimestamp()}.xlsx`,
  sheetName: 'Movimientos'
})

export const buildExpiringWorksheet = (rowsData = []) => ({
  rows: buildWorksheetRows({
    reportTitle: 'Proximos a Vencer',
    header: ['Codigo', 'Medicamento', 'Vencimiento', 'Dias restantes', 'Stock', 'Estado'],
    rows: rowsData.map((item) => {
      const daysUntilExpiration = getDaysUntilDate(item.fechavencimiento)
      return [
        item.codigo,
        item.nombre,
        item.fechavencimiento || '---',
        daysUntilExpiration,
        item.stock,
        resolveExpiringStatus(daysUntilExpiration)
      ]
    })
  }),
  cols: [{ wch: 14 }, { wch: 36 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 }],
  summary: buildSummaryWorksheet({
    reportTitle: 'Proximos a Vencer',
    summaryItems: [{ label: 'Productos en ventana de vencimiento', value: rowsData.length }]
  }),
  numericColumns: [4, 5],
  theme: REPORT_THEMES.expiring,
  fileName: `reporte-proximos-vencer-${getFileTimestamp()}.xlsx`,
  sheetName: 'ProximosVencer'
})

export const buildLowStockWorksheet = (rowsData = []) => ({
  rows: buildWorksheetRows({
    reportTitle: 'Bajo Stock',
    header: ['Codigo', 'Medicamento', 'Stock', 'Minimo', 'Estado', 'Sugerencia de reposicion'],
    rows: rowsData.map((item) => {
      const shortage = Math.max((toNumber(item.stockMinimo) * 2) - toNumber(item.stock), 1)
      return [item.codigo, item.nombre, item.stock, item.stockMinimo, resolveLowStockStatus(item), `Reponer ${shortage} unidades`]
    })
  }),
  cols: [{ wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 36 }],
  summary: buildSummaryWorksheet({
    reportTitle: 'Bajo Stock',
    summaryItems: [{ label: 'Productos en bajo stock', value: rowsData.length }]
  }),
  numericColumns: [3, 4],
  theme: REPORT_THEMES.lowstock,
  fileName: `reporte-bajo-stock-${getFileTimestamp()}.xlsx`,
  sheetName: 'BajoStock'
})

export const buildByUserWorksheet = (rowsData = []) => ({
  rows: buildWorksheetRows({
    reportTitle: 'Por Usuario',
    header: ['Usuario', 'Rol', 'Movimientos', 'Entradas', 'Salidas'],
    rows: rowsData.map((row) => [row.user, row.roleLabel, row.totalMovements, row.entrances, row.exits])
  }),
  cols: [{ wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }],
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
