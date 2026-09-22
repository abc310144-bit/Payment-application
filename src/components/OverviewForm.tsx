import { useMemo, useState, type FormEvent } from 'react'
import { VendorSelect } from './VendorSelect'
import { mockVendors } from '../data/mockVendors'
import {
  mockEmployees,
  findEmployeeForApplicant,
  isPettyCashType,
} from '../data/mockEmployees'
import { defaultPayeeId } from '../utils/payee'
import {
  CURRENCIES,
  CURRENT_USER_ACCOUNT,
  PAYMENT_METHODS,
  PAYMENT_TYPE_META,
  PAYMENT_TYPES,
  REMITTANCE_FEE_OPTIONS,
  isChannelFeeType,
  isUmMonthlyType,
  type CurrencyCode,
  type PaymentMethod,
  type PaymentOverviewForm,
  type PaymentType,
  type RemittanceFeeBearer,
} from '../types/payment'
import { lookupMockUmSettlement } from '../utils/mockVendorSettlement'
import {
  calcExpectedPaymentDate,
  getExpectedDateHint,
  getPrepaymentDateRange,
  getUmExpectedDateRange,
  isExpectedDateEditable,
  todayISO,
} from '../utils/expectedPaymentDate'
import '../pages/PaymentOverviewPage.css'

type FieldErrors = Partial<
  Record<
    | 'paymentType'
    | 'settlementMonth'
    | 'applicationDate'
    | 'vendorId'
    | 'currency'
    | 'paymentMethod'
    | 'remittanceFee'
    | 'expectedPaymentDate',
    string
  >
>

function applyUmSettlement(next: PaymentOverviewForm) {
  if (!isUmMonthlyType(next.paymentType)) return
  next.currency = '臺幣TWD'
  if (next.vendorId && next.settlementMonth) {
    const vendor = mockVendors.find((item) => item.id === next.vendorId)
    const totals = lookupMockUmSettlement(next.vendorId, next.settlementMonth)
    next.monthlyTotals = totals
    next.totalAmount = totals?.companyInvoiceAmount ?? null
    next.vendorName = vendor?.name ?? ''
    next.vendorTaxId = vendor?.taxId ?? ''
  } else {
    next.monthlyTotals = null
    next.totalAmount = null
  }
}

export function buildInitialOverviewForm(): PaymentOverviewForm {
  const paymentType: PaymentType = '個人代墊報支'
  const applicationDate = todayISO()
  return {
    paymentType,
    settlementMonth: '',
    applicant: CURRENT_USER_ACCOUNT,
    applicationDate,
    vendorId: defaultPayeeId(paymentType, CURRENT_USER_ACCOUNT),
    currency: '臺幣TWD',
    paymentMethod: '匯款',
    remittanceFee: '公司負擔',
    totalAmount: null,
    expectedPaymentDate: calcExpectedPaymentDate(paymentType, applicationDate),
    vendorTaxId: '',
    cooperationMode: '',
    vendorName: '',
    monthlyTotals: null,
  }
}

interface Props {
  initial?: PaymentOverviewForm
  readOnly?: boolean
  title?: string
  /** 為 false 時不顯示頁首標題（步驟工作區內嵌用） */
  showTitle?: boolean
  submitLabel?: string
  onSubmit?: (form: PaymentOverviewForm) => void
  /** 左下「返回」：回上一階 */
  onBack?: () => void
}

