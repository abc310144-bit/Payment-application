import type { TaxFlag, VoucherLineItem } from '../types/voucher'
import { parseAmount, roundMoney } from './money'

const TAX_RATE = 1.05

export function roundInt(n: number) {
  return Math.round(n)
}

function roundByMode(n: number, decimal?: boolean) {
  return decimal ? roundMoney(n) : roundInt(n)
}

/** 單筆細項對未稅／稅額／付款金額的貢獻 */
export function calcLineContribution(
  mainTaxable: TaxFlag,
  lineTaxable: TaxFlag,
  amount: number | string,
  decimal?: boolean,
) {
  const amt = parseAmount(amount)
  const round = (n: number) => roundByMode(n, decimal)
  const effectiveLine: TaxFlag =
    mainTaxable === '未稅' ? '未稅' : lineTaxable

  if (mainTaxable === '未稅' || effectiveLine === '未稅') {
    if (mainTaxable === '未稅') {
      const pay = round(amt)
      return { untaxed: pay, tax: 0, pay }
    }
    const untaxed = round(amt)
    const pay = round(amt * TAX_RATE)
    return { untaxed, tax: round(pay - untaxed), pay }
  }

  const pay = round(amt)
  const untaxed = round(amt / TAX_RATE)
  return { untaxed, tax: round(pay - untaxed), pay }
}

export function calcVoucherTotals(
  mainTaxable: TaxFlag,
  lines: Pick<VoucherLineItem, 'taxable' | 'amount'>[],
  decimal?: boolean,
) {
  let untaxedAmount = 0
  let payAmount = 0
  for (const line of lines) {
    const c = calcLineContribution(
      mainTaxable,
      line.taxable,
      line.amount,
      decimal,
    )
    untaxedAmount += c.untaxed
    payAmount += c.pay
  }
  const round = (n: number) => roundByMode(n, decimal)
  const nextUntaxed = round(untaxedAmount)
  const nextPay = round(payAmount)
  return {
    untaxedAmount: nextUntaxed,
    taxAmount: round(nextPay - nextUntaxed),
    payAmount: nextPay,
  }
}
