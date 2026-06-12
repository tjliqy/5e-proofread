import request from '@/utils/request'

export function fetchFiles(file_name) {
  return request({
    url: '/json',
    method: 'get',
    params: { 'file': file_name }
  })
}

export function syncFileProgress(data) {
  return request({
    url: '/json',
    method: 'post',
    data
  })
}

export function fetchSyncTaskStatus(taskId) {
  return request({
    url: '/json',
    method: 'post',
    data: { task_id: taskId }
  })
}

export function updateFile(file_name, file_data) {
  return request({
    url: '/file',
    method: 'put',
    params: { 'file': file_name },
    data: file_data
  })
}
