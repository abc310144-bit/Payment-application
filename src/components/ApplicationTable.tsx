import { useEffect, useMemo, useRef } from 'react'
import type { StoredApplication } from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import { formatExchangeRate } from '../types/payment'
import { formatMoney } from '../utils/money'
import { getPayeeDisplayName } from '../utils/payee'
import { getRowOperations } from '../utils/operations'
import { StatusBadge } from './StatusBadge'
import { EllipsisTooltip } from './EllipsisTooltip'
import './ApplicationTable.css'

interface Props {
  rows: StoredApplication[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  onAction: (action: string, row: StoredApplication) => void
}

function displayDate(value: string | null | undefined) {
  if (value == null || String(value).trim() === '') return '-'
  return value
}

function payeeName(row: StoredApplication) {
  return (
    row.overview?.vendorName ||
    getPayeeDisplayName(row.overview?.vendorId || '', row.paymentType) ||
    '-'
  )
}

export function ApplicationTable({
  rows,
  selectedIds,
  onSelectedIdsChange,
  onAction,
}: Props) {
  const { role } = useRole()
  const headerRef = useRef<HTMLInputElement>(null)
  const visibleIds = useMemo(() => rows.map((row) => row.id), [rows])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedVisibleCount = visibleIds.filter((id) => selectedSet.has(id)).length
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length

  useEffect(() => {
    const next = selectedIds.filter((id) => visibleIds.includes(id))
    if (next.length !== selectedIds.length) onSelectedIdsChange(next)
    // 只在可見列變更時剔除已不在結果中的勾選
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds])

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    el.indeterminate =
      selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length
  }, [selectedVisibleCount, visibleIds.length])

  const toggleAll = () => {
    onSelectedIdsChange(allVisibleSelected ? [] : [...visibleIds])
  }

  const toggleOne = (id: string) => {
    onSelectedIdsChange(
      selectedSet.has(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id],
    )
  }

  return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="check-col">
                <input
                  ref={headerRef}
                  type="checkbox"
                  aria-label="全選"
                  disabled={rows.length === 0}
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                />
              </th>
              <th>申請單號</th>
              <th>申請款項類型</th>
              <th>付款對象</th>
              <th>總金額</th>
              <th>付款幣別</th>
              <th>付款匯率</th>
              <th>建立時間</th>
              <th>預計付款日</th>
              <th>實際付款日</th>
              <th>不通過原因</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={13} className="empty-cell">
                  查無符合條件的付款申請
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const ops = getRowOperations(role, row.status, row.paymentType)
                return (
                  <tr key={row.id}>
                    <td className="check-col">
                      <input
                        type="checkbox"
                        aria-label={`選取 ${row.applicationNo}`}
                        checked={selectedSet.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                      />
                    </td>
                    <td className="mono">{row.applicationNo}</td>
                    <td>{row.paymentType}</td>
                    <td>{payeeName(row)}</td>
                    <td className="num">
                      {formatMoney(row.totalAmount, row.overview?.currency)}
                    </td>
                    <td>{row.overview?.currency || '臺幣TWD'}</td>
                    <td className="num">
                      {formatExchangeRate(row.paymentExchangeRate)}
                    </td>
                    <td>{row.createdAt}</td>
                    <td>{displayDate(row.expectedPaymentDate)}</td>
                    <td>{displayDate(row.actualPaymentDate)}</td>
                    <td>
                      {row.rejectReason ? (
                        <EllipsisTooltip text={row.rejectReason} />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <div className="ops">
                        {ops.map((op) => (
                          <button
                            key={op.key}
                            type="button"
                            className={`btn-link${op.kind === 'danger' ? ' danger' : ''}`}
                            disabled={op.disabled}
                            onClick={() => !op.disabled && onAction(op.key, row)}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
