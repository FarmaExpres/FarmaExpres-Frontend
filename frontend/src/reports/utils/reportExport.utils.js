import ExcelJS from 'exceljs'
import { getDaysUntilDate, getFileTimestamp, getReportTimestamp, toNumber } from './reportFormatters'

const REPORT_THEMES = Object.freeze({
  inventory: { headerColor: 'FF6D3FF1', stripeColor: 'FFF8FAFF', totalColor: 'FFE9EEFF', tabColor: 'FF6D3FF1' },
  movements: { headerColor: 'FF3366CC', stripeColor: 'FFF5F9FF', totalColor: 'FFE8F2FF', tabColor: 'FF3366CC' },
  expiring: { headerColor: 'FFB36B00', stripeColor: 'FFFFFAF2', totalColor: 'FFFFF1DB', tabColor: 'FFB36B00' },
  lowstock: { headerColor: 'FFB4232D', stripeColor: 'FFFFF6F7', totalColor: 'FFFFE8EB', tabColor: 'FFB4232D' },
  byuser: { headerColor: 'FF0F766E', stripeColor: 'FFF3FCFA', totalColor: 'FFE4F7F4', tabColor: 'FF0F766E' }
})

const toExcelColWidth = (wch) => {
  const parsed = Number(wch)
  if (!Number.isFinite(parsed) || parsed <= 0) return 14
  return parsed
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

const buildInventoryWorksheet = (rowsData = []) => {
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

const buildMovementsWorksheet = (rowsData = []) => ({
  rows: buildWorksheetRows({
    reportTitle: 'Movimientos',
    header: ['Fecha', 'Hora', 'Tipo', 'Medicamento', 'Cantidad', 'Usuario'],
    rows: rowsData.map((item) => [item.date, item.time, item.typeLabel, item.medicine, item.quantity, item.user])
  }),
  cols: [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 34 }, { wch: 12 }, { wch: 28 }],
  summary: buildSummaryWorksheet({
    reportTitle: 'Movimientos',
    summaryItems: [{ label: 'Registros exportados', value: rowsData.length }]
  }),
  numericColumns: [5],
  theme: REPORT_THEMES.movements,
  fileName: `reporte-movimientos-${getFileTimestamp()}.xlsx`,
  sheetName: 'Movimientos'
})

const buildExpiringWorksheet = (rowsData = []) => ({
  rows: buildWorksheetRows({
    reportTitle: 'Proximos a Vencer',
    header: ['Codigo', 'Medicamento', 'Vencimiento', 'Dias restantes', 'Stock'],
    rows: rowsData.map((item) => [item.codigo, item.nombre, item.fechavencimiento || '---', getDaysUntilDate(item.fechavencimiento), item.stock])
  }),
  cols: [{ wch: 14 }, { wch: 36 }, { wch: 16 }, { wch: 16 }, { wch: 10 }],
  summary: buildSummaryWorksheet({
    reportTitle: 'Proximos a Vencer',
    summaryItems: [{ label: 'Productos en ventana de vencimiento', value: rowsData.length }]
  }),
  numericColumns: [4, 5],
  theme: REPORT_THEMES.expiring,
  fileName: `reporte-proximos-vencer-${getFileTimestamp()}.xlsx`,
  sheetName: 'ProximosVencer'
})

const buildLowStockWorksheet = (rowsData = []) => ({
  rows: buildWorksheetRows({
    reportTitle: 'Bajo Stock',
    header: ['Codigo', 'Medicamento', 'Stock', 'Minimo', 'Sugerencia de reposicion'],
    rows: rowsData.map((item) => {
      const shortage = Math.max((toNumber(item.stockMinimo) * 2) - toNumber(item.stock), 1)
      return [item.codigo, item.nombre, item.stock, item.stockMinimo, `Reponer ${shortage} unidades`]
    })
  }),
  cols: [{ wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 30 }],
  summary: buildSummaryWorksheet({
    reportTitle: 'Bajo Stock',
    summaryItems: [{ label: 'Productos en bajo stock', value: rowsData.length }]
  }),
  numericColumns: [3, 4],
  theme: REPORT_THEMES.lowstock,
  fileName: `reporte-bajo-stock-${getFileTimestamp()}.xlsx`,
  sheetName: 'BajoStock'
})

const buildByUserWorksheet = (rowsData = []) => ({
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

const applyCorporateSheetStyles = ({ worksheet, rows, headerLength, currencyColumns = [], numericColumns = [], theme }) => {
  worksheet.views = [{ state: 'frozen', ySplit: 4 }]
  worksheet.properties.tabColor = { argb: theme.tabColor }
  worksheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headerLength } }

  const borderStyle = {
    top: { style: 'thin', color: { argb: 'FFE2E8F3' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F3' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F3' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F3' } }
  }

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FF1F3561' }, size: 12 }
  worksheet.getRow(2).font = { color: { argb: 'FF5F729A' }, size: 10 }

  const headerRow = worksheet.getRow(4)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10.5 }
  headerRow.height = 22

  for (let colIndex = 1; colIndex <= headerLength; colIndex += 1) {
    headerRow.getCell(colIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.headerColor } }
  }

  for (let rowIndex = 4; rowIndex <= rows.length; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex)
    const isHeader = rowIndex === 4
    const hasData = row.values.some((value, index) => index > 0 && value !== null && value !== '')
    if (!hasData && !isHeader) continue

    for (let colIndex = 1; colIndex <= headerLength; colIndex += 1) {
      const cell = row.getCell(colIndex)
      cell.border = borderStyle
      if (!isHeader) {
        const isTotalLabel = String(row.getCell(4).value || '').toUpperCase().includes('TOTAL GENERAL')
        if (isTotalLabel) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.totalColor } }
          row.font = { bold: true, color: { argb: 'FF1F3561' } }
        } else if (rowIndex % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.stripeColor } }
        }
      }
    }
  }

  currencyColumns.forEach((columnIndex) => {
    worksheet.getColumn(columnIndex).numFmt = '"$" #,##0'
    worksheet.getColumn(columnIndex).alignment = { horizontal: 'left', vertical: 'middle' }
  })
  numericColumns.forEach((columnIndex) => {
    worksheet.getColumn(columnIndex).numFmt = '#,##0'
    worksheet.getColumn(columnIndex).alignment = { horizontal: 'left', vertical: 'middle' }
  })
  worksheet.getColumn(1).alignment = { horizontal: 'left', vertical: 'middle' }
  worksheet.getColumn(2).alignment = { horizontal: 'left', vertical: 'middle' }
}

