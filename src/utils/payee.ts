import { mockVendors } from '../data/mockVendors'
import {
  employeeOptionLabel,
  findEmployeeForApplicant,
  isPettyCashType,
  mockEmployees,
} from '../data/mockEmployees'
import type { PaymentType } from '../types/payment'

export function getPayeeDisplayName(
  payeeId: string,
  paymentType: PaymentType,
) {
  if (isPettyCashType(paymentType)) {
    const emp = mockEmployees.find((item) => item.id === payeeId)
    return emp ? employeeOptionLabel(emp) : ''
  }
  const vendor = mockVendors.find((item) => item.id === payeeId)
  return vendor ? `${vendor.code} ${vendor.name}` : ''
}

export function defaultPayeeId(paymentType: PaymentType, applicant: string) {
  if (isPettyCashType(paymentType)) {
    return findEmployeeForApplicant(applicant).id
  }
  return ''
}
