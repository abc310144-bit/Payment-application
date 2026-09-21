import { Link } from 'react-router-dom'
import './ApplicationStepper.css'

export const APPLICATION_STEPS = [
  { step: 1, label: '建立基本資料', path: 'overview' },
  { step: 2, label: '設定款項憑證明細', path: 'details' },
  { step: 3, label: '付款申請總覽', path: 'summary' },
] as const

export type ApplicationStep = (typeof APPLICATION_STEPS)[number]['step']

interface Props {
  current: ApplicationStep
  /** 已建立申請單時可點步前進；新增頁僅步驟 1 可點 */
  applicationId?: string
  /** 尚未建立時，步驟 2／3 顯示為停用 */
  disableFuture?: boolean
}

export function ApplicationStepper({
  current,
  applicationId,
  disableFuture = false,
}: Props) {
  return (
    <nav className="app-stepper" aria-label="付款申請步驟">
      {APPLICATION_STEPS.map((item, index) => {
        const active = item.step === current
        const locked = disableFuture && item.step > current
        const className = `app-step${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}`
        const body = (
          <>
            <span className="app-step-index">{item.step}</span>
            <span className="app-step-label">{item.label}</span>
          </>
        )

        return (
          <div className="app-step-wrap" key={item.step}>
            {index > 0 && (
              <span className="app-step-sep" aria-hidden="true">
                &gt;
              </span>
            )}
            {applicationId && !locked ? (
              <Link
                to={`/applications/${applicationId}/${item.path}`}
                className={className}
                aria-current={active ? 'step' : undefined}
              >
                {body}
              </Link>
            ) : (
              <span
                className={className}
                aria-current={active ? 'step' : undefined}
              >
                {body}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
