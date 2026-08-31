import * as XLSX from 'xlsx'
import {
  monthlyVendorKey,
  type MonthlySummaryImport,
  type MonthlyVendorRow,
} from '../types/monthlySettlement'

const MONTH_SHEET = /^(\d{4}-\d{2})$/

function cellText(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function cellNumber(value: unknown): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

function headerIndex(headers: string[], aliases: string[]) {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h === alias || h.replace(/\s/g, '') === alias)
    if (idx >= 0) return idx
  }
  return -1
}

function normalizeHeaders(row: unknown[]): string[] {
  return row.map((cell) => cellText(cell).replace(/\s/g, ''))
}

function pickLatestMonthSheet(names: string[]): string | null {
  const months = names
    .map((name) => name.trim())
    .filter((name) => MONTH_SHEET.test(name))
  if (months.length === 0) return null
  return months.sort()[months.length - 1]
}

export function parseMonthlySummaryWorkbook(data: ArrayBuffer): MonthlySummaryImport {
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = pickLatestMonthSheet(workbook.SheetNames)
  if (!sheetName) {
    throw new Error('找不到 YYYY-MM 月份分頁，請確認這是月結總結表。')
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  })
  if (rows.length < 2) {
    throw new Error(`分頁「${sheetName}」沒有廠商資料。`)
  }

  const headers = normalizeHeaders(rows[0] ?? [])
  const nameIdx = headerIndex(headers, ['廠商名稱'])
  const modeIdx = headerIndex(headers, ['合作模式'])
  const taxIdx = headerIndex(headers, ['統一編號'])
  const salesIdx = headerIndex(headers, ['銷售總額', '貨款加總', '銷售額加總'])
  const commissionIdx = headerIndex(headers, ['抽成', '總抽成金額'])
  const platformIdx = headerIndex(headers, ['平台維護費'])
  const paymentIdx = headerIndex(headers, ['金流處理費'])
  const marketingIdx = headerIndex(headers, ['行銷推廣費'])
  const eventIdx = headerIndex(headers, ['活動贊助費'])
  const logisticsIdx = headerIndex(headers, ['運費攤提', '物流分攤費'])
  const laborIdx = headerIndex(headers, ['人工處理費'])
  const warehouseIdx = headerIndex(headers, ['倉租加總', '倉庫加總'])
  const absorptionIdx = headerIndex(headers, ['吸收額', '報表調整項目'])
  const specialIdx = headerIndex(headers, ['特殊費用', '廣告方案費用'])

  if (nameIdx < 0) {
    throw new Error(`分頁「${sheetName}」缺少「廠商名稱」欄。`)
  }

  const vendors: MonthlyVendorRow[] = []
  const seen = new Set<string>()

  for (const row of rows.slice(1)) {
    if (!Array.isArray(row)) continue
    const name = cellText(row[nameIdx])
    if (!name) continue
    const cooperationMode = modeIdx >= 0 ? cellText(row[modeIdx]) || '未填合作模式' : '未填合作模式'
    const taxRaw = taxIdx >= 0 ? cellText(row[taxIdx]).replace(/\D/g, '') : ''
    const taxId = taxRaw ? taxRaw.padStart(8, '0').slice(-8) : ''
    const key = monthlyVendorKey(taxId, name, cooperationMode)
    if (seen.has(key)) continue
    seen.add(key)

    vendors.push({
      key,
      name,
      taxId: /^\d{8}$/.test(taxId) ? taxId : '',
      cooperationMode,
      salesTotal: salesIdx >= 0 ? cellNumber(row[salesIdx]) : 0,
      commission: commissionIdx >= 0 ? cellNumber(row[commissionIdx]) : 0,
      platformFee: platformIdx >= 0 ? cellNumber(row[platformIdx]) : 0,
      paymentProcessingFee: paymentIdx >= 0 ? cellNumber(row[paymentIdx]) : 0,
      marketingFee: marketingIdx >= 0 ? cellNumber(row[marketingIdx]) : 0,
      eventFee: eventIdx >= 0 ? cellNumber(row[eventIdx]) : 0,
      logisticsFee: logisticsIdx >= 0 ? cellNumber(row[logisticsIdx]) : 0,
      laborFee: laborIdx >= 0 ? cellNumber(row[laborIdx]) : 0,
      warehouseTotal: warehouseIdx >= 0 ? cellNumber(row[warehouseIdx]) : 0,
      absorption: absorptionIdx >= 0 ? cellNumber(row[absorptionIdx]) : 0,
      specialFee: specialIdx >= 0 ? cellNumber(row[specialIdx]) : 0,
    })
  }

  if (vendors.length === 0) {
    throw new Error(`分頁「${sheetName}」沒有可匯入的廠商列。`)
  }

  return {
    month: sheetName,
    sheetName,
    vendors,
  }
}
