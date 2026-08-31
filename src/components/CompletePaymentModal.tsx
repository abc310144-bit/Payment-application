import { useState } from 'react'
import type { CurrencyCode } from '../types/payment'
import { todayISO } from '../utils/expectedPaymentDate'
import './AddDetailModal.css'

interface Props {
  currency?: CurrencyCode
  requireRate?: boolean
  onClose: () => void
  onConfirm: (payload: { actualPaymentDate: string; exchangeRate?: number }) => void
}

function sanitizeRateInput(value: string) {
  const next = value.replace(/[^\d.]/g, '')
  const dot = next.indexOf('.')
  if (dot < 0) return next
  const intPart = next.slice(0, dot)
  const frac = next.slice(dot + 1).replace(/\./g, '').slice(0, 6)
  return `${intPart}.${frac}`
}

/** 完成付款：回壓實際付款日；外幣時一併填匯率 */
export function CompletePaymentModal({
  currency,
  requireRate = false,
  onClose,
  onConfirm,
}: Props) {
  const [actualPaymentDate, setActualPaymentDate] = useState(todayISO())
  const [rate, setRate] = useState('')
  const [dateError, setDateError] = useState('')
  const [rateError, setRateError] = useState('')

  const handleConfirm = () => {
    let ok = true
    if (!actualPaymentDate) {
      setDateError('請選擇實際付款日')
      ok = false
    } else {
      setDateError('')
    }

    let exchangeRate: number | undefined
    if (requireRate) {
      const next = rate.trim()
      if (!next) {
        setRateError('請填入付款匯率')
        ok = false
      } else {
        const parsed = Number(next)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setRateError('請輸入大於 0 的匯率')
          ok = false
        } else {
          setRateError('')
          exchangeRate = parsed
        }
      }
    }

    if (!ok) return
    onConfirm({ actualPaymentDate, exchangeRate })
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal-card modal-card-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="complete-payment-title"
      >
        <div className="modal-head">
          <h2 id="complete-payment-title">完成付款</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-row">
          <span className="required">實際付款日</span>
          <div className="modal-field">
            <input
              type="date"
              autoFocus
              value={actualPaymentDate}
              className={dateError ? 'error' : undefined}
              onChange={(e) => {
                setActualPaymentDate(e.target.value)
                if (dateError) setDateError('')
              }}
            />
            <p className="field-hint">預設為今日，可依實際付款日調整。</p>
            {dateError ? <p className="field-error">{dateError}</p> : null}
          </div>
        </div>

        {requireRate ? (
          <div className="modal-row">
            <span className="required">付款匯率</span>
            <div className="modal-field">
              <input
                inputMode="decimal"
                placeholder="請填入付款匯率"
                value={rate}
                className={rateError ? 'error' : undefined}
                onChange={(e) => {
                  setRate(sanitizeRateInput(e.target.value))
                  if (rateError) setRateError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm()
                }}
              />
              {currency ? (
                <p className="field-hint">付款幣別：{currency}</p>
              ) : null}
              {rateError ? <p className="field-error">{rateError}</p> : null}
            </div>
          </div>
        ) : null}

        <div className="modal-foot">
          <button type="button" className="btn btn-default" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
          >
            確認
          </button>
        </div>
      </div>
    </div>
  )
}
