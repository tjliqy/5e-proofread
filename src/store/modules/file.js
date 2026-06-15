import { fetchFiles } from '@/api/files'
// import { reject } from 'core-js/fn/promise'

const requestVersions = {}
const pendingRequests = {}

const state = {
  files: {},
  currentFilePath: '',
  currentFileProgress: {
    total: 0,
    translate: 0,
    proofread: 0
  }
}

const mutations = {
  ADD_JSON_FILES: (state, payload) => {
    state.files[payload.file] = payload.data
  },
  CLEAR_JSON_FILES: (state) => {
    state.files = {}
  },
  SET_CURRENT_FILE_PROGRESS: (state, payload) => {
    state.currentFilePath = payload.filePath || ''
    state.currentFileProgress = {
      total: payload.total || 0,
      translate: payload.translate || 0,
      proofread: payload.proofread || 0
    }
  }
}

const actions = {
  loadJsonFiles({ commit, state }, { file_path, force = false }) {
    if (!force && state.files[file_path] !== undefined) {
      return Promise.resolve(state.files[file_path])
    }

    const version = (requestVersions[file_path] || 0) + 1
    requestVersions[file_path] = version
    const requestPromise = fetchFiles(file_path, force).then(response => {
      const { data } = response
      if (!data) {
        return Promise.reject(new Error('No data'))
      }
      if (requestVersions[file_path] !== version) {
        return pendingRequests[file_path] || state.files[file_path] || data
      }
      console.log(file_path)
      commit('ADD_JSON_FILES', { 'file': file_path, 'data': data })
      return data
    }).finally(() => {
      if (pendingRequests[file_path] === requestPromise) {
        delete pendingRequests[file_path]
      }
    })
    pendingRequests[file_path] = requestPromise
    return requestPromise
  },
  clearJsonFiles({ commit }) {
    commit('CLEAR_JSON_FILES')
  },
  setCurrentFileProgress({ commit }, payload) {
    commit('SET_CURRENT_FILE_PROGRESS', payload)
  }

}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
