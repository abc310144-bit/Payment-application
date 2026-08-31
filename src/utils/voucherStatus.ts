import type { PaymentType } from '../types/payment'
import type { VoucherDetail, VoucherDetailStatus } from '../types/voucher'
import { needsWriteoffHistory } from './writeoff'

/**
 * 母單與明細不是一對一同步。
 * 明細可自行導出／審核。導出文件時：草稿明細改為待審核，母單（草稿／審核不通過）改為待審核。
 * 母單審核、完成付款仍只改對應階段的明細，其餘列維持原狀。
 *
 * 一般單：草稿／待審核／審核通過／已完成（無待核銷）
 * 預付單：完成付款後逐列 待核銷 → 部分核銷 → 核銷完成；全部核銷完成後母單為已完成
 */
export function mapDetailsOnParentApprove(details: VoucherDetail[]) {
  return details.map((item) =>
    item.status === '待審核' ? { ...item, status: '審核通過' as const } : item,
  )
}

export function mapDetailsOnParentReject(details: VoucherDetail[]) {
  return details.map((item) =>
    item.status === '待審核' || item.status === '審核通過'
      ? { ...item, status: '草稿' as const }
      : item,
  )
}

export function nextDetailStatusOnPayment(
  paymentType: PaymentType,
): VoucherDetailStatus {
  return needsWriteoffHistory(paymentType) ? '待核銷' : '已完成'
}

export function mapDetailsOnCompletePayment(
  details: VoucherDetail[],
  paymentType: PaymentType,
) {
  const next = nextDetailStatusOnPayment(paymentType)
  return details.map((item) =>
    item.status === '審核通過'
      ? { ...item, status: next, writebacks: item.writebacks ?? [] }
      : item,
  )
}
