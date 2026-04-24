import * as XLSX from 'xlsx'

export interface ExportColumn<T> {
  header: string
  key: keyof T | ((row: T) => string | number | null | undefined)
  width?: number
}

/**
 * Export data rows to an Excel (.xlsx) file and trigger browser download.
 * All headers are in Arabic and the workbook is RTL-ready.
 */
export function exportToExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  fileName = 'ship-pro-export.xlsx',
  sheetName = 'البيانات'
): void {
  const header = columns.map(c => c.header)
  const data = rows.map(row =>
    columns.map(c => {
      const value = typeof c.key === 'function'
        ? c.key(row)
        : (row as unknown as Record<string, unknown>)[c.key as string]
      if (value == null) return ''
      if (value instanceof Date) return value.toISOString()
      return value as string | number
    })
  )

  const sheet = XLSX.utils.aoa_to_sheet([header, ...data])
  sheet['!cols'] = columns.map(c => ({ wch: c.width || 18 }))
  sheet['!rtl'] = true

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
  XLSX.writeFile(workbook, fileName)
}

export async function parseSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer()
  const workbook = XLSX.read(buf, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
}

export function todayStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`
}
