import { isForeignCurrency } from '../types/payment'

export const AMOUNT_DECIMALS = 3
export const FOREIGN_MIN_AMOUNT = 0.001

const SCALE = 10 ** AMOUNT_DECIMALS

export function allowsDecimalAmount(
  currency?: string | null,
): boolean {
  return isForeignCurrency(currency)
}

export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * SCALE) / SCALE
}

export function parseAmount(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  return Number.isFinite(n) ? n : 0
}

export function sanitizeAmountInput(value: string, allowDecimal: boolean): string {
  if (!allowDecimal) return value.replace(/\D/g, '')
  const next = value.replace(/[^\d.]/g, '')
  const dot = next.indexOf('.')
  if (dot < 0) return next
  const intPart = next.slice(0, dot)
  const frac = next.slice(dot + 1).replace(/\./g, '').slice(0, AMOUNT_DECIMALS)
  return `${intPart}.${frac}`
}

export function amountInputFromValue(
  value: number | string | null | undefined,
  allowDecimal: boolean,
): string {
  if (value == null || value === '') return ''
  const n = parseAmount(value)
  if (n <= 0) return ''
  if (!allowDecimal) return String(Math.trunc(n))
  return String(roundMoney(n))
}

export function isCompleteAmountInput(
  value: string,
  allowDecimal: boolean,
): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '.' || trimmed.endsWith('.')) return false
  if (!allowDecimal) return /^[1-9]\d*$/.test(trimmed)
  if (!/^\d*\.?\d+$/.test(trimmed)) return false
  const frac = trimmed.split('.')[1]
  if (frac && frac.length > AMOUNT_DECIMALS) return false
  return parseAmount(trimmed) >= FOREIGN_MIN_AMOUNT
}

export function amountInputError(
  value: string,
  allowDecimal: boolean,
): string | undefined {
  if (isCompleteAmountInput(value, allowDecimal)) return undefined
  return allowDecimal
    ? '請輸入至少 0.001 的金額（最多三位小數）'
    : '請輸入正整數金額'
}

export function commitAmount(
  value: string | number,
  allowDecimal: boolean,
): number {
  const n = parseAmount(value)
  return allowDecimal ? roundMoney(n) : Math.trunc(n)
}

/** 畫面顯示用數字（臺幣整數；外幣最多三位小數） */
export function formatAmount(
  n: number | null | undefined,
  currency?: string | null,
): string {
  const value = parseAmount(n)
  if (allowsDecimalAmount(currency)) {
    return roundMoney(value).toLocaleString('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: AMOUNT_DECIMALS,
    })
  }
  return Math.round(value).toLocaleString('zh-TW')
}

/** 列表總金額：臺幣加 NT$；外幣只顯示數字 */
export function formatMoney(
  n: number | null | undefined,
  currency?: string | null,
): string {
  const body = formatAmount(n, currency)
  return allowsDecimalAmount(currency) ? body : `NT$ ${body}`
}

export function sumAmounts(values: Array<number | null | undefined>): number {
  return roundMoney(
    values.reduce<number>((sum, n) => sum + parseAmount(n), 0),
  )
}
