import type { StoredApplication } from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import { formatMoney } from '../utils/money'
import { getPayeeDisplayName } from '../utils/payee'
import { getRowOperations } from '../utils/operations'
import { StatusBadge } from './StatusBadge'
import { EllipsisTooltip } from './EllipsisTooltip'
import './ApplicationTable.css'

interface Props {
  rows: StoredApplication[]
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

export function ApplicationTable({ rows, onAction }: Props) {
  const { role } = useRole()

  return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>申請單號</th>
              <th>申請款項類型</th>
              <th>付款對象</th>
              <th>總金額</th>
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
                <td colSpan={10} className="empty-cell">
                  查無符合條件的付款申請
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const ops = getRowOperations(role, row.status, row.paymentType)
                return (
                  <tr key={row.id}>
                    <td className="mono">{row.applicationNo}</td>
                    <td>{row.paymentType}</td>
                    <td>{payeeName(row)}</td>
                    <td className="num">
                      {formatMoney(row.totalAmount, row.overview?.currency)}
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
