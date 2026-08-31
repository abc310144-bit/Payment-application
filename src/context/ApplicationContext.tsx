import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { mockApplications } from '../data/mockApplications'
import { mockVendors } from '../data/mockVendors'
import type {
  PaymentApplication,
  PaymentOverviewForm,
} from '../types/payment'
import {
  completesOnApprove,
  isForeignCurrency,
  PAYMENT_TYPE_META,
} from '../types/payment'
import {
  commitAmount,
  FOREIGN_MIN_AMOUNT,
  formatAmount,
  sumAmounts,
} from '../utils/money'
import type {
  VoucherDetail,
  VoucherDetailStatus,
  VoucherFile,
  WritebackRecord,
} from '../types/voucher'
import { todayISO } from '../utils/expectedPaymentDate'
import {
  mapDetailsOnCompletePayment,
  mapDetailsOnParentApprove,
  mapDetailsOnParentReject,
} from '../utils/voucherStatus'
import {
  formatWritebackStamp,
  needsWriteoffHistory,
  nextDetailWriteoffStatus,
  nextParentWriteoffStatus,
  remainingWriteoffAmount,
} from '../utils/writeoff'
import { defaultPayeeId, getPayeeDisplayName } from '../utils/payee'

export type ApplicationOverview = PaymentOverviewForm & { vendorName?: string }

export interface StoredApplication extends PaymentApplication {
  overview?: ApplicationOverview
  vouchers: VoucherDetail[]
  /** 外幣完成付款時填入，回壓至憑證明細「稅額／付款金額」中間欄 */
  paymentExchangeRate?: number | null
  /** 最近一次導出文件，已完成後可供檢視／下載 */
  exportedFile?: VoucherFile | null
}

interface ApplicationContextValue {
  applications: StoredApplication[]
  getById: (id: string) => StoredApplication | undefined
  createApplication: (overview: ApplicationOverview) => StoredApplication
  updateOverview: (id: string, overview: ApplicationOverview) => void
  completePayment: (
    id: string,
    options: { actualPaymentDate: string; exchangeRate?: number },
  ) => StoredApplication | undefined
  submitApplication: (id: string) => StoredApplication | undefined
  approveApplication: (id: string) => StoredApplication | undefined
  rejectApplication: (id: string, reason: string) => StoredApplication | undefined
  voidApplication: (id: string) => void
  saveVoucher: (appId: string, detail: VoucherDetail) => void
  removeVoucher: (appId: string, detailId: string) => void
  addWriteback: (
    appId: string,
    detailId: string,
    payload: Omit<WritebackRecord, 'id' | 'uploadedAt'>,
  ) => string | undefined
  removeWriteback: (
    appId: string,
    detailId: string,
    writebackId: string,
  ) => string | undefined
  exportVouchers: (appId: string) => void
  saveExportedFile: (appId: string, file: VoucherFile) => void
  approveVouchers: (appId: string) => void
  rejectVouchers: (appId: string) => void
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null)

