<template>
  <div class="menu-container">
    <div class="claim-filters">
      <span class="claim-filters__label">占坑筛选</span>
      <el-radio-group v-model="claimFilter" size="small" @change="handleClaimFilterChange">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="unclaimed">未占坑</el-radio-button>
        <el-radio-button label="mine">我的占坑</el-radio-button>
      </el-radio-group>
    </div>
    <div v-loading="loading" class="card-container" :element-loading-text="'加载中...'">
      <div v-if="!loading && filteredFileTree.length === 0" class="empty-state">
        当前筛选条件下没有文件或文件夹
      </div>
      <div
        v-for="item in filteredFileTree"
        :key="item.file || item.label"
        :class="['file-card', { 'folder-card': item.proofread != item.total }, { 'locked-card': item.locked === 1 }]"
        @click="handleNodeClick(item)"
      >
        <div class="card-header">
          <div class="card-title">
            <i :class="item.isFolder ? 'el-icon-folder' : 'el-icon-document'" class="file-icon" />
            <span class="card-title__text" v-html="item.highlightedLabel || item.label" />
            <el-button
              v-if="!item.isFolder"
              v-permission="['admin']"
              type="text"
              size="small"
              icon="el-icon-edit"
              class="render-button"
              @click.stop="goToRender(item.file)"
            >
              高级模式
            </el-button>
            <el-button
              v-if="!item.isFolder"
              v-permission="['admin']"
              :loading="syncingFile === item.file"
              type="text"
              size="small"
              icon="el-icon-refresh"
              class="render-button"
              @click.stop="syncItem(item)"
            >
              同步
            </el-button>
          </div>
          <div class="claim-actions">
            <span
              :class="['claim-owner', `claim-owner--${item.claimStatus}`]"
              :title="item.claimUsername || item.claimNickname"
            >
              <i class="el-icon-user" />
              {{ getClaimOwnerText(item) }}
            </span>
            <div class="claim-actions__buttons">
              <el-button
                v-if="canClaim(item)"
                :loading="claimingFile === item.file"
                type="primary"
                size="mini"
                plain
                class="claim-button"
                @click.stop="claimItem(item)"
              >
                {{ item.claimStatus === 'partial_mine' ? '补全占坑' : '占坑' }}
              </el-button>
              <el-button
                v-if="item.claimStatus === 'mine' || item.claimStatus === 'partial_mine'"
                :loading="claimingFile === item.file"
                type="danger"
                size="mini"
                plain
                class="claim-button"
                @click.stop="releaseItem(item)"
              >
                取消占坑
              </el-button>
              <el-button
                v-if="!canClaim(item) && item.claimStatus !== 'mine' && item.claimStatus !== 'partial_mine'"
                type="info"
                size="mini"
                plain
                disabled
                class="claim-button"
              >
                已占坑
              </el-button>
            </div>
          </div>
        </div>
        <div class="card-content">
          <div class="folder-stats">
            <div class="progress-wrapper">
              <div class="integrated-progress">
                <span
                  class="integrated-progress__bar integrated-progress__bar--translated"
                  :style="{ width: item.translatePercentage + '%' }"
                />
                <span
                  class="integrated-progress__bar integrated-progress__bar--proofread"
                  :style="{ width: item.proofreadPercentage + '%' }"
                />
              </div>
              <div class="progress-texts">
                <span class="progress-text progress-text--translated">
                  翻译 {{ item.translate }}/{{ item.total }}
                </span>
                <span class="progress-text progress-text--proofread">
                  校对 {{ item.proofread }}/{{ item.total }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  claimFile,
  fetchSyncTaskStatus,
  releaseFileClaim,
  syncFileProgress
} from '@/api/files'

