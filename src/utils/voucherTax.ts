import type { TaxFlag, VoucherLineItem } from '../types/voucher'
import { parseAmount, roundMoney } from './money'

const TAX_RATE = 1.05

export function roundInt(n: number) {
  return Math.round(n)
}

function roundByMode(n: number, decimal?: boolean) {
  return decimal ? roundMoney(n) : roundInt(n)
}

/** 零稅率／免稅／未選：計算比照舊「未稅」（稅額 0） */
export function isExemptTaxMode(flag: TaxFlag | '' | null | undefined) {
  return flag !== '應稅'
}

/** 舊資料「未稅」對應為「免稅」 */
export function normalizeTaxFlag(
  flag: string | null | undefined,
): TaxFlag | '' {
  if (flag === '未稅') return '免稅'
  if (flag === '應稅' || flag === '零稅率' || flag === '免稅') return flag
  return ''
}

/** 單筆細項對未稅／稅額／付款金額的貢獻（細項稅別跟主檔） */
export function calcLineContribution(
  mainTaxable: TaxFlag | '',
  amount: number | string,
  decimal?: boolean,
) {
  const amt = parseAmount(amount)
  const round = (n: number) => roundByMode(n, decimal)

  if (isExemptTaxMode(mainTaxable)) {
    const pay = round(amt)
    return { untaxed: pay, tax: 0, pay }
  }

  const pay = round(amt)
  const untaxed = round(amt / TAX_RATE)
  return { untaxed, tax: round(pay - untaxed), pay }
}

export function calcVoucherTotals(
  mainTaxable: TaxFlag | '',
  lines: Pick<VoucherLineItem, 'amount'>[],
  decimal?: boolean,
) {
  let untaxedAmount = 0
  let payAmount = 0
  for (const line of lines) {
    const c = calcLineContribution(mainTaxable, line.amount, decimal)
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
