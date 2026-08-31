import { useMemo, useState, type FormEvent } from 'react'
import { VendorSelect } from './VendorSelect'
import { mockVendors } from '../data/mockVendors'
import {
  mockEmployees,
  findEmployeeForApplicant,
  isPettyCashType,
} from '../data/mockEmployees'
import { formatAmount } from '../utils/money'
import { defaultPayeeId } from '../utils/payee'
import {
  CURRENCIES,
  CURRENT_USER_ACCOUNT,
  PAYMENT_METHODS,
  PAYMENT_TYPE_META,
  PAYMENT_TYPES,
  REMITTANCE_FEE_OPTIONS,
  isUmMonthlyType,
  type CurrencyCode,
  type PaymentMethod,
  type PaymentOverviewForm,
  type PaymentType,
  type RemittanceFeeBearer,
} from '../types/payment'
import {
  monthlyVendorLabel,
  type MonthlySummaryImport,
} from '../types/monthlySettlement'
import { parseMonthlySummaryWorkbook } from '../utils/parseMonthlySummary'
import { buildMockVendorSettlement } from '../utils/mockVendorSettlement'
import {
  calcExpectedPaymentDate,
  getExpectedDateHint,
  getPrepaymentDateRange,
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
    | 'expectedPaymentDate'
    | 'monthlyImport',
    string
  >
>

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
  submitLabel?: string
  onSubmit?: (form: PaymentOverviewForm) => void
}

