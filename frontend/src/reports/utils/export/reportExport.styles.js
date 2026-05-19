export const toExcelColWidth = (wch) => {
  const parsed = Number(wch)
  if (!Number.isFinite(parsed) || parsed <= 0) return 14
  return parsed
}

export const applyCorporateSheetStyles = ({
  worksheet,
  rows,
  headerLength,
  currencyColumns = [],
  numericColumns = [],
  wrapTextColumns = [],
  theme
}) => {
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
  wrapTextColumns.forEach((columnIndex) => {
    worksheet.getColumn(columnIndex).alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
  })
  worksheet.getColumn(1).alignment = { horizontal: 'left', vertical: 'middle' }
  worksheet.getColumn(2).alignment = { horizontal: 'left', vertical: 'middle' }
}

export const applyInventoryFormulas = (worksheet, formulas) => {
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

export const applySummaryStyles = (worksheet, rowCount = 0, formats = []) => {
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
