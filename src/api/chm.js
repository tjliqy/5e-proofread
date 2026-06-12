import request from '@/utils/request'

export function fetchChmTree(path = '') {
  return request({
    url: '/chm/tree',
    method: 'get',
    params: { path }
  })
}

export function searchChm(query) {
  return request({
    url: '/chm/search',
    method: 'get',
    params: { q: query }
  })
}

export function buildChmPageUrl(path, query = '') {
  const base = process.env.VUE_APP_BASE_API || '/api/v1'
  const queryPart = query ? `&q=${encodeURIComponent(query)}` : ''
  return `${base}/chm/page?path=${encodeURIComponent(path)}${queryPart}`
}
