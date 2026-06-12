<template>
  <div :class="['navbar', { 'navbar--compact': isCompactHeader }]">
    <div class="navbar-main">
      <div class="navbar-left">
        <div class="brand-block">
          <div class="brand-copy">
            <span class="brand-kicker">5etools & Wiki</span>
            <span class="brand-title">翻译校对平台</span>
          </div>
          <div class="context-block">
            <span class="page-title">{{ pageTitle }}</span>
            <span v-if="pageContext" class="page-context">{{ pageContext }}</span>
          </div>
        </div>
        <div class="page-nav">
          <router-link class="page-nav-link" to="/table/dashboard">
            首页看板
          </router-link>
          <router-link class="page-nav-link" to="/table/menu">
            文件进度
          </router-link>
          <router-link class="page-nav-link" to="/table/words">
            翻译列表
          </router-link>
          <router-link class="page-nav-link" to="/table/terms">
            术语表
          </router-link>
          <router-link v-if="$store.getters.roles === 'admin'" class="page-nav-link" to="/table/key-words">
            关键词修正
          </router-link>
          <router-link v-if="$store.getters.roles === 'admin'" class="page-nav-link" to="/table/invite-codes">
            邀请码
          </router-link>
        </div>
        <div v-if="showWorkspaceToolbar" class="workspace-toolbar">
          <el-button
            v-if="showBackButton"
            size="mini"
            icon="el-icon-back"
            class="toolbar-button"
            @click="goBackDir"
          >
            返回上级目录
          </el-button>
          <div v-if="isFileDetailPage" class="file-progress-pill">
            <div class="file-progress-track">
              <el-progress
                :percentage="proofreadPercentage"
                :stroke-width="18"
                :show-text="false"
                color="#e28a22"
              />
              <div class="file-progress-overlay file-progress-overlay--base">
                <div class="file-progress-overlay-content">
                  <span class="file-progress-title file-progress-title--base">{{ currentFilePath || '当前文件' }}</span>
                  <span class="file-progress-value">{{ currentFileProgress.translate }}/{{ currentFileProgress.total }}</span>
                </div>
              </div>
              <div class="file-progress-overlay file-progress-overlay--active" :style="{ width: `${proofreadPercentage}%` }">
                <div class="file-progress-overlay-content">
                  <span class="file-progress-title file-progress-title--active">{{ currentFilePath || '当前文件' }}</span>
                  <span v-if="showActiveProgressValue" class="file-progress-value">{{ currentFileProgress.translate }}/{{ currentFileProgress.total }}</span>
                </div>
              </div>
            </div>
          </div>
          <el-button
            v-if="isFileDetailPage && $store.getters.roles === 'admin' && currentFilePath"
            size="mini"
            type="primary"
            icon="el-icon-refresh"
            class="toolbar-button toolbar-button--sync"
            :loading="syncingCurrentFile"
            @click="syncCurrentFile"
          >
            同步当前文件
          </el-button>
          <div v-if="!isFileDetailPage" class="path-pill">
            <span class="path-label">当前路径</span>
            <span class="path-value">{{ workspacePath }}</span>
          </div>
          <el-input
            v-if="isFileMenuPage"
            v-model="menuSearchDraft"
            size="mini"
            clearable
            placeholder="搜索文件名或文件夹"
            class="toolbar-search"
            @input="handleMenuSearchInput"
            @clear="handleMenuSearchClear"
          >
            <i slot="prefix" class="el-input__icon el-icon-search" />
          </el-input>
        </div>

      </div>

      <div class="right-menu">
        <template v-if="device!=='mobile'">
          <!-- <search id="header-search" class="right-menu-item" /> -->

          <!-- <error-log class="errLog-container right-menu-item hover-effect" /> -->

          <!-- <el-tooltip content="Global Size" effect="dark" placement="bottom">
          <size-select id="size-select" class="right-menu-item hover-effect" />
        </el-tooltip> -->

          <el-tooltip :content="darkMode ? '关闭夜间模式' : '开启夜间模式'" effect="dark" placement="bottom">
            <div
              :class="['right-menu-item', 'hover-effect', 'toolbar-icon-button', { 'toolbar-icon-button--active': darkMode }]"
              @click="toggleDarkMode(!darkMode)"
            >
              <i class="toolbar-icon-button__icon">☾</i>
            </div>
          </el-tooltip>

          <el-tooltip :content="chmDrawerVisible ? '收起资料库' : '资料库'" effect="dark" placement="bottom">
            <div
              :class="['right-menu-item', 'hover-effect', 'chm-entry', 'toolbar-icon-button', { 'toolbar-icon-button--active': chmDrawerVisible }]"
              @click="toggleChmPanel"
            >
              <i class="el-icon-reading" />
            </div>
          </el-tooltip>

        </template>

        <el-dropdown class="avatar-container right-menu-item hover-effect" trigger="click">
          <div class="avatar-wrapper">
            <img :src="avatarSrc" class="user-avatar" @error="handleAvatarError">
            <i class="el-icon-caret-bottom" />
          </div>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item divided @click.native="logout">
              <span style="display:block;">登出</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>
    <div
      :class="['chm-panel', { 'chm-panel--open': chmDrawerVisible }]"
      :style="chmPanelStyle"
    >
      <div class="chm-panel__resize-handle" @mousedown="startResizeChmPanel" />
      <div class="chm-browser">
        <button
          v-if="chmSidebarCollapsed"
          type="button"
          class="chm-browser__sidebar-toggle"
          @click="toggleChmSidebar"
        >
          <i class="el-icon-s-unfold" />
          <span>展开目录</span>
        </button>
        <div v-show="!chmSidebarCollapsed" class="chm-browser__sidebar">
          <div class="chm-browser__header">
            <div class="chm-browser__header-main">
              <div class="chm-browser__title">DND5e 不全书</div>
              <div class="chm-browser__header-actions">
                <el-button
                  type="text"
                  icon="el-icon-s-fold"
                  class="chm-browser__close"
                  @click="toggleChmSidebar"
                />
                <el-button
                  type="text"
                  icon="el-icon-close"
                  class="chm-browser__close"
                  @click="toggleChmPanel(false)"
                />
              </div>
            </div>
            <div class="chm-browser__toolbar">
              <el-button
                size="mini"
                icon="el-icon-arrow-left"
                :disabled="!canGoBackChmHistory"
                @click="goBackChmHistory"
              >
                后退
              </el-button>
              <el-button
                size="mini"
                icon="el-icon-arrow-right"
                :disabled="!canGoForwardChmHistory"
                @click="goForwardChmHistory"
              >
                前进
              </el-button>
              <el-button size="mini" icon="el-icon-house" @click="loadChmDir('')">根目录</el-button>
              <el-button size="mini" icon="el-icon-refresh" @click="reloadChmPanel">刷新</el-button>
            </div>
          </div>
          <div class="chm-browser__sidebar-body">
            <el-input
              v-model="chmSearchKeyword"
              size="small"
              clearable
              placeholder="搜索标题或内容"
              class="chm-search"
              @keyup.enter.native="runChmSearch"
              @clear="clearChmSearch"
            >
              <el-button slot="append" icon="el-icon-search" @click="runChmSearch" />
            </el-input>
            <div class="chm-current-path">
              <span>{{ chmSearchKeyword ? `搜索：${chmSearchKeyword}` : (chmCurrentDir || '/') }}</span>
              <el-button
                v-if="!chmSearchKeyword && chmCurrentDir"
                type="text"
                size="mini"
                icon="el-icon-back"
                @click="goToChmParent"
              >
                上一级
              </el-button>
            </div>
            <div v-loading="chmLoading" class="chm-browser__list">
              <template v-if="chmSearchKeyword">
                <div v-if="chmSearchResults.titleMatches.length" class="chm-search-group">
                  <div class="chm-search-group__title">文件名匹配</div>
                  <button
                    v-for="item in chmSearchResults.titleMatches"
                    :key="`title-${item.path}`"
                    type="button"
                    class="chm-item chm-item--result"
                    @click="openChmPage(item.path)"
                  >
                    <span class="chm-item__title" v-html="item.title_highlight || item.title" />
                    <span class="chm-item__path" v-html="item.path_highlight || item.path" />
                  </button>
                </div>
                <div v-if="chmSearchResults.contentMatches.length" class="chm-search-group">
                  <div class="chm-search-group__title">内容匹配</div>
                  <button
                    v-for="item in chmSearchResults.contentMatches"
                    :key="`content-${item.path}`"
                    type="button"
                    class="chm-item chm-item--result"
                    @click="openChmPage(item.path)"
                  >
                    <span class="chm-item__title" v-html="item.title_highlight || item.title" />
                    <span class="chm-item__path" v-html="item.path_highlight || item.path" />
                    <span class="chm-item__snippet" v-html="item.snippet_highlight || item.snippet" />
                  </button>
                </div>
                <div
                  v-if="!chmSearchResults.titleMatches.length && !chmSearchResults.contentMatches.length && !chmLoading"
                  class="chm-empty"
                >
                  没有找到匹配结果
                </div>
              </template>
              <template v-else>
                <button
                  v-for="item in chmEntries"
                  :key="item.path || item.name"
                  type="button"
                  class="chm-item"
                  @click="handleChmEntryClick(item)"
                >
                  <span class="chm-item__title">
                    <i :class="item.is_dir ? 'el-icon-folder-opened' : 'el-icon-document'" />
                    {{ item.name }}
                  </span>
                  <span class="chm-item__path">{{ item.path || '/' }}</span>
                </button>
                <div v-if="!chmEntries.length && !chmLoading" class="chm-empty">这个目录下没有可显示内容</div>
              </template>
            </div>
          </div>
        </div>
        <div class="chm-browser__viewer">
          <iframe
            v-if="chmViewerSrc"
            :src="chmViewerSrc"
            title="DND5e CHM"
            class="chm-browser__iframe"
          />
          <div v-else class="chm-empty chm-empty--viewer">请选择一个页面查看</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { buildChmPageUrl, fetchChmTree, searchChm } from '@/api/chm'
