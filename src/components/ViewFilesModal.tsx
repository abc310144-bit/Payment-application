import type { VoucherFile } from '../types/voucher'
import './AddDetailModal.css'
import './ViewFilesModal.css'

interface Props {
  voucherFile: VoucherFile | null
  attachments: VoucherFile[]
  onClose: () => void
}

function Preview({ file, label }: { file: VoucherFile; label: string }) {
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  return (
    <article className="file-preview">
      <div className="file-preview-tag">{label}</div>
      {isImage ? (
        <img src={file.url} alt={file.name} />
      ) : isPdf ? (
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
  )
}

export function ViewFilesModal({ voucherFile, attachments, onClose }: Props) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal-card view-files-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="view-files-title"
      >
        <div className="modal-head">
          <h2 id="view-files-title">檢視憑證</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="view-files-body">
          {voucherFile ? (
            <Preview file={voucherFile} label="主憑證" />
          ) : (
            <p className="file-empty">尚未上傳主憑證</p>
          )}
          {attachments.map((file, idx) => (
            <Preview key={`${file.name}-${idx}`} file={file} label={`附件 ${idx + 1}`} />
          ))}
          {!voucherFile && attachments.length === 0 && (
            <p className="file-empty">沒有可檢視的檔案</p>
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
