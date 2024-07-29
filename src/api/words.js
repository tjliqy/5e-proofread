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

export function fetchFileSource(eq_file) {
  return request({
    url: '/source',
    method: 'get',
    params: { eq_file }
  })
}
