import { Link, useLocation, useParams } from 'react-router-dom'
import type { PaymentOverviewForm } from '../types/payment'
import { formatDateDisplay } from '../utils/expectedPaymentDate'
import './VoucherDetailsPage.css'

interface OverviewState {
  overview?: PaymentOverviewForm & { vendorName?: string }
}

/** 款項憑證明細頁籤 — 細節待後續 PRD */
export function VoucherDetailsPage() {
  const { id } = useParams()
  const location = useLocation()
  const state = (location.state || {}) as OverviewState
  const overview = state.overview

  return (
    <div className="voucher-page">
      <div className="page-header">
        <div>
          <h1>款項憑證明細</h1>
          <p className="sub">申請單草稿：{id}</p>
        </div>
        <Link to="/" className="btn btn-default">
          返回列表
        </Link>
      </div>

      <div className="tabs">
        <button type="button" className="tab active">
          款項憑證明細
        </button>
        <button type="button" className="tab" disabled>
          核銷歷史（條件顯示，待後續）
        </button>
      </div>

      {overview ? (
        <div className="summary-card">
          <h2>已建立之付款總覽</h2>
          <dl className="summary-grid">
            <div>
              <dt>付款類型</dt>
              <dd>{overview.paymentType}</dd>
            </div>
            {overview.settlementMonth && (
              <div>
                <dt>結算月</dt>
                <dd>{overview.settlementMonth}</dd>
              </div>
            )}
            <div>
              <dt>申請人</dt>
              <dd>{overview.applicant}</dd>
            </div>
            <div>
              <dt>申請日</dt>
              <dd>{formatDateDisplay(overview.applicationDate)}</dd>
            </div>
            <div>
              <dt>付款對象</dt>
              <dd>{overview.vendorName || '-'}</dd>
            </div>
            <div>
              <dt>付款幣別</dt>
              <dd>{overview.currency}</dd>
            </div>
            <div>
              <dt>付款方式</dt>
              <dd>{overview.paymentMethod}</dd>
            </div>
            <div>
              <dt>匯款手續費</dt>
              <dd>{overview.remittanceFee}</dd>
            </div>
            <div>
              <dt>預計付款日</dt>
              <dd>{formatDateDisplay(overview.expectedPaymentDate)}</dd>
            </div>
            <div>
              <dt>總付款金額（含稅）</dt>
              <dd>待明細加總</dd>
            </div>
          </dl>
          <p className="placeholder-note">
            明細新增／編輯介面待下一段 PRD 實作。若為通路後扣或月結廠商，新增明細時會自動帶入款項用途與結算月。
          </p>
        </div>
      ) : (
        <div className="summary-card">
          <p className="placeholder-note">
            請先從「新增付款申請」建立付款總覽。
          </p>
          <Link to="/overview" className="btn btn-primary">
            前往付款總覽
          </Link>
        </div>
      )}
    </div>
  )
}
