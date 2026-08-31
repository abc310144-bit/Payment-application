import type {
  PaymentApplication,
  PaymentStatus,
  PaymentType,
  UserRole,
} from '../types/payment'
import { completesOnApprove, TYPES_NEED_WRITEOFF } from '../types/payment'

export interface RowOperation {
  key: string
  label: string
  kind?: 'primary' | 'danger'
  disabled?: boolean
}

/** 建檔人：導出前／審核不通過可編輯。財務：非已完成／已作廢皆可編輯。已完成僅能檢視。 */
export function canEditApplication(role: UserRole, status: PaymentStatus) {
  if (status === '已作廢' || status === '已完成') return false
  if (role === '財務') return true
  return status === '草稿' || status === '審核不通過'
}

function canVoidApplication(role: UserRole, status: PaymentStatus) {
  if (status === '已完成' || status === '已作廢') return false
  if (role === '財務') return true
  return status === '草稿' || status === '審核不通過'
}

const ALL_OPS: { key: string; label: string; kind?: 'primary' | 'danger' }[] = [
  { key: 'edit', label: '編輯' },
  { key: 'view', label: '檢視' },
  { key: 'void', label: '作廢', kind: 'danger' },
  { key: 'review', label: '進行審核', kind: 'primary' },
  { key: 'writeoff', label: '進行核銷' },
  { key: 'pay', label: '完成付款', kind: 'primary' },
  { key: 'auditFile', label: '檢視審核檔案' },
]

export function getRowOperations(
  role: UserRole,
  status: PaymentStatus,
  paymentType: PaymentType,
): RowOperation[] {
  const canEdit = canEditApplication(role, status)
  const canVoid = canVoidApplication(role, status)
  const canReview = role === '財務' && status === '待審核'
  const canWriteoff =
    role === '建檔人' &&
    TYPES_NEED_WRITEOFF.includes(paymentType) &&
    (status === '待核銷' || status === '部分核銷')
  const canPay =
    role === '財務' && status === '待付款' && !completesOnApprove(paymentType)
  const canAuditFile = status === '已完成'

  const enabled: Record<string, boolean> = {
    edit: canEdit,
    view: true,
    void: canVoid,
    review: canReview,
    writeoff: canWriteoff,
    pay: canPay,
    auditFile: canAuditFile,
  }

  return ALL_OPS.filter((op) =>
    op.key === 'auditFile' ? canAuditFile : true,
  ).map((op) => ({
    ...op,
    disabled: !enabled[op.key],
  }))
}

export function describeAction(action: string, row: PaymentApplication) {
  switch (action) {
    case 'void':
      return `已作廢 ${row.applicationNo}`
    case 'pay':
      return `已完成付款 ${row.applicationNo}`
    case 'writeoff':
      return `進行核銷 ${row.applicationNo}`
    default:
      return `${row.applicationNo}：${action}`
  }
}
