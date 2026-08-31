import type { MonthlySettlementTotals } from './monthlySettlement'

/** 申請款項類型 */
export type PaymentType =
  | '個人代墊報支'
  | '廠商實報實銷'
  | '廠商預付 / 訂金'
  | '通路費用 (通路後扣)'
  | 'URMART 月結廠商'

/** 付款申請單狀態 */
export type PaymentStatus =
  | '草稿'
  | '待審核'
  | '審核不通過'
  | '待付款'
  | '待核銷'
  | '部分核銷'
  | '已完成'
  | '已作廢'

/** 系統角色（原型用切換） */
export type UserRole = '建檔人' | '財務'

export type CurrencyCode =
  | '臺幣TWD'
  | '美元USD'
  | '英镑GBP'
  | '澳元AUD'
  | '人民幣CNY'
  | '歐元EUR'
  | '港幣HK'

export type PaymentMethod = '匯款' | '開立支票' | '現金'

export type RemittanceFeeBearer = '公司負擔' | '收款人負擔'

/** 預計付款日規則類別 */
export type PaymentDateRuleCategory = '零用金' | '一般' | '預付款' | '待確認'

export interface PaymentTypeMeta {
  type: PaymentType
  /** 文案標題 */
  title: string
  /** 文案說明 */
  description: string
  ruleCategory: PaymentDateRuleCategory
  /** 是否需顯示結算月 */
  needsSettlementMonth: boolean
}

export interface Vendor {
  id: string
  code: string
  name: string
  /** 統一編號，8 位數字 */
  taxId: string
}

export interface PaymentOverviewForm {
  paymentType: PaymentType
  settlementMonth: string
  applicant: string
  applicationDate: string
  vendorId: string
  currency: CurrencyCode
  paymentMethod: PaymentMethod
  remittanceFee: RemittanceFeeBearer
  totalAmount: number | null
  expectedPaymentDate: string
  vendorTaxId?: string
  cooperationMode?: string
  vendorName?: string
  monthlyTotals?: MonthlySettlementTotals | null
}

export function isUmMonthlyType(type: PaymentType | string | undefined) {
  return type === 'URMART 月結廠商'
}

export function isChannelFeeType(type: PaymentType | string | undefined) {
  return type === '通路費用 (通路後扣)'
}

/** 憑證明細只開發票（UM 月結、通路費用） */
export function isInvoiceOnlyType(type: PaymentType | string | undefined) {
  return isUmMonthlyType(type) || isChannelFeeType(type)
}

/** 財務審核通過後直接已完成，不經待付款 */
export function completesOnApprove(type: PaymentType | string | undefined) {
  return isChannelFeeType(type)
}

export interface PaymentApplication {
  id: string
  applicationNo: string
  paymentType: PaymentType
  applicant: string
  detailCount: number
  totalAmount: number
  createdAt: string
  expectedPaymentDate: string | null
  actualPaymentDate: string | null
  rejectReason: string | null
  status: PaymentStatus
}

/** 需事後核銷的款項類型（會出現「核銷歷史」頁籤） */
export const TYPES_NEED_WRITEOFF: PaymentType[] = ['廠商預付 / 訂金']

export const PAYMENT_TYPES: PaymentType[] = [
  '個人代墊報支',
  '廠商實報實銷',
  '廠商預付 / 訂金',
  '通路費用 (通路後扣)',
  'URMART 月結廠商',
]

export const PAYMENT_TYPE_META: Record<PaymentType, PaymentTypeMeta> = {
  個人代墊報支: {
    type: '個人代墊報支',
    title: '個人代墊報支（零用金）',
    description:
      '我已先用個人款項墊付餐費、車資、雜支等，請公司退款至我的薪資帳戶。',
    ruleCategory: '零用金',
    needsSettlementMonth: false,
  },
  廠商實報實銷: {
    type: '廠商實報實銷',
    title: '廠商實報實銷（一般付款）',
    description:
      '已取得廠商開立的正式發票或收據，請公司直接匯款給該廠商。',
    ruleCategory: '一般',
    needsSettlementMonth: false,
  },
  '廠商預付 / 訂金': {
    type: '廠商預付 / 訂金',
    title: '廠商預付 / 訂金（預付款）',
    description:
      '目前僅有合約或報價單，需先申請款項支付給廠商，事後再補發票核銷。',
    ruleCategory: '預付款',
    needsSettlementMonth: false,
  },
  '通路費用 (通路後扣)': {
    type: '通路費用 (通路後扣)',
    title: '通路費用（通路後扣）',
    description:
      '設定結算月後選擇付款對象，憑證明細以發票新增；可新增多張。導出後線下審核，財務通過即已完成。',
    ruleCategory: '待確認',
    needsSettlementMonth: true,
  },
  'URMART 月結廠商': {
    type: 'URMART 月結廠商',
    title: 'URMART 月結廠商',
    description:
      '匯入月結總結表後選擇廠商，結算月與憑證明細彙總欄自動帶入；發票請手動新增。',
    ruleCategory: '待確認',
    needsSettlementMonth: true,
  },
}

export const CURRENCIES: CurrencyCode[] = [
  '臺幣TWD',
  '美元USD',
  '英镑GBP',
  '澳元AUD',
  '人民幣CNY',
  '歐元EUR',
  '港幣HK',
]

export function isForeignCurrency(
  currency: CurrencyCode | string | undefined | null,
) {
  return Boolean(currency && currency !== '臺幣TWD')
}

export function formatExchangeRate(rate: number | null | undefined) {
  if (rate == null || Number.isNaN(rate)) return '-'
  return rate.toLocaleString('zh-TW', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  })
}

export const PAYMENT_METHODS: PaymentMethod[] = ['匯款', '開立支票', '現金']

export const REMITTANCE_FEE_OPTIONS: RemittanceFeeBearer[] = [
  '公司負擔',
  '收款人負擔',
]

export const PAYMENT_STATUSES: PaymentStatus[] = [
  '草稿',
  '待審核',
  '審核不通過',
  '待付款',
  '待核銷',
  '部分核銷',
  '已完成',
  '已作廢',
]

/** 原型：目前登入建立人帳號 */
export const CURRENT_USER_ACCOUNT = 'ruby.lee'
