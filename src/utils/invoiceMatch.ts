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
      ? '目前發票總金額已符合所需發票總金額（外幣允許 ±3）。'
      : '目前發票總金額已等於所需發票總金額。'
  }
  return foreign
    ? '外幣：目前發票總金額須與所需發票總金額相差不超過 3。'
    : '目前發票總金額須等於所需發票總金額。'
}
