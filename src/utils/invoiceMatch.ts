import { isForeignCurrency } from '../types/payment'
import { parseAmount, roundMoney } from './money'

const FOREIGN_INVOICE_TOLERANCE = 3

export function invoiceAmountSum(
  amounts: Array<number | null | undefined>,
): number {
  return roundMoney(
    amounts.reduce<number>((sum, n) => sum + parseAmount(n), 0),
  )
}

export function invoiceSumMatchesTarget(
  invoiceSum: number,
  target: number,
  currency?: string | null,
): boolean {
  const diff = Math.abs(roundMoney(invoiceSum) - roundMoney(target))
  if (isForeignCurrency(currency)) {
    return diff <= FOREIGN_INVOICE_TOLERANCE
  }
  return diff < 0.0001
}

export function invoiceSumHint(
  invoiceSum: number,
  target: number,
  currency?: string | null,
): string {
  const foreign = isForeignCurrency(currency)
  if (invoiceSumMatchesTarget(invoiceSum, target, currency)) {
    return foreign
      ? '發票金額加總已符合貴公司開立發票金額（含稅，允許 ±3）。'
      : '發票金額加總已等於貴公司開立發票金額（含稅）。'
  }
  return foreign
    ? '外幣：全部發票金額加總須與「貴公司開立發票金額(含稅)」相差不超過 3。'
    : '全部發票金額加總須等於「貴公司開立發票金額(含稅)」。'
}
