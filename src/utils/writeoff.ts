import type { PaymentStatus, PaymentType } from '../types/payment'
import { TYPES_NEED_WRITEOFF } from '../types/payment'
import type {
  VoucherDetail,
  VoucherDetailStatus,
  WritebackRecord,
} from '../types/voucher'
import { formatAmount, roundMoney, sumAmounts } from './money'

/** 事後才拿到發票，須走核銷流程 */
export function needsWriteoffHistory(type: PaymentType): boolean {
  return TYPES_NEED_WRITEOFF.includes(type)
}

export const WRITEBACK_INVOICE_TAX_IDS = [
  '00842283',
  '00757574',
  '80285675',
  '00655979',
  '04406559',
  '16037708',
  '70759575',
  '54395156',
] as const

const CUSTOMS_BROKER_VENDOR_NAMES = ['龍鋒報關有限公司']

/** 廠商預付／訂金 + 龍鋒報關：回壓發票需選發票統編 */
export function needsWritebackInvoiceTaxId(app: {
  paymentType: string
  overview?: { vendorName?: string }
}): boolean {
  if (app.paymentType !== '廠商預付 / 訂金') return false
  const name = app.overview?.vendorName || ''
  return CUSTOMS_BROKER_VENDOR_NAMES.some((item) => name.includes(item))
}

/** 財務完成付款後才顯示「核銷歷史」頁籤；建檔人與財務均看得到 */
export function showWriteoffHistoryTab(app: {
  paymentType: PaymentType
  actualPaymentDate: string | null
}): boolean {
  return needsWriteoffHistory(app.paymentType) && Boolean(app.actualPaymentDate)
}

export function isWriteoffPhaseStatus(status: VoucherDetailStatus): boolean {
  return status === '待核銷' || status === '部分核銷' || status === '核銷完成'
}

export function writebacksOf(
  detail: Pick<VoucherDetail, 'writebacks'>,
): WritebackRecord[] {
  return detail.writebacks ?? []
}

export function writtenOffAmount(
  detail: Pick<VoucherDetail, 'writebacks'>,
): number {
  return sumAmounts(writebacksOf(detail).map((item) => item.amount))
}

export function remainingWriteoffAmount(
  detail: Pick<VoucherDetail, 'payAmount' | 'writebacks'>,
): number {
  return roundMoney(Math.max(0, detail.payAmount - writtenOffAmount(detail)))
}

export function isFullyWrittenOff(
  detail: Pick<VoucherDetail, 'payAmount' | 'writebacks'>,
): boolean {
  return remainingWriteoffAmount(detail) <= 0
}

export function nextDetailWriteoffStatus(
  detail: Pick<VoucherDetail, 'payAmount' | 'writebacks'>,
): VoucherDetailStatus {
  const written = writtenOffAmount(detail)
  const pay = roundMoney(detail.payAmount)
  if (written <= 0) return '待核銷'
  if (written < pay) return '部分核銷'
  return '核銷完成'
}

export function nextParentWriteoffStatus(
  vouchers: VoucherDetail[],
): PaymentStatus | null {
  const list = vouchers.filter((item) => isWriteoffPhaseStatus(item.status))
  if (list.length === 0) return null
  if (list.every((item) => item.status === '核銷完成')) return '已完成'
  if (list.every((item) => item.status === '待核銷')) return '待核銷'
  return '部分核銷'
}

export function parentUnwrittenRemaining(vouchers: VoucherDetail[]): number {
  return sumAmounts(
    vouchers
      .filter((item) => isWriteoffPhaseStatus(item.status))
      .map((item) => remainingWriteoffAmount(item)),
  )
}

export function formatWritebackStamp(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${day} ${hh}:${mm}`
}

export function formatWritebackLabel(
  record: WritebackRecord,
  currency?: string | null,
): string {
  const amountText = formatAmount(record.amount, currency)
  if (record.style === '發票') {
    const invoiceNo = record.invoiceNo.trim() || '-'
    return `回壓憑證文件 : 發票 ${invoiceNo}｜金額 ${amountText} ｜上傳時間 ${record.uploadedAt}`
  }
  const fileName = record.file?.name?.trim() || '-'
  return `回壓憑證文件：其他 ${fileName}｜上傳時間 ${record.uploadedAt}`
}

export function formatDisplayDate(value: string): string {
  return value.replaceAll('-', '/')
}
