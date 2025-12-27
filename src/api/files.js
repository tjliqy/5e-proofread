import request from '@/utils/request'

export function fetchFiles(file_name) {
  return request({
    url: '/json',
    method: 'get',
    params: { 'file': file_name }
  })
}
