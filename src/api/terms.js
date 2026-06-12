import request from '@/utils/request'

export function fetchTerms(params) {
  return request({
    url: '/terms',
    method: 'get',
    params
  })
}
