import type { PaymentType, UserRole } from './payment'

export const VOUCHER_PURPOSES = [
  '進貨款項(PO單)',
  '進口相關費用(LCM)',
  '旅費(國內外出差費用)',
  '廣告費',
  '勞務費(KOL、律師、會計師)',
  '通路費用(通路後扣)',
  'URMART月結廠商',
  '倉庫相關費用',
  '其他費用',
] as const

export type VoucherPurpose = (typeof VOUCHER_PURPOSES)[number]

export type SecondFieldKind = 'text' | 'month' | 'dateRange'

export const PURPOSE_SECOND_FIELD: Record<
  VoucherPurpose,
  { label: string; kind: SecondFieldKind }
> = {
  '進貨款項(PO單)': { label: 'PO單', kind: 'text' },
  '進口相關費用(LCM)': { label: '報關單號', kind: 'text' },
  '旅費(國內外出差費用)': { label: '出差期間', kind: 'dateRange' },
  廣告費: { label: '結算月', kind: 'month' },
  '勞務費(KOL、律師、會計師)': { label: '勞務期間', kind: 'dateRange' },
  '通路費用(通路後扣)': { label: '結算月', kind: 'month' },
  URMART月結廠商: { label: '結算月', kind: 'month' },
  倉庫相關費用: { label: '結算月', kind: 'month' },
  其他費用: { label: '使用期間', kind: 'dateRange' },
}

export const VOUCHER_STYLES_ALL = [
  '發票',
  '收據',
  '合約',
  '報價單',
  '勞務報酬單',
  '簽呈(無憑證補貼款項)',
  '差旅費',
] as const

export const VOUCHER_STYLES_PREPAY = ['合約', '報價單'] as const

export const INVOICE_FORMATS = ['21', '22', '23', '25', '28'] as const

export type TaxFlag = '應稅' | '未稅'

/** 明細狀態。預付單全額回壓後為「核銷完成」；母單全部核銷完才是「已完成」。 */
export type VoucherDetailStatus =
  | '草稿'
  | '待審核'
  | '審核通過'
  | '待核銷'
  | '部分核銷'
  | '核銷完成'
  | '已完成'

export const WRITEBACK_STYLES = ['發票', '其他'] as const
export type WritebackStyle = (typeof WRITEBACK_STYLES)[number]

export interface VoucherLineItem {
  id: string
  name: string
  taxable: TaxFlag
  amount: number
}

export interface VoucherFile {
  name: string
  type: string
  url: string
}

export interface WritebackRecord {
  id: string
  style: WritebackStyle
  invoiceNo: string
  invoiceTaxId: string
  invoiceDate: string
  invoiceFormat: string
  amount: number
  uploadedAt: string
  file: VoucherFile | null
}

export interface VoucherDetail {
  id: string
  vendorTaxId: string
  purpose: VoucherPurpose
  remarkNo: string
  secondText: string
  secondFrom: string
  secondTo: string
  voucherStyle: string
  invoiceFormat: string
  invoiceNo: string
  invoiceDate: string
  taxable: TaxFlag
  untaxedAmount: number
  taxAmount: number
  payAmount: number
  status: VoucherDetailStatus
  lines: VoucherLineItem[]
  voucherFile: VoucherFile | null
  attachments: VoucherFile[]
  writebacks: WritebackRecord[]
}

export function getVoucherStyles(paymentType: PaymentType): readonly string[] {
  return paymentType === '廠商預付 / 訂金'
    ? VOUCHER_STYLES_PREPAY
    : VOUCHER_STYLES_ALL
}

export function formatRemarkNo(
  purpose: VoucherPurpose,
  secondText: string,
  secondFrom: string,
  secondTo: string,
) {
  const meta = PURPOSE_SECOND_FIELD[purpose]
  if (meta.kind === 'dateRange') {
    if (!secondFrom && !secondTo) return '-'
    const from = secondFrom.replaceAll('-', '/')
    const to = secondTo.replaceAll('-', '/')
    if (from && to) return `${from} 至 ${to}`
    return from || to
  }
  return secondText.trim() || '-'
}

export function dashOrValue(value: string) {
  return value.trim() ? value : '-'
}

export function canAddVoucherDetail(
  role: UserRole,
  appStatus: string,
) {
  if (role === '建檔人') {
    return appStatus === '草稿' || appStatus === '審核不通過'
  }
  return (
    appStatus === '草稿' ||
    appStatus === '審核不通過' ||
    appStatus === '待審核'
  )
}

/** 導出前（草稿）：建檔人／財務皆可檢視、編輯、作廢；導出後僅財務可編輯、作廢 */
export function getVoucherRowOps(
  role: UserRole,
  status: VoucherDetailStatus,
) {
  const view = { key: 'view' as const, label: '檢視' }
  const edit = { key: 'edit' as const, label: '編輯' }
  const voidOp = { key: 'void' as const, label: '作廢' }
  if (status === '草稿') return [view, edit, voidOp]
  if (role === '財務' && (status === '待審核' || status === '審核通過')) {
    return [view, edit, voidOp]
  }
  return [view]
}
