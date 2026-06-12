<template>
  <div :class="classObj" class="app-wrapper">
    <div class="main-container workbench-shell">
      <div :class="{'fixed-header':fixedHeader}">
        <navbar />
      </div>
      <app-main />
      <!-- <right-panel v-if="showSettings">
        <settings />
      </right-panel> -->
    </div>
  </div>
</template>

<script>
// import RightPanel from '@/components/RightPanel'
// import { AppMain, Navbar, Settings } from './components'
import { AppMain, Navbar } from './components'
import ResizeMixin from './mixin/ResizeHandler'
import { mapState } from 'vuex'

export default {
  name: 'Layout',
  components: {
    AppMain,
    Navbar
    // RightPanel,
    // Settings,
  },
  mixins: [ResizeMixin],
  computed: {
    ...mapState({
      sidebar: state => state.app.sidebar,
      device: state => state.app.device,
      showSettings: state => state.settings.showSettings,
      fixedHeader: state => state.settings.fixedHeader
    }),
    classObj() {
      return {
        mobile: this.device === 'mobile'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  @import "~@/styles/mixin.scss";
  @import "~@/styles/variables.scss";

  .app-wrapper {
    @include clearfix;
    position: relative;
    height: 100%;
    width: 100%;

    &.mobile.openSidebar {
      position: fixed;
      top: 0;
    }
  }

  .fixed-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9;
    transition: right 0.24s ease;
  }

  .mobile .fixed-header {
    width: 100%;
  }
</style>

<style lang="scss">
#app {
  .app-wrapper {
    .main-container.workbench-shell {
      display: flex;
      flex-direction: column;
      margin-left: 0 !important;
      width: 100%;
      height: 100vh;
      min-height: 100vh;
      overflow: hidden;
      box-sizing: border-box;
      transition: padding-right 0.24s ease;
      background: linear-gradient(180deg, #f3f7fc 0%, #eef3f8 100%);
    }
  }
}
</style>