const applyInventoryFormulas = (worksheet, formulas) => {
  if (!formulas) return
  const { valueTotalColumn, stockColumn, priceColumn, dataStartRow, dataEndRow, totalRow } = formulas
  const toColumnLetter = (columnIndex) => {
    let dividend = columnIndex
    let columnName = ''
    while (dividend > 0) {
      const modulo = (dividend - 1) % 26
      columnName = String.fromCharCode(65 + modulo) + columnName
      dividend = Math.floor((dividend - modulo) / 26)
    }
    return columnName
  }
  const s = toColumnLetter(stockColumn)
  const p = toColumnLetter(priceColumn)
  const v = toColumnLetter(valueTotalColumn)

  for (let rowIndex = dataStartRow; rowIndex <= dataEndRow; rowIndex += 1) {
    worksheet.getRow(rowIndex).getCell(valueTotalColumn).value = { formula: `${s}${rowIndex}*${p}${rowIndex}` }
  }
  if (totalRow) {
    worksheet.getRow(totalRow).getCell(valueTotalColumn).value = { formula: `SUM(${v}${dataStartRow}:${v}${dataEndRow})` }
  }
}

const applySummaryStyles = (worksheet, rowCount = 0, formats = []) => {
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FF1F3561' }, size: 12 }
  worksheet.getRow(2).font = { color: { argb: 'FF5F729A' }, size: 10 }
  for (let rowIndex = 4; rowIndex <= rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex)
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F3' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F3' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F3' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F3' } }
      }
    })
    if (rowIndex % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFF' } }
    }
  }
  formats.forEach((formatRule) => {
    const targetCell = worksheet.getRow(formatRule.row).getCell(formatRule.col)
    targetCell.numFmt = formatRule.numFmt
    targetCell.alignment = { horizontal: 'left', vertical: 'middle' }
  })
}

const triggerExcelDownload = async (workbook, fileName) => {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const exportReportExcel = async ({ tab, inventoryRows, movementsRows, expiringRows, lowStockRows, byUserRows }) => {
  const builders = {
    inventory: () => buildInventoryWorksheet(inventoryRows),
    movements: () => buildMovementsWorksheet(movementsRows),
    expiring: () => buildExpiringWorksheet(expiringRows),
    lowstock: () => buildLowStockWorksheet(lowStockRows),
    byuser: () => buildByUserWorksheet(byUserRows)
  }

  const buildData = builders[tab]
  if (!buildData) return

  const data = buildData()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'FarmaExpres'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(data.sheetName)
  data.rows.forEach((row) => worksheet.addRow(row))
  worksheet.columns = (data.cols || []).map((column) => ({ width: toExcelColWidth(column.wch) }))
  applyCorporateSheetStyles({
    worksheet,
    rows: data.rows,
    headerLength: data.rows[3]?.length || 1,
    currencyColumns: data.currencyColumns || [],
    numericColumns: data.numericColumns || [],
    theme: data.theme || REPORT_THEMES.inventory
  })
  applyInventoryFormulas(worksheet, data.formulas || null)

  if (data.summary?.rows?.length) {
    const summaryWorksheet = workbook.addWorksheet('Resumen')
    data.summary.rows.forEach((row) => summaryWorksheet.addRow(row))
    summaryWorksheet.columns = (data.summary.cols || [{ wch: 34 }, { wch: 30 }]).map((column) => ({ width: toExcelColWidth(column.wch) }))
    applySummaryStyles(summaryWorksheet, data.summary.rows.length, data.summary.formats || [])
  }

  await triggerExcelDownload(workbook, data.fileName)
}
