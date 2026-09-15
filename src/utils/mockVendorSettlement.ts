import type {
  MonthlySettlementTotals,
  MonthlyVendorRow,
} from '../types/monthlySettlement'
import { roundMoney } from './money'

function hashKey(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function totalsFromCompanyAmount(companyInvoiceAmount: number): MonthlySettlementTotals {
  const salesUntaxed = Math.round(companyInvoiceAmount / 1.05)
  const vat = roundMoney(companyInvoiceAmount - salesUntaxed)
  const commission = Math.round(companyInvoiceAmount * 0.08)
  const platformFee = 300
  const paymentProcessingFee = 150
  const marketingFee = 200
  const eventFee = 0
  const logisticsFee = 400
  const laborFee = 100
  const warehouseTotal = 250
  const adjustment = 0
  const payoutAmount = roundMoney(
    companyInvoiceAmount -
      commission -
      platformFee -
      paymentProcessingFee -
      marketingFee -
      eventFee -
      logisticsFee -
      laborFee -
      warehouseTotal -
      adjustment,
  )

  return {
    salesTotal: companyInvoiceAmount,
    commission,
    platformFee,
    paymentProcessingFee,
    marketingFee,
    eventFee,
    logisticsFee,
    laborFee,
    warehouseTotal,
    adjustment,
    payoutAmount,
    salesUntaxed,
    vat,
    companyInvoiceAmount,
  }
}

/** 原型：用總結表列組出廠商「總結」假資料，欄位對齊廠商結算報表。 */
export function buildMockVendorSettlement(
  row: MonthlyVendorRow,
): MonthlySettlementTotals {
  return totalsFromCompanyAmount(roundMoney(row.salesTotal))
}

/**
 * DEMO：依廠商＋結算月帶入月結金額（正式環境改由資料庫查詢）。
 * 金額為整數、約 8,000～23,000，方便測試發票 ±3 元。
 */
export function lookupMockUmSettlement(
  vendorId: string,
  settlementMonth: string,
): MonthlySettlementTotals | null {
  if (!vendorId || !settlementMonth) return null
  const companyInvoiceAmount = 8000 + (hashKey(`${vendorId}|${settlementMonth}`) % 15001)
  return totalsFromCompanyAmount(companyInvoiceAmount)
}
