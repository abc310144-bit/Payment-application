import { useNavigate } from 'react-router-dom'
import { OverviewForm } from '../components/OverviewForm'
import { useApplications } from '../context/ApplicationContext'
import type { PaymentOverviewForm } from '../types/payment'
import { getPayeeDisplayName } from '../utils/payee'

export function PaymentOverviewPage() {
  const navigate = useNavigate()
  const { createApplication } = useApplications()

  const handleSubmit = (form: PaymentOverviewForm) => {
    const created = createApplication({
      ...form,
      vendorName: getPayeeDisplayName(form.vendorId, form.paymentType),
    })
    navigate(`/applications/${created.id}/details`)
  }

  return <OverviewForm submitLabel="建立" onSubmit={handleSubmit} />
}
