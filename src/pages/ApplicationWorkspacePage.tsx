import { Link, Navigate, NavLink, useParams } from 'react-router-dom'
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

type TabKey = 'overview' | 'details' | 'writeoff'

export function ApplicationWorkspacePage({ tab }: { tab: TabKey }) {
  const { id } = useParams()
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
    return <Navigate to={`/applications/${app.id}/details`} replace />
  }

  const writable = canEditApplication(role, app.status)
  const writeoffType = needsWriteoffHistory(app.paymentType)

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
          ? '此狀態可由目前操作人編輯「付款總覽」「款項憑證明細」。'
          : '此狀態目前操作人不可編輯，付款總覽與款項憑證明細為唯讀。'}
      </div>

      <div className="logic-hint">
        {writeoffType ? (
          showWriteoff ? (
            <>
              此單為「事後才拿到發票」。財務已完成付款，顯示
              <strong> 3 個頁籤</strong>。明細可逐列核銷，列狀態為待核銷／部分核銷／核銷完成；全部核銷完成後母單為已完成。
            </>
          ) : (
            <>
              此單為「事後才拿到發票」。完成付款前只顯示
              <strong> 2 個頁籤</strong>。
            </>
          )
        ) : (
          <>
            此單為「申請前即可拿到發票」，只顯示
            <strong> 2 個頁籤</strong>。
          </>
        )}
      </div>

      <div className="tabs">
        <NavLink
          to={`/applications/${app.id}/overview`}
          className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
        >
          付款總覽
        </NavLink>
        <NavLink
          to={`/applications/${app.id}/details`}
          className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
        >
          款項憑證明細
        </NavLink>
        {showWriteoff && (
          <NavLink
            to={`/applications/${app.id}/writeoff`}
            className={({ isActive }) => `tab${isActive ? ' active' : ''}`}
          >
            核銷歷史
          </NavLink>
        )}
      </div>

      {tab === 'overview' && (
        <OverviewTab key={`${app.id}-${role}-${app.status}`} app={app} writable={writable} />
      )}
      {tab === 'details' && <VoucherDetailsPanel app={app} />}
      {tab === 'writeoff' && <WriteoffHistoryPanel app={app} />}
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
}: {
  app: StoredApplication
  writable: boolean
}) {
  const { updateOverview } = useApplications()

  const handleSubmit = (form: PaymentOverviewForm) => {
    const overview: ApplicationOverview = {
      ...form,
      vendorName:
        form.vendorName || getPayeeDisplayName(form.vendorId, form.paymentType),
    }
    updateOverview(app.id, overview)
  }

  return (
    <OverviewForm
      initial={toForm(app)}
      readOnly={!writable}
      submitLabel="儲存"
      onSubmit={writable ? handleSubmit : undefined}
    />
  )
}
