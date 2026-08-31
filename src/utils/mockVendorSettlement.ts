import type {
  MonthlySettlementTotals,
  MonthlyVendorRow,
} from '../types/monthlySettlement'
import { roundMoney } from './money'

/** 原型：用總結表列組出廠商「總結」假資料，欄位對齊廠商結算報表。 */
export function buildMockVendorSettlement(
  row: MonthlyVendorRow,
): MonthlySettlementTotals {
  const salesTotal = roundMoney(row.salesTotal)
  const commission = roundMoney(row.commission)
  const platformFee = roundMoney(row.platformFee)
  const paymentProcessingFee = roundMoney(row.paymentProcessingFee)
  const marketingFee = roundMoney(row.marketingFee)
  const eventFee = roundMoney(row.eventFee)
  const logisticsFee = roundMoney(row.logisticsFee)
  const laborFee = roundMoney(row.laborFee)
  const warehouseTotal = roundMoney(row.warehouseTotal)
  const adjustment = roundMoney(row.absorption + row.specialFee)
  const payoutAmount = roundMoney(
    salesTotal -
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
  const companyInvoiceAmount = salesTotal
  const salesUntaxed = Math.round(companyInvoiceAmount / 1.05)
  const vat = roundMoney(companyInvoiceAmount - salesUntaxed)

  return {
    salesTotal,
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
