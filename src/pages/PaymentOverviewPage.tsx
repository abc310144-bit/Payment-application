import { Link, useNavigate } from 'react-router-dom'
import { ApplicationStepper } from '../components/ApplicationStepper'
import { OverviewForm } from '../components/OverviewForm'
import { useApplications } from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import type { PaymentOverviewForm } from '../types/payment'
import { getPayeeDisplayName } from '../utils/payee'
import './PaymentOverviewPage.css'
import './ApplicationWorkspacePage.css'

export function PaymentOverviewPage() {
  const navigate = useNavigate()
  const { role } = useRole()
  const { createApplication } = useApplications()

  if (role === '出納') {
    return (
      <div className="overview-page">
        <p className="placeholder-note">出納不可新增付款申請。</p>
        <Link to="/" className="btn btn-default">
          返回列表
        </Link>
      </div>
    )
  }

  const handleSubmit = (form: PaymentOverviewForm) => {
    const created = createApplication({
      ...form,
      vendorName:
        form.vendorName || getPayeeDisplayName(form.vendorId, form.paymentType),
    })
    navigate(`/applications/${created.id}/details`)
  }

  return (
    <div className="create-wizard">
      <div className="workspace-stepper-bar">
        <ApplicationStepper current={1} disableFuture />
        <Link to="/" className="btn btn-default workspace-back">
          返回列表
        </Link>
      </div>
      <OverviewForm
        showTitle={false}
        title="建立基本資料"
        submitLabel="儲存此分頁"
        onSubmit={handleSubmit}
      />
    </div>
  )
}
