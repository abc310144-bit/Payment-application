import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApplicationStepper } from '../components/ApplicationStepper'
import { ApplicationSummaryPanel } from '../components/ApplicationSummaryPanel'
import { OverviewForm } from '../components/OverviewForm'
import { VoucherDetailsPanel } from '../components/VoucherDetailsPanel'
import { WriteoffHistoryPanel } from '../components/WriteoffHistoryPanel'
import {
  useApplications,
  type ApplicationOverview,
  type StoredApplication,
} from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import {
  CURRENT_USER_ACCOUNT,
  type PaymentOverviewForm,
} from '../types/payment'
import { calcExpectedPaymentDate } from '../utils/expectedPaymentDate'
import { sumAmounts } from '../utils/money'
import { canEditApplication } from '../utils/operations'
import { getPayeeDisplayName, defaultPayeeId } from '../utils/payee'
import {
  needsWriteoffHistory,
  showWriteoffHistoryTab,
} from '../utils/writeoff'
import './ApplicationWorkspacePage.css'

type TabKey = 'overview' | 'details' | 'summary' | 'writeoff'

export function ApplicationWorkspacePage({ tab }: { tab: TabKey }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useRole()
  const { getById } = useApplications()
  const app = id ? getById(id) : undefined

  if (!app) {
    return (
      <div className="workspace">
        <p className="placeholder-note">找不到這張付款申請，請返回列表。</p>
        <Link to="/" className="btn btn-default">
          返回列表
        </Link>
      </div>
    )
  }

  const showWriteoff = showWriteoffHistoryTab(app)
  if (tab === 'writeoff' && !showWriteoff) {
    return <Navigate to={`/applications/${app.id}/summary`} replace />
  }

  const writable = canEditApplication(role, app.status)
  const writeoffType = needsWriteoffHistory(app.paymentType)
  const step =
    tab === 'overview' ? 1 : tab === 'details' ? 2 : 3

  return (
    <div className="workspace">
      <div className="page-header">
        <div>
          <h1>付款申請單</h1>
          <p className="sub">
            單號：{app.applicationNo}　狀態：{app.status}
          </p>
        </div>
        <Link to="/" className="btn btn-default">
          返回列表
        </Link>
      </div>

      <div className={`mode-banner${writable ? ' is-edit' : ' is-view'}`}>
        目前操作人：{role}　狀態：{app.status}　
        {writable
          ? '此狀態可由目前操作人編輯步驟 1「基本資料」與步驟 2「憑證明細」。步驟 3 為唯讀總覽。'
          : '此狀態目前操作人不可編輯；步驟內容為唯讀。出納可於步驟 3 完成付款或標記失敗。'}
      </div>

      <div className="logic-hint">
        {writeoffType ? (
          showWriteoff ? (
            <>
              此單為「事後才拿到發票」。財務／出納已完成付款後可進行核銷（核銷介面稍後改版；目前仍可從下方連結進入）。
            </>
          ) : (
            <>
              此單為「事後才拿到發票」。建檔請依步驟 1 → 2 → 3；完成付款後才進入核銷階段。
            </>
          )
        ) : (
          <>
            建檔請依步驟 1「建立基本資料」→ 2「設定款項憑證明細」→ 3「付款申請總覽」。
          </>
        )}
      </div>

      <ApplicationStepper current={step} applicationId={app.id} />

      {tab === 'overview' && (
        <OverviewTab
          key={`${app.id}-${role}-${app.status}`}
          app={app}
          writable={writable}
          onSaved={() => navigate(`/applications/${app.id}/details`)}
        />
      )}
      {tab === 'details' && (
        <div className="step-details">
          <VoucherDetailsPanel app={app} />
          <div className="step-footer">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/applications/${app.id}/summary`)}
            >
              儲存此分頁
            </button>
          </div>
        </div>
      )}
      {tab === 'summary' && <ApplicationSummaryPanel app={app} />}
      {tab === 'writeoff' && <WriteoffHistoryPanel app={app} />}

      {showWriteoff && tab !== 'writeoff' && (
        <div className="writeoff-entry">
          <Link to={`/applications/${app.id}/writeoff`}>開啟核銷歷史（暫存入口）</Link>
        </div>
      )}
    </div>
  )
}

function toForm(app: StoredApplication): PaymentOverviewForm {
  if (app.overview) {
    return {
      paymentType: app.overview.paymentType,
      settlementMonth: app.overview.settlementMonth,
      applicant: app.overview.applicant,
      applicationDate: app.overview.applicationDate,
      vendorId:
        app.overview.vendorId ||
        defaultPayeeId(app.overview.paymentType, app.overview.applicant),
      currency: app.overview.currency,
      paymentMethod: app.overview.paymentMethod,
      remittanceFee: app.overview.remittanceFee,
      totalAmount:
        app.overview.monthlyTotals?.companyInvoiceAmount ??
        sumAmounts(app.vouchers.map((item) => item.payAmount)),
      expectedPaymentDate: app.overview.expectedPaymentDate,
      vendorTaxId: app.overview.vendorTaxId,
      cooperationMode: app.overview.cooperationMode,
      vendorName: app.overview.vendorName,
      monthlyTotals: app.overview.monthlyTotals,
    }
  }

  const applicationDate = app.createdAt.slice(0, 10)
  return {
    paymentType: app.paymentType,
    settlementMonth: '',
    applicant: app.applicant || CURRENT_USER_ACCOUNT,
    applicationDate,
    vendorId: defaultPayeeId(app.paymentType, app.applicant || CURRENT_USER_ACCOUNT),
    currency: '臺幣TWD',
    paymentMethod: '匯款',
    remittanceFee: '公司負擔',
    totalAmount: sumAmounts(app.vouchers.map((item) => item.payAmount)),
    expectedPaymentDate:
      app.expectedPaymentDate ||
      calcExpectedPaymentDate(app.paymentType, applicationDate),
  }
}

function OverviewTab({
  app,
  writable,
  onSaved,
}: {
  app: StoredApplication
  writable: boolean
  onSaved: () => void
}) {
  const { updateOverview } = useApplications()

  const handleSubmit = (form: PaymentOverviewForm) => {
    const overview: ApplicationOverview = {
      ...form,
      vendorName:
        form.vendorName || getPayeeDisplayName(form.vendorId, form.paymentType),
    }
    updateOverview(app.id, overview)
    onSaved()
  }

  return (
    <OverviewForm
      initial={toForm(app)}
      readOnly={!writable}
      showTitle
      title="建立基本資料"
      submitLabel="儲存此分頁"
      onSubmit={writable ? handleSubmit : undefined}
    />
  )
}