function optionalDate(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function nowStamp() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${todayISO()} ${hh}:${mm}:${ss}`
}

function seedOverview(row: PaymentApplication): ApplicationOverview {
  const vendor = mockVendors[(Number(row.id) - 1) % mockVendors.length] ?? mockVendors[0]
  const vendorId =
    row.paymentType === '個人代墊報支'
      ? defaultPayeeId(row.paymentType, row.applicant)
      : vendor.id
  return {
    paymentType: row.paymentType,
    settlementMonth: PAYMENT_TYPE_META[row.paymentType].needsSettlementMonth
      ? '2026-07'
      : '',
    applicant: row.applicant,
    applicationDate: row.createdAt.slice(0, 10),
    vendorId,
    currency: row.id === '8' || row.id === '11' ? '美元USD' : '臺幣TWD',
    paymentMethod: '匯款',
    remittanceFee: '公司負擔',
    totalAmount: row.totalAmount,
    expectedPaymentDate: row.expectedPaymentDate || '',
    vendorName: getPayeeDisplayName(vendorId, row.paymentType),
  }
}

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<StoredApplication[]>(() =>
    mockApplications.map((row) => ({
      ...row,
      vouchers: [],
      overview: seedOverview(row),
      paymentExchangeRate: null,
      exportedFile: null,
    })),
  )

  const value = useMemo<ApplicationContextValue>(() => {
    const getById = (id: string) => applications.find((row) => row.id === id)

    const createApplication = (overview: ApplicationOverview) => {
      const seq = String(applications.length + 1).padStart(3, '0')
      const umTotal = overview.monthlyTotals?.companyInvoiceAmount
      const created: StoredApplication = {
        id: `DRAFT-${Date.now()}`,
        applicationNo: `PA${todayISO().replaceAll('-', '')}${seq}`,
        paymentType: overview.paymentType,
        applicant: overview.applicant,
        detailCount: 0,
        totalAmount: umTotal ?? 0,
        vouchers: [],
        createdAt: nowStamp(),
        expectedPaymentDate: optionalDate(overview.expectedPaymentDate),
        actualPaymentDate: null,
        rejectReason: null,
        status: '草稿',
        overview,
        paymentExchangeRate: null,
        exportedFile: null,
      }
      setApplications((prev) => [created, ...prev])
      return created
    }

    const updateOverview = (id: string, overview: ApplicationOverview) => {
      setApplications((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                paymentType: overview.paymentType,
                applicant: overview.applicant,
                expectedPaymentDate: optionalDate(overview.expectedPaymentDate),
                overview,
              }
            : row,
        ),
      )
    }

    const patchApp = (
      id: string,
      updater: (row: StoredApplication) => StoredApplication,
    ) => {
      setApplications((prev) => prev.map((row) => (row.id === id ? updater(row) : row)))
    }

    const withTotals = (row: StoredApplication): StoredApplication => {
      const umTotal = row.overview?.monthlyTotals?.companyInvoiceAmount
      const totalAmount =
        row.paymentType === 'URMART 月結廠商' && umTotal != null
          ? umTotal
          : sumAmounts(row.vouchers.map((item) => item.payAmount))
      return {
        ...row,
        detailCount: row.vouchers.length,
        totalAmount,
        overview: row.overview ? { ...row.overview, totalAmount } : row.overview,
      }
    }

    const completePayment = (
      id: string,
      options: { actualPaymentDate: string; exchangeRate?: number },
    ) => {
      const current = applications.find((row) => row.id === id)
      if (!current) return undefined
      const needWriteoff = needsWriteoffHistory(current.paymentType)
      const updated = withTotals({
        ...current,
        actualPaymentDate: options.actualPaymentDate,
        status: needWriteoff ? '待核銷' : '已完成',
        paymentExchangeRate:
          options.exchangeRate ?? current.paymentExchangeRate ?? null,
        vouchers: mapDetailsOnCompletePayment(current.vouchers, current.paymentType),
      })
      setApplications((prev) =>
        prev.map((row) => (row.id === id ? updated : row)),
      )
      return updated
    }

    const submitApplication = (id: string) => {
      const current = applications.find((row) => row.id === id)
      if (!current) return undefined
      const updated: StoredApplication = { ...current, status: '待審核' }
      setApplications((prev) =>
        prev.map((row) => (row.id === id ? updated : row)),
      )
      return updated
    }

    const approveApplication = (id: string) => {
      const current = applications.find((row) => row.id === id)
      if (!current) return undefined
      const updated = withTotals({
        ...current,
        status: completesOnApprove(current.paymentType) ? '已完成' : '待付款',
        rejectReason: null,
        vouchers: mapDetailsOnParentApprove(
          current.vouchers,
          current.paymentType,
        ),
      })
      setApplications((prev) =>
        prev.map((row) => (row.id === id ? updated : row)),
      )
      return updated
    }

    const rejectApplication = (id: string, reason: string) => {
      const current = applications.find((row) => row.id === id)
      if (!current) return undefined
      const updated = withTotals({
        ...current,
        status: '審核不通過',
        rejectReason: reason.trim(),
        vouchers: mapDetailsOnParentReject(current.vouchers),
      })
      setApplications((prev) =>
        prev.map((row) => (row.id === id ? updated : row)),
      )
      return updated
    }

    const voidApplication = (id: string) => {
      patchApp(id, (row) =>
        row.status === '已完成' || row.status === '已作廢'
          ? row
          : { ...row, status: '已作廢' },
      )
    }

    const saveVoucher = (appId: string, detail: VoucherDetail) => {
      patchApp(appId, (row) => {
        const exists = row.vouchers.some((item) => item.id === detail.id)
        const vouchers = exists
          ? row.vouchers.map((item) =>
              item.id === detail.id
                ? { ...detail, writebacks: detail.writebacks ?? item.writebacks ?? [] }
                : item,
            )
          : [...row.vouchers, { ...detail, writebacks: detail.writebacks ?? [] }]
        return withTotals({ ...row, vouchers })
      })
    }

    const addWriteback = (
      appId: string,
      detailId: string,
      payload: Omit<WritebackRecord, 'id' | 'uploadedAt'>,
    ) => {
      let error: string | undefined
      patchApp(appId, (row) => {
        const target = row.vouchers.find((item) => item.id === detailId)
        if (!target) {
          error = '找不到明細'
          return row
        }
        if (row.status === '已作廢' || row.status === '已完成') {
          error = row.status === '已完成' ? '已完成申請不可回壓' : '已作廢申請不可回壓'
          return row
        }
        const remaining = remainingWriteoffAmount(target)
        const allowDecimal = isForeignCurrency(row.overview?.currency)
        const amount = commitAmount(payload.amount, allowDecimal)
        if (amount < (allowDecimal ? FOREIGN_MIN_AMOUNT : 1)) {
          error = allowDecimal
            ? '請輸入至少 0.001 的金額（最多三位小數）'
            : '請輸入大於 0 的金額'
          return row
        }
        if (amount > remaining) {
          error = `回壓金額不可超過本明細未核銷餘額（${formatAmount(remaining, row.overview?.currency)}）`
          return row
        }
        const record: WritebackRecord = {
          ...payload,
          amount,
          id: `WB-${Date.now()}`,
          uploadedAt: formatWritebackStamp(),
        }
        const vouchers = row.vouchers.map((item) => {
          if (item.id !== detailId) return item
          const next = {
            ...item,
            writebacks: [...(item.writebacks ?? []), record],
          }
          return { ...next, status: nextDetailWriteoffStatus(next) }
        })
        const parentStatus = nextParentWriteoffStatus(vouchers) ?? row.status
        return { ...row, vouchers, status: parentStatus }
      })
      return error
    }

    const removeWriteback = (
      appId: string,
      detailId: string,
      writebackId: string,
    ) => {
      let error: string | undefined
      patchApp(appId, (row) => {
        if (row.status === '已完成' || row.status === '已作廢') {
          error = '已完成／已作廢申請不可作廢核銷紀錄'
          return row
        }
        const target = row.vouchers.find((item) => item.id === detailId)
        if (!target) {
          error = '找不到明細'
          return row
        }
        const prevRecord = (target.writebacks ?? []).find(
          (item) => item.id === writebackId,
        )
        if (!prevRecord) {
          error = '找不到核銷紀錄'
          return row
        }
        if (prevRecord.file?.url.startsWith('blob:')) {
          URL.revokeObjectURL(prevRecord.file.url)
        }
        const vouchers = row.vouchers.map((item) => {
          if (item.id !== detailId) return item
          const next = {
            ...item,
            writebacks: (item.writebacks ?? []).filter(
              (record) => record.id !== writebackId,
            ),
          }
          return { ...next, status: nextDetailWriteoffStatus(next) }
        })
        const parentStatus = nextParentWriteoffStatus(vouchers) ?? row.status
        return { ...row, vouchers, status: parentStatus }
      })
      return error
    }

    const removeVoucher = (appId: string, detailId: string) => {
      patchApp(appId, (row) =>
        withTotals({
          ...row,
          vouchers: row.vouchers.filter((item) => item.id !== detailId),
        }),
      )
    }

    const mapDraftStatus = (
      appId: string,
      from: VoucherDetailStatus,
      to: VoucherDetailStatus,
    ) => {
      patchApp(appId, (row) => ({
        ...row,
        vouchers: row.vouchers.map((item) =>
          item.status === from ? { ...item, status: to } : item,
        ),
      }))
    }

    const exportVouchers = (appId: string) => {
      patchApp(appId, (row) => ({
        ...row,
        status:
          row.status === '草稿' || row.status === '審核不通過'
            ? '待審核'
            : row.status,
        rejectReason:
          row.status === '審核不通過' ? null : row.rejectReason,
        vouchers: row.vouchers.map((item) =>
          item.status === '草稿' ? { ...item, status: '待審核' } : item,
        ),
      }))
    }

    const saveExportedFile = (appId: string, file: VoucherFile) => {
      patchApp(appId, (row) => {
        if (row.exportedFile?.url.startsWith('blob:')) {
          URL.revokeObjectURL(row.exportedFile.url)
        }
        return { ...row, exportedFile: file }
      })
    }
    const approveVouchers = (appId: string) => mapDraftStatus(appId, '待審核', '審核通過')
    const rejectVouchers = (appId: string) => mapDraftStatus(appId, '待審核', '草稿')

    return {
      applications,
      getById,
      createApplication,
      updateOverview,
      completePayment,
      submitApplication,
      approveApplication,
      rejectApplication,
      voidApplication,
      saveVoucher,
      removeVoucher,
      addWriteback,
      removeWriteback,
      exportVouchers,
      saveExportedFile,
      approveVouchers,
      rejectVouchers,
    }
  }, [applications])

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  )
}

export function useApplications() {
  const ctx = useContext(ApplicationContext)
  if (!ctx) throw new Error('useApplications must be used within ApplicationProvider')
  return ctx
}
