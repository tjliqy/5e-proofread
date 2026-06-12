import { fetchFiles } from '@/api/files'
// import { reject } from 'core-js/fn/promise'

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
    return new Promise((resolve, reject) => {
      if (!force && state.files[file_path] !== undefined) {
        resolve(state.files[file_path])
        return
      }
      fetchFiles(file_path).then(response => {
        const { data } = response

        if (!data) {
          reject('No data')
        }
        // commit('CLEAR_JSON_FILES')
        console.log(file_path)
        commit('ADD_JSON_FILES', { 'file': file_path, 'data': data })
        resolve(state.files[file_path])
      }).catch(error => {
        reject(error)
      })
    })
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
