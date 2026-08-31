import { createContext, useContext } from 'react'
import type { UserRole } from '../types/payment'

interface RoleContextValue {
  role: UserRole
  setRole: (role: UserRole) => void
}

export const RoleContext = createContext<RoleContextValue | null>(null)

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleContext')
  return ctx
}
