<template>
  <div
    v-loading="loading"
    class="file-page"
    element-loading-text="加载文件中，请稍候..."
    element-loading-spinner="el-icon-loading"
    element-loading-background="rgba(255, 255, 255, 0.72)"
  >
    <el-container class="file-layout">
      <el-main class="file-main">
        <split-pane split="horizontal" class="file-split-pane">
          <template slot="paneL" style="overflow-y:scroll;">
            <div
              ref="leftPane"
              style="overflow-y:scroll;height:100%; padding: 10px;"
              @scroll.passive="handlePaneScroll"
              @contextmenu="handleTextContextMenu"
            >
              <div class="legend-panel">
                <span class="legend-item"><span class="legend-dot legend-dot--green" />已确认文本</span>
                <span class="legend-item"><span class="legend-dot legend-dot--orange" />有校对未确认的文本</span>
                <span class="legend-item"><span class="legend-dot legend-dot--blue" />未确认文本</span>
              </div>
              <translate-line
                v-if="json_html"
                :json-html="json_html"
                :words="words"
                :current-word-key="activeWordKey"
                @to-proofread="toProofread"
              />
            </div>
          </template>
          <template slot="paneR">
            <div
              ref="rightPane"
              class="proofread-content"
              @scroll.passive="handlePaneScroll"
            >
              <div v-if="temp.sql_id === undefined" class="proofread-empty">
                <h3>校对窗口:请先选择要校对的文本</h3>
              </div>
              <proofread
                v-else
                ref="proofread"
                :word="temp"
                :current-file="file_path"
                :has-next-unproofread="hasNextUnproofread"
                :has-previous-unproofread="hasPreviousUnproofread"
                @previous-unproofread="goToPreviousUnproofread"
                @progress-updated="handleProgressUpdated"
                @next-unproofread="goToNextUnproofread"
                @word-updated="handleWordUpdated"
              />
            </div>
          </template>
        </split-pane>
      </el-main>
    </el-container>
    <button
      type="button"
      class="preview-toggle"
      :class="{ 'preview-toggle--open': previewDrawerOpen }"
      @click="togglePreviewDrawer"
    >
      {{ previewDrawerOpen ? '收起预览' : '展开预览' }}
    </button>
    <div class="preview-drawer" :class="{ 'preview-drawer--open': previewDrawerOpen }">
      <div class="preview-drawer__header">
        <span>高级模式预览</span>
        <button type="button" class="preview-drawer__close" @click="togglePreviewDrawer">
          关闭
        </button>
      </div>
      <div class="preview-drawer__body">
        <render-preview :file-path="file_path" />
      </div>
    </div>
    <div
      v-if="textContextMenu.visible"
      class="text-context-menu"
      :style="{ left: `${textContextMenu.left}px`, top: `${textContextMenu.top}px` }"
    >
      <button type="button" class="text-context-menu__item" @click="searchSelectionInChm">
        在资料库中搜索
      </button>
    </div>
  </div>
</template>

<script>
// import JsonEditor from '@/components/JsonEditor'
import Proofread from '@/components/Proofread'
import splitPane from 'vue-splitpane'
import TranslateLine from '@/components/TranslateLine'
import RenderPreview from '@/components/RenderPreview'

