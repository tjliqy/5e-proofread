import request from '@/utils/request'

export function fetchFiles(query) {
  return request({
    url: '/json',
    method: 'get',
    params: query
  })
}
export function fetchFileInfo(file_name, source) {
  return request({
    url: '/json',
    method: 'get',
    params: { 'file': file_name, source }
  })
}
