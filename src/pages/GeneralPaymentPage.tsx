import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CompletePaymentModal } from '../components/CompletePaymentModal'
import { ApplicationTable } from '../components/ApplicationTable'
import { DateModeField } from '../components/DateModeField'
import { VendorSelect } from '../components/VendorSelect'
import {
  useApplications,
  type StoredApplication,
} from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import { mockVendors } from '../data/mockVendors'
import { mockEmployees } from '../data/mockEmployees'
import {
  CURRENCIES,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  completesOnApprove,
  isForeignCurrency,
  type CurrencyCode,
  type PaymentApplication,
  type PaymentStatus,
  type PaymentType,
} from '../types/payment'
import {
  EMPTY_DATE_QUERY,
  matchDateQuery,
  type DateQuery,
} from '../utils/dateQuery'
import { fuzzyMatch } from '../utils/fuzzy'
import { canCompletePayment, describeAction } from '../utils/operations'
import { needsWriteoffHistory } from '../utils/writeoff'
import './GeneralPaymentPage.css'

type PayeeKind = '' | 'vendor' | 'employee'

interface Filters {
  applicationNo: string
  paymentType: '' | PaymentType
  status: '' | PaymentStatus
  applicant: string
  payeeKind: PayeeKind
  payeeId: string
  currency: '' | CurrencyCode
  created: DateQuery
  expected: DateQuery
  actual: DateQuery
}

function emptyFilters(): Filters {
  return {
    applicationNo: '',
    paymentType: '',
    status: '',
    applicant: '',
    payeeKind: '',
    payeeId: '',
    currency: '',
    created: { ...EMPTY_DATE_QUERY },
    expected: { ...EMPTY_DATE_QUERY },
    actual: { ...EMPTY_DATE_QUERY },
  }
}

function rowCurrency(row: StoredApplication) {
  return row.overview?.currency || '臺幣TWD'
}

