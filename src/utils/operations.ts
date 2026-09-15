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

function isClosedForEdit(status: PaymentStatus) {
  return status === '已作廢' || status === '已完成' || status === '付款失敗'
}

/** 建檔人：導出前／審核不通過可編輯。財務：非已完成／已作廢／付款失敗皆可編輯。出納：不可編輯。 */
export function canEditApplication(role: UserRole, status: PaymentStatus) {
  if (role === '出納') return false
  if (isClosedForEdit(status)) return false
  if (role === '財務') return true
  if (role === '建檔人') return status === '草稿' || status === '審核不通過'
  return false
}

function canVoidApplication(role: UserRole, status: PaymentStatus) {
  if (role === '出納') return false
  if (status === '已完成' || status === '已作廢') return false
  if (role === '財務') return true
  if (role === '建檔人') return status === '草稿' || status === '審核不通過'
  return false
}

/** 完成付款／批量完成付款／付款失敗僅出納可操作。 */
export function canCompletePayment(role: UserRole) {
  return role === '出納'
}

export function canMarkPaymentFailed(
  role: UserRole,
  status: PaymentStatus,
  paymentType: PaymentType,
) {
  return (
    canCompletePayment(role) &&
    status === '待付款' &&
    !completesOnApprove(paymentType)
  )
}

/** 單筆／批量完成付款：出納可對待付款、付款失敗操作。 */
export function canPayApplication(
  role: UserRole,
  status: PaymentStatus,
  paymentType: PaymentType,
) {
  return (
    canCompletePayment(role) &&
    (status === '待付款' || status === '付款失敗') &&
    !completesOnApprove(paymentType)
  )
}

const ALL_OPS: { key: string; label: string; kind?: 'primary' | 'danger' }[] = [
  { key: 'edit', label: '編輯' },
  { key: 'view', label: '檢視' },
  { key: 'void', label: '作廢', kind: 'danger' },
  { key: 'review', label: '進行審核', kind: 'primary' },
  { key: 'writeoff', label: '進行核銷' },
  { key: 'pay', label: '完成付款', kind: 'primary' },
  { key: 'fail', label: '付款失敗', kind: 'danger' },
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
  const canPay = canPayApplication(role, status, paymentType)
  const canFail = canMarkPaymentFailed(role, status, paymentType)

  const enabled: Record<string, boolean> = {
    edit: canEdit,
    view: true,
    void: canVoid,
    review: canReview,
    writeoff: canWriteoff,
    pay: canPay,
    fail: canFail,
  }

  return ALL_OPS.map((op) => ({
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
    case 'fail':
      return `已標記付款失敗 ${row.applicationNo}`
    case 'writeoff':
      return `進行核銷 ${row.applicationNo}`
    default:
      return `${row.applicationNo}：${action}`
  }
}