export default {
  name: 'FileList',
  components: { Proofread, splitPane, TranslateLine, RenderPreview },
  data() {
    return {
      drawVisible: false,
      files: [],
      words: {},
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      file_path: '',
      json_txt: '',
      json_html: [],
      en_in_file: '',
      loading: false,
      temp: {
        sql_id: undefined,
        en_str: '',
        cn_str: '',
        create_at: '',
        modified_at: '',
        is_key: 0,
        is_proofread: 0
      },
      source: '',
      jobSequence: [],
      headerCollapsed: false,
      previewDrawerOpen: false,
      textContextMenu: {
        visible: false,
        left: 0,
        top: 0,
        text: ''
      }
    }
  },
  computed: {
    activeWordKey() {
      return this.temp && this.temp.en_str ? this.temp.en_str.toLowerCase() : ''
    },
    hasNextUnproofread() {
      const currentIndex = this.findCurrentWordIndex()
      if (currentIndex === -1) {
        return this.findNextUnproofreadIndex(-1) !== -1
      }
      return this.findNextUnproofreadIndex(currentIndex) !== -1
    },
    hasPreviousUnproofread() {
      const currentIndex = this.findCurrentWordIndex()
      if (currentIndex === -1) {
        return false
      }
      return this.findPreviousUnproofreadIndex(currentIndex) !== -1
    }
  },
  watch: {
    // 监听路由参数变化
    '$route.query.file_path'(newPath) {
      if (newPath) {
        this.loadJsonFile(newPath)
      }
    },
    '$route.query.refreshAt'() {
      if (this.$route.query.file_path) {
        this.loadJsonFile(this.$route.query.file_path, true)
      }
    }
  },
  // 添加created钩子和watch路由参数变化的逻辑
  created() {
    // 检查路由参数，如果有file_path则直接加载该文件
    if (this.$route.query.file_path) {
      this.loadJsonFile(this.$route.query.file_path)
    }
    this.updateHeaderCompact(false)
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeTextContextMenu)
    window.removeEventListener('keydown', this.handleGlobalKeydown)
    this.updateHeaderCompact(false)
  },
  mounted() {
    document.addEventListener('click', this.closeTextContextMenu)
    window.addEventListener('keydown', this.handleGlobalKeydown)
  },
  methods: {
    handleTextContextMenu(event) {
      const selection = window.getSelection ? window.getSelection().toString().trim() : ''
      if (!selection) {
        this.closeTextContextMenu()
        return
      }
      event.preventDefault()
      this.textContextMenu = {
        visible: true,
        left: event.clientX,
        top: event.clientY,
        text: selection
      }
    },
    closeTextContextMenu() {
      if (!this.textContextMenu.visible) return
      this.textContextMenu.visible = false
    },
    handleGlobalKeydown(event) {
      if (event.key === 'Escape') {
        this.closeTextContextMenu()
      }
    },
    searchSelectionInChm() {
      if (!this.textContextMenu.text) return
      window.dispatchEvent(new CustomEvent('chm-search-request', {
        detail: {
          query: this.textContextMenu.text
        }
      }))
      this.closeTextContextMenu()
    },
    handlePaneScroll(event) {
      this.closeTextContextMenu()
      const shouldCollapse = event && event.target ? event.target.scrollTop > 36 : false
      if (shouldCollapse === this.headerCollapsed) {
        return
      }
      this.headerCollapsed = shouldCollapse
      this.updateHeaderCompact(shouldCollapse)
    },
    updateHeaderCompact(compact) {
      if (typeof window === 'undefined') return
      window.dispatchEvent(new CustomEvent('file-proofread-scroll', {
        detail: {
          compact
        }
      }))
    },
    handleNodeClick(data) {
      if (data.children.length > 0) {
        return
      }
      this.loadJsonFile(data.path, true)
    },
    loadJsonFile(file_path, force = true) {
      if (file_path === '') {
        this.$message.error('请选择文件')
        return
      }
      this.headerCollapsed = false
      this.updateHeaderCompact(false)
      this.loading = true
      this.json_html = []
      if (!force && this.files[file_path] !== undefined && this.files[file_path] !== '') {
        this.json_txt = this.files[file_path]
        this.getJsonHtml()
        this.file_path = file_path
        this.loading = false
      } else {
        this.$store.dispatch('file/loadJsonFiles', { 'file_path': file_path, force }).then(file_data => {
          console.log(file_data)
          const data = file_data[0]
          this.json_txt = data.json_content
          this.jobSequence = Array.isArray(data.job_list) ? data.job_list : []
          this.$store.dispatch('file/setCurrentFileProgress', {
            filePath: file_path,
            total: data.total || 0,
            translate: data.translate || 0,
            proofread: data.proofread || 0
          })
          if (this.file_path === file_path) {
            this.getJsonHtml()
            this.loading = false
          } else {
            const words_ = {}
            data.job_list.map(job => {
              // console.log(job)
              words_[job.en_str.toLowerCase()] = job
            })
            this.words = words_
            this.getJsonHtml()
            this.selectInitialUnproofread()
            this.loading = false
          }
          this.file_path = file_path
          this.loading = false
        }
        ).catch(error => {
          console.log(error)
          this.loading = false
        })
      }
    },
    handleProgressUpdated(progress) {
      if (!progress) return
      const fileProgress = progress[this.file_path] || progress
      if (typeof fileProgress.total === 'undefined') return
      this.$store.dispatch('file/setCurrentFileProgress', {
        filePath: this.file_path,
        total: fileProgress.total || 0,
        translate: fileProgress.translate || 0,
        proofread: fileProgress.proofread || 0
      })
    },
    handleWordUpdated(word) {
      if (!word || !word.en_str) return
      const wordKey = word.en_str.toLowerCase()
      this.jobSequence = this.jobSequence.map((job) => {
        if (job.en_str.toLowerCase() !== wordKey) return job
        return {
          ...job,
          ...word
        }
      })
      this.words = {
        ...this.words,
        [wordKey]: {
          ...(this.words[wordKey] || {}),
          ...word
        }
      }
      this.temp = {
        ...this.temp,
        ...word
      }
    },
    selectInitialUnproofread() {
      const nextIndex = this.findNextUnproofreadIndex(-1)
      if (nextIndex === -1) {
        return
      }
      this.selectJobAtIndex(nextIndex)
    },
    goToNextUnproofread() {
      const currentIndex = this.findCurrentWordIndex()
      const nextIndex = this.findNextUnproofreadIndex(currentIndex)
      if (nextIndex === -1) {
        this.$message.info('当前文件已没有下一个未校对文本')
        return
      }
      this.selectJobAtIndex(nextIndex)
    },
    goToPreviousUnproofread() {
      const currentIndex = this.findCurrentWordIndex()
      const previousIndex = this.findPreviousUnproofreadIndex(currentIndex)
      if (previousIndex === -1) {
        this.$message.info('当前文件已没有上一个未校对文本')
        return
      }
      this.selectJobAtIndex(previousIndex)
    },
    togglePreviewDrawer() {
      this.previewDrawerOpen = !this.previewDrawerOpen
    },
    findCurrentWordIndex() {
      if (!this.activeWordKey) return -1
      return this.jobSequence.findIndex((job) => job.en_str && job.en_str.toLowerCase() === this.activeWordKey)
    },
    findNextUnproofreadIndex(startIndex) {
      for (let index = startIndex + 1; index < this.jobSequence.length; index++) {
        const job = this.jobSequence[index]
        if (!job || !job.en_str) continue
        if (Number(job.is_proofread) !== 1) {
          return index
        }
      }
      return -1
    },
    findPreviousUnproofreadIndex(startIndex) {
      for (let index = startIndex - 1; index >= 0; index--) {
        const job = this.jobSequence[index]
        if (!job || !job.en_str) continue
        if (Number(job.is_proofread) !== 1) {
          return index
        }
      }
      return -1
    },
    selectJobAtIndex(index) {
      const job = this.jobSequence[index]
      if (!job || !job.en_str) return
      const wordKey = job.en_str.toLowerCase()
      const word = this.words[wordKey] || job
      this.toProofread(word, wordKey)
      this.scrollToWord(wordKey)
    },
    scrollToWord(wordKey) {
      this.$nextTick(() => {
        const target = Array.from(document.querySelectorAll('[data-word-key]')).find(
          (item) => item.getAttribute('data-word-key') === wordKey
        )
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      })
    },
    getJsonHtml() {
      // 判断this.json_txt的类型是否为字符串
      // console.log(typeof this.json_txt)
      if (typeof this.json_txt !== 'object' && this.json_txt !== null) {
        this.$message.error('文件内容不是有效的对象')
        return
      }
      const words = this.words // 将响应式属性保存到局部变量
      const fuckLine = (in_line) => {
        if (in_line === '') {
          return ''
        }
        let res_line = []
        // 检查整个字符串值是否在words中（用于原句校对）
        const lowerValueContent = in_line.toLowerCase()
        const isWholeSentenceInWords = lowerValueContent in words

        const wholeSentenceValue = isWholeSentenceInWords ? lowerValueContent : undefined

        if ((!in_line.includes('{@')) && (!in_line.includes('|') && !in_line.includes('='))) {
          // 普通文本 - 使用完整句子作为word
          if (wholeSentenceValue !== undefined) {
            res_line.push({
              html: in_line,
              word: wholeSentenceValue
            })
          }
          return res_line
        }

        let currentContent = '' // 当前已经读取的内容
        let markUpContent = '' // 当前正在读取的标记符内容
        let markUpLevel = 0 // 标记符嵌套层级
        // 使用for...of循环遍历字符串，避免遍历到原型链上的方法
        for (const c of in_line) {
          if (c === '{') {
            markUpLevel++
          } else if (c === '}') {
            markUpLevel--
            if (markUpLevel === 0) {
              // 将第一个空格到}之间的内容递归处理，前后的内容放到currentContent里
              currentContent += markUpContent.substring(0, markUpContent.indexOf(' ') + 1)
              res_line.push({
                html: currentContent,
                word: wholeSentenceValue
              })
              const subContent = markUpContent.substring(markUpContent.indexOf(' ') + 1, markUpContent.length)
              res_line = res_line.concat(fuckLine(subContent))
              currentContent = '}'
              markUpContent = ''
              continue
            }
          }
          if (markUpLevel === 0) {
            if (c === '|' || c === '=') {
              res_line = res_line.concat(fuckLine(currentContent))
              res_line.push({
                html: c,
                word: undefined
              })
              currentContent = ''
            } else {
              currentContent += c
            }
          } else {
            // 标记符开始或中间内容
            markUpContent += c
          }
        }
        if (currentContent.length > 0) {
          const last_part = fuckLine(currentContent)
          if (last_part.length > 0) {
            res_line = res_line.concat(last_part)
          } else {
            res_line.push({
              html: currentContent,
              word: wholeSentenceValue
            })
          }
        }
        return res_line
      }

      const process = (obj) => {
        const res_obj = {
          name_obj: null,
          entries: []
        }
        if (typeof obj === 'object' && obj !== null) {
          // 先处理name属性
          if (obj.name !== undefined) {
            // console.log(obj.name)
            res_obj.name_obj = fuckLine(obj.name)
          }
          // 再处理name之外的其他属性
          for (const key in obj) {
            // 跳过name属性
            if (key === 'name') {
              continue
            }
            const proc_obj = process(obj[key])
            if (proc_obj.name_obj !== null) {
              res_obj.entries.push(proc_obj)
            } else if (proc_obj.entries.length > 0) {
              // 展开数组，避免嵌套
              res_obj.entries.push(...proc_obj.entries)
            }
          }
        } else if (typeof obj === 'string') {
          const line = fuckLine(obj)
          // 展开数组，避免嵌套
          if (line && line.length > 0) {
            res_obj.entries.push({ entries: line })
          }
        }
        return res_obj
      }
      // 直接使用process的结果，不需要包装在数组中
      this.json_html = process(this.json_txt)
      // console.log(this.json_html)
    },
    toProofread(row, en_in_file) {
      this.$nextTick(() => {
        if (row) {
          this.temp = row
          this.en_in_file = en_in_file
        } else {
          // 原句校对逻辑，创建临时word对象
          // console.log(en_in_file)
          this.temp = { sql_id: undefined, en_str: en_in_file }
          this.en_in_file = en_in_file
        }
        if (this.en_in_file) {
          this.scrollToWord(this.en_in_file)
        }
      })
    }
  }
}
</script>
<style>
  .file-page {
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  .file-layout,
  .file-main,
  .file-split-pane {
    height: 100%;
  }

  .file-main {
    padding: 0;
  }

  .proofread-content {
    height: 100%;
    overflow-y: auto;
  }

  .proofread-empty {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .preview-toggle {
    position: absolute;
    top: 18px;
    right: 0;
    z-index: 5;
    border: 0;
    border-radius: 12px 0 0 12px;
    background: rgba(31, 42, 55, 0.86);
    color: #fff;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: right 0.2s ease, background 0.2s ease;
  }

  .preview-toggle:hover {
    background: rgba(31, 42, 55, 0.95);
  }

  .preview-toggle--open {
    right: min(38vw, 540px);
  }

  .preview-drawer {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 4;
    width: min(38vw, 540px);
    height: 100%;
    background: rgba(255, 255, 255, 0.98);
    border-left: 1px solid #dce4ef;
    box-shadow: -12px 0 32px rgba(31, 42, 55, 0.14);
    transform: translateX(100%);
    transition: transform 0.22s ease;
    display: flex;
    flex-direction: column;
  }

  .preview-drawer--open {
    transform: translateX(0);
  }

  .preview-drawer__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid #e4eaf3;
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    background: linear-gradient(180deg, #f8fbff 0%, #f1f5fb 100%);
  }

  .preview-drawer__close {
    border: 0;
    background: transparent;
    color: #607086;
    font-size: 12px;
    cursor: pointer;
  }

  .preview-drawer__body {
    flex: 1;
    min-height: 0;
    background: #fff;
  }

  .legend-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 0 0 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #f7f9fc;
    border: 1px solid #e4eaf3;
    font-size: 12px;
    color: #506078;
  }

  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .legend-dot--green {
    background: #67c23a;
  }

  .legend-dot--orange {
    background: #e6a23c;
  }

  .legend-dot--blue {
    background: #409eff;
  }

  .text-context-menu {
    position: fixed;
    z-index: 30;
    min-width: 168px;
    padding: 6px;
    border: 1px solid #dbe3ef;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 14px 32px rgba(18, 28, 45, 0.14);
  }

  .text-context-menu__item {
    width: 100%;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #314157;
    font-size: 13px;
    font-weight: 600;
    text-align: left;
    padding: 10px 12px;
    cursor: pointer;
  }

  .text-context-menu__item:hover {
    background: #eef4ff;
    color: #1749b9;
  }
</style>
