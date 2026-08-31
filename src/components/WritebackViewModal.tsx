import type { WritebackRecord } from '../types/voucher'
import { formatAmount } from '../utils/money'
import { formatDisplayDate } from '../utils/writeoff'
import './AddDetailModal.css'
import './ViewFilesModal.css'
import './WriteoffHistoryPanel.css'

interface Props {
  applicationNo: string
  vendorTaxId: string
  currency?: string | null
  record: WritebackRecord
  onClose: () => void
}

function isImageFile(type: string, name: string) {
  return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name)
}

function isPdfFile(type: string, name: string) {
  return type === 'application/pdf' || /\.pdf$/i.test(name)
}

export function WritebackViewModal({
  applicationNo,
  vendorTaxId,
  currency,
  record,
  onClose,
}: Props) {
  const writeoffNo = `${applicationNo}-${record.id}`
  const isInvoice = record.style === '發票'
  const file = record.file
  const showImage = Boolean(file && isImageFile(file.type, file.name))
  const showPdf = Boolean(file && isPdfFile(file.type, file.name))

  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal-card view-files-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="writeback-view-title"
      >
        <div className="modal-head">
          <h2 id="writeback-view-title">回壓憑證檢視：{writeoffNo}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <dl className="view-meta">
          <div>
            <dt>核銷單號</dt>
            <dd>{writeoffNo}</dd>
          </div>
          <div>
            <dt>憑證樣式</dt>
            <dd>{record.style}</dd>
          </div>
          {isInvoice && (
            <>
              <div>
                <dt>發票格式</dt>
                <dd>{record.invoiceFormat || '-'}</dd>
              </div>
              <div>
                <dt>發票號碼（憑證號碼）</dt>
                <dd>{record.invoiceNo || '-'}</dd>
              </div>
              {record.invoiceTaxId ? (
                <div>
                  <dt>發票統編</dt>
                  <dd>{record.invoiceTaxId}</dd>
                </div>
              ) : null}
              <div>
                <dt>發票日期</dt>
                <dd>
                  {record.invoiceDate
                    ? formatDisplayDate(record.invoiceDate)
                    : '-'}
                </dd>
              </div>
            </>
          )}
          <div>
            <dt>金額</dt>
            <dd>{formatAmount(record.amount, currency)}</dd>
          </div>
          <div>
            <dt>廠商統編</dt>
            <dd>{vendorTaxId || '-'}</dd>
          </div>
          <div>
            <dt>上傳時間</dt>
            <dd>{record.uploadedAt}</dd>
          </div>
        </dl>

        <div className="view-files-body writeback-file-body">
          {file ? (
            <article className="file-preview">
              <div className="file-preview-tag">回壓文件</div>
              {showImage ? (
                <img src={file.url} alt={file.name} />
              ) : showPdf ? (
                <iframe
                  className="file-preview-pdf"
                  title={file.name}
                  src={file.url}
                />
              ) : (
                <a href={file.url} target="_blank" rel="noreferrer">
                  {file.name}
                </a>
              )}
            </article>
          ) : (
            <p className="file-empty">尚未上傳回壓文件</p>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-default" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
