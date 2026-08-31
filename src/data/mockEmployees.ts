import type { PaymentType } from '../types/payment'

export interface Employee {
  id: string
  employeeNo: string
  account: string
  name: string
}

/** 公司員工假資料；申請人 ruby.lee 對應李若比 */
export const mockEmployees: Employee[] = [
  { id: 'e1', employeeNo: 'E0001', account: 'ruby.lee', name: '李若比' },
  { id: 'e2', employeeNo: 'E0002', account: 'xiaoming.wang', name: '王小明' },
  { id: 'e3', employeeNo: 'E0003', account: 'meiling.chen', name: '陳美玲' },
  { id: 'e4', employeeNo: 'E0004', account: 'zhiwei.lin', name: '林志偉' },
  { id: 'e5', employeeNo: 'E0005', account: 'yating.huang', name: '黃雅婷' },
  { id: 'e6', employeeNo: 'E0006', account: 'tingyu.zhang', name: '張庭瑜' },
  { id: 'e7', employeeNo: 'E0007', account: 'jiahao.liu', name: '劉家豪' },
  { id: 'e8', employeeNo: 'E0008', account: 'xin.wu', name: '吳欣怡' },
]

export function findEmployeeForApplicant(applicant: string) {
  const key = applicant.trim()
  return (
    mockEmployees.find((item) => item.account === key || item.name === key) ??
    mockEmployees[0]
  )
}

export function employeeOptionLabel(emp: Employee) {
  return `${emp.employeeNo} ${emp.name}`
}

export function isPettyCashType(type: PaymentType) {
  return type === '個人代墊報支'
}
