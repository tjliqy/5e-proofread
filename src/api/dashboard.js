import request from '@/utils/request'

export function fetchDashboardSummary() {
  return request({
    url: '/dashboard/summary',
    method: 'get'
  })
}
