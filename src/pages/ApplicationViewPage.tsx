import { Link, useParams } from 'react-router-dom'
import { ApplicationSummaryPanel } from '../components/ApplicationSummaryPanel'
import { useApplications } from '../context/ApplicationContext'
import './ApplicationWorkspacePage.css'

/** 列表「檢視」：僅顯示付款申請詳情，不帶 1-2-3 步驟 */
export function ApplicationViewPage() {
  const { id } = useParams()
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

  return (
    <div className="workspace">
      <div className="view-page-bar">
        <h1>付款申請詳情</h1>
        <Link to="/" className="btn btn-default">
          返回列表
        </Link>
      </div>

      <div className="workspace-panel">
        <ApplicationSummaryPanel app={app} />
      </div>
    </div>
  )
}
