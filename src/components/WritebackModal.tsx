import { useState } from 'react'
import {
  INVOICE_FORMATS,
  WRITEBACK_STYLES,
  type VoucherFile,
  type WritebackRecord,
  type WritebackStyle,
} from '../types/voucher'
import {
  amountInputError,
  allowsDecimalAmount,
  commitAmount,
  formatAmount,
  sanitizeAmountInput,
} from '../utils/money'
import { WRITEBACK_INVOICE_TAX_IDS } from '../utils/writeoff'
import './AddDetailModal.css'
import './WriteoffHistoryPanel.css'

interface Props {
  currency?: string | null
  paidTotal: number
  writtenOff: number
  remaining: number
  requireInvoiceTaxId?: boolean
  onClose: () => void
  onConfirm: (payload: Omit<WritebackRecord, 'id' | 'uploadedAt'>) => string | undefined
}

function toFileMeta(file: File): VoucherFile {
  return { name: file.name, type: file.type, url: URL.createObjectURL(file) }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="field-error">{message}</p>
}

export function WritebackModal({
  currency,
  paidTotal,
  writtenOff,
  remaining,
  requireInvoiceTaxId = false,
  onClose,
  onConfirm,
}: Props) {
  const allowDecimal = allowsDecimalAmount(currency)
  const [style, setStyle] = useState<WritebackStyle>('發票')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceTaxId, setInvoiceTaxId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceFormat, setInvoiceFormat] = useState('')
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<VoucherFile | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isInvoice = style === '發票'

  const validate = () => {
    const next: Record<string, string> = {}
    if (isInvoice) {
      if (!invoiceNo.trim()) next.invoiceNo = '請輸入發票號碼（憑證號碼）'
      if (requireInvoiceTaxId && !invoiceTaxId) next.invoiceTaxId = '請選擇發票統編'
      if (!invoiceDate) next.invoiceDate = '請選擇發票日期'
      if (!invoiceFormat) next.invoiceFormat = '請選擇發票格式'
    }
    const amountError = amountInputError(amount, allowDecimal)
    if (amountError) {
      next.amount = amountError
    } else if (commitAmount(amount, allowDecimal) > remaining) {
      next.amount = `回壓金額不可超過本明細未核銷餘額（${formatAmount(remaining, currency)}）`
    }
    if (!file) next.file = '請上傳附件'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleConfirm = () => {
    if (!validate()) return
    const saveError = onConfirm({
      style,
      invoiceNo: isInvoice ? invoiceNo.trim() : '',
      invoiceTaxId: isInvoice && requireInvoiceTaxId ? invoiceTaxId : '',
      invoiceDate: isInvoice ? invoiceDate : '',
      invoiceFormat: isInvoice ? invoiceFormat : '',
      amount: commitAmount(amount, allowDecimal),
      file,
    })
    if (saveError) {
      setErrors({ amount: saveError })
      return
    }
    onClose()
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="writeback-title"
      >
        <div className="modal-head">
          <h2 id="writeback-title">回壓憑證文件</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-row">
          <span className="required">選擇憑證樣式</span>
          <div className="modal-field">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as WritebackStyle)}
            >
              {WRITEBACK_STYLES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        {isInvoice && (
          <>
            <div className="modal-row">
              <span className="required">發票號碼（憑證號碼）</span>
              <div className="modal-field">
                <input
                  placeholder="請輸入發票號碼"
                  value={invoiceNo}
                  className={errors.invoiceNo ? 'error' : undefined}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
                <FieldError message={errors.invoiceNo} />
              </div>
            </div>
            {requireInvoiceTaxId && (
              <div className="modal-row">
                <span className="required">發票統編</span>
                <div className="modal-field">
                  <select
                    value={invoiceTaxId}
                    className={errors.invoiceTaxId ? 'error' : undefined}
                    onChange={(e) => setInvoiceTaxId(e.target.value)}
                  >
                    <option value="">請選擇</option>
                    {WRITEBACK_INVOICE_TAX_IDS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.invoiceTaxId} />
                </div>
              </div>
            )}
            <div className="modal-row">
              <span className="required">發票日期</span>
              <div className="modal-field">
                <input
                  type="date"
                  value={invoiceDate}
                  className={errors.invoiceDate ? 'error' : undefined}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
                <FieldError message={errors.invoiceDate} />
              </div>
            </div>
            <div className="modal-row">
              <span className="required">發票格式</span>
              <div className="modal-field">
                <select
                  value={invoiceFormat}
                  className={errors.invoiceFormat ? 'error' : undefined}
                  onChange={(e) => setInvoiceFormat(e.target.value)}
                >
                  <option value="">請選擇</option>
                  {INVOICE_FORMATS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <FieldError message={errors.invoiceFormat} />
              </div>
            </div>
          </>
        )}

        <div className="modal-row">
          <span className="required">金額</span>
          <div className="modal-field">
            <input
              inputMode={allowDecimal ? 'decimal' : 'numeric'}
              pattern={allowDecimal ? undefined : '[0-9]*'}
              value={amount}
              placeholder={`不可超過 ${formatAmount(remaining, currency)}`}
              className={errors.amount ? 'error' : undefined}
              onChange={(e) =>
                setAmount(sanitizeAmountInput(e.target.value, allowDecimal))
              }
            />
            <FieldError message={errors.amount} />
          </div>
        </div>

        <div className="file-block" style={{ marginLeft: 0 }}>
          <label htmlFor="writeback-file" className="required">
            上傳附件
          </label>
          <input
            id="writeback-file"
            className="file-native"
            type="file"
            onChange={(e) =>
              setFile(e.target.files?.[0] ? toFileMeta(e.target.files[0]) : null)
            }
          />
          {file && <div className="file-names">{file.name}</div>}
          <FieldError message={errors.file} />
        </div>

        <p className="writeback-summary">
          付款總金額：{formatAmount(paidTotal, currency)}　|　本明細已核銷：
          {formatAmount(writtenOff, currency)}　|　本明細未核銷餘額：
          {formatAmount(remaining, currency)}
        </p>

        <div className="modal-foot">
          <button type="button" className="btn btn-default" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm}>
            確定
          </button>
        </div>
      </div>
    </div>
  )
}
