import request from '@/utils/request'

export function login(data) {
  return request({
    url: '/login',
    method: 'post',
    data
  })
}

export function register(data) {
  return request({
    url: '/register',
    method: 'post',
    data
  })
}

export function fetchInviteCodes(params) {
  return request({
    url: '/invite-code',
    method: 'get',
    params
  })
}

export function createInviteCode() {
  return request({
    url: '/invite-code',
    method: 'post'
  })
}

export function getInfo(token) {
  return request({
    url: '/user',
    method: 'get',
    params: { token }
  })
}

export function updateProfile(data) {
  return request({
    url: '/user',
    method: 'put',
    data
  })
}

export function logout() {
  return request({
    url: '/logout',
    method: 'post'
  })
}
