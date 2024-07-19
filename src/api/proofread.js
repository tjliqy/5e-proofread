import request from '@/utils/request'

export function fetchProofreadList(query) {
  return request({
    url: '/proofread',
    method: 'get',
    params: query
  })
}

export function fetchWord(id) {
  return request({
    url: '/words',
    method: 'get',
    params: { id }
  })
}

export function fetchPv(pv) {
  return request({
    url: '/vue-element-admin/article/pv',
    method: 'get',
    params: { pv }
  })
}

export function createProofread(data) {
  return request({
    url: '/proofread',
    method: 'post',
    data
  })
}

export function updateArticle(data) {
  return request({
    url: '/vue-element-admin/article/update',
    method: 'post',
    data
  })
}
