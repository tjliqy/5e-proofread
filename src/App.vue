<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'App',
  computed: {
    ...mapState({
      darkMode: state => state.settings.darkMode
    })
  },
  watch: {
    darkMode: {
      handler(newVal) {
        this.toggleDarkMode(newVal)
      },
      immediate: true
    }
  },
  methods: {
    toggleDarkMode(dark) {
      if (dark) {
        document.body.classList.add('dark-mode')
      } else {
        document.body.classList.remove('dark-mode')
      }
    }
  }
}
</script>