export function GeneralPaymentPage() {
  const navigate = useNavigate()
  const { role } = useRole()
  const {
    applications,
    completePayment,
    completePayments,
    failPayment,
    failPayments,
    voidApplication,
  } = useApplications()
  const [draft, setDraft] = useState<Filters>(emptyFilters)
  const [applied, setApplied] = useState<Filters>(emptyFilters)
  const [notice, setNotice] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [payTarget, setPayTarget] = useState<StoredApplication | null>(null)
  const [batchPayOpen, setBatchPayOpen] = useState(false)

  const rows = useMemo(() => {
    return applications.filter((row) => {
      const applicationNoQuery = draft.applicationNo || applied.applicationNo
      if (applicationNoQuery && !fuzzyMatch(row.applicationNo, applicationNoQuery)) {
        return false
      }
      if (applied.paymentType && row.paymentType !== applied.paymentType) return false
      if (applied.status && row.status !== applied.status) return false
      if (
        applied.applicant &&
        !row.applicant.includes(applied.applicant.trim())
      ) {
        return false
      }
      if (applied.payeeId && row.overview?.vendorId !== applied.payeeId) {
        return false
      }
      if (applied.currency && rowCurrency(row) !== applied.currency) return false
      if (!matchDateQuery(row.createdAt, applied.created)) return false
      if (!matchDateQuery(row.expectedPaymentDate, applied.expected)) return false
      if (!matchDateQuery(row.actualPaymentDate, applied.actual)) return false
      return true
    })
  }, [applications, applied, draft.applicationNo])

  const selectedRows = rows.filter((row) => selectedIds.includes(row.id))
  const canBatchPay =
    canCompletePayment(role) &&
    selectedRows.length > 0 &&
    selectedRows.every(
      (row) => row.status === '待付款' && !completesOnApprove(row.paymentType),
    )
  const sameSelectedCurrency = () => {
    const currencies = new Set(selectedRows.map(rowCurrency))
    if (currencies.size === 1) return true
    window.alert('需所有申請皆為相同幣別才可批量操作')
    return false
  }
  const payModalTargets = payTarget ? [payTarget] : selectedRows
  const payModalOpen = Boolean(payTarget) || batchPayOpen
  const payModalNeedRate = payModalTargets.some((row) =>
    isForeignCurrency(rowCurrency(row)),
  )
  const payModalCurrency = payModalTargets[0]
    ? rowCurrency(payModalTargets[0])
    : undefined

  const finishPay = (
    row: PaymentApplication,
    options: { actualPaymentDate: string; exchangeRate?: number },
  ) => {
    const updated = completePayment(row.id, options)
    if (updated && needsWriteoffHistory(updated.paymentType)) {
      setNotice(
        `${updated.applicationNo} 已完成付款。此單為事後核銷，核銷歷史頁籤已出現（建檔人／財務均可看見）。`,
      )
      return
    }
    setNotice(describeAction('pay', updated ?? row))
  }

  const finishBatchPay = (options: {
    actualPaymentDate: string
    exchangeRate?: number
  }) => {
    const paid = completePayments(
      selectedRows.map((row) => row.id),
      options,
    )
    const writeoffCount = paid.filter((row) =>
      needsWriteoffHistory(row.paymentType),
    ).length
    if (writeoffCount) {
      setNotice(
        `已完成付款 ${paid.length} 筆。其中 ${writeoffCount} 筆為事後核銷，核銷歷史頁籤已出現。`,
      )
    } else {
      setNotice(`已完成付款 ${paid.length} 筆`)
    }
    setSelectedIds([])
  }

  const handleBatchPay = () => {
    if (!canBatchPay || !sameSelectedCurrency()) return
    setPayTarget(null)
    setBatchPayOpen(true)
  }

  const handleBatchFail = () => {
    if (!canBatchPay || !sameSelectedCurrency()) return
    const failed = failPayments(selectedRows.map((row) => row.id))
    setNotice(`已標記付款失敗 ${failed.length} 筆`)
    setSelectedIds([])
  }

  const handleAction = (action: string, row: PaymentApplication) => {
    if (action === 'edit') {
      navigate(`/applications/${row.id}/overview`)
      return
    }
    if (action === 'view' || action === 'review') {
      navigate(`/applications/${row.id}/details`)
      return
    }
    if (action === 'writeoff') {
      navigate(`/applications/${row.id}/writeoff`)
      return
    }
    if (action === 'void') {
      if (window.confirm(`確定作廢 ${row.applicationNo}？`)) {
        voidApplication(row.id)
        setNotice(describeAction('void', row))
      }
      return
    }
    if (action === 'pay') {
      const app = applications.find((item) => item.id === row.id)
      setBatchPayOpen(false)
      setPayTarget(app ?? null)
      return
    }
    if (action === 'fail') {
      const updated = failPayment(row.id)
      if (updated) setNotice(describeAction('fail', updated))
      return
    }
    setNotice(describeAction(action, row))
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <h1>一般付款</h1>
        <button
          type="button"
          className="btn btn-primary"
          disabled={role === '出納'}
          onClick={() => role !== '出納' && navigate('/overview')}
        >
          新增付款申請
        </button>
      </div>

      <section className="filter-card">
        <div className="filter-grid">
          <label>
            申請單號
            <input
              value={draft.applicationNo}
              placeholder="模糊查詢，例如 24001"
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, applicationNo: e.target.value }))
              }
            />
            <span className="field-hint">輸入部分單號即可，支援即時模糊查詢</span>
          </label>
          <label>
            申請款項類型
            <select
              value={draft.paymentType}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  paymentType: e.target.value as Filters['paymentType'],
                }))
              }
            >
              <option value="">請選擇</option>
              {PAYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            狀態
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  status: e.target.value as Filters['status'],
                }))
              }
            >
              <option value="">請選擇</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            申請人
            <input
              value={draft.applicant}
              placeholder="模糊查詢"
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, applicant: e.target.value }))
              }
            />
          </label>
          <label>
            付款幣別
            <select
              value={draft.currency}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  currency: e.target.value as Filters['currency'],
                }))
              }
            >
              <option value="">請選擇</option>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <div className="filter-payee">
            <span className="filter-label">付款對象</span>
            <div className="payee-kind-radios">
              <label>
                <input
                  type="radio"
                  name="payeeKind"
                  checked={draft.payeeKind === 'vendor'}
                  onChange={() =>
                    setDraft((prev) => ({
                      ...prev,
                      payeeKind: 'vendor',
                      payeeId: '',
                    }))
                  }
                />
                廠商
              </label>
              <label>
                <input
                  type="radio"
                  name="payeeKind"
                  checked={draft.payeeKind === 'employee'}
                  onChange={() =>
                    setDraft((prev) => ({
                      ...prev,
                      payeeKind: 'employee',
                      payeeId: '',
                    }))
                  }
                />
                員工
              </label>
            </div>
            {draft.payeeKind === 'vendor' && (
              <VendorSelect
                items={mockVendors.map((item) => ({
                  id: item.id,
                  code: item.code,
                  name: item.name,
                }))}
                value={draft.payeeId}
                allowClear
                placeholder="搜尋或選擇廠商"
                emptyText="查無廠商"
                searchPlaceholder="搜尋編號或名稱"
                onChange={(payeeId) =>
                  setDraft((prev) => ({ ...prev, payeeId }))
                }
              />
            )}
            {draft.payeeKind === 'employee' && (
              <VendorSelect
                items={mockEmployees.map((item) => ({
                  id: item.id,
                  code: item.employeeNo,
                  name: `${item.name}（${item.account}）`,
                }))}
                value={draft.payeeId}
                allowClear
                placeholder="搜尋或選擇員工"
                emptyText="查無員工"
                searchPlaceholder="搜尋姓名、帳號或編號"
                onChange={(payeeId) =>
                  setDraft((prev) => ({ ...prev, payeeId }))
                }
              />
            )}
          </div>
          <DateModeField
            label="建立日"
            value={draft.created}
            onChange={(created) => setDraft((prev) => ({ ...prev, created }))}
          />
          <DateModeField
            label="預計付款日"
            value={draft.expected}
            onChange={(expected) =>
              setDraft((prev) => ({ ...prev, expected }))
            }
          />
          <DateModeField
            label="實際付款日"
            value={draft.actual}
            onChange={(actual) => setDraft((prev) => ({ ...prev, actual }))}
          />
        </div>
        <div className="filter-actions">
          <button
            type="button"
            className="btn btn-default"
            onClick={() => {
              setDraft(emptyFilters())
              setApplied(emptyFilters())
              setSelectedIds([])
              setNotice('')
            }}
          >
            重置
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setApplied(draft)}
          >
            查詢
          </button>
        </div>
      </section>

      {notice && <div className="notice">{notice}</div>}

      {canBatchPay && (
        <div className="result-toolbar">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleBatchPay}
          >
            批量完成付款
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleBatchFail}
          >
            批量付款失敗
          </button>
        </div>
      )}
      <div className="result-meta">共 {rows.length} 筆</div>
      <ApplicationTable
        rows={rows}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onAction={handleAction}
      />

      {payModalOpen && (
        <CompletePaymentModal
          currency={payModalCurrency}
          requireRate={payModalNeedRate}
          onClose={() => {
            setPayTarget(null)
            setBatchPayOpen(false)
          }}
          onConfirm={(payload) => {
            if (payTarget) finishPay(payTarget, payload)
            else finishBatchPay(payload)
            setPayTarget(null)
            setBatchPayOpen(false)
          }}
        />
      )}
    </div>
  )
}
