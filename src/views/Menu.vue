<template>
  <div class="menu-container">
    <div class="header-section">
      <h2>文件翻译进度管理</h2>
      <div class="header-actions">
        <div class="breadcrumb">
          <el-button
            v-if="currentPath !== '/'"
            type="primary"
            size="small"
            icon="el-icon-back"
            @click="goBack"
          >
            返回上级目录
          </el-button>
          <span class="current-path">{{ currentPath }}</span>
        </div>
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="搜索文件名或文件夹"
            size="small"
            clearable
            style="width: 200px;"
            @input="handleSearch"
          >
            <template #append>
              <el-button icon="el-icon-search" @click="handleSearch" />
            </template>
          </el-input>
        </div>
      </div>
    </div>
    <div v-loading="loading" class="card-container" :element-loading-text="'加载中...'">
      <div
        v-for="item in filteredFileTree"
        :key="item.file || item.label"
        :class="['file-card', { 'folder-card': item.isFolder }]"
        @click="handleNodeClick(item)"
      >
        <div class="card-header">
          <div class="card-title">
            <i :class="item.isFolder ? 'el-icon-folder' : 'el-icon-document'" class="file-icon" />
            <span>{{ item.label }}</span>
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
export default {
  name: 'FileMenu',
  data() {
    return {
      files: [],
      fileTree: [],
      filteredFileTree: [],
      searchQuery: '',
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      loading: false,
      currentPath: '/',
      pathHistory: ['/']
    }
  },
  mounted() {
    this.loadFiles('/')
  },
  methods: {
    loadFiles(path) {
      this.loading = true
      this.$store.dispatch('file/loadJsonFiles', { file_path: path })
        .then(files => {
          this.files = files
          this.buildFileTree()
          this.currentPath = path
          // 更新路径历史记录
          if (!this.pathHistory.includes(path)) {
            this.pathHistory.push(path)
          }
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
          const fileNode = {
            label: item.display_name || item.file.split('/').pop(), // 获取文件名
            file: item.file,
            total: item.total,
            translate: item.translate,
            proofread: item.proofread,
            translatePercentage: item.total > 0 ? Math.round((item.translate / item.total) * 100) : 0,
            proofreadPercentage: item.total > 0 ? Math.round((item.proofread / item.total) * 100) : 0,
            isFolder: false
          }
          tree.push(fileNode)
        } else {
          // 这是一个文件夹，已经包含了统计信息
          const folderNode = {
            label: item.display_name || item.file.split('/').pop(), // 获取文件夹名
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
      this.filteredFileTree = tree
    },
    handleSearch() {
      if (!this.searchQuery.trim()) {
        this.filteredFileTree = this.fileTree
        return
      }

      const query = this.searchQuery.toLowerCase()
      this.filteredFileTree = this.fileTree.filter(item => {
        return item.label.toLowerCase().includes(query)
      })
    },
    handleNodeClick(data) {
      // 如果正在加载中，不处理点击事件
      if (this.loading) return

      if (!data.isFolder) {
        // 如果是文件，跳转到list.vue并携带参数
        this.$router.push({
          path: '/table/files',
          query: {
            file_path: data.file
          }
        })
      } else {
        // 如果是文件夹，加载该文件夹下的内容
        this.loadFiles(data.file)
      }
    },
    goBack() {
      // 返回上级目录
      if (this.currentPath === '/') return

      // 获取上级目录路径
      const pathParts = this.currentPath.split('/').filter(Boolean)
      pathParts.pop()
      const parentPath = pathParts.length > 0 ? pathParts.join('/') : '/'

      // 加载上级目录内容
      this.loadFiles(parentPath)
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
    }
  }
}
</script>

<style scoped>
.menu-container {
  padding: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

h2 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
}

.current-path {
  font-size: 14px;
  color: #606266;
  background-color: #f5f7fa;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
}

.search-box {
  display: flex;
  align-items: center;
}

.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
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
  border-left: 4px solid #409EFF;
}

.file-card:not(.folder-card) {
  border-left: 4px solid #67C23A;
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

.file-icon {
  font-size: 20px;
}

.folder-card .file-icon {
  color: #409EFF;
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
</style>
