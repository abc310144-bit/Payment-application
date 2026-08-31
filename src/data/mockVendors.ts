import type { Vendor } from '../types/payment'

/** 尚未對到廠商時的假統編 */
export const FALLBACK_VENDOR_TAX_ID = '88366693'

export const mockVendors: Vendor[] = [
  { id: 'v1', code: 'V0001', name: '台灣優瑪特股份有限公司', taxId: '24536815' },
  { id: 'v2', code: 'V0002', name: '鼎盛物流有限公司', taxId: '88366693' },
  { id: 'v3', code: 'V0003', name: '新鮮食材行', taxId: '12345678' },
  { id: 'v4', code: 'V0004', name: '光速印刷社', taxId: '55667788' },
  { id: 'v5', code: 'V0005', name: '綠意清潔服務', taxId: '99887766' },
  { id: 'v6', code: 'V0006', name: '雲端科技股份有限公司', taxId: '11223344' },
  { id: 'v7', code: 'V0007', name: '安心保險經紀人', taxId: '33445566' },
  { id: 'v8', code: 'V0008', name: '好市多企業社', taxId: '77889900' },
  { id: 'v9', code: 'V0009', name: '龍鋒報關有限公司', taxId: '53724680' },
]

export function getVendorTaxId(vendorId?: string | null) {
  if (vendorId) {
    const vendor = mockVendors.find((item) => item.id === vendorId)
    if (vendor?.taxId) return vendor.taxId
  }
  return FALLBACK_VENDOR_TAX_ID
}
