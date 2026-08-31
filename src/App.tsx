import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ApplicationProvider } from './context/ApplicationContext'
import { RoleContext } from './context/RoleContext'
import { ApplicationWorkspacePage } from './pages/ApplicationWorkspacePage'
import { GeneralPaymentPage } from './pages/GeneralPaymentPage'
import { PaymentOverviewPage } from './pages/PaymentOverviewPage'
import type { UserRole } from './types/payment'

export default function App() {
  const [role, setRole] = useState<UserRole>('建檔人')

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      <ApplicationProvider>
        <BrowserRouter
          basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}
        >
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<GeneralPaymentPage />} />
              <Route path="overview" element={<PaymentOverviewPage />} />
              <Route
                path="applications/:id"
                element={<Navigate to="overview" replace />}
              />
              <Route
                path="applications/:id/overview"
                element={<ApplicationWorkspacePage tab="overview" />}
              />
              <Route
                path="applications/:id/details"
                element={<ApplicationWorkspacePage tab="details" />}
              />
              <Route
                path="applications/:id/writeoff"
                element={<ApplicationWorkspacePage tab="writeoff" />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ApplicationProvider>
    </RoleContext.Provider>
  )
}
