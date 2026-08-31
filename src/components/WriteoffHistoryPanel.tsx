import { Fragment, useMemo, useState } from 'react'
import {
  useApplications,
  type StoredApplication,
} from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import type { VoucherDetail, WritebackRecord } from '../types/voucher'
import { formatAmount } from '../utils/money'
import {
  formatWritebackLabel,
  isFullyWrittenOff,
  isWriteoffPhaseStatus,
  needsWritebackInvoiceTaxId,
  parentUnwrittenRemaining,
  remainingWriteoffAmount,
  writebacksOf,
  writtenOffAmount,
} from '../utils/writeoff'
import { WritebackModal } from './WritebackModal'
import { WritebackViewModal } from './WritebackViewModal'
import './WriteoffHistoryPanel.css'

export function WriteoffHistoryPanel({ app }: { app: StoredApplication }) {
  const { role } = useRole()
  const { addWriteback, removeWriteback } = useApplications()
  const [writebackRow, setWritebackRow] = useState<VoucherDetail | null>(null)
  const [viewing, setViewing] = useState<{
    detail: VoucherDetail
    record: WritebackRecord
  } | null>(null)

  const rows = useMemo(
    () => app.vouchers.filter((item) => isWriteoffPhaseStatus(item.status)),
    [app.vouchers],
  )
  const remaining = parentUnwrittenRemaining(app.vouchers)
  /** 已完成後除檢視外不可操作；僅建檔人可回壓／作廢核銷 */
  const canMutateWriteoff =
    role === '建檔人' &&
    (app.status === '待核銷' || app.status === '部分核銷')
  const currency = app.overview?.currency

  const handleVoidWriteback = (detail: VoucherDetail, record: WritebackRecord) => {
    if (!canMutateWriteoff) return
    if (!window.confirm('確定作廢此筆核銷紀錄？作廢後將刪除該筆回壓資料與核銷金額。')) {
      return
    }
    const error = removeWriteback(app.id, detail.id, record.id)
    if (error) window.alert(error)
  }

  return (
    <div className="writeoff-panel">
      <p className="writeoff-summary">
        母單：{app.applicationNo}（未核銷餘額：{formatAmount(remaining, currency)}）
      </p>

      <div className="writeoff-table-wrap">
        <table className="writeoff-table">
          <thead>
            <tr>
              <th>明細</th>
              <th>應稅 / 未稅</th>
              <th>金額</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="writeoff-empty">
                  尚無待核銷明細。請先新增憑證明細並完成付款。
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const full = isFullyWrittenOff(row)
              const disabled = !canMutateWriteoff || full
              const records = writebacksOf(row)
              return (
                <Fragment key={row.id}>
                  <tr>
                    <td>
                      {idx + 1}. {row.purpose}
                    </td>
                    <td>{row.taxable}</td>
                    <td className="num">{formatAmount(row.payAmount, currency)}</td>
                    <td>
                      <div className="writeoff-ops">
                        <button
                          type="button"
                          disabled={disabled}
                          title={
                            app.status === '已完成'
                              ? '已完成申請不可再回壓'
                              : full
                                ? '此明細已全額回壓，不可再回壓'
                                : !canMutateWriteoff
                                  ? '僅建檔人可回壓憑證'
                                  : undefined
                          }
                          onClick={() => setWritebackRow(row)}
                        >
                          回壓憑證文件
                        </button>
                      </div>
                    </td>
                  </tr>
                  {records.map((record) => (
                    <tr key={record.id} className="writeoff-child">
                      <td colSpan={3}>{formatWritebackLabel(record, currency)}</td>
                      <td>
                        <div className="writeoff-ops">
                          <button
                            type="button"
                            onClick={() => setViewing({ detail: row, record })}
                          >
                            檢視憑證
                          </button>
                          {canMutateWriteoff && (
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleVoidWriteback(row, record)}
                            >
                              作廢
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {writebackRow && (
        <WritebackModal
          currency={currency}
          paidTotal={app.totalAmount}
          writtenOff={writtenOffAmount(writebackRow)}
          remaining={remainingWriteoffAmount(writebackRow)}
          requireInvoiceTaxId={needsWritebackInvoiceTaxId(app)}
          onClose={() => setWritebackRow(null)}
          onConfirm={(payload) => addWriteback(app.id, writebackRow.id, payload)}
        />
      )}

      {viewing && (
        <WritebackViewModal
          applicationNo={app.applicationNo}
          vendorTaxId={viewing.detail.vendorTaxId}
          currency={currency}
          record={viewing.record}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
