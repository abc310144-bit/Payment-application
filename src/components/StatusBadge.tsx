import type { PaymentStatus } from '../types/payment'
import type { VoucherDetailStatus } from '../types/voucher'
import './StatusBadge.css'

type BadgeStatus = PaymentStatus | VoucherDetailStatus

const statusClass: Record<BadgeStatus, string> = {
  草稿: 'status-draft',
  待審核: 'status-pending-audit',
  審核不通過: 'status-rejected',
  審核通過: 'status-approved',
  待付款: 'status-pending-pay',
  待核銷: 'status-pending-writeoff',
  部分核銷: 'status-partial',
  核銷完成: 'status-writeoff-done',
  已完成: 'status-done',
  已作廢: 'status-voided',
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <span className={`status-badge ${statusClass[status]}`}>{status}</span>
  )
}