export function OverviewForm({
  initial,
  readOnly = false,
  title = '付款總覽',
  submitLabel = '儲存',
  onSubmit,
}: Props) {
  const [form, setForm] = useState<PaymentOverviewForm>(
    () => initial ?? buildInitialOverviewForm(),
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importNotice, setImportNotice] = useState('')
  const [imported, setImported] = useState<MonthlySummaryImport | null>(() => {
    if (!initial || !isUmMonthlyType(initial.paymentType) || !initial.vendorId) {
      return null
    }
    return {
      month: initial.settlementMonth,
      sheetName: initial.settlementMonth,
      vendors: [
        {
          key: initial.vendorId,
          name: initial.vendorName || '已選廠商',
          taxId: initial.vendorTaxId || '',
          cooperationMode: initial.cooperationMode || '',
          salesTotal: initial.monthlyTotals?.salesTotal ?? 0,
          commission: initial.monthlyTotals?.commission ?? 0,
          platformFee: initial.monthlyTotals?.platformFee ?? 0,
          paymentProcessingFee: initial.monthlyTotals?.paymentProcessingFee ?? 0,
          marketingFee: initial.monthlyTotals?.marketingFee ?? 0,
          eventFee: initial.monthlyTotals?.eventFee ?? 0,
          logisticsFee: initial.monthlyTotals?.logisticsFee ?? 0,
          laborFee: initial.monthlyTotals?.laborFee ?? 0,
          warehouseTotal: initial.monthlyTotals?.warehouseTotal ?? 0,
          absorption: initial.monthlyTotals?.adjustment ?? 0,
          specialFee: 0,
        },
      ],
    }
  })

  const meta = PAYMENT_TYPE_META[form.paymentType]
  const needsSettlement = meta.needsSettlementMonth
  const expectedEditable = isExpectedDateEditable(form.paymentType) && !readOnly
  const onlyRemittance = isPettyCashType(form.paymentType)
  const umMonthly = isUmMonthlyType(form.paymentType)
  const locked = readOnly
  const payeeItems = useMemo(() => {
    if (onlyRemittance) {
      return mockEmployees.map((emp) => ({
        id: emp.id,
        code: emp.employeeNo,
        name: `${emp.name}（${emp.account}）`,
      }))
    }
    if (umMonthly) {
      return (imported?.vendors ?? []).map((vendor) => ({
        id: vendor.key,
        code: vendor.taxId || '-',
        name: monthlyVendorLabel(vendor),
      }))
    }
    return mockVendors.map((vendor) => ({
      id: vendor.id,
      code: vendor.code,
      name: vendor.name,
    }))
  }, [onlyRemittance, umMonthly, imported])

  const paymentMethodOptions = useMemo(
    () => (onlyRemittance ? (['匯款'] as PaymentMethod[]) : PAYMENT_METHODS),
    [onlyRemittance],
  )

  const prepayRange = useMemo(() => {
    if (!expectedEditable || !form.applicationDate) return null
    return getPrepaymentDateRange(form.applicationDate)
  }, [expectedEditable, form.applicationDate])

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
          next.vendorId = ''
          next.vendorName = ''
          next.vendorTaxId = ''
          next.cooperationMode = ''
          next.monthlyTotals = null
          next.totalAmount = null
          next.settlementMonth = ''
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
        next.expectedPaymentDate = calcExpectedPaymentDate(
          next.paymentType,
          next.applicationDate,
          next.expectedPaymentDate,
        )
      }

      if (partial.applicationDate !== undefined) {
        next.expectedPaymentDate = calcExpectedPaymentDate(
          next.paymentType,
          next.applicationDate,
          isExpectedDateEditable(next.paymentType)
            ? next.expectedPaymentDate
            : undefined,
        )
      }

      return next
    })
    if (partial.paymentType !== undefined && !isUmMonthlyType(partial.paymentType)) {
      setImported(null)
      setImportNotice('')
    }
  }

  const applyVendor = (vendorKey: string) => {
    const row = imported?.vendors.find((item) => item.key === vendorKey)
    if (!row) {
      patch({
        vendorId: vendorKey,
        vendorName: '',
        vendorTaxId: '',
        cooperationMode: '',
        monthlyTotals: null,
        totalAmount: null,
      })
      return
    }
    const totals = buildMockVendorSettlement(row)
    patch({
      vendorId: row.key,
      vendorName: monthlyVendorLabel(row),
      vendorTaxId: row.taxId,
      cooperationMode: row.cooperationMode,
      monthlyTotals: totals,
      totalAmount: totals.companyInvoiceAmount,
    })
  }

  const handleImportFile = async (file: File | undefined) => {
    if (!file || locked) return
    setImporting(true)
    setImportNotice('')
    try {
      const buffer = await file.arrayBuffer()
      const result = parseMonthlySummaryWorkbook(buffer)
      setImported(result)
      patch({
        settlementMonth: result.month,
        vendorId: '',
        vendorName: '',
        vendorTaxId: '',
        cooperationMode: '',
        monthlyTotals: null,
        totalAmount: null,
      })
      setImportNotice(
        `已使用最新月份「${result.month}」，共 ${result.vendors.length} 筆廠商（同一廠商不同合作模式會分開列出）。`,
      )
    } catch (error) {
      setImported(null)
      setImportNotice('')
      const message = error instanceof Error ? error.message : '匯入失敗'
      setErrors((prev) => ({ ...prev, monthlyImport: message }))
    } finally {
      setImporting(false)
    }
  }

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (!form.paymentType) next.paymentType = '必填'
    if (needsSettlement && !form.settlementMonth) {
      next.settlementMonth = '必填'
    }
    if (umMonthly && !imported) {
      next.monthlyImport = '請先匯入月結總結表'
    }
    if (!form.applicationDate) next.applicationDate = '必填'
    if (!form.vendorId) next.vendorId = '必填'
    if (!form.currency) next.currency = '必填'
    if (!form.paymentMethod) next.paymentMethod = '必填'
    if (!form.remittanceFee) next.remittanceFee = '必填'
    if (!form.expectedPaymentDate) next.expectedPaymentDate = '必填'

    if (
      isExpectedDateEditable(form.paymentType) &&
      form.applicationDate &&
      form.expectedPaymentDate
    ) {
      const { min, max } = getPrepaymentDateRange(form.applicationDate)
      if (form.expectedPaymentDate < min || form.expectedPaymentDate > max) {
        next.expectedPaymentDate = `須介於 ${min} ~ ${max}`
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
    onSubmit(form)
    setSaved(true)
  }

  const showError = (key: keyof FieldErrors) => submitted && Boolean(errors[key])

  return (
    <div className="overview-page">
      <form onSubmit={handleSubmit}>
        <div className="page-header">
          <h1>{title}</h1>
          {!locked && onSubmit && (
            <button type="submit" className="btn btn-primary">
              {submitLabel}
            </button>
          )}
        </div>

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

          {umMonthly && (
            <div className="form-row">
              <label className="form-label required">匯入月結報表</label>
              <div className="form-control">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  disabled={locked || importing}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    void handleImportFile(file)
                  }}
                />
                <p className="field-hint">
                  選擇 URMART 月結廠商後匯入月結總結表。系統自動使用最新
                  YYYY-MM 分頁。範例檔：
                  <a href="/samples/月結總結表.xlsx">月結總結表.xlsx</a>
                </p>
                {importing && <p className="field-hint">匯入中…</p>}
                {importNotice && <p className="field-hint">{importNotice}</p>}
                {showError('monthlyImport') && (
                  <p className="field-error">{errors.monthlyImport}</p>
                )}
              </div>
            </div>
          )}

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
                  disabled={locked || umMonthly}
                  className={showError('settlementMonth') ? 'error' : undefined}
                  onChange={(e) => patch({ settlementMonth: e.target.value })}
                />
                <p className="field-hint">
                  {umMonthly
                    ? '由匯入的月結總結表最新月份自動帶入，不可手改。'
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
                disabled={locked || (umMonthly && !imported)}
                error={showError('vendorId')}
                placeholder={
                  onlyRemittance
                    ? '搜尋或選擇員工'
                    : umMonthly
                      ? imported
                        ? '搜尋廠商名稱、統編或合作模式'
                        : '請先匯入月結報表'
                      : '搜尋或選擇付款對象（資料來自廠商列表）'
                }
                emptyText={
                  onlyRemittance
                    ? '查無員工'
                    : umMonthly
                      ? '查無此結算月廠商'
                      : '查無付款對象'
                }
                searchPlaceholder={
                  onlyRemittance
                    ? '搜尋姓名、帳號或編號'
                    : umMonthly
                      ? '模糊搜尋廠商、統編、合作模式'
                      : '搜尋編號或名稱'
                }
                onChange={(vendorId) =>
                  umMonthly ? applyVendor(vendorId) : patch({ vendorId })
                }
              />
              {onlyRemittance && (
                <p className="field-hint">
                  付款類型為「個人代墊報支」時，付款對象為公司員工；預設帶入申請人，可改選。
                </p>
              )}
              {umMonthly && (
                <p className="field-hint">
                  僅能選擇最新月份報表中的廠商。同一廠商若有兩種合作模式，會顯示成兩筆。
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
                value={form.currency}
                disabled={locked}
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

          <div className="form-row">
            <label className="form-label" htmlFor="totalAmount">
              總付款金額（含稅）
            </label>
            <div className="form-control">
              <input
                id="totalAmount"
                value={
                  umMonthly && form.monthlyTotals
                    ? formatAmount(
                        form.monthlyTotals.companyInvoiceAmount,
                        form.currency,
                      )
                    : formatAmount(form.totalAmount ?? 0, form.currency)
                }
                disabled
                readOnly
              />
              {umMonthly && (
                <p className="field-hint">
                  帶入「貴公司開立發票金額(含稅)」。選完廠商後由月結資料帶入。
                </p>
              )}
            </div>
          </div>

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
                min={prepayRange?.min}
                max={prepayRange?.max}
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
                    <strong>廠商後扣、月結：</strong>
                    規則待確認（原型暫依一般付款規則）。
                  </li>
                </ul>
                <div className="rule-footer">
                  {getExpectedDateHint(form.paymentType)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
