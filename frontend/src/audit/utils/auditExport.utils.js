import ExcelJS from 'exceljs'
import { triggerExcelDownload } from '../../reports/utils/export/reportExport.download'
import {
  applyCorporateSheetStyles,
  applySummaryStyles,
  toExcelColWidth
} from '../../reports/utils/export/reportExport.styles'

const AUDIT_THEME = Object.freeze({
  headerColor: 'FF6D3FF1',
  stripeColor: 'FFF8FAFF',
  totalColor: 'FFE9EEFF',
  tabColor: 'FF6D3FF1'
})

const getTimestamp = () => new Date()
  .toISOString()
  .slice(0, 19)
  .replaceAll('-', '')
  .replaceAll(':', '')
  .replaceAll('T', '')

const getReportTimestamp = () => new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(new Date())

const buildWorksheetRows = ({ reportTitle, header, rows }) => ([
  ['Reporte', reportTitle],
  ['Generado', getReportTimestamp()],
  [],
  header,
  ...rows
])

const createWorkbook = ({ sheetName, reportTitle, header, rows, columns, summaryItems, wrapTextColumns = [], numericColumns = [] }) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'FarmaExpres'
  workbook.created = new Date()

  const worksheetRows = buildWorksheetRows({ reportTitle, header, rows })
  const worksheet = workbook.addWorksheet(sheetName)
  worksheetRows.forEach((row) => worksheet.addRow(row))
  worksheet.columns = columns.map((column) => ({ width: toExcelColWidth(column.wch) }))

  applyCorporateSheetStyles({
    worksheet,
    rows: worksheetRows,
    headerLength: header.length,
    numericColumns,
    wrapTextColumns,
    theme: AUDIT_THEME
  })

  const summaryRows = [
    ['Resumen Ejecutivo', reportTitle],
    ['Generado', getReportTimestamp()],
    [],
    ...summaryItems.map((item) => [item.label, item.value])
  ]
  const summaryWorksheet = workbook.addWorksheet('Resumen')
  summaryRows.forEach((row) => summaryWorksheet.addRow(row))
  summaryWorksheet.columns = [{ width: 34 }, { width: 26 }]
  applySummaryStyles(summaryWorksheet, summaryRows.length)

  return workbook
}

export const exportAuditHistory = async (rows = []) => {
  const workbook = createWorkbook({
    sheetName: 'Historial',
    reportTitle: 'Auditoría - Historial',
    header: ['ID', 'Fecha', 'Tipo', 'Medicamento', 'Cantidad', 'Usuario', 'Motivo', 'Estado', 'Origen', 'Riesgo', 'Nota auditoría'],
    rows: rows.map((row) => [
      row.id,
      row.date,
      row.type,
      row.medicine,
      row.absoluteQuantity,
      row.user,
      row.reason,
      row.status,
      row.auditSource || '',
      row.riskScore || 0,
      row.auditNote || ''
    ]),
    columns: [
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 12 },
      { wch: 24 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 42 }
    ],
    summaryItems: [
      { label: 'Movimientos exportados', value: rows.length },
      { label: 'Movimientos marcados', value: rows.filter((row) => ['Marcado', 'En revisión'].includes(row.status)).length }
    ],
    numericColumns: [5, 10],
    wrapTextColumns: [7, 11]
  })

  await triggerExcelDownload(workbook, `auditoria-historial-${getTimestamp()}.xlsx`)
}

export const exportAuditObservations = async (rows = []) => {
  const workbook = createWorkbook({
    sheetName: 'Observaciones',
    reportTitle: 'Auditoría - Observaciones',
    header: ['Prioridad', 'Movimiento', 'Descripción', 'Usuario relacionado', 'Registrada por'],
    rows: rows.map((row) => [
      row.priority,
      row.movementId,
      row.description,
      row.user,
      row.createdBy || ''
    ]),
    columns: [
      { wch: 20 },
      { wch: 14 },
      { wch: 70 },
      { wch: 26 },
      { wch: 26 }
    ],
    summaryItems: [
      { label: 'Observaciones exportadas', value: rows.length },
      { label: 'Alta prioridad', value: rows.filter((row) => /alta/i.test(row.priority)).length },
      { label: 'Media prioridad', value: rows.filter((row) => /media/i.test(row.priority)).length },
      { label: 'Baja prioridad', value: rows.filter((row) => /baja/i.test(row.priority)).length }
    ],
    wrapTextColumns: [3]
  })

  await triggerExcelDownload(workbook, `auditoria-observaciones-${getTimestamp()}.xlsx`)
}