export default {
  name: 'FileMenu',
  data() {
    return {
      files: [],
      fileTree: [],
      filteredFileTree: [],
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      loading: false,
      syncingFile: '',
      claimingFile: '',
      claimFilter: 'all'
    }
  },
  computed: {
    currentPath() {
      return this.$route.query.dir || '/'
    },
    searchQuery() {
      return (this.$route.query.search || '').trim()
    },
    hideCompleted() {
      if (this.$route.query.hide_completed === '1') return true
      return localStorage.getItem('file-menu-hide-completed') === '1'
    },
    routeClaimFilter() {
      const filter = this.$route.query.claim_filter
      return ['unclaimed', 'mine'].includes(filter) ? filter : 'all'
    }
  },
  watch: {
    '$route.query': {
      immediate: true,
      handler() {
        this.claimFilter = this.routeClaimFilter
        this.loadFiles(this.currentPath, true)
      }
    }
  },
  methods: {
    escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    },
    highlightText(text, query) {
      const safeText = this.escapeHtml(text)
      if (!query) return safeText
      const pattern = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig')
      return safeText.replace(pattern, '<mark>$1</mark>')
    },
    getSearchScore(label, query) {
      if (!query) return 0
      const lowerLabel = label.toLowerCase()
      const lowerQuery = query.toLowerCase()
      const index = lowerLabel.indexOf(lowerQuery)
      if (index === -1) return 0
      if (lowerLabel === lowerQuery) return 4
      if (lowerLabel.startsWith(lowerQuery)) return 3
      if (lowerLabel.includes(lowerQuery)) return 2
      return 1
    },
    loadFiles(path, force = true) {
      this.loading = true
      this.$store.dispatch('file/loadJsonFiles', { file_path: path, force })
        .then(files => {
          this.files = files
          this.buildFileTree()
        })
        .catch(error => {
          console.error('加载文件列表失败:', error)
          this.$message.error('加载文件列表失败')
        })
        .finally(() => {
          this.loading = false
        })
    },
    buildFileTree() {
      const tree = []

      // 直接使用loadJsonFiles返回的条目，只包含当前路径下的文件夹和文件
      this.files.forEach(item => {
        console.log(item)
        if (item.source_file) {
          // 这是一个文件
          const baseLabel = (item.display_name || item.file.split('/').pop())
          const fileNode = {
            rawLabel: baseLabel,
            label: baseLabel + (item.locked === 1 ? ' (已锁定)' : ''), // 获取文件名
            file: item.file,
            total: item.total,
            translate: item.translate,
            proofread: item.proofread,
            translatePercentage: item.total > 0 ? Math.round((item.translate / item.total) * 100) : 0,
            proofreadPercentage: item.total > 0 ? Math.round((item.proofread / item.total) * 100) : 0,
            locked: item.locked || 0,
            userId: item.user_id,
            claimNickname: item.claim_nickname || '',
            claimUsername: item.claim_username || '',
            claimStatus: item.claim_status || 'unclaimed',
            isFolder: false
          }
          tree.push(fileNode)
        } else {
          // 这是一个文件夹，已经包含了统计信息
          const baseLabel = item.display_name || item.file.split('/').pop()
          const folderNode = {
            rawLabel: baseLabel,
            label: baseLabel, // 获取文件夹名
            file: item.file,
            children: [], // 保持结构一致，但不包含子路径下的内容
            fileCount: item.fileCount || 0,
            total: item.total || 0,
            translate: item.translate || 0,
            proofread: item.proofread || 0,
            translatePercentage: item.total > 0 ? Math.round((item.translate / item.total) * 100) : 0,
            proofreadPercentage: item.total > 0 ? Math.round((item.proofread / item.total) * 100) : 0,
            userId: item.user_id,
            claimNickname: item.claim_nickname || '',
            claimUsername: item.claim_username || '',
            claimStatus: item.claim_status || 'unclaimed',
            isFolder: true
          }
          tree.push(folderNode)
        }
      })
      this.fileTree = tree
      this.applyFilters()
    },
    applyFilters() {
      let visibleItems = this.hideCompleted
        ? this.fileTree.filter(item => !this.isTranslationComplete(item))
        : [...this.fileTree]
      if (this.claimFilter === 'unclaimed') {
        visibleItems = visibleItems.filter(item => item.claimStatus === 'unclaimed')
      } else if (this.claimFilter === 'mine') {
        visibleItems = visibleItems.filter(item => (
          item.claimStatus === 'mine' || item.claimStatus === 'partial_mine'
        ))
      }
      if (!this.searchQuery) {
        this.filteredFileTree = visibleItems
        return
      }
      const query = this.searchQuery
      this.filteredFileTree = visibleItems
        .map((item, index) => {
          const searchScore = this.getSearchScore(item.rawLabel || item.label, query)
          return {
            ...item,
            highlightedLabel: this.highlightText(item.label, query),
            searchScore,
            originalIndex: index
          }
        })
        .sort((a, b) => {
          if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore
          return a.originalIndex - b.originalIndex
        })
    },
    isTranslationComplete(item) {
      const total = Number(item.total) || 0
      const translated = Number(item.translate) || 0
      return total > 0 && translated >= total
    },
    handleClaimFilterChange(filter) {
      const query = { ...this.$route.query }
      if (filter === 'all') {
        delete query.claim_filter
      } else {
        query.claim_filter = filter
      }
      this.$router.replace({ path: this.$route.path, query })
    },
    getClaimOwnerText(item) {
      if (item.claimStatus === 'unclaimed') return '未占坑'
      if (item.claimStatus === 'mixed') return '多人占坑'
      if (item.claimStatus === 'partial_mine') return `${item.claimNickname || '我'}（部分）`
      if (item.claimStatus === 'partial_claimed') return `${item.claimNickname || '已占坑'}（部分）`
      return item.claimNickname || '已占坑'
    },
    canClaim(item) {
      return item.claimStatus === 'unclaimed' || item.claimStatus === 'partial_mine'
    },
    claimItem(item, confirmed = false) {
      this.claimingFile = item.file
      return claimFile({
        file: item.file,
        is_folder: item.isFolder,
        confirmed
      }).then(response => {
        const data = response.data || {}
        if (data.requires_confirmation) {
          this.claimingFile = ''
          return this.$confirm(
            `该${item.isFolder ? '文件夹' : '文件'}仍有 ${data.untranslated} 条未翻译内容，超过 2000 条。确定要占坑吗？`,
            '占坑确认',
            {
              confirmButtonText: '确认占坑',
              cancelButtonText: '取消',
              type: 'warning'
            }
          ).then(() => this.claimItem(item, true))
        }
        this.$message.success('占坑成功')
        return this.loadFiles(this.currentPath, true)
      }).catch(error => {
        if (error !== 'cancel' && error !== 'close') {
          console.error(error)
        }
      }).finally(() => {
        this.claimingFile = ''
      })
    },
    releaseItem(item) {
      this.$confirm(
        `确定取消对“${item.rawLabel || item.label}”的占坑吗？`,
        '取消占坑',
        {
          confirmButtonText: '确定取消',
          cancelButtonText: '保留占坑',
          type: 'warning'
        }
      ).then(() => {
        this.claimingFile = item.file
        return releaseFileClaim({
          file: item.file,
          is_folder: item.isFolder
        })
      }).then(() => {
        this.$message.success('已取消占坑')
        return this.loadFiles(this.currentPath, true)
      }).catch(error => {
        if (error !== 'cancel' && error !== 'close') {
          console.error(error)
        }
      }).finally(() => {
        this.claimingFile = ''
      })
    },
    handleNodeClick(data) {
      // 如果正在加载中，不处理点击事件
      if (this.loading) return

      if (!data.isFolder) {
        // 如果是文件，跳转到list.vue并携带参数
        console.log(data)
        console.log(data.locked === 1)
        console.log(data.locked === '1')
        if (data.locked === 1) {
          this.$message.error('该文件已被锁定，无法查看')
          return
        }
        this.$router.push({
          path: '/table/files',
          query: {
            file_path: data.file
          }
        })
      } else {
        // 如果是文件夹，加载该文件夹下的内容
        this.$router.push({
          path: '/table/menu',
          query: {
            ...this.$route.query,
            dir: data.file
          }
        })
      }
    },
    syncItem(item) {
      this.syncingFile = item.file
      syncFileProgress({ file: item.file }).then((response) => {
        return this.waitForSyncTask(response.data.task_id)
      }).then(() => {
        this.$message.success('同步完成')
        this.loadFiles(this.currentPath, true)
      }).catch(error => {
        console.error(error)
        this.$message.error(error.message || '同步失败')
      }).finally(() => {
        this.syncingFile = ''
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
    getProgressColor(percentage) {
      if (percentage === 100) return '#67C23A'
      if (percentage >= 50) return '#E6A23C'
      return '#F56C6C'
    },
    getProofreadColor(percentage) {
      if (percentage === 100) return '#67C23A'
      if (percentage >= 50) return '#409EFF'
      return '#909399'
    },
    goToRender(filePath) {
      this.$router.push({
        path: '/table/render',
        query: {
          file_path: filePath
        }
      })
    }
  }
}
</script>

<style scoped>
.menu-container {
  padding: 0;
}

.claim-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.claim-filters__label {
  color: #606266;
  font-size: 13px;
  font-weight: 600;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 48px 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  color: #909399;
  text-align: center;
  background: #fff;
}

.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.file-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #ebeef5;
  position: relative;
  overflow: hidden;
}

.file-card:hover {
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.folder-card {
  border-left: 4px solid #ff4040;
}

.file-card:not(.folder-card) {
  border-left: 4px solid #67C23A;
}

.locked-card {
  /* border-left: 4px solid #909399; */
  background-color: #606266;
}

.locked-card .card-title {
  color: #909399;
}

.card-header {
  margin-bottom: 15px;
  position: relative;
  z-index: 1;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.card-title__text {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.card-title__text mark {
  padding: 0 2px;
  border-radius: 4px;
  background: #ffe1a8;
  color: #8a4b00;
}

.file-icon {
  font-size: 20px;
}

.claim-owner {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  max-width: 200px;
  padding: 3px 8px;
  border-radius: 999px;
  overflow: hidden;
  color: #606266;
  background: #f2f4f7;
  font-size: 12px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.claim-owner--mine,
.claim-owner--partial_mine {
  color: #287348;
  background: #e8f7ef;
}

.claim-owner--claimed,
.claim-owner--partial_claimed,
.claim-owner--mixed {
  color: #9a6516;
  background: #fff3dc;
}

.claim-button {
  flex-shrink: 0;
}

.claim-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.claim-actions__buttons {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}

.claim-actions__buttons .el-button + .el-button {
  margin-left: 0;
}

.folder-card .file-icon {
  color: #ff4040;
}

.file-card:not(.folder-card) .file-icon {
  color: #67C23A;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.folder-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.stat-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.progress-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-wrapper .el-progress {
  flex: 1;
  margin: 0;
}

.file-progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.progress-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-info .el-progress {
  flex: 1;
  margin: 0;
}

.progress-texts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 60px;
  text-align: right;
}

.progress-text {
  font-size: 12px;
  color: #909399;
}

.progress-text--translated::before,
.progress-text--proofread::before {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 50%;
  content: "";
}

.progress-text--translated::before {
  background: #E6A23C;
}

.progress-text--proofread::before {
  background: #409EFF;
}

.integrated-progress {
  flex: 1;
  position: relative;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  background-color: #f3f4f6;
}

.integrated-progress__bar {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: inherit;
  transition: width 0.35s ease;
}

.integrated-progress__bar--translated {
  z-index: 1;
  background: #E6A23C;
}

.integrated-progress__bar--proofread {
  z-index: 2;
  background: #409EFF;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-container {
    grid-template-columns: 1fr;
  }

  .claim-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .claim-actions__buttons {
    width: 100%;
  }
}
/* 响应式设计 */
@media (max-width: 768px) {
  .card-container {
    grid-template-columns: 1fr;
  }
}
</style>

<style lang="scss">
body.dark-mode .menu-container {
  background-color: #2d2d2d;
}

body.dark-mode .menu-container .empty-state {
  border-color: #555;
  color: #aaa;
  background-color: #333;
}

body.dark-mode .menu-container .claim-filters {
  border-color: #444;
  background-color: #333;
}

body.dark-mode .menu-container .claim-filters__label {
  color: #c5cbd3;
}

body.dark-mode .menu-container h2 {
  color: #e0e0e0;
}

body.dark-mode .menu-container .current-path {
  background-color: #3a3a3a;
  border-color: #444;
  color: #e0e0e0;
}

body.dark-mode .menu-container .file-card {
  background-color: #333;
  border-color: #444;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3);
}

body.dark-mode .menu-container .file-card:hover {
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.4);
}

body.dark-mode .menu-container .folder-card {
  border-left-color: #ff6b6b;
}

body.dark-mode .menu-container .file-card:not(.folder-card) {
  border-left-color: #67C23A;
}

body.dark-mode .menu-container .locked-card {
  background-color: #444;
}

body.dark-mode .menu-container .locked-card .card-title {
  color: #b0b0b0;
}

body.dark-mode .menu-container .card-title {
  color: #e0e0e0;
}

body.dark-mode .menu-container .claim-owner {
  color: #d1d5db;
  background: #444;
}

body.dark-mode .menu-container .claim-owner--mine,
body.dark-mode .menu-container .claim-owner--partial_mine {
  color: #9de2ba;
  background: rgba(42, 121, 77, 0.35);
}

body.dark-mode .menu-container .claim-owner--claimed,
body.dark-mode .menu-container .claim-owner--partial_claimed,
body.dark-mode .menu-container .claim-owner--mixed {
  color: #f1cc8c;
  background: rgba(154, 101, 22, 0.3);
}

body.dark-mode .menu-container .claim-button.el-button--primary.is-plain {
  color: #b9d7ff;
  border-color: #4f8edc;
  background: rgba(47, 111, 237, 0.22);
}

body.dark-mode .menu-container .claim-button.el-button--primary.is-plain:hover,
body.dark-mode .menu-container .claim-button.el-button--primary.is-plain:focus {
  color: #fff;
  border-color: #6da8ef;
  background: #3478cf;
}

body.dark-mode .menu-container .claim-button.el-button--danger.is-plain {
  color: #ffb3b3;
  border-color: #c85b5b;
  background: rgba(210, 70, 70, 0.2);
}

body.dark-mode .menu-container .claim-button.el-button--danger.is-plain:hover,
body.dark-mode .menu-container .claim-button.el-button--danger.is-plain:focus {
  color: #fff;
  border-color: #e47878;
  background: #c84f4f;
}

body.dark-mode .menu-container .claim-button.el-button--info.is-plain.is-disabled {
  color: #aab2bf;
  border-color: #596273;
  background: #414854;
}

body.dark-mode .menu-container .card-title__text mark {
  background: rgba(245, 182, 66, 0.28);
  color: #ffe7b3;
}

body.dark-mode .menu-container .folder-card .file-icon {
  color: #ff6b6b;
}

body.dark-mode .menu-container .file-card:not(.folder-card) .file-icon {
  color: #67C23A;
}

body.dark-mode .menu-container .stat-label {
  color: #b0b0b0;
}

body.dark-mode .menu-container .stat-value {
  color: #e0e0e0;
}

body.dark-mode .menu-container .progress-label {
  color: #b0b0b0;
}

body.dark-mode .menu-container .progress-text {
  color: #909399;
}

body.dark-mode .menu-container .integrated-progress {
  background-color: #444;
}

body.dark-mode .menu-container .el-progress__text {
  color: #e0e0e0;
}
</style>
