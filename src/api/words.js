import request from '@/utils/request'

export function fetchList(query) {
  return request({
    url: '/words',
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

export function fetchSourceFiles(eq_word_id) {
  return request({
    url: '/source',
    method: 'get',
    params: { eq_word_id }
  })
}

export function createArticle(data) {
  return request({
    url: '/vue-element-admin/article/create',
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
