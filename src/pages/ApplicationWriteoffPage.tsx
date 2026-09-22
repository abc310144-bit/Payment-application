import { Link, Navigate, useParams } from 'react-router-dom'
import { WriteoffHistoryPanel } from '../components/WriteoffHistoryPanel'
import { useApplications } from '../context/ApplicationContext'
import { useRole } from '../context/RoleContext'
import { canPerformWriteoff } from '../utils/operations'
import { showWriteoffHistoryTab } from '../utils/writeoff'
import './ApplicationWorkspacePage.css'

/** 列表「進行核銷」：獨立核銷作業頁（無 1-2-3 步驟） */
export function ApplicationWriteoffPage() {
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

  if (!showWriteoffHistoryTab(app)) {
    return <Navigate to={`/applications/${app.id}/view`} replace />
  }

  if (!canPerformWriteoff(role, app.status, app.paymentType)) {
    return <Navigate to={`/applications/${app.id}/view`} replace />
  }

  return (
    <div className="workspace">
      <div className="view-page-bar">
        <div>
          <h1>進行核銷</h1>
          <p className="sub">
            單號：{app.applicationNo}　狀態：{app.status}
          </p>
        </div>
        <Link to="/" className="btn btn-default">
          返回列表
        </Link>
      </div>

      <div className="workspace-panel">
        <WriteoffHistoryPanel app={app} variant="work" />
      </div>
    </div>
  )
}
