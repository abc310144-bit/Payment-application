export interface MonthlyVendorRow {
  key: string
  name: string
  taxId: string
  cooperationMode: string
  salesTotal: number
  commission: number
  platformFee: number
  paymentProcessingFee: number
  marketingFee: number
  eventFee: number
  logisticsFee: number
  laborFee: number
  warehouseTotal: number
  absorption: number
  specialFee: number
}

export interface MonthlySettlementTotals {
  salesTotal: number
  commission: number
  platformFee: number
  paymentProcessingFee: number
  marketingFee: number
  eventFee: number
  logisticsFee: number
  laborFee: number
  warehouseTotal: number
  adjustment: number
  payoutAmount: number
  salesUntaxed: number
  vat: number
  companyInvoiceAmount: number
}

export interface MonthlySummaryImport {
  month: string
  sheetName: string
  vendors: MonthlyVendorRow[]
}

export const MONTHLY_SETTLEMENT_FIELDS: {
  key: keyof MonthlySettlementTotals
  label: string
}[] = [
  { key: 'salesTotal', label: '銷售額加總' },
  { key: 'commission', label: '總抽成金額' },
  { key: 'platformFee', label: '平台維護費' },
  { key: 'paymentProcessingFee', label: '金流處理費' },
  { key: 'marketingFee', label: '行銷推廣費' },
  { key: 'eventFee', label: '活動贊助費' },
  { key: 'logisticsFee', label: '流程分攤費' },
  { key: 'laborFee', label: '人工處理費' },
  { key: 'warehouseTotal', label: '倉庫加總' },
  { key: 'adjustment', label: '報表調整項目' },
  { key: 'payoutAmount', label: '撥款金額' },
  { key: 'salesUntaxed', label: '銷售額合計' },
  { key: 'vat', label: '營業稅(未稅*5%)' },
  { key: 'companyInvoiceAmount', label: '貴公司開立發票金額(含稅)' },
]

export function monthlyVendorLabel(row: Pick<MonthlyVendorRow, 'name' | 'cooperationMode'>) {
  return `${row.name}（${row.cooperationMode}）`
}

export function monthlyVendorKey(taxId: string, name: string, mode: string) {
  return `um:${taxId || name}:${mode}`
}
