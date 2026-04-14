import ExcelJS from 'exceljs'
import {
  buildByUserWorksheet,
  buildExpiringWorksheet,
  buildInventoryWorksheet,
  buildLowStockWorksheet,
  buildMovementsWorksheet,
  REPORT_THEMES
} from './export/reportExport.builders'
import { triggerExcelDownload } from './export/reportExport.download'
import {
  applyCorporateSheetStyles,
  applyInventoryFormulas,
  applySummaryStyles,
  toExcelColWidth
} from './export/reportExport.styles'

export const exportReportExcel = async ({
  tab,
  inventoryRows,
  movementsRows,
  movementsFilterKey,
  expiringRows,
  lowStockRows,
  byUserRows
}) => {
  const builders = {
    inventory: () => buildInventoryWorksheet(inventoryRows),
    movements: () => buildMovementsWorksheet(movementsRows, movementsFilterKey),
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
    wrapTextColumns: data.wrapTextColumns || [],
    theme: data.theme || REPORT_THEMES.inventory
  })

  applyInventoryFormulas(worksheet, data.formulas || null)

  if (data.summary?.rows?.length) {
    const summaryWorksheet = workbook.addWorksheet('Resumen')
    data.summary.rows.forEach((row) => summaryWorksheet.addRow(row))
    summaryWorksheet.columns = (data.summary.cols || [{ wch: 34 }, { wch: 30 }]).map((column) => ({
      width: toExcelColWidth(column.wch)
    }))
    applySummaryStyles(summaryWorksheet, data.summary.rows.length, data.summary.formats || [])
  }

  await triggerExcelDownload(workbook, data.fileName)
}
