import { useMemo, useState } from 'react'
import { AddDetailModal } from './AddDetailModal'
import { RejectReasonModal } from './RejectReasonModal'
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
  downloadExistingVoucherFile,
  downloadVoucherPdf,
} from '../utils/exportVoucherPdf'
import {
  formatExchangeRate,
  isForeignCurrency,
} from '../types/payment'
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
  const {
    saveVoucher,
    removeVoucher,
    exportVouchers,
    saveExportedFile,
    approveApplication,
    rejectApplication,
  } = useApplications()

  const [pageSize, setPageSize] = useState(20)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<VoucherDetail | undefined>()
  const [viewing, setViewing] = useState<VoucherDetail | null>(null)
  const [exporting, setExporting] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  const defaultTaxId = isPettyCashType(app.paymentType)
    ? ''
    : getVendorTaxId(app.overview?.vendorId)
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
  const hasDraft = app.vouchers.some((item) => item.status === '草稿')
  const canReview = role === '財務' && app.status === '待審核'
  /** 已完成／已作廢：除檢視外不可操作 */
  const parentLocked = app.status === '已作廢' || app.status === '已完成'
  const hasAnyDetail = app.vouchers.length > 0
  const canExport =
    hasAnyDetail &&
    !parentLocked &&
    !exporting &&
    (hasDraft || Boolean(app.exportedFile))
  const rows = app.vouchers.slice(0, pageSize)
  const showExchangeRate = isForeignCurrency(app.overview?.currency)
  const colCount = showExchangeRate ? 15 : 14

  const openAdd = () => {
    setEditing(undefined)
    setModal('add')
  }

  const openEdit = (row: VoucherDetail) => {
    setEditing(row)
    setModal('edit')
  }

  const handleExport = async () => {
    if (!canExport || parentLocked) return

    // 無草稿但已有導出檔：重複下載同一份，狀態不變
    if (!hasDraft && app.exportedFile) {
      downloadExistingVoucherFile(app.exportedFile)
      return
    }

    if (!hasDraft) return

    setExporting(true)
    try {
      const file = await downloadVoucherPdf(app)
      saveExportedFile(app.id, file)
      exportVouchers(app.id)
    } catch {
      window.alert('導出 PDF 失敗，請再試一次。')
    } finally {
      setExporting(false)
    }
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
            + 新增明細
          </button>
          <button
            type="button"
            className="btn btn-default"
            disabled={!canExport}
            onClick={() => void handleExport()}
          >
            {exporting ? '導出中…' : '導出文件'}
          </button>
          <button
            type="button"
            className={canReview ? 'btn btn-primary' : 'btn btn-disabled'}
            disabled={!canReview}
            onClick={() => canReview && approveApplication(app.id)}
          >
            審核通過
          </button>
          <button
            type="button"
            className={canReview ? 'btn btn-default' : 'btn btn-disabled'}
            disabled={!canReview}
            onClick={() => canReview && setRejectOpen(true)}
          >
            審核不通過
          </button>
        </div>
      </div>

      <div className="details-table-wrap">
        <table className="details-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>廠商統編</th>
              <th>款項用途</th>
              <th>備註單號</th>
              <th>憑證樣式</th>
              <th>發票格式</th>
              <th>發票號碼(憑證號碼)</th>
              <th>發票日期</th>
              <th>應稅 / 未稅</th>
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
                  尚無已保存之憑證明細
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
                    <td>{row.remarkNo}</td>
                    <td>{row.voucherStyle}</td>
                    <td>{dashOrValue(row.invoiceFormat)}</td>
                    <td>{dashOrValue(row.invoiceNo)}</td>
                    <td>{dashOrValue(formatDateDisplay(row.invoiceDate))}</td>
                    <td>{row.taxable}</td>
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
        請點「+ 新增明細」以列出憑證明細。本表僅顯示已保存之憑證。首次導出會下載該批草稿明細 PDF，並將草稿改為待審核；之後可重複下載同一份檔案且狀態不變。母單已完成後僅可檢視。
      </p>

      {modal && (
        <AddDetailModal
          paymentType={app.paymentType}
          currency={app.overview?.currency ?? '臺幣TWD'}
          defaultTaxId={defaultTaxId}
          autoPurpose={autoFill?.purpose}
          autoSettlementMonth={autoFill?.month}
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

      {rejectOpen && (
        <RejectReasonModal
          onClose={() => setRejectOpen(false)}
          onConfirm={(reason) => {
            rejectApplication(app.id, reason)
            setRejectOpen(false)
          }}
        />
      )}
    </div>
  )
}
