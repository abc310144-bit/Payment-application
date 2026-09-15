import { parseAmount, roundMoney } from './money'

/** 發票加總與貴公司開立發票金額允許相差的絕對值（元，臺幣／外幣皆適用） */
export const INVOICE_AMOUNT_TOLERANCE = 3

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
  _currency?: string | null,
): boolean {
  const diff = Math.abs(roundMoney(invoiceSum) - roundMoney(target))
  return diff <= INVOICE_AMOUNT_TOLERANCE
}

export function invoiceSumHint(
  invoiceSum: number,
  target: number,
  currency?: string | null,
): string {
  if (invoiceSumMatchesTarget(invoiceSum, target, currency)) {
    return '發票加總與貴公司開立發票金額相差在 ±3 元以內，可導出／送審。'
  }
  return '發票加總與貴公司開立發票金額相差超過 ±3 元，請調整發票後再導出／送審。'
}
