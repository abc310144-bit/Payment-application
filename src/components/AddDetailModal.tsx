import { useMemo, useState } from 'react'
import {
  isForeignCurrency,
  type CurrencyCode,
  type PaymentType,
} from '../types/payment'
import {
  INVOICE_FORMATS,
  PURPOSE_SECOND_FIELD,
  VOUCHER_PURPOSES,
  formatRemarkNo,
  getVoucherStyles,
  type TaxFlag,
  type VoucherDetail,
  type VoucherFile,
  type VoucherPurpose,
} from '../types/voucher'
import {
  amountInputError,
  amountInputFromValue,
  allowsDecimalAmount,
  commitAmount,
  formatAmount,
  sanitizeAmountInput,
} from '../utils/money'
import { calcVoucherTotals } from '../utils/voucherTax'
import './AddDetailModal.css'

interface LineDraft {
  id: string
  name: string
  taxable: TaxFlag
  amount: string
}

interface Props {
  paymentType: PaymentType
  currency?: CurrencyCode
  defaultTaxId: string
  autoPurpose?: VoucherPurpose
  autoSettlementMonth?: string
  initial?: VoucherDetail
  onClose: () => void
  onSave: (detail: VoucherDetail) => void
}

const TAX_OPTIONS: TaxFlag[] = ['應稅', '未稅']

