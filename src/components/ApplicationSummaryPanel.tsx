import { useMemo, useState } from 'react'
import { CompletePaymentModal } from './CompletePaymentModal'
import { RejectReasonModal } from './RejectReasonModal'
import { StatusBadge } from './StatusBadge'
import { ViewFilesModal } from './ViewFilesModal'
import {
  useApplications,
  type StoredApplication,
} from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import {
  formatExchangeRate,
  isForeignCurrency,
  isInvoiceOnlyType,
  isUmMonthlyType,
  PAYMENT_TYPE_META,
} from '../types/payment'
import { dashOrValue, type VoucherDetail } from '../types/voucher'
import { formatDateDisplay } from '../utils/expectedPaymentDate'
import {
  downloadExistingVoucherFile,
  downloadVoucherPdf,
} from '../utils/exportVoucherPdf'
import {
  invoiceAmountSum,
  invoiceSumHint,
  invoiceSumMatchesTarget,
} from '../utils/invoiceMatch'
import { formatAmount, formatMoney } from '../utils/money'
import {
  canMarkPaymentFailed,
  canPayApplication,
} from '../utils/operations'
import { getPayeeDisplayName } from '../utils/payee'
import './ApplicationSummaryPanel.css'
import './VoucherDetailsPanel.css'

interface Props {
  app: StoredApplication
  onBack?: () => void
}

function displayDate(value: string | null | undefined) {
  if (value == null || String(value).trim() === '') return '-'
  return value
}

export function ApplicationSummaryPanel({ app, onBack }: Props) {
  const { role } = useRole()
  const {
    completePayment,
    failPayment,
    exportVouchers,
    saveExportedFile,
    approveApplication,
    rejectApplication,
  } = useApplications()
  const [payOpen, setPayOpen] = useState(false)
  const [viewing, setViewing] = useState<VoucherDetail | null>(null)
  const [exporting, setExporting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const overview = app.overview
  const currency = overview?.currency || '臺幣TWD'
  const payee =
    overview?.vendorName ||
    getPayeeDisplayName(overview?.vendorId || '', app.paymentType) ||
    '-'
  const isCashier = role === '出納'
  const canPay = canPayApplication(role, app.status, app.paymentType)
  const canFail = canMarkPaymentFailed(role, app.status, app.paymentType)
  const canReview = role === '財務' && app.status === '待審核'
  const invoiceOnly = isInvoiceOnlyType(app.paymentType)
  const needRate = isForeignCurrency(currency)
  const showExchangeRate = isForeignCurrency(currency)

  const umMode = isUmMonthlyType(app.paymentType) && Boolean(overview?.monthlyTotals)
  const parentLocked =
    app.status === '已作廢' || app.status === '已完成' || app.status === '付款失敗'
  const hasDraft = app.vouchers.some((item) => item.status === '草稿')
  const hasAnyDetail = app.vouchers.length > 0
  const invoiceSum = useMemo(
    () => invoiceAmountSum(app.vouchers.map((item) => item.payAmount)),
    [app.vouchers],
  )
  const invoiceTarget = overview?.monthlyTotals?.companyInvoiceAmount ?? 0
  const invoiceOk =
    !umMode ||
    invoiceSumMatchesTarget(invoiceSum, invoiceTarget, currency)
  const canExport =
    !isCashier &&
    hasAnyDetail &&
    !parentLocked &&
    !exporting &&
    (hasDraft || Boolean(app.exportedFile)) &&
    (!umMode || invoiceOk)

  const handleExport = async () => {
    if (!canExport || parentLocked) return

    if (!hasDraft && app.exportedFile) {
      downloadExistingVoucherFile(app.exportedFile)
      return
    }

    if (!hasDraft) return
    if (umMode && !invoiceOk) {
      window.alert(invoiceSumHint(invoiceSum, invoiceTarget, currency))
      return
    }

    setExporting(true)
    try {
      const file = await downloadVoucherPdf(app)
      saveExportedFile(app.id, file)
      exportVouchers(app.id)
      setNotice('已導出送線下審核')
    } catch {
      window.alert('導出 PDF 失敗，請再試一次。')
    } finally {
      setExporting(false)
    }
  }

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
            <dt>總付款金額（含稅）</dt>
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
          <div className="details-table-wrap">
            <table className="details-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>廠商統編</th>
                  <th>款項用途</th>
                  {!invoiceOnly && <th>備註單號</th>}
                  <th>憑證樣式</th>
                  <th>發票格式</th>
                  <th>發票號碼(憑證號碼)</th>
                  <th>發票日期</th>
                  <th>是否應稅</th>
                  <th>未稅金額</th>
                  <th>稅額</th>
                  {showExchangeRate && <th>付款匯率</th>}
                  <th>付款金額</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {app.vouchers.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{idx + 1}</td>
                    <td>{row.vendorTaxId}</td>
                    <td>{row.purpose}</td>
                    {!invoiceOnly && <td>{row.remarkNo}</td>}
                    <td>{row.voucherStyle}</td>
                    <td>{dashOrValue(row.invoiceFormat)}</td>
                    <td>{dashOrValue(row.invoiceNo)}</td>
                    <td>{dashOrValue(formatDateDisplay(row.invoiceDate))}</td>
                    <td>{dashOrValue(row.taxable)}</td>
                    <td className="num">
                      {formatAmount(row.untaxedAmount, currency)}
                    </td>
                    <td className="num">
                      {formatAmount(row.taxAmount, currency)}
                    </td>
                    {showExchangeRate && (
                      <td className="num">
                        {formatExchangeRate(app.paymentExchangeRate)}
                      </td>
                    )}
                    <td className="num">
                      {formatAmount(row.payAmount, currency)}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <div className="details-ops">
                        <button type="button" onClick={() => setViewing(row)}>
                          檢視
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="summary-footer">
        {onBack ? (
          <button
            type="button"
            className="btn btn-default btn-step"
            onClick={onBack}
          >
            返回
          </button>
        ) : (
          <span />
        )}
        <div className="summary-footer-right">
          {isCashier ? (
            <>
              {canFail && (
                <button
                  type="button"
                  className="btn btn-danger btn-step"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `確定將 ${app.applicationNo} 標記為付款失敗？`,
                      )
                    ) {
                      return
                    }
                    const updated = failPayment(app.id)
                    if (updated) {
                      setNotice(`已標記付款失敗 ${updated.applicationNo}`)
                    }
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
            </>
          ) : (
            <>
              {canReview && (
                <>
                  <button
                    type="button"
                    className="btn btn-default btn-step"
                    onClick={() => setRejectOpen(true)}
                  >
                    審核不通過
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-step"
                    onClick={() => {
                      approveApplication(app.id)
                      setNotice('已審核通過')
                    }}
                  >
                    審核通過
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-primary btn-step"
                disabled={!canExport}
                onClick={() => void handleExport()}
              >
                {exporting ? '導出中…' : '導出送線下審核'}
              </button>
            </>
          )}
        </div>
      </div>

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

      {viewing && (
        <ViewFilesModal
          voucherFile={viewing.voucherFile}
          attachments={viewing.attachments}
          onClose={() => setViewing(null)}
        />
      )}

      {rejectOpen && (
        <RejectReasonModal
          onClose={() => setRejectOpen(false)}
          onConfirm={(reason) => {
            rejectApplication(app.id, reason)
            setRejectOpen(false)
            setNotice('已審核不通過')
          }}
        />
      )}
    </div>
  )
}