import { fetchSyncTaskStatus, syncFileProgress } from '@/api/files'

export default {
  chmPanelWidthStorageKey: 'workbench.chmPanelWidth',
  chmPanelStateStorageKey: 'workbench.chmPanelState',
  data() {
    return {
      menuSearchDraft: '',
      defaultAvatarDataUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23dbe7f7'/%3E%3Cstop offset='100%25' stop-color='%23b9cbe3'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='80' height='80' rx='18' fill='url(%23g)'/%3E%3Ccircle cx='40' cy='30' r='14' fill='%23627996'/%3E%3Cpath d='M18 67c4-12 15-19 22-19s18 7 22 19' fill='%23627996'/%3E%3C/svg%3E",
      syncingCurrentFile: false,
      fileHeaderCompact: false,
      chmDrawerVisible: false,
      chmPanelWidth: 720,
      chmLoading: false,
      chmEntries: [],
      chmCurrentDir: '',
      chmViewerSrc: '',
      chmSearchKeyword: '',
      chmSearchResults: {
        titleMatches: [],
        contentMatches: []
      },
      isResizingChmPanel: false,
      chmSidebarCollapsed: false,
      chmHistoryEntries: [],
      chmHistoryIndex: -1,
      isApplyingChmHistory: false
    }
  },
  computed: {
    ...mapGetters([
      'avatar',
      'device'
    ]),
    currentFileProgress() {
      return this.$store.state.file.currentFileProgress
    },
    pageTitle() {
      return this.$route.meta && this.$route.meta.title ? this.$route.meta.title : '工作台'
    },
    isFileMenuPage() {
      return this.$route.path === '/table/menu'
    },
    isFileDetailPage() {
      return this.$route.path === '/table/files'
    },
    showWorkspaceToolbar() {
      return this.isFileMenuPage || this.isFileDetailPage
    },
    currentDir() {
      return this.$route.query && this.$route.query.dir ? this.$route.query.dir : '/'
    },
    currentFilePath() {
      return this.$route.query && this.$route.query.file_path ? this.$route.query.file_path : ''
    },
    currentFileDir() {
      if (!this.currentFilePath) {
        return '/'
      }
      const pathParts = this.currentFilePath.split('/').filter(Boolean)
      pathParts.pop()
      return pathParts.length > 0 ? pathParts.join('/') : '/'
    },
    workspacePath() {
      if (this.isFileDetailPage) {
        return this.currentFilePath || '/'
      }
      return this.currentDir
    },
    showBackButton() {
      if (this.isFileDetailPage) {
        return true
      }
      return this.currentDir !== '/'
    },
    pageContext() {
      if (this.currentFilePath) {
        return this.currentFilePath
      }
      if (this.$route.path === '/table/dashboard') {
        return '整体进度、趋势与贡献榜'
      }
      if (this.isFileMenuPage) {
        return this.currentDir
      }
      return ''
    },
    darkMode: {
      get() {
        return this.$store.state.settings.darkMode
      },
      set(val) {
        this.$store.dispatch('settings/changeSetting', {
          key: 'darkMode',
          value: val
        })
      }
    },
    avatarSrc() {
      if (!this.avatar) {
        return this.defaultAvatarDataUrl
      }
      return `${this.avatar}?imageView2/1/w/80/h/80`
    },
    proofreadPercentage() {
      if (!this.currentFileProgress.total) {
        return 0
      }
      return Math.round((this.currentFileProgress.translate / this.currentFileProgress.total) * 100)
    },
    showActiveProgressValue() {
      return this.proofreadPercentage >= 28
    },
    isCompactHeader() {
      return this.isFileDetailPage && this.fileHeaderCompact
    },
    chmPanelStyle() {
      return {
        '--chm-panel-width': `${this.chmPanelWidth}px`
      }
    },
    canGoBackChmHistory() {
      return this.chmHistoryIndex > 0
    },
    canGoForwardChmHistory() {
      return this.chmHistoryIndex >= 0 && this.chmHistoryIndex < this.chmHistoryEntries.length - 1
    }
  },
  watch: {
    '$route.query.search': {
      immediate: true,
      handler(value) {
        this.menuSearchDraft = value || ''
      }
    },
    chmDrawerVisible: {
      immediate: true,
      handler(value) {
        this.applyChmPanelState(value)
      }
    },
    '$route.path'() {
      if (!this.isFileDetailPage) {
        this.fileHeaderCompact = false
      }
    }
  },
  mounted() {
    this.restoreChmPanelWidth()
    this.restoreChmPanelState()
    window.addEventListener('file-proofread-scroll', this.handleFileProofreadScroll)
    window.addEventListener('chm-search-request', this.handleChmSearchRequest)
    window.addEventListener('mousemove', this.handleResizeChmPanel)
    window.addEventListener('mouseup', this.stopResizeChmPanel)
  },
  beforeDestroy() {
    window.removeEventListener('file-proofread-scroll', this.handleFileProofreadScroll)
    window.removeEventListener('chm-search-request', this.handleChmSearchRequest)
    window.removeEventListener('mousemove', this.handleResizeChmPanel)
    window.removeEventListener('mouseup', this.stopResizeChmPanel)
    this.applyChmPanelState(false)
  },
  methods: {
    handleChmSearchRequest(event) {
      const query = event && event.detail && event.detail.query ? String(event.detail.query).trim() : ''
      if (!query) return
      this.chmSidebarCollapsed = false
      this.chmDrawerVisible = true
      this.chmSearchKeyword = query
      this.runChmSearch()
    },
    normalizeChmPanelWidth(width) {
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1440
      const minWidth = Math.min(420, Math.floor(viewportWidth * 0.85))
      const maxWidth = Math.min(960, Math.floor(viewportWidth * 0.7))
      return Math.max(minWidth, Math.min(maxWidth, width))
    },
    restoreChmPanelWidth() {
      const storedWidth = Number(window.localStorage.getItem(this.$options.chmPanelWidthStorageKey))
      if (!Number.isFinite(storedWidth) || storedWidth <= 0) {
        document.body.style.setProperty('--chm-panel-width', `${this.chmPanelWidth}px`)
        return
      }
      this.chmPanelWidth = this.normalizeChmPanelWidth(storedWidth)
      document.body.style.setProperty('--chm-panel-width', `${this.chmPanelWidth}px`)
    },
    persistChmPanelWidth() {
      window.localStorage.setItem(this.$options.chmPanelWidthStorageKey, String(this.chmPanelWidth))
    },
    persistChmPanelState() {
      const payload = {
        visible: this.chmDrawerVisible,
        currentDir: this.chmCurrentDir,
        viewerSrc: this.chmViewerSrc,
        searchKeyword: this.chmSearchKeyword,
        searchResults: this.chmSearchResults,
        sidebarCollapsed: this.chmSidebarCollapsed,
        historyEntries: this.chmHistoryEntries,
        historyIndex: this.chmHistoryIndex
      }
      window.localStorage.setItem(this.$options.chmPanelStateStorageKey, JSON.stringify(payload))
    },
    restoreChmPanelState() {
      const raw = window.localStorage.getItem(this.$options.chmPanelStateStorageKey)
      if (!raw) return
      try {
        const payload = JSON.parse(raw)
        this.chmDrawerVisible = !!payload.visible
        this.chmCurrentDir = payload.currentDir || ''
        this.chmViewerSrc = payload.viewerSrc || ''
        this.chmSearchKeyword = payload.searchKeyword || ''
        this.chmSearchResults = {
          titleMatches: Array.isArray(payload.searchResults && payload.searchResults.titleMatches) ? payload.searchResults.titleMatches : [],
          contentMatches: Array.isArray(payload.searchResults && payload.searchResults.contentMatches) ? payload.searchResults.contentMatches : []
        }
        this.chmSidebarCollapsed = !!payload.sidebarCollapsed
        this.chmHistoryEntries = Array.isArray(payload.historyEntries) ? payload.historyEntries : []
        this.chmHistoryIndex = Number.isInteger(payload.historyIndex) ? payload.historyIndex : this.chmHistoryEntries.length - 1
        if (this.chmSearchKeyword) {
          this.runChmSearch()
          return
        }
        this.loadChmDir(this.chmCurrentDir)
      } catch (error) {
        console.error('Failed to restore CHM panel state', error)
      }
    },
    applyChmPanelState(isOpen) {
      document.body.classList.toggle('chm-panel-open', isOpen)
      document.body.style.setProperty('--chm-panel-width', `${this.chmPanelWidth}px`)
      this.persistChmPanelState()
    },
    normalizeChmHistoryEntry(entry) {
      if (typeof entry === 'string') {
        return {
          path: entry,
          query: ''
        }
      }
      return {
        path: entry && entry.path ? entry.path : '',
        query: entry && entry.query ? entry.query : ''
      }
    },
    pushChmHistoryEntry(path, query = this.chmSearchKeyword) {
      if (!path || this.isApplyingChmHistory) return
      const currentEntry = this.normalizeChmHistoryEntry(this.chmHistoryEntries[this.chmHistoryIndex])
      const nextEntry = {
        path,
        query: query || ''
      }
      if (currentEntry.path === nextEntry.path && currentEntry.query === nextEntry.query) return
      if (this.chmHistoryIndex < this.chmHistoryEntries.length - 1) {
        this.chmHistoryEntries = this.chmHistoryEntries.slice(0, this.chmHistoryIndex + 1)
      }
      this.chmHistoryEntries = [...this.chmHistoryEntries, nextEntry].slice(-100)
      this.chmHistoryIndex = this.chmHistoryEntries.length - 1
      this.persistChmPanelState()
    },
    applyChmHistoryEntry(direction) {
      const nextIndex = this.chmHistoryIndex + direction
      if (nextIndex < 0 || nextIndex >= this.chmHistoryEntries.length) return
      const nextEntry = this.normalizeChmHistoryEntry(this.chmHistoryEntries[nextIndex])
      this.isApplyingChmHistory = true
      this.chmHistoryIndex = nextIndex
      this.openChmPage(nextEntry.path, nextEntry.query)
      this.persistChmPanelState()
      this.$nextTick(() => {
        this.isApplyingChmHistory = false
      })
    },
    goBackChmHistory() {
      this.applyChmHistoryEntry(-1)
    },
    goForwardChmHistory() {
      this.applyChmHistoryEntry(1)
    },
    toggleChmSidebar() {
      this.chmSidebarCollapsed = !this.chmSidebarCollapsed
      this.persistChmPanelState()
    },
    startResizeChmPanel() {
      this.isResizingChmPanel = true
      document.body.classList.add('chm-panel-resizing')
    },
    handleResizeChmPanel(event) {
      if (!this.isResizingChmPanel) return
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1440
      const nextWidth = viewportWidth - event.clientX
      this.chmPanelWidth = this.normalizeChmPanelWidth(nextWidth)
      document.body.style.setProperty('--chm-panel-width', `${this.chmPanelWidth}px`)
    },
    stopResizeChmPanel() {
      if (!this.isResizingChmPanel) return
      this.isResizingChmPanel = false
      document.body.classList.remove('chm-panel-resizing')
      this.persistChmPanelWidth()
    },
    handleFileProofreadScroll(event) {
      this.fileHeaderCompact = !!(event && event.detail && event.detail.compact)
    },
    toggleChmPanel(forceVisible) {
      const nextVisible = typeof forceVisible === 'boolean' ? forceVisible : !this.chmDrawerVisible
      this.chmDrawerVisible = nextVisible
      if (!nextVisible) {
        return
      }
      if (!this.chmEntries.length && !this.chmSearchKeyword) {
        this.loadChmDir('')
      }
      if (!this.chmViewerSrc) {
        this.openChmPage('写在前面.html')
      }
    },
    loadChmDir(path) {
      this.chmLoading = true
      fetchChmTree(path).then((response) => {
        this.chmEntries = response.data.items || []
        this.chmCurrentDir = response.data.path || ''
        this.persistChmPanelState()
      }).finally(() => {
        this.chmLoading = false
      })
    },
    reloadChmPanel() {
      if (this.chmSearchKeyword) {
        this.runChmSearch()
        return
      }
      this.loadChmDir(this.chmCurrentDir)
    },
    runChmSearch() {
      if (!this.chmSearchKeyword) {
        this.clearChmSearch()
        return
      }
      this.chmLoading = true
      searchChm(this.chmSearchKeyword).then((response) => {
        this.chmSearchResults = {
          titleMatches: response.data.title_matches || [],
          contentMatches: response.data.content_matches || []
        }
        this.persistChmPanelState()
      }).finally(() => {
        this.chmLoading = false
      })
    },
    clearChmSearch() {
      this.chmSearchKeyword = ''
      this.chmSearchResults = {
        titleMatches: [],
        contentMatches: []
      }
      this.persistChmPanelState()
      this.loadChmDir(this.chmCurrentDir)
    },
    goToChmParent() {
      if (!this.chmCurrentDir) return
      const pathParts = this.chmCurrentDir.split('/').filter(Boolean)
      pathParts.pop()
      this.loadChmDir(pathParts.join('/'))
    },
    handleChmEntryClick(item) {
      if (item.is_dir) {
        this.loadChmDir(item.path)
        return
      }
      this.openChmPage(item.path)
    },
    openChmPage(path, query = this.chmSearchKeyword) {
      this.chmViewerSrc = buildChmPageUrl(path, query)
      this.pushChmHistoryEntry(path, query)
      this.persistChmPanelState()
    },
    updateMenuQuery(nextQuery) {
      this.$router.push({
        path: '/table/menu',
        query: nextQuery
      })
    },
    handleMenuSearchInput(value) {
      if (!this.isFileMenuPage) return
      const nextQuery = { ...this.$route.query, dir: this.currentDir }
      if (value) {
        nextQuery.search = value
      } else {
        delete nextQuery.search
      }
      this.updateMenuQuery(nextQuery)
    },
    handleMenuSearchClear() {
      if (!this.isFileMenuPage) return
      const nextQuery = { ...this.$route.query, dir: this.currentDir }
      delete nextQuery.search
      this.updateMenuQuery(nextQuery)
    },
    goBackDir() {
      if (this.isFileDetailPage) {
        this.$router.push({
          path: '/table/menu',
          query: {
            dir: this.currentFileDir
          }
        })
        return
      }
      if (!this.isFileMenuPage || this.currentDir === '/') return
      const pathParts = this.currentDir.split('/').filter(Boolean)
      pathParts.pop()
      const parentPath = pathParts.length > 0 ? pathParts.join('/') : '/'
      this.updateMenuQuery({
        ...this.$route.query,
        dir: parentPath
      })
    },
    syncCurrentFile() {
      if (!this.currentFilePath || this.syncingCurrentFile) return
      this.syncingCurrentFile = true
      syncFileProgress({ file: this.currentFilePath }).then((response) => {
        return this.waitForSyncTask(response.data.task_id)
      }).then(() => {
        this.$message.success('同步完成')
        this.$router.replace({
          path: this.$route.path,
          query: {
            ...this.$route.query,
            refreshAt: `${Date.now()}`
          }
        })
      }).catch(error => {
        console.error(error)
        this.$message.error(error.message || '同步失败')
      }).finally(() => {
        this.syncingCurrentFile = false
      })
    },
    waitForSyncTask(taskId) {
      return new Promise((resolve, reject) => {
        const poll = () => {
          fetchSyncTaskStatus(taskId).then((response) => {
            const task = response.data
            if (task.status === 'success') {
              resolve(task)
              return
            }
            if (task.status === 'error') {
              reject(new Error(task.message || '同步失败'))
              return
            }
            setTimeout(poll, 1500)
          }).catch(reject)
        }
        poll()
      })
    },
    async logout() {
      await this.$store.dispatch('user/logout')
      this.$router.push(`/login?redirect=${this.$route.fullPath}`)
    },
    handleAvatarError(event) {
      event.target.src = this.defaultAvatarDataUrl
    },
    toggleDarkMode(val) {
      this.darkMode = val
    }
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  min-height: 68px;
  overflow: hidden;
  position: relative;
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 10px 30px rgba(31, 42, 55, 0.08);
  border-bottom: 1px solid rgba(210, 220, 235, 0.8);
  padding: 8px 18px 6px;
  transition: padding 0.18s ease, box-shadow 0.18s ease, min-height 0.18s ease;

  .navbar-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 52px;
    flex-wrap: wrap;
    transition: min-height 0.18s ease, gap 0.18s ease;
  }

  .navbar-left {
    display: flex;
    flex: 1;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    min-width: 0;
    gap: 6px;
  }

  .brand-block {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex-shrink: 0;
    max-height: 56px;
    opacity: 1;
    overflow: hidden;
    transform: translateY(0);
    transition: opacity 0.18s ease, transform 0.18s ease, max-height 0.18s ease;
  }

  .brand-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .brand-kicker {
    color: #7c8aa5;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 1;
    text-transform: uppercase;
  }

  .brand-title {
    color: #1f2a37;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
  }

  .context-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding-left: 12px;
    border-left: 1px solid #dbe4f0;
  }

  .page-title {
    color: #2c3a4f;
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
  }

  .page-context {
    max-width: 540px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #8b95a7;
    font-size: 12px;
    line-height: 1;
  }

  .workspace-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
    flex: 1 1 420px;
  }

  .toolbar-button {
    border-radius: 999px;
    padding: 7px 14px;
    border-color: #d5dfeb;
    color: #43536b;
    background: #fff;
  }

  .toolbar-button--sync {
    flex-shrink: 0;
  }

  .path-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    max-width: 460px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid #dbe4f0;
    border-radius: 999px;
    background: #f9fbfe;
  }

  .file-progress-pill {
    flex: 1 1 420px;
    min-width: 240px;
  }

  .file-progress-track {
    position: relative;
  }

  .file-progress-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .file-progress-overlay-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    height: 100%;
    padding: 0 12px;
  }

  .file-progress-overlay--base {
    color: #4f5d73;
  }

  .file-progress-overlay--active {
    color: #fff;
  }

  .file-progress-title,
  .file-progress-value {
    font-size: 12px;
    font-weight: 700;
    color: inherit;
  }

  .file-progress-title {
    min-width: 0;
    flex: 1;
    white-space: nowrap;
  }

  .file-progress-title--base {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-progress-title--active {
    overflow: hidden;
    text-overflow: clip;
  }

  .file-progress-value {
    flex-shrink: 0;
  }

  .path-label {
    color: #7d8aa3;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .path-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #314157;
    font-size: 12px;
    font-weight: 600;
  }

  .toolbar-search {
    width: 240px;
    max-width: 100%;
  }

  .page-nav {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
    flex-shrink: 0;
    max-height: 56px;
    opacity: 1;
    overflow: hidden;
    transform: translateY(0);
    transition: opacity 0.18s ease, transform 0.18s ease, max-height 0.18s ease;
  }

  .page-nav-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 0 14px;
    border-radius: 12px;
    color: #5e6c84;
    background: rgba(255, 255, 255, 0.65);
    border: 1px solid transparent;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all .2s ease;

    &:hover {
      color: #2f6fed;
      background: #f4f8ff;
      border-color: #c8d9fb;
    }

    &.router-link-active,
    &.router-link-exact-active {
      color: #1749b9;
      background: #eaf1ff;
      border-color: #bfd2fb;
      box-shadow: inset 0 0 0 1px rgba(47, 111, 237, 0.08);
    }
  }

  &.navbar--compact {
    padding-top: 6px;
    padding-bottom: 4px;
    min-height: 52px;
    box-shadow: 0 8px 22px rgba(31, 42, 55, 0.06);

    .navbar-main {
      min-height: 40px;
      gap: 8px;
    }

    .brand-block,
    .page-nav,
    .right-menu {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transform: translateY(-8px);
      pointer-events: none;
    }

    .workspace-toolbar {
      flex: 1 1 100%;
      gap: 8px;
    }
  }

  .right-menu {
    max-height: 56px;
    opacity: 1;
    overflow: hidden;
    transform: translateY(0);
    transition: opacity 0.18s ease, transform 0.18s ease, max-height 0.18s ease;
  }

  .chm-entry {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .toolbar-icon-button {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 38px;
    min-width: 38px;
    height: 38px !important;
    padding: 0 !important;
    border-radius: 12px;
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.5);
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }

  .toolbar-icon-button__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-style: normal;
    font-size: 18px;
    line-height: 1;
  }

  .toolbar-icon-button--active {
    color: #1f56c4 !important;
    background: #eaf1ff !important;
    border-color: #bfd2fb !important;
    box-shadow: inset 0 0 0 1px rgba(47, 111, 237, 0.08);
  }

  .right-menu {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 52px;
    line-height: 42px;
    flex-shrink: 0;
    margin-left: auto;

    &:focus {
      outline: none;
    }

    .right-menu-item {
      display: inline-block;
      padding: 0 8px;
      height: 100%;
      font-size: 18px;
      color: #5a5e66;
      vertical-align: text-bottom;

      &.hover-effect {
        cursor: pointer;
        transition: background .3s;

        &:hover {
          background: rgba(0, 0, 0, .025)
        }
      }
    }

    .avatar-container {
      margin-right: 12px;

      .avatar-wrapper {
        margin-top: 2px;
        position: relative;

        .user-avatar {
          cursor: pointer;
          width: 40px;
          height: 40px;
          border-radius: 10px;
        }

        .el-icon-caret-bottom {
          cursor: pointer;
          position: absolute;
          right: -20px;
          top: 25px;
          font-size: 12px;
        }
      }
    }
  }

  @media (max-width: 900px) {
    .navbar-main {
      align-items: stretch;
    }

    .right-menu {
      height: auto;
      line-height: normal;
      justify-content: space-between;
    }

    .brand-block {
      width: 100%;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 8px;
    }

    .context-block {
      padding-left: 0;
      border-left: 0;
    }

    .workspace-toolbar {
      align-items: stretch;
      flex-basis: 100%;
    }

    .page-nav {
      width: 100%;
    }

    .path-pill,
    .toolbar-search {
      max-width: 100%;
      width: 100%;
    }
  }
}

