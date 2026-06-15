<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'App',
  data() {
    return {
      colorSchemeMedia: null
    }
  },
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
  mounted() {
    if (!window.matchMedia) return
    this.colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
    if (this.colorSchemeMedia.addEventListener) {
      this.colorSchemeMedia.addEventListener('change', this.handleColorSchemeChange)
    } else {
      this.colorSchemeMedia.addListener(this.handleColorSchemeChange)
    }
  },
  beforeDestroy() {
    if (!this.colorSchemeMedia) return
    if (this.colorSchemeMedia.removeEventListener) {
      this.colorSchemeMedia.removeEventListener('change', this.handleColorSchemeChange)
    } else {
      this.colorSchemeMedia.removeListener(this.handleColorSchemeChange)
    }
  },
  methods: {
    handleColorSchemeChange(event) {
      this.$store.dispatch('settings/changeSetting', {
        key: 'darkMode',
        value: event.matches
      })
    },
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
