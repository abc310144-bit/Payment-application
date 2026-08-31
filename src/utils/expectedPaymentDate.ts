import type { PaymentDateRuleCategory, PaymentType } from '../types/payment'
import { PAYMENT_TYPE_META } from '../types/payment'

/** YYYY-MM-DD */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 顯示用 YYYY/MM/DD */
export function formatDateDisplay(iso: string): string {
  if (!iso) return ''
  return iso.replaceAll('-', '/')
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return formatDateISO(date)
}

export function todayISO(): string {
  return formatDateISO(new Date())
}

/** 一般付款：21日~次月5日 → 次月15日；6日~20日 → 當月30日 */
export function calcGeneralPaymentDate(applicationDateISO: string): string {
  const date = parseISODate(applicationDateISO)
  const day = date.getDate()
  const year = date.getFullYear()
  const month = date.getMonth()

  if (day >= 21) {
    const next = new Date(year, month + 1, 15)
    return formatDateISO(next)
  }
  if (day <= 5) {
    return formatDateISO(new Date(year, month, 15))
  }
  const lastDay = new Date(year, month + 1, 0).getDate()
  return formatDateISO(new Date(year, month, Math.min(30, lastDay)))
}

/**
 * 零用金：下週的週四
 * （不論申請日為星期幾，皆為「下一個曆週」的週四）
 */
export function calcPettyCashPaymentDate(applicationDateISO: string): string {
  const date = parseISODate(applicationDateISO)
  const dayOfWeek = date.getDay()
  const thisWeekSunday = new Date(date)
  thisWeekSunday.setDate(date.getDate() - dayOfWeek)
  const nextWeekThursday = new Date(thisWeekSunday)
  nextWeekThursday.setDate(thisWeekSunday.getDate() + 7 + 4)
  return formatDateISO(nextWeekThursday)
}

/** 預付款：預設申請日；可選範圍為申請日起 5 日內（含）= +0 ~ +5 */
export function getPrepaymentDateRange(applicationDateISO: string): {
  min: string
  max: string
  defaultDate: string
} {
  return {
    min: applicationDateISO,
    max: addDays(applicationDateISO, 5),
    defaultDate: applicationDateISO,
  }
}

export function getRuleCategory(type: PaymentType): PaymentDateRuleCategory {
  return PAYMENT_TYPE_META[type].ruleCategory
}

/** 預計付款日是否可手動編輯 */
export function isExpectedDateEditable(type: PaymentType): boolean {
  return getRuleCategory(type) === '預付款'
}

/**
 * 依申請款項與申請日計算預計付款日
 * 通路後扣／月結規則待確認，暫依一般付款規則
 */
export function calcExpectedPaymentDate(
  type: PaymentType,
  applicationDateISO: string,
  currentExpected?: string,
): string {
  if (!applicationDateISO) return ''

  const category = getRuleCategory(type)

  if (category === '零用金') {
    return calcPettyCashPaymentDate(applicationDateISO)
  }

  if (category === '預付款') {
    const { min, max, defaultDate } = getPrepaymentDateRange(applicationDateISO)
    if (currentExpected && currentExpected >= min && currentExpected <= max) {
      return currentExpected
    }
    return defaultDate
  }

  return calcGeneralPaymentDate(applicationDateISO)
}

export function getExpectedDateHint(type: PaymentType): string {
  const category = getRuleCategory(type)
  if (category === '零用金') {
    return '目前類別「零用金」：自動帶入下週四（不可手動修改）。'
  }
  if (category === '預付款') {
    return '目前類別「預付款」：預設申請日，可於申請日起 5 日內（含）調整。'
  }
  if (category === '待確認') {
    return '目前類別「廠商後扣／月結」規則待確認，暫依一般付款截止規則自動帶入（不可手動修改）。'
  }
  return '目前類別「一般」：依每月截止規則自動帶入（不可手動修改）。'
}
