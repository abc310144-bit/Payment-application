import { useState } from 'react'
import './AddDetailModal.css'

interface Props {
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function RejectReasonModal({ onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    const next = reason.trim()
    if (!next) {
      setError('請輸入不通過原因')
      return
    }
    onConfirm(next)
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal-card modal-card-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="reject-reason-title"
      >
        <div className="modal-head">
          <h2 id="reject-reason-title">審核不通過</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-row">
          <span className="required">不通過原因</span>
          <div className="modal-field">
            <textarea
              autoFocus
              rows={4}
              placeholder="請輸入不通過原因"
              value={reason}
              className={error ? 'error' : undefined}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError('')
              }}
            />
            {error ? <p className="field-error">{error}</p> : null}
          </div>
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-default" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            確認
          </button>
        </div>
      </div>
    </div>
  )
}
