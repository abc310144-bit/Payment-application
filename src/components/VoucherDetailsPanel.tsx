import { useMemo, useState } from 'react'
import { AddDetailModal } from './AddDetailModal'
import { StatusBadge } from './StatusBadge'
import { ViewFilesModal } from './ViewFilesModal'
import {
  useApplications,
  type StoredApplication,
} from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import { isPettyCashType } from '../data/mockEmployees'
import { getVendorTaxId } from '../data/mockVendors'
import { formatDateDisplay } from '../utils/expectedPaymentDate'
import { formatAmount } from '../utils/money'
import {
  formatExchangeRate,
  isForeignCurrency,
  isInvoiceOnlyType,
  isUmMonthlyType,
} from '../types/payment'
import {
  MONTHLY_SETTLEMENT_FIELDS,
} from '../types/monthlySettlement'
import {
  invoiceAmountSum,
  invoiceSumHint,
  invoiceSumMatchesTarget,
} from '../utils/invoiceMatch'
import {
  canAddVoucherDetail,
  dashOrValue,
  getVoucherRowOps,
  type VoucherDetail,
  type VoucherPurpose,
} from '../types/voucher'
import './VoucherDetailsPanel.css'

interface Props {
  app: StoredApplication
}

export function VoucherDetailsPanel({ app }: Props) {
  const { role } = useRole()
  const { saveVoucher, removeVoucher } = useApplications()

  const [pageSize, setPageSize] = useState(20)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<VoucherDetail | undefined>()
  const [viewing, setViewing] = useState<VoucherDetail | null>(null)

  const defaultTaxId = isUmMonthlyType(app.paymentType)
    ? app.overview?.vendorTaxId || ''
    : isPettyCashType(app.paymentType)
      ? ''
      : getVendorTaxId(app.overview?.vendorId)
  const umMode = isUmMonthlyType(app.paymentType) && Boolean(app.overview?.monthlyTotals)
  const invoiceOnlyMode =
    isInvoiceOnlyType(app.paymentType) &&
    (!isUmMonthlyType(app.paymentType) || umMode)
  const monthlyTotals = app.overview?.monthlyTotals
  const autoFill = useMemo(() => {
    const month = app.overview?.settlementMonth || ''
    if (app.paymentType === '通路費用 (通路後扣)' && month) {
      return { purpose: '通路費用(通路後扣)' as VoucherPurpose, month }
    }
    if (app.paymentType === 'URMART 月結廠商' && month) {
      return { purpose: 'URMART月結廠商' as VoucherPurpose, month }
    }
    return null
  }, [app.paymentType, app.overview?.settlementMonth])

  const canAdd = canAddVoucherDetail(role, app.status)
  /** 已完成／已作廢／付款失敗：除檢視外不可操作 */
  const parentLocked =
    app.status === '已作廢' || app.status === '已完成' || app.status === '付款失敗'
  const invoiceSum = invoiceAmountSum(app.vouchers.map((item) => item.payAmount))
  const invoiceTarget = monthlyTotals?.companyInvoiceAmount ?? 0
  const invoiceOk =
    !umMode ||
    invoiceSumMatchesTarget(
      invoiceSum,
      invoiceTarget,
      app.overview?.currency,
    )
  const rows = app.vouchers.slice(0, pageSize)
  const showExchangeRate = isForeignCurrency(app.overview?.currency)
  const colCount = (showExchangeRate ? 15 : 14) - (invoiceOnlyMode ? 1 : 0)

  const openAdd = () => {
    setEditing(undefined)
    setModal('add')
  }

  const openEdit = (row: VoucherDetail) => {
    setEditing(row)
    setModal('edit')
  }

  return (
    <div className="details-panel">
      <div className="details-toolbar">
        <div className="details-meta">
          總共 {app.vouchers.length} 筆，每頁顯示
          <select
            value={pageSize}
            aria-label="每頁筆數"
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          筆
        </div>
        <div className="details-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAdd || parentLocked}
            onClick={() => canAdd && openAdd()}
          >
            {invoiceOnlyMode ? '+ 新增發票' : '+ 新增明細'}
          </button>
        </div>
      </div>

      {umMode && monthlyTotals && (
        <div className="monthly-settlement">
          <h2 className="monthly-title">月結彙總（唯讀，由廠商結算報表帶入）</h2>
          <dl className="monthly-grid">
            {MONTHLY_SETTLEMENT_FIELDS.map((field) => (
              <div className="monthly-item" key={field.key}>
                <dt>{field.label}</dt>
                <dd>
                  {formatAmount(monthlyTotals[field.key], app.overview?.currency)}
                </dd>
              </div>
            ))}
          </dl>
          <div className={`invoice-match${invoiceOk ? ' is-ok' : ' is-bad'}`}>
            <div className="invoice-match-amounts">
              <div className="invoice-match-row">
                <span>貴公司開立發票金額(含稅)</span>
                <strong>
                  {formatAmount(invoiceTarget, app.overview?.currency)}
                </strong>
              </div>
              <div className="invoice-match-row">
                <span>所需發票總金額</span>
                <strong>
                  {formatAmount(invoiceTarget, app.overview?.currency)}
                </strong>
              </div>
              <div className="invoice-match-row">
                <span>目前發票總金額</span>
                <strong>
                  {formatAmount(invoiceSum, app.overview?.currency)}
                </strong>
              </div>
            </div>
            <p className="invoice-match-status">
              {invoiceSumHint(invoiceSum, invoiceTarget, app.overview?.currency)}
            </p>
          </div>
        </div>
      )}

      <div className="details-table-wrap">
        <table className="details-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>廠商統編</th>
              <th>款項用途</th>
              {!invoiceOnlyMode && <th>備註單號</th>}
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="empty-cell">
                  {invoiceOnlyMode ? '尚無已保存之發票' : '尚無已保存之憑證明細'}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const ops = parentLocked
                  ? [{ key: 'view' as const, label: '檢視' }]
                  : getVoucherRowOps(role, row.status)
                return (
                  <tr key={row.id}>
                    <td>{idx + 1}</td>
                    <td>{row.vendorTaxId}</td>
                    <td>{row.purpose}</td>
                    {!invoiceOnlyMode && <td>{row.remarkNo}</td>}
                    <td>{row.voucherStyle}</td>
                    <td>{dashOrValue(row.invoiceFormat)}</td>
                    <td>{dashOrValue(row.invoiceNo)}</td>
                    <td>{dashOrValue(formatDateDisplay(row.invoiceDate))}</td>
                    <td>{dashOrValue(row.taxable)}</td>
                    <td className="num">
                      {formatAmount(row.untaxedAmount, app.overview?.currency)}
                    </td>
                    <td className="num">
                      {formatAmount(row.taxAmount, app.overview?.currency)}
                    </td>
                    {showExchangeRate && (
                      <td className="num">
                        {formatExchangeRate(app.paymentExchangeRate)}
                      </td>
                    )}
                    <td className="num">
                      {formatAmount(row.payAmount, app.overview?.currency)}
                    </td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <div className="details-ops">
                        {ops.map((op) => (
                          <button
                            type="button"
                            key={op.key}
                            onClick={() => {
                              if (op.key === 'view') setViewing(row)
                              if (op.key === 'edit') openEdit(row)
                              if (
                                op.key === 'void' &&
                                window.confirm('確定作廢此筆明細？')
                              ) {
                                removeVoucher(app.id, row.id)
                              }
                            }}
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

      <p className="details-foot">
        {umMode
          ? '請點「+ 新增發票」補上憑證。發票加總與貴公司開立發票金額相差在 ±3 元以內才可於步驟 3 導出送審（臺幣、外幣皆適用）。彙總欄位唯讀。'
          : invoiceOnlyMode
            ? '請點「+ 新增發票」新增一至多張發票。於步驟 3「導出送線下審核」後草稿改為待審核；財務於步驟 3 審核通過後單據直接已完成。'
            : '請點「+ 新增明細」以列出憑證明細。本表僅顯示已保存之憑證。於步驟 3「導出送線下審核」後草稿改為待審核；之後可重複下載且狀態不變。母單已完成後僅可檢視。'}
      </p>

      {modal && (
        <AddDetailModal
          paymentType={app.paymentType}
          currency={app.overview?.currency ?? '臺幣TWD'}
          defaultTaxId={defaultTaxId}
          autoPurpose={autoFill?.purpose}
          autoSettlementMonth={autoFill?.month}
          variant={invoiceOnlyMode ? 'um-invoice' : 'default'}
          initial={editing}
          onClose={() => setModal(null)}
          onSave={(detail) => {
            saveVoucher(app.id, detail)
            setModal(null)
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
    </div>
  )
}