export function OverviewForm({
  initial,
  readOnly = false,
  title = '付款總覽',
  showTitle = true,
  submitLabel = '儲存',
  onSubmit,
  onBack,
}: Props) {
  const [form, setForm] = useState<PaymentOverviewForm>(
    () => initial ?? buildInitialOverviewForm(),
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(false)

  const meta = PAYMENT_TYPE_META[form.paymentType]
  const needsSettlement = meta.needsSettlementMonth
  const onlyRemittance = isPettyCashType(form.paymentType)
  const umMonthly = isUmMonthlyType(form.paymentType)
  const channelFee = isChannelFeeType(form.paymentType)
  const locked = readOnly
  const expectedEditable =
    isExpectedDateEditable(form.paymentType, form.applicationDate) && !readOnly
  const payeeItems = useMemo(() => {
    if (onlyRemittance) {
      return mockEmployees.map((emp) => ({
        id: emp.id,
        code: emp.employeeNo,
        name: `${emp.name}（${emp.account}）`,
      }))
    }
    return mockVendors.map((vendor) => ({
      id: vendor.id,
      code: vendor.code,
      name: vendor.name,
    }))
  }, [onlyRemittance])

  const paymentMethodOptions = useMemo(
    () => (onlyRemittance ? (['匯款'] as PaymentMethod[]) : PAYMENT_METHODS),
    [onlyRemittance],
  )

  const expectedRange = useMemo(() => {
    if (!form.applicationDate) return null
    if (umMonthly) return getUmExpectedDateRange(form.applicationDate)
    if (expectedEditable) return getPrepaymentDateRange(form.applicationDate)
    return null
  }, [expectedEditable, form.applicationDate, umMonthly])

  const patch = (partial: Partial<PaymentOverviewForm>) => {
    if (locked) return
    setSaved(false)
    setForm((prev) => {
      const next = { ...prev, ...partial }

      if (partial.paymentType !== undefined) {
        const nextMeta = PAYMENT_TYPE_META[partial.paymentType]
        if (!nextMeta.needsSettlementMonth) {
          next.settlementMonth = ''
        }
        if (isUmMonthlyType(partial.paymentType)) {
          next.currency = '臺幣TWD'
          next.cooperationMode = ''
          if (next.vendorId.startsWith('um:')) {
            next.vendorId = ''
            next.vendorName = ''
            next.vendorTaxId = ''
            next.monthlyTotals = null
            next.totalAmount = null
          }
        } else {
          next.vendorName = ''
          next.vendorTaxId = ''
          next.cooperationMode = ''
          next.monthlyTotals = null
        }
        if (isPettyCashType(partial.paymentType)) {
          next.paymentMethod = '匯款'
          const stillEmployee = mockEmployees.some((emp) => emp.id === next.vendorId)
          if (!stillEmployee) {
            next.vendorId = findEmployeeForApplicant(next.applicant).id
          }
        } else {
          const isEmployeeOnly = mockEmployees.some((emp) => emp.id === next.vendorId)
          const isVendor = mockVendors.some((vendor) => vendor.id === next.vendorId)
          if (isEmployeeOnly && !isVendor) next.vendorId = ''
          if (next.vendorId.startsWith('um:')) next.vendorId = ''
        }
        applyUmSettlement(next)
        next.expectedPaymentDate = calcExpectedPaymentDate(
          next.paymentType,
          next.applicationDate,
        )
      }

      if (partial.applicationDate !== undefined) {
        next.expectedPaymentDate = calcExpectedPaymentDate(
          next.paymentType,
          next.applicationDate,
          next.expectedPaymentDate,
        )
      }

      if (
        partial.vendorId !== undefined ||
        partial.settlementMonth !== undefined
      ) {
        applyUmSettlement(next)
      }

      if (
        partial.expectedPaymentDate !== undefined &&
        isUmMonthlyType(next.paymentType) &&
        next.applicationDate
      ) {
        next.expectedPaymentDate = calcExpectedPaymentDate(
          next.paymentType,
          next.applicationDate,
          next.expectedPaymentDate,
        )
      }

      return next
    })
  }

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (!form.paymentType) next.paymentType = '必填'
    if (needsSettlement && !form.settlementMonth) {
      next.settlementMonth = '必填'
    }
    if (!form.applicationDate) next.applicationDate = '必填'
    if (!form.vendorId) next.vendorId = '必填'
    if (!form.currency) next.currency = '必填'
    if (!form.paymentMethod) next.paymentMethod = '必填'
    if (!form.remittanceFee) next.remittanceFee = '必填'
    if (!channelFee && !form.expectedPaymentDate) next.expectedPaymentDate = '必填'

    if (form.applicationDate && form.expectedPaymentDate) {
      if (umMonthly) {
        const { min, max } = getUmExpectedDateRange(form.applicationDate)
        if (form.expectedPaymentDate !== min && form.expectedPaymentDate !== max) {
          next.expectedPaymentDate =
            min === max ? `僅可選 ${min}` : `須為 ${min} 或 ${max}`
        }
      } else if (isExpectedDateEditable(form.paymentType, form.applicationDate)) {
        const { min, max } = getPrepaymentDateRange(form.applicationDate)
        if (form.expectedPaymentDate < min || form.expectedPaymentDate > max) {
          next.expectedPaymentDate = `須介於 ${min} ~ ${max}`
        }
      }
    }

    return next
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (locked || !onSubmit) return
    setSubmitted(true)
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit({
      ...form,
      currency: umMonthly ? '臺幣TWD' : form.currency,
      expectedPaymentDate: channelFee ? '' : form.expectedPaymentDate,
    })
    setSaved(true)
  }

  const showError = (key: keyof FieldErrors) => submitted && Boolean(errors[key])

  return (
    <div className="overview-page">
      <form onSubmit={handleSubmit}>
        {showTitle && (
          <div className="page-header">
            <h1>{title}</h1>
          </div>
        )}

        {saved && <div className="save-ok">已儲存</div>}

        <div className="overview-card">
          <div className="form-row">
            <label className="form-label required" htmlFor="paymentType">
              付款類型
            </label>
            <div className="form-control">
              <select
                id="paymentType"
                value={form.paymentType}
                disabled={locked}
                className={showError('paymentType') ? 'error' : undefined}
                onChange={(e) =>
                  patch({ paymentType: e.target.value as PaymentType })
                }
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="info-box">
                <div className="info-box-title">{meta.title}</div>
                <div className="info-box-desc">{meta.description}</div>
              </div>
            </div>
          </div>

          {needsSettlement && (
            <div className="form-row">
              <label className="form-label required" htmlFor="settlementMonth">
                結算月
              </label>
              <div className="form-control">
                <input
                  id="settlementMonth"
                  type="month"
                  value={form.settlementMonth}
                  disabled={locked}
                  className={showError('settlementMonth') ? 'error' : undefined}
                  onChange={(e) => patch({ settlementMonth: e.target.value })}
                />
                <p className="field-hint">
                  {umMonthly
                    ? '可自選結算月。設定後，新增發票將自動帶入款項用途與結算月，並依廠商帶入該月月結金額。'
                    : '設定後，新增明細將自動帶入款項用途以及結算月。'}
                </p>
                {showError('settlementMonth') && (
                  <p className="field-error">此欄位為必填</p>
                )}
              </div>
            </div>
          )}

          <div className="form-row">
            <label className="form-label required" htmlFor="applicant">
              申請人
            </label>
            <div className="form-control">
              <input id="applicant" value={form.applicant} readOnly disabled />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label required" htmlFor="applicationDate">
              申請日
            </label>
            <div className="form-control">
              <input
                id="applicationDate"
                type="date"
                value={form.applicationDate}
                disabled={locked}
                className={showError('applicationDate') ? 'error' : undefined}
                onChange={(e) => patch({ applicationDate: e.target.value })}
              />
              <p className="field-hint">
                作為預計付款日計算基準；預設為今日，可依實際申請日調整。
              </p>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label required">付款對象</label>
            <div className="form-control">
              <VendorSelect
                items={payeeItems}
                value={form.vendorId}
                disabled={locked}
                error={showError('vendorId')}
                placeholder={
                  onlyRemittance
                    ? '搜尋或選擇員工'
                    : '搜尋或選擇付款對象（資料來自廠商列表）'
                }
                emptyText={onlyRemittance ? '查無員工' : '查無付款對象'}
                searchPlaceholder={
                  onlyRemittance ? '搜尋姓名、帳號或編號' : '搜尋編號或名稱'
                }
                onChange={(vendorId) => patch({ vendorId })}
              />
              {onlyRemittance && (
                <p className="field-hint">
                  付款類型為「個人代墊報支」時，付款對象為公司員工；預設帶入申請人，可改選。
                </p>
              )}
              {umMonthly && (
                <p className="field-hint">
                  選完廠商與結算月後，系統帶入該月月結金額（DEMO 為假資料，正式環境由資料庫查詢）。
                </p>
              )}
              {showError('vendorId') && (
                <p className="field-error">此欄位為必填</p>
              )}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label required" htmlFor="currency">
              付款幣別
            </label>
            <div className="form-control">
              <select
                id="currency"
                value={umMonthly ? '臺幣TWD' : form.currency}
                disabled={locked || umMonthly}
                onChange={(e) =>
                  patch({ currency: e.target.value as CurrencyCode })
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {umMonthly && (
                <p className="field-hint">月結金額為臺幣，付款幣別不可變更。</p>
              )}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label required" htmlFor="paymentMethod">
              付款方式
            </label>
            <div className="form-control">
              <select
                id="paymentMethod"
                value={form.paymentMethod}
                disabled={locked}
                onChange={(e) =>
                  patch({ paymentMethod: e.target.value as PaymentMethod })
                }
              >
                {paymentMethodOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {onlyRemittance && (
                <p className="field-hint">
                  付款類型為「個人代墊報支」時，付款方式僅可選擇匯款。
                </p>
              )}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label required" htmlFor="remittanceFee">
              匯款手續費
            </label>
            <div className="form-control">
              <select
                id="remittanceFee"
                value={form.remittanceFee}
                disabled={locked}
                onChange={(e) =>
                  patch({
                    remittanceFee: e.target.value as RemittanceFeeBearer,
                  })
                }
              >
                {REMITTANCE_FEE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!channelFee && (
          <div className="form-row">
            <label className="form-label required" htmlFor="expectedPaymentDate">
              預計付款日
            </label>
            <div className="form-control">
              <input
                id="expectedPaymentDate"
                type="date"
                value={form.expectedPaymentDate}
                disabled={!expectedEditable}
                min={expectedRange?.min}
                max={expectedRange?.max}
                className={
                  showError('expectedPaymentDate') ? 'error' : undefined
                }
                onChange={(e) =>
                  patch({ expectedPaymentDate: e.target.value })
                }
              />
              {showError('expectedPaymentDate') && (
                <p className="field-error">
                  {errors.expectedPaymentDate === '必填'
                    ? '此欄位為必填'
                    : errors.expectedPaymentDate}
                </p>
              )}
              <div className="info-box info-box-rules">
                <div className="info-box-title">
                  預計付款日（需依付款類型限制）
                </div>
                <ul className="rule-list">
                  <li>
                    <strong>一般付款：</strong>
                    每月21日~次月5日（含）之申請，付款日為次月15日；每月6日~20日（含）之申請，付款日為當月30日。
                  </li>
                  <li>
                    <strong>零用金：</strong>
                    下一個週四（申請日若為週四，則為下週四）。
                  </li>
                  <li>
                    <strong>預付款（或廠商預付／訂金）：</strong>
                    須在申請日起 5 日內（含）。
                  </li>
                  <li>
                    <strong>URMART 月結：</strong>
                    申請日 1–25 日預設當月 25 日，可改為次月 25 日；26 日起僅可選次月 25 日。
                  </li>
                </ul>
                <div className="rule-footer">
                  {getExpectedDateHint(form.paymentType)}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {(onBack || (!locked && onSubmit)) && (
          <div className="form-footer">
            {onBack && (
              <button
                type="button"
                className="btn btn-default btn-step"
                onClick={onBack}
              >
                返回
              </button>
            )}
            {!locked && onSubmit && (
              <button type="submit" className="btn btn-primary btn-step">
                {submitLabel}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
