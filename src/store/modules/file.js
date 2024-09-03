import { fetchFiles, fetchFileInfo } from '@/api/files'
// import { reject } from 'core-js/fn/promise'

const state = {
  files: {}
}

const mutations = {
  ADD_JSON_FILES: (state, file, json) => {
    state.files[file] = json
  },
  CLEAR_JSON_FILES: (state) => {
    state.files = {}
  }
}

const actions = {
  loadJsonFiles({ commit, state }) {
    return new Promise((resolve, reject) => {
      if (state.files.length > 0) {
        resolve(state.files)
      }
      fetchFiles().then(response => {
        const { data } = response

        if (!data) {
          reject('No data')
        }
        commit('CLEAR_JSON_FILES')

        for (const file of data) {
          commit('ADD_JSON_FILES', file, '')
        }
        resolve(state.files)
      }).catch(error => {
        reject(error)
      })
    })
  },
  loadJsonFile({ commit, state }, { file, source }) {
    return new Promise((resolve, reject) => {
      if (state.files[file + source] !== undefined) {
        resolve(state.files[file + source])
        return
      }
      fetchFileInfo(file, source).then(response => {
        const { data } = response
        if (!data) {
          reject('No data')
        }
        commit('ADD_JSON_FILES', file + source, data)
        resolve(data)
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