function newLineId() {
  return `L-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeLine(taxable: TaxFlag): LineDraft {
  return { id: newLineId(), name: '', taxable, amount: '' }
}

function toFileMeta(file: File): VoucherFile {
  return { name: file.name, type: file.type, url: URL.createObjectURL(file) }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="field-error">{message}</p>
}

export function AddDetailModal({
  paymentType,
  currency = '臺幣TWD',
  defaultTaxId,
  autoPurpose,
  autoSettlementMonth,
  initial,
  onClose,
  onSave,
}: Props) {
  const isEdit = Boolean(initial)
  const taxLockedByCurrency = isForeignCurrency(currency)
  const allowDecimal = allowsDecimalAmount(currency)
  const styles = getVoucherStyles(paymentType)
  const startPurpose = initial?.purpose ?? autoPurpose ?? '其他費用'
  const secondMeta0 = PURPOSE_SECOND_FIELD[startPurpose]

  const [purpose, setPurpose] = useState<VoucherPurpose>(startPurpose)
  const [secondText, setSecondText] = useState(() => {
    if (initial) return initial.secondText
    return secondMeta0.kind === 'month' ? autoSettlementMonth ?? '' : ''
  })
  const [secondFrom, setSecondFrom] = useState(initial?.secondFrom ?? '')
  const [secondTo, setSecondTo] = useState(initial?.secondTo ?? '')
  const [voucherStyle, setVoucherStyle] = useState(
    initial?.voucherStyle && styles.includes(initial.voucherStyle)
      ? initial.voucherStyle
      : styles[0],
  )
  const [invoiceFormat, setInvoiceFormat] = useState(initial?.invoiceFormat ?? '')
  const [invoiceNo, setInvoiceNo] = useState(initial?.invoiceNo ?? '')
  const [invoiceDate, setInvoiceDate] = useState(initial?.invoiceDate ?? '')
  const [vendorTaxId, setVendorTaxId] = useState(
    initial?.vendorTaxId ?? defaultTaxId,
  )
  const [taxable, setTaxable] = useState<TaxFlag>(
    taxLockedByCurrency ? '未稅' : (initial?.taxable ?? '應稅'),
  )
  const [lines, setLines] = useState<LineDraft[]>(() =>
    initial?.lines.length
      ? initial.lines.map((line) => ({
          id: line.id,
          name: line.name,
          taxable: taxLockedByCurrency ? '未稅' : line.taxable,
          amount: amountInputFromValue(line.amount, allowsDecimalAmount(currency)),
        }))
      : [makeLine(taxLockedByCurrency ? '未稅' : '應稅')],
  )
  const [voucherFile, setVoucherFile] = useState<VoucherFile | null>(
    initial?.voucherFile ?? null,
  )
  const [attachments, setAttachments] = useState<VoucherFile[]>(
    initial?.attachments ?? [],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const second = PURPOSE_SECOND_FIELD[purpose]
  const showInvoiceFormat = voucherStyle === '發票'
  const effectiveTaxable: TaxFlag = taxLockedByCurrency ? '未稅' : taxable
  const lineTaxLocked = effectiveTaxable === '未稅'

  const totals = useMemo(
    () =>
      calcVoucherTotals(
        effectiveTaxable,
        lines.map((line) => ({
          taxable: lineTaxLocked ? '未稅' : line.taxable,
          amount: Number(line.amount) || 0,
        })),
        allowDecimal,
      ),
    [effectiveTaxable, lines, lineTaxLocked, allowDecimal],
  )

  const changePurpose = (next: VoucherPurpose) => {
    setPurpose(next)
    const meta = PURPOSE_SECOND_FIELD[next]
    setSecondFrom('')
    setSecondTo('')
    setSecondText(
      meta.kind === 'month' &&
        (next === autoPurpose || next === '通路費用(通路後扣)' || next === 'URMART月結廠商')
        ? autoSettlementMonth ?? ''
        : '',
    )
  }

  const changeMainTax = (next: TaxFlag) => {
    setTaxable(next)
    if (next === '未稅') {
      setLines((prev) => prev.map((line) => ({ ...line, taxable: '未稅' })))
    }
  }

  const updateLine = (id: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (second.kind === 'dateRange' && (!secondFrom || !secondTo)) {
      next.second = `請設定${second.label}`
    } else if (second.kind === 'dateRange' && secondFrom > secondTo) {
      next.second = `${second.label}的結束日不可早於開始日`
    }
    if (second.kind !== 'dateRange' && !secondText.trim()) {
      next.second = `請輸入${second.label}`
    }
    if (showInvoiceFormat && !invoiceFormat) next.invoiceFormat = '請選擇發票格式'
    if (!invoiceNo.trim()) next.invoiceNo = '請輸入發票號碼(憑證號碼)'
    if (showInvoiceFormat && !invoiceDate) next.invoiceDate = '請選擇發票日期'
    if (!/^\d{8}$/.test(vendorTaxId)) next.vendorTaxId = '請輸入 8 位數字統編'
    lines.forEach((line) => {
      if (!line.name.trim()) next[`lineName:${line.id}`] = '請輸入明細細項'
      const amountError = amountInputError(line.amount, allowDecimal)
      if (amountError) next[`lineAmount:${line.id}`] = amountError
    })
    if (!voucherFile) next.voucherFile = '請上傳憑證檔案'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const savedLines = lines.map((line) => ({
      id: line.id,
      name: line.name.slice(0, 50),
      taxable: lineTaxLocked ? ('未稅' as const) : line.taxable,
      amount: commitAmount(line.amount, allowDecimal),
    }))
    const computed = calcVoucherTotals(effectiveTaxable, savedLines, allowDecimal)
    onSave({
      id: initial?.id ?? `V-${Date.now()}`,
      vendorTaxId,
      purpose,
      remarkNo: formatRemarkNo(purpose, secondText, secondFrom, secondTo),
      secondText,
      secondFrom,
      secondTo,
      voucherStyle,
      invoiceFormat: showInvoiceFormat ? invoiceFormat : '',
      invoiceNo: invoiceNo.trim(),
      invoiceDate: showInvoiceFormat ? invoiceDate : '',
      taxable: effectiveTaxable,
      ...computed,
      status: initial?.status ?? '草稿',
      lines: savedLines,
      voucherFile,
      attachments,
      writebacks: initial?.writebacks ?? [],
    })
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-detail-title"
      >
        <div className="modal-head">
          <h2 id="add-detail-title">{isEdit ? '編輯明細' : '新增明細'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <label className="modal-row">
          <span className="required">款項用途</span>
          <select
            value={purpose}
            onChange={(e) => changePurpose(e.target.value as VoucherPurpose)}
          >
            {VOUCHER_PURPOSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <div className="modal-row">
          <span className="required">{second.label}</span>
          <div className="modal-field">
            {second.kind === 'dateRange' ? (
              <div className="date-range">
                <input
                  type="date"
                  value={secondFrom}
                  max={secondTo || undefined}
                  className={!secondFrom && errors.second ? 'error' : undefined}
                  onChange={(e) => setSecondFrom(e.target.value)}
                />
                <span>至</span>
                <input
                  type="date"
                  value={secondTo}
                  min={secondFrom || undefined}
                  className={!secondTo && errors.second ? 'error' : undefined}
                  onChange={(e) => setSecondTo(e.target.value)}
                />
              </div>
            ) : (
              <input
                type={second.kind === 'month' ? 'month' : 'text'}
                placeholder={`請輸入${second.label}`}
                value={secondText}
                onChange={(e) => setSecondText(e.target.value)}
                className={errors.second ? 'error' : undefined}
              />
            )}
            <FieldError message={errors.second} />
          </div>
        </div>

        <label className="modal-row">
          <span className="required">憑證樣式</span>
          <select
            value={voucherStyle}
            onChange={(e) => {
              const next = e.target.value
              setVoucherStyle(next)
              if (next !== '發票') {
                setInvoiceFormat('')
                setInvoiceDate('')
              }
            }}
          >
            {styles.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        {showInvoiceFormat && (
          <div className="modal-row">
            <span className="required">發票格式</span>
            <div className="modal-field">
              <select
                value={invoiceFormat}
                onChange={(e) => setInvoiceFormat(e.target.value)}
                className={errors.invoiceFormat ? 'error' : undefined}
              >
                <option value="">請選擇</option>
                {INVOICE_FORMATS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <FieldError message={errors.invoiceFormat} />
            </div>
          </div>
        )}

        <div className="modal-row">
          <span className="required">發票號碼(憑證號碼)</span>
          <div className="modal-field">
            <input
              placeholder="請輸入憑證號碼"
              value={invoiceNo}
              className={errors.invoiceNo ? 'error' : undefined}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
            <FieldError message={errors.invoiceNo} />
          </div>
        </div>

        {showInvoiceFormat && (
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
        )}

        <div className="modal-row">
          <span className="required">廠商統編</span>
          <div className="modal-field">
            <input
              inputMode="numeric"
              maxLength={8}
              value={vendorTaxId}
              className={errors.vendorTaxId ? 'error' : undefined}
              onChange={(e) =>
                setVendorTaxId(e.target.value.replace(/\D/g, '').slice(0, 8))
              }
            />
            <FieldError message={errors.vendorTaxId} />
          </div>
        </div>

        <div className="modal-row">
          <span className="required">是否應稅</span>
          <div className="modal-field">
            <select
              value={effectiveTaxable}
              disabled={taxLockedByCurrency}
              onChange={(e) => changeMainTax(e.target.value as TaxFlag)}
            >
              {TAX_OPTIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            {taxLockedByCurrency && (
              <p className="field-hint">外幣付款僅能設定未稅。</p>
            )}
          </div>
        </div>

        <div className="sub-block">
          <div className="sub-title">明細細項</div>
          <div className="line-head">
            <span className="required">明細細項</span>
            <span className="required">是否應稅</span>
            <span className="required">金額</span>
            <span />
          </div>
          {lines.map((line, idx) => (
            <div className="line-row" key={line.id}>
              <div className="line-cell">
                <input
                  placeholder="請輸入明細細項"
                  maxLength={50}
                  value={line.name}
                  className={errors[`lineName:${line.id}`] ? 'error' : undefined}
                  onChange={(e) => updateLine(line.id, { name: e.target.value })}
                />
                <FieldError message={errors[`lineName:${line.id}`]} />
              </div>
              <select
                value={lineTaxLocked ? '未稅' : line.taxable}
                disabled={lineTaxLocked}
                onChange={(e) =>
                  updateLine(line.id, { taxable: e.target.value as TaxFlag })
                }
              >
                {TAX_OPTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <div className="line-cell">
                <input
                  inputMode={allowDecimal ? 'decimal' : 'numeric'}
                  pattern={allowDecimal ? undefined : '[0-9]*'}
                  placeholder={
                    allowDecimal ? '可至小數第三位' : '請輸入金額'
                  }
                  value={line.amount}
                  className={
                    errors[`lineAmount:${line.id}`] ? 'error' : undefined
                  }
                  onChange={(e) =>
                    updateLine(line.id, {
                      amount: sanitizeAmountInput(e.target.value, allowDecimal),
                    })
                  }
                />
                <FieldError message={errors[`lineAmount:${line.id}`]} />
              </div>
              <div className="line-ops">
                {lines.length > 1 && (
                  <button
                    type="button"
                    className="minus-btn"
                    onClick={() =>
                      setLines((prev) => prev.filter((item) => item.id !== line.id))
                    }
                  >
                    −
                  </button>
                )}
                {idx === lines.length - 1 && (
                  <button
                    type="button"
                    className="plus-btn"
                    onClick={() =>
                      setLines((prev) => [
                        ...prev,
                        makeLine(lineTaxLocked ? '未稅' : '應稅'),
                      ])
                    }
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <label className="modal-row">
          <span>未稅金額</span>
          <input readOnly value={formatAmount(totals.untaxedAmount, currency)} />
        </label>
        <label className="modal-row">
          <span>稅額</span>
          <input readOnly value={formatAmount(totals.taxAmount, currency)} />
        </label>
        <label className="modal-row">
          <span>付款金額</span>
          <input readOnly value={formatAmount(totals.payAmount, currency)} />
        </label>

        <div className="file-block">
          <label htmlFor="voucher-file" className="required">
            上傳憑證檔案
          </label>
          <input
            id="voucher-file"
            className="file-native"
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0]
              setVoucherFile(file ? toFileMeta(file) : null)
            }}
          />
          {voucherFile && (
            <div className="file-names">{voucherFile.name}</div>
          )}
          {errors.voucherFile && (
            <p className="field-error file-error">{errors.voucherFile}</p>
          )}
        </div>

        <div className="file-block">
          <label htmlFor="attach-files">附件（ 選填，可上傳多個檔案 ）</label>
          <input
            id="attach-files"
            className="file-native"
            type="file"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []).map(toFileMeta)
              setAttachments((prev) => [...prev, ...files])
              e.target.value = ''
            }}
          />
          {attachments.length > 0 && (
            <div className="file-names">
              {attachments.map((file) => file.name).join('、')}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-default" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            確定
          </button>
        </div>
      </div>
    </div>
  )
}