body.dark-mode .navbar {
  background: linear-gradient(135deg, #131922 0%, #18202c 100%);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  border-bottom-color: rgba(69, 83, 108, 0.82);

  .brand-kicker {
    color: #89a0c2;
  }

  .brand-title {
    color: #eef4ff;
  }

  .context-block {
    border-left-color: rgba(96, 112, 139, 0.72);
  }

  .page-title {
    color: #d7e2f3;
  }

  .page-context {
    color: #8fa3c1;
  }

  .toolbar-button {
    background: rgba(22, 31, 45, 0.92);
    border-color: rgba(86, 104, 132, 0.76);
    color: #d7e2f3;

    &:hover,
    &:focus {
      color: #ffffff;
      border-color: rgba(95, 154, 255, 0.72);
      background: rgba(34, 49, 72, 0.96);
    }
  }

  .path-pill {
    background: rgba(20, 28, 41, 0.92);
    border-color: rgba(80, 97, 123, 0.82);
  }

  .file-progress-overlay--base {
    color: #c8d4e6;
  }

  .path-label {
    color: #89a0c2;
  }

  .path-value {
    color: #ecf2ff;
  }

  .page-nav-link {
    color: #aebed8;
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(92, 108, 133, 0.28);

    &:hover {
      color: #f3f7ff;
      background: rgba(66, 101, 162, 0.28);
      border-color: rgba(103, 141, 208, 0.52);
    }

    &.router-link-active,
    &.router-link-exact-active {
      color: #ffffff;
      background: linear-gradient(135deg, rgba(59, 111, 211, 0.72) 0%, rgba(51, 86, 167, 0.92) 100%);
      border-color: rgba(126, 165, 240, 0.72);
      box-shadow: inset 0 0 0 1px rgba(203, 223, 255, 0.08);
    }
  }

  .right-menu {
    .right-menu-item {
      color: #b9c7dc;

      &.hover-effect:hover {
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .toolbar-icon-button {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(92, 108, 133, 0.28);
    }

    .toolbar-icon-button--active {
      color: #ffffff !important;
      background: linear-gradient(135deg, rgba(59, 111, 211, 0.72) 0%, rgba(51, 86, 167, 0.92) 100%) !important;
      border-color: rgba(126, 165, 240, 0.72) !important;
      box-shadow: inset 0 0 0 1px rgba(203, 223, 255, 0.08);
    }

    .avatar-container .avatar-wrapper .user-avatar {
      border: 1px solid rgba(104, 123, 154, 0.9);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
    }
  }
}
</style>

<style lang="scss">
:root {
  --chm-panel-width: min(44vw, 720px);
}

body.chm-panel-open {
  #app {
    .app-wrapper {
      .main-container.workbench-shell {
        box-sizing: border-box;
        padding-right: var(--chm-panel-width);
      }
    }
  }

  .fixed-header {
    right: var(--chm-panel-width);
  }
}

body.chm-panel-resizing {
  cursor: col-resize;
  user-select: none;
}

.chm-panel {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 12;
  width: var(--chm-panel-width);
  height: 100vh;
  border-left: 1px solid #d9e2ec;
  background: #f8fafc;
  box-shadow: -18px 0 40px rgba(24, 36, 52, 0.12);
  transform: translateX(100%);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.chm-panel__resize-handle {
  position: absolute;
  top: 0;
  left: -5px;
  width: 10px;
  height: 100%;
  cursor: col-resize;
  z-index: 2;
}

.chm-panel__resize-handle::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 4px;
  width: 2px;
  border-radius: 999px;
  background: rgba(115, 134, 160, 0.24);
  transition: background 0.18s ease;
}

.chm-panel__resize-handle:hover::before {
  background: rgba(66, 113, 191, 0.6);
}

.chm-panel--open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.chm-browser {
  display: flex;
  height: 100%;
  background: #f8fafc;
}

.chm-browser__sidebar {
  width: 320px;
  border-right: 1px solid #d9e2ec;
  background: #fff;
  display: flex;
  flex-direction: column;
  transition: width 0.22s ease, border-color 0.22s ease, background-color 0.22s ease;
  overflow: hidden;
}

.chm-browser__sidebar-body {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.chm-browser__sidebar-toggle {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid #d6e0ec;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #41526b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(27, 38, 52, 0.08);
}

.chm-browser__sidebar-toggle:hover {
  border-color: #bfd1ea;
  background: #ffffff;
}

.chm-browser__header {
  padding: 16px 16px 12px;
  border-bottom: 1px solid #e5ebf3;
}

.chm-browser__header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chm-browser__header-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chm-browser__title {
  font-size: 18px;
  font-weight: 700;
  color: #243447;
}

.chm-browser__close {
  padding: 0;
  color: #63748d;
}

.chm-browser__toolbar {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.chm-search {
  padding: 12px 16px 8px;
}

.chm-current-path {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px 10px;
  color: #5b6b82;
  font-size: 12px;
}

.chm-browser__list {
  flex: 1;
  overflow: auto;
  padding: 0 10px 12px;
}

.chm-search-group + .chm-search-group {
  margin-top: 14px;
}

.chm-search-group__title {
  padding: 0 10px 8px;
  color: #5b6b82;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chm-item {
  width: 100%;
  text-align: left;
  border: 0;
  border-radius: 12px;
  background: transparent;
  padding: 10px 12px;
  cursor: pointer;
  margin-bottom: 4px;
}

.chm-item:hover {
  background: #eef4fb;
}

.chm-item__title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #243447;
  font-size: 13px;
  font-weight: 600;
}

.chm-item__path,
.chm-item__snippet {
  display: block;
  margin-top: 4px;
  color: #708198;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
}

.chm-item mark {
  padding: 0 2px;
  border-radius: 4px;
  background: #ffe1a8;
  color: #8a4b00;
}

.chm-browser__viewer {
  flex: 1;
  min-width: 0;
  background: #fff;
}

.chm-browser__iframe {
  width: 100%;
  height: 100%;
  border: 0;
}

.chm-empty {
  padding: 18px 12px;
  color: #7b8aa0;
  font-size: 13px;
}

.chm-empty--viewer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

body.dark-mode {
  .chm-panel {
    border-left-color: #2d3a4f;
    background: #111722;
    box-shadow: -18px 0 42px rgba(0, 0, 0, 0.36);
  }

  .chm-browser__sidebar-toggle {
    border-color: rgba(86, 104, 132, 0.76);
    background: rgba(20, 28, 41, 0.94);
    color: #d7e2f3;
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
  }

  .chm-browser__sidebar-toggle:hover {
    border-color: rgba(110, 147, 210, 0.72);
    background: rgba(27, 39, 57, 0.98);
  }

  .chm-panel__resize-handle::before {
    background: rgba(124, 147, 183, 0.28);
  }

  .chm-panel__resize-handle:hover::before {
    background: rgba(114, 163, 255, 0.64);
  }

  .chm-browser {
    background: #111722;
  }

  .chm-browser__sidebar,
  .chm-browser__viewer {
    background: #17202c;
  }

  .chm-browser__sidebar {
    border-right-color: #2d3a4f;
  }

  .chm-browser__header {
    border-bottom-color: #2d3a4f;
  }

  .chm-browser__title,
  .chm-item__title {
    color: #e5eefc;
  }

  .chm-browser__close {
    color: #a9b9d3;
  }

  .chm-current-path,
  .chm-item__path,
  .chm-item__snippet,
  .chm-empty {
    color: #9aabc5;
  }

  .chm-search-group__title {
    color: #8fa3c1;
  }

  .chm-item mark {
    background: rgba(245, 182, 66, 0.28);
    color: #ffe7b3;
  }

  .chm-item:hover {
    background: rgba(77, 110, 170, 0.18);
  }
}

@media (max-width: 1280px) {
  :root {
    --chm-panel-width: min(48vw, 640px);
  }
}

@media (max-width: 960px) {
  :root {
    --chm-panel-width: 100vw;
  }

  body.chm-panel-open {
    #app {
      .app-wrapper {
        .main-container.workbench-shell {
          padding-right: 0;
        }
      }
    }

    .fixed-header {
      right: 0;
    }
  }

  .chm-panel {
    width: 100vw;
    border-left: 0;
  }

  .chm-panel__resize-handle {
    display: none;
  }
}
</style>
