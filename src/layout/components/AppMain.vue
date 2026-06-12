<template>
  <section :class="['app-main', { 'app-main--file-detail': isFileDetailPage }]">
    <transition name="fade-transform" mode="out-in">
      <keep-alive :include="cachedViews">
        <router-view :key="key" />
      </keep-alive>
    </transition>
  </section>
</template>

<script>
export default {
  name: 'AppMain',
  computed: {
    cachedViews() {
      return this.$store.state.tagsView.cachedViews
    },
    isFileDetailPage() {
      return this.$route.path === '/table/files'
    },
    key() {
      return this.$route.path
    }
  }
}
</script>

<style lang="scss" scoped>
.app-main {
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  padding: 0 16px 16px;
}

.app-main--file-detail {
  overflow: hidden;
}
</style>

<style lang="scss">
// fix css style bug in open el-dialog
.el-popup-parent--hidden {
  .fixed-header {
    padding-right: 15px;
  }
}
</style>
