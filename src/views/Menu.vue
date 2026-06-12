<template>
  <div class="menu-container">
    <div v-loading="loading" class="card-container" :element-loading-text="'加载中...'">
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
        </div>
        <div class="card-content">
          <div class="folder-stats">
            <div class="progress-wrapper">
              <div class="integrated-progress">
                <el-progress
                  v-if="item.total > 0"
                  type="line"
                  :percentage="item.proofreadPercentage"
                  :stroke-width="10"
                  :color="'#409EFF'"
                  :show-text="false"
                />
              </div>
              <span class="progress-text">校对：{{ item.proofread }}/{{ item.total }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { fetchSyncTaskStatus, syncFileProgress } from '@/api/files'

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
      syncingFile: ''
    }
  },
  computed: {
    currentPath() {
      return this.$route.query.dir || '/'
    },
    searchQuery() {
      return (this.$route.query.search || '').trim()
    }
  },
  watch: {
    '$route.query': {
      immediate: true,
      handler() {
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
            isFolder: true
          }
          tree.push(folderNode)
        }
      })
      this.fileTree = tree
      if (!this.searchQuery) {
        this.filteredFileTree = tree
        return
      }
      const query = this.searchQuery
      this.filteredFileTree = [...this.fileTree]
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

.integrated-progress {
  flex: 1;
  position: relative;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  background-color: #f3f4f6;
}

.integrated-progress .el-progress {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  margin: 0;
}

.integrated-progress .el-progress:first-child {
  z-index: 1;
}

.integrated-progress .el-progress:last-child {
  z-index: 2;
}

/* 覆盖Element UI进度条样式 */
.integrated-progress .el-progress__bar {
  border-radius: 5px;
}

.integrated-progress .el-progress__bar-inner {
  border-radius: 5px;
}

/* 调整进度条背景 */
.integrated-progress .el-progress__bar__outer {
  background-color: transparent;
  border-radius: 5px;
  overflow: visible;
}

/* 确保两个进度条可以叠加 */
.integrated-progress .el-progress--line .el-progress__bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .card-container {
    grid-template-columns: 1fr;
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
