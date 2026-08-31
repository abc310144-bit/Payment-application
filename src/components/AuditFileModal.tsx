import type { VoucherFile } from '../types/voucher'
import './AddDetailModal.css'
import './ViewFilesModal.css'

interface Props {
  file: VoucherFile | null
  onClose: () => void
}

export function AuditFileModal({ file, onClose }: Props) {
  const handleDownload = () => {
    if (!file) return
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    link.click()
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal-card view-files-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="audit-file-title"
      >
        <div className="modal-head">
          <h2 id="audit-file-title">檢視審核檔案</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="view-files-body">
          {file ? (
            <article className="file-preview">
              <div className="file-preview-tag">導出文件</div>
              <div>
                <div className="file-names">{file.name}</div>
                <iframe
                  className="file-preview-pdf"
                  title={file.name}
                  src={file.url}
                />
              </div>
            </article>
          ) : (
            <p className="file-empty">
              尚無導出檔案。請先於明細頁導出文件；重新整理後本次暫存檔會消失。
            </p>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-default" onClick={onClose}>
            關閉
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!file}
            onClick={handleDownload}
          >
            下載
          </button>
        </div>
      </div>
    </div>
  )
}
