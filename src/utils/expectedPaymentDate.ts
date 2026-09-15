import type { PaymentDateRuleCategory, PaymentType } from '../types/payment'
import { isChannelFeeType, isUmMonthlyType, PAYMENT_TYPE_META } from '../types/payment'

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

/**
 * URMART 月結預計付款日：
 * 申請日 1–25：預設當月 25 日，可改為次月 25 日
 * 申請日 ≥26：僅可選次月 25 日
 */
export function getUmExpectedDateRange(applicationDateISO: string): {
  min: string
  max: string
  defaultDate: string
} {
  const date = parseISODate(applicationDateISO)
  const thisMonth25 = formatDateISO(new Date(date.getFullYear(), date.getMonth(), 25))
  const nextMonth25 = formatDateISO(
    new Date(date.getFullYear(), date.getMonth() + 1, 25),
  )
  if (date.getDate() <= 25) {
    return { min: thisMonth25, max: nextMonth25, defaultDate: thisMonth25 }
  }
  return { min: nextMonth25, max: nextMonth25, defaultDate: nextMonth25 }
}

/** 將候選日對齊到允許的當月／次月 25 日 */
export function snapUmExpectedDate(
  applicationDateISO: string,
  candidate?: string,
): string {
  const { min, max, defaultDate } = getUmExpectedDateRange(applicationDateISO)
  if (candidate && (candidate === min || candidate === max)) return candidate
  if (candidate) {
    const picked = parseISODate(candidate)
    const snapped = formatDateISO(
      new Date(picked.getFullYear(), picked.getMonth(), 25),
    )
    if (snapped === min || snapped === max) return snapped
  }
  return defaultDate
}

export function getRuleCategory(type: PaymentType): PaymentDateRuleCategory {
  return PAYMENT_TYPE_META[type].ruleCategory
}

/** 預計付款日是否可手動編輯 */
export function isExpectedDateEditable(
  type: PaymentType,
  applicationDateISO?: string,
): boolean {
  if (getRuleCategory(type) === '預付款') return true
  if (isUmMonthlyType(type) && applicationDateISO) {
    return parseISODate(applicationDateISO).getDate() <= 25
  }
  return false
}

/**
 * 依申請款項與申請日計算預計付款日
 * 通路費用不需預計付款日
 */
export function calcExpectedPaymentDate(
  type: PaymentType,
  applicationDateISO: string,
  currentExpected?: string,
): string {
  if (isChannelFeeType(type)) return ''
  if (!applicationDateISO) return ''

  if (isUmMonthlyType(type)) {
    return snapUmExpectedDate(applicationDateISO, currentExpected)
  }

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
  if (isUmMonthlyType(type)) {
    return '目前類別「URMART 月結」：申請日 1–25 日預設當月 25 日，可改次月 25 日；26 日起僅可選次月 25 日。'
  }
  const category = getRuleCategory(type)
  if (category === '零用金') {
    return '目前類別「零用金」：自動帶入下週四（不可手動修改）。'
  }
  if (category === '預付款') {
    return '目前類別「預付款」：預設申請日，可於申請日起 5 日內（含）調整。'
  }
  return '目前類別「一般」：依每月截止規則自動帶入（不可手動修改）。'
}
