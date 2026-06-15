import request from '@/utils/request'

export function fetchFiles(file_name, force = false) {
  const params = { file: file_name }
  if (force) {
    params._t = Date.now()
  }
  return request({
    url: '/json',
    method: 'get',
    params
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

export function claimFile(data) {
  return request({
    url: '/file/claim',
    method: 'put',
    data
  })
}

export function releaseFileClaim(data) {
  return request({
    url: '/file/claim',
    method: 'delete',
    data
  })
}
