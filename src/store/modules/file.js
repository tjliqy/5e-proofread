import { fetchFiles } from '@/api/files'
// import { reject } from 'core-js/fn/promise'

const state = {
  files: {}
}

const mutations = {
  ADD_JSON_FILES: (state, payload) => {
    state.files[payload.file] = payload.data
  },
  CLEAR_JSON_FILES: (state) => {
    state.files = {}
  }
}

const actions = {
  loadJsonFiles({ commit, state }, { file_path }) {
    return new Promise((resolve, reject) => {
      if (state.files[file_path] !== undefined) {
        resolve(state.files[file_path])
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
  }

}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
