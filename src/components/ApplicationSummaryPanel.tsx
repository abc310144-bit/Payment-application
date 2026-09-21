import { useState } from 'react'
import { CompletePaymentModal } from './CompletePaymentModal'
import { StatusBadge } from './StatusBadge'
import {
  useApplications,
  type StoredApplication,
} from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import {
  formatExchangeRate,
  isForeignCurrency,
  isInvoiceOnlyType,
  PAYMENT_TYPE_META,
} from '../types/payment'
import { formatAmount, formatMoney } from '../utils/money'
import {
  canMarkPaymentFailed,
  canPayApplication,
} from '../utils/operations'
import { getPayeeDisplayName } from '../utils/payee'
import './ApplicationSummaryPanel.css'

interface Props {
  app: StoredApplication
}

function displayDate(value: string | null | undefined) {
  if (value == null || String(value).trim() === '') return '-'
  return value
}

export function ApplicationSummaryPanel({ app }: Props) {
  const { role } = useRole()
  const { completePayment, failPayment } = useApplications()
  const [payOpen, setPayOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const overview = app.overview
  const currency = overview?.currency || '臺幣TWD'
  const payee =
    overview?.vendorName ||
    getPayeeDisplayName(overview?.vendorId || '', app.paymentType) ||
    '-'
  const canPay = canPayApplication(role, app.status, app.paymentType)
  const canFail = canMarkPaymentFailed(role, app.status, app.paymentType)
  const invoiceOnly = isInvoiceOnlyType(app.paymentType)
  const needRate = isForeignCurrency(currency)

  return (
    <div className="summary-panel">
      <h2>付款申請總覽</h2>

      {notice && <div className="summary-notice">{notice}</div>}

      <section className="summary-card">
        <h3>基本資料</h3>
        <dl className="summary-grid">
          <div>
            <dt>申請單號</dt>
            <dd>{app.applicationNo}</dd>
          </div>
          <div>
            <dt>狀態</dt>
            <dd>
              <StatusBadge status={app.status} />
            </dd>
          </div>
          <div>
            <dt>付款類型</dt>
            <dd>{PAYMENT_TYPE_META[app.paymentType]?.title || app.paymentType}</dd>
          </div>
          <div>
            <dt>申請人</dt>
            <dd>{overview?.applicant || app.applicant || '-'}</dd>
          </div>
          <div>
            <dt>申請日</dt>
            <dd>{displayDate(overview?.applicationDate)}</dd>
          </div>
          <div>
            <dt>付款對象</dt>
            <dd>{payee}</dd>
          </div>
          {overview?.vendorTaxId ? (
            <div>
              <dt>統一編號</dt>
              <dd>{overview.vendorTaxId}</dd>
            </div>
          ) : null}
          {overview?.settlementMonth ? (
            <div>
              <dt>結算月</dt>
              <dd>{overview.settlementMonth}</dd>
            </div>
          ) : null}
          <div>
            <dt>幣別</dt>
            <dd>{currency}</dd>
          </div>
          <div>
            <dt>付款方式</dt>
            <dd>{overview?.paymentMethod || '-'}</dd>
          </div>
          <div>
            <dt>匯費負擔</dt>
            <dd>{overview?.remittanceFee || '-'}</dd>
          </div>
          <div>
            <dt>預計付款日</dt>
            <dd>{displayDate(app.expectedPaymentDate || overview?.expectedPaymentDate)}</dd>
          </div>
          <div>
            <dt>實際付款日</dt>
            <dd>{displayDate(app.actualPaymentDate)}</dd>
          </div>
          <div>
            <dt>付款匯率</dt>
            <dd>{formatExchangeRate(app.paymentExchangeRate)}</dd>
          </div>
          <div>
            <dt>總金額</dt>
            <dd>{formatMoney(app.totalAmount, currency)}</dd>
          </div>
          {app.rejectReason ? (
            <div className="summary-span-2">
              <dt>不通過原因</dt>
              <dd>{app.rejectReason}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="summary-card">
        <h3>款項憑證明細（{app.vouchers.length} 筆）</h3>
        {app.vouchers.length === 0 ? (
          <p className="summary-empty">尚未新增憑證明細。</p>
        ) : (
          <div className="summary-table-wrap">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>款項用途</th>
                  {!invoiceOnly && <th>備註單號</th>}
                  <th>憑證樣式</th>
                  <th>付款金額</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {app.vouchers.map((row) => (
                  <tr key={row.id}>
                    <td className="mono">{row.id}</td>
                    <td>{row.purpose}</td>
                    {!invoiceOnly && <td>{row.remarkNo || '-'}</td>}
                    <td>{row.voucherStyle}</td>
                    <td className="num">{formatAmount(row.payAmount, currency)}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(canPay || canFail) && (
        <div className="summary-footer">
          {canFail && (
            <button
              type="button"
              className="btn btn-danger btn-step"
              onClick={() => {
                if (!window.confirm(`確定將 ${app.applicationNo} 標記為付款失敗？`)) {
                  return
                }
                const updated = failPayment(app.id)
                if (updated) setNotice(`已標記付款失敗 ${updated.applicationNo}`)
              }}
            >
              付款失敗
            </button>
          )}
          {canPay && (
            <button
              type="button"
              className="btn btn-primary btn-step"
              onClick={() => setPayOpen(true)}
            >
              完成付款
            </button>
          )}
        </div>
      )}

      {payOpen && (
        <CompletePaymentModal
          currency={currency}
          requireRate={needRate}
          onClose={() => setPayOpen(false)}
          onConfirm={(payload) => {
            const updated = completePayment(app.id, payload)
            if (updated) {
              setNotice(`已完成付款 ${updated.applicationNo}`)
            }
            setPayOpen(false)
          }}
        />
      )}
    </div>
  )
}
