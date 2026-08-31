import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useRole } from '../context/RoleContext'
import type { UserRole } from '../types/payment'
import './AppLayout.css'

const ROLES: UserRole[] = ['建檔人', '財務']

function Breadcrumb() {
  const { pathname } = useLocation()

  let current = '一般付款'
  if (pathname.startsWith('/overview')) current = '新增付款申請'
  else if (pathname.includes('/writeoff')) current = '核銷歷史'
  else if (pathname.includes('/details')) current = '款項憑證明細'
  else if (pathname.includes('/overview')) current = '付款總覽'

  return (
    <div className="breadcrumb">
      財務 <span>/</span> 付款申請 <span>/</span> {current}
    </div>
  )
}

export function AppLayout() {
  const { role, setRole } = useRole()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">財務系統</div>
        <nav className="sidebar-nav">
          <div className="nav-group">
            <div className="nav-group-title">財務</div>
            <div className="nav-subgroup">
              <div className="nav-subgroup-title">付款申請</div>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `nav-link${isActive ? ' active' : ''}`
                }
              >
                一般付款
              </NavLink>
            </div>
          </div>
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <Breadcrumb />
          <div className="role-switcher">
            <span className="role-label">原型角色</span>
            <div className="role-tabs" role="tablist">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={role === r}
                  className={`role-tab${role === r ? ' active' : ''}`}
                  onClick={() => setRole(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
